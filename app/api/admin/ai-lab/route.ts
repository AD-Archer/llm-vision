import { NextRequest, NextResponse } from "next/server";
import { performance } from "node:perf_hooks";
import { prisma } from "@/lib/prisma";
import { invokeAiProvider } from "@/lib/aiClient";
import { getOrCreateSettings } from "@/lib/settings";
import { z } from "zod";
import { Prisma } from "@prisma/client";

enum AiExperimentStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

enum AiRunStatus {
  QUEUED = "QUEUED",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

const HeaderRecordSchema = z.record(z.string(), z.string());

const TargetSchema = z
  .object({
    label: z.string().min(1).max(60),
    webhookUrl: z.string().url().optional(),
    modelName: z.string().min(1).max(120),
    method: z.enum(["POST", "PUT", "PATCH"]).optional(),
    color: z.string().optional(),
    headers: HeaderRecordSchema.optional(),
    timeoutMs: z.number().int().min(1000).max(120000).optional(),
    payloadTemplate: z.record(z.string(), z.any()).optional(),
    costPer1kTokens: z.number().nonnegative().optional(),
    inputTokensPerMillion: z.number().nonnegative().optional(),
    outputTokensPerMillion: z.number().nonnegative().optional(),
  })
  .strict();

const CreateExperimentPayload = z.object({
  userId: z.string().cuid(),
  label: z.string().min(1).max(120),
  prompt: z.string().min(1),
  expectedAnswer: z.string().optional(),
  notes: z.string().optional(),
  maxConcurrency: z.number().int().min(1).max(6).optional(),
  targets: z.array(TargetSchema).min(1).max(6),
});

const QuerySchema = z.object({
  userId: z.string().cuid(),
  limit: z.coerce.number().int().min(1).max(25).optional(),
  experimentId: z.string().cuid().optional(),
});

const FeedbackPayload = z
  .object({
    userId: z.string().cuid(),
    resultId: z.string().cuid(),
    reviewScore: z.number().int().min(1).max(5).nullable().optional(),
    feedbackNotes: z.string().max(2000).nullable().optional(),
  })
  .refine(
    (data) =>
      data.reviewScore !== undefined || data.feedbackNotes !== undefined,
    {
      message: "reviewScore or feedbackNotes required",
      path: ["reviewScore"],
    }
  );

type TargetInput = z.infer<typeof TargetSchema>;

type ExperimentPayload = z.infer<typeof CreateExperimentPayload>;

type RunOutcome = {
  resultId: string;
  status: AiRunStatus;
};

function maskSensitiveHeaders(headers?: Record<string, string>) {
  if (!headers) return undefined;
  const sensitiveKeywords = [
    "authorization",
    "api",
    "token",
    "secret",
    "password",
    "key",
  ];
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeywords.some((keyword) =>
        lowerKey.includes(keyword)
      );
      return [key, isSensitive ? "••••" : value];
    })
  );
}

function serializeTargetsForStorage(targets: TargetInput[]) {
  return targets.map((target) => ({
    ...target,
    headers: maskSensitiveHeaders(target.headers),
  }));
}

async function runWithConcurrency<T>(
  limit: number,
  items: T[],
  runner: (item: T, index: number) => Promise<RunOutcome>
): Promise<RunOutcome[]> {
  const results: RunOutcome[] = new Array(items.length);
  let pointer = 0;

  const worker = async () => {
    while (pointer < items.length) {
      const currentIndex = pointer++;
      results[currentIndex] = await runner(items[currentIndex], currentIndex);
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker()
  );

  await Promise.all(workers);
  return results;
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function calculateAccuracy(expected?: string, actual?: string) {
  if (!expected || !actual) {
    return null;
  }
  const expectedTokens = normalizeText(expected);
  const actualTokens = normalizeText(actual);
  if (!expectedTokens.length || !actualTokens.length) {
    return null;
  }
  const expectedSet = new Set(expectedTokens);
  const actualSet = new Set(actualTokens);
  let matches = 0;
  expectedSet.forEach((token) => {
    if (actualSet.has(token)) {
      matches += 1;
    }
  });
  return Number((matches / expectedSet.size).toFixed(2));
}

function coerceNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function extractTokenCounts(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { promptTokens: null, completionTokens: null, totalTokens: null };
  }
  const usage =
    (payload as Record<string, unknown>).usage ??
    (payload as Record<string, unknown>).tokenUsage ??
    (payload as Record<string, unknown>).tokens ??
    null;
  if (!usage || typeof usage !== "object") {
    return { promptTokens: null, completionTokens: null, totalTokens: null };
  }
  const promptTokens =
    (usage as Record<string, unknown>).promptTokens ??
    (usage as Record<string, unknown>).prompt_tokens ??
    (usage as Record<string, unknown>).inputTokens ??
    (usage as Record<string, unknown>).input_tokens ??
    null;
  const completionTokens =
    (usage as Record<string, unknown>).completionTokens ??
    (usage as Record<string, unknown>).completion_tokens ??
    (usage as Record<string, unknown>).outputTokens ??
    (usage as Record<string, unknown>).output_tokens ??
    null;
  const totalTokens =
    (usage as Record<string, unknown>).totalTokens ??
    (usage as Record<string, unknown>).total_tokens ??
    (usage as Record<string, unknown>).overallTokens ??
    (usage as Record<string, unknown>).overall_tokens ??
    null;

  const prompt = coerceNumber(promptTokens);
  const completion = coerceNumber(completionTokens);
  const total =
    coerceNumber(totalTokens) ??
    (prompt !== null && completion !== null ? prompt + completion : null);

  return {
    promptTokens: prompt,
    completionTokens: completion,
    totalTokens: total,
  };
}

function extractModel(payload: unknown, fallback?: string) {
  if (payload && typeof payload === "object") {
    const candidate =
      (payload as Record<string, unknown>).model ??
      (payload as Record<string, unknown>).modelName ??
      (payload as Record<string, unknown>).usedModel ??
      null;
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return fallback;
}

function extractAnswer(payload: unknown, fallback: string) {
  if (!payload) return fallback;
  if (typeof payload === "string") {
    return payload;
  }
  if (typeof payload === "object") {
    const candidate =
      (payload as Record<string, unknown>).answer ??
      (payload as Record<string, unknown>).output ??
      (payload as Record<string, unknown>).result ??
      (payload as Record<string, unknown>).message ??
      (payload as Record<string, unknown>).text ??
      null;
    if (typeof candidate === "string") {
      return candidate;
    }
  }
  return fallback;
}

async function executeTarget(
  resultId: string,
  target: TargetInput,
  params: { prompt: string; expectedAnswer?: string; experimentId: string },
  settings: Awaited<ReturnType<typeof getOrCreateSettings>>
): Promise<RunOutcome> {
  const timeout = target.timeoutMs ?? 45000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const startTs = performance.now();
    await prisma.aiExperimentResult.update({
      where: { id: resultId },
      data: { status: AiRunStatus.RUNNING, startedAt: new Date() },
    });

    const payload = {
      ...(target.payloadTemplate ?? {}),
      prompt: params.prompt,
      chatInput: params.prompt, // Include chatInput for compatibility
      experimentId: params.experimentId,
      slotLabel: target.label,
      model: target.modelName,
      expectedAnswer: params.expectedAnswer,
      chatId: params.experimentId, // Use experimentId as chatId
      sessionId: `session-${params.experimentId}-${target.label}`, // Generate sessionId
      issuedAt: new Date().toISOString(),
    };

    const headers = {
      "Content-Type": "application/json",
      ...(target.headers ?? {}),
    };

    // If an AI provider is configured via env, invoke it directly instead of
    // forwarding to the target's webhook. This replaces previous behavior
    // where a separate n8n webhook was used.
    const aiProviderUrl =
      settings.aiProviderUrl ?? process.env.AI_PROVIDER_URL ?? undefined;
    const aiProviderApiKey =
      settings.aiProviderApiKey ?? process.env.AI_PROVIDER_API_KEY ?? undefined;
    const targetUrl = aiProviderUrl ?? target.webhookUrl;
    const usingAiProvider = targetUrl === aiProviderUrl;

    // If target URL is not set (neither a target-specific webhook nor a configured
    // AI_PROVIDER_URL), fail early and mark the run as failed.
    if (!targetUrl) {
      await prisma.aiExperimentResult.update({
        where: { id: resultId },
        data: {
          status: AiRunStatus.FAILED,
          errorMessage: "No target webhook URL or AI provider configured",
          completedAt: new Date(),
        },
      });

      clearTimeout(timer);
      return { resultId, status: AiRunStatus.FAILED };
    }

    const providerResponse = await invokeAiProvider(
      targetUrl,
      usingAiProvider ? aiProviderApiKey : undefined,
      payload,
      headers,
      target.method ?? "POST",
      timeout
    );

    const response = {
      ok: providerResponse.ok,
      status: providerResponse.status,
      statusText: providerResponse.statusText ?? undefined,
    } as Response;

    const rawText =
      typeof providerResponse.body === "string"
        ? (providerResponse.body as string)
        : JSON.stringify(providerResponse.body);
    let parsedResponse: unknown = providerResponse.body;
    try {
      parsedResponse = JSON.parse(rawText);
    } catch {
      parsedResponse = rawText;
    }

    const latencyMs = Math.round(performance.now() - startTs);
    const { promptTokens, completionTokens, totalTokens } =
      extractTokenCounts(parsedResponse);
    const accuracyScore = calculateAccuracy(
      params.expectedAnswer,
      extractAnswer(parsedResponse, rawText)
    );
    const speedScore = Number(Math.max(0, 1 - latencyMs / timeout).toFixed(2));
    const inputCost =
      promptTokens !== null && target.inputTokensPerMillion !== undefined
        ? (promptTokens * target.inputTokensPerMillion) / 1_000_000
        : 0;
    const outputCost =
      completionTokens !== null && target.outputTokensPerMillion !== undefined
        ? (completionTokens * target.outputTokensPerMillion) / 1_000_000
        : 0;
    const costEstimate =
      inputCost + outputCost > 0
        ? Number((inputCost + outputCost).toFixed(4))
        : null;

    await prisma.aiExperimentResult.update({
      where: { id: resultId },
      data: {
        status: response.ok ? AiRunStatus.COMPLETED : AiRunStatus.FAILED,
        latencyMs,
        completionTokens,
        promptTokens,
        totalTokens,
        accuracyScore,
        speedScore,
        costEstimate,
        completedAt: new Date(),
        errorMessage: response.ok
          ? null
          : `HTTP ${response.status}: ${response.statusText}`,
        responsePayload: (typeof parsedResponse === "string"
          ? { raw: parsedResponse }
          : parsedResponse) as Prisma.InputJsonValue,
        modelName: extractModel(parsedResponse, target.modelName),
      },
    });

    clearTimeout(timer);
    return {
      resultId,
      status: response.ok ? AiRunStatus.COMPLETED : AiRunStatus.FAILED,
    };
  } catch (error) {
    clearTimeout(timer);
    await prisma.aiExperimentResult.update({
      where: { id: resultId },
      data: {
        status: AiRunStatus.FAILED,
        errorMessage:
          error instanceof Error ? error.message : "Unknown error occurred",
        completedAt: new Date(),
      },
    });
    return { resultId, status: AiRunStatus.FAILED };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      userId: searchParams.get("userId"),
      limit: searchParams.get("limit") ?? undefined,
      experimentId: searchParams.get("experimentId") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId, limit, experimentId } = parsed.data;
    const limitValue = limit ?? 5;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (experimentId) {
      const experiment = await prisma.aiExperiment.findUnique({
        where: { id: experimentId },
        include: {
          results: { orderBy: { slotIndex: "asc" } },
        },
      });

      if (!experiment) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return NextResponse.json(experiment);
    }

    const experiments = await prisma.aiExperiment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limitValue,
      include: {
        results: { orderBy: { slotIndex: "asc" } },
      },
    });

    return NextResponse.json(experiments);
  } catch (error) {
    console.error("[ai-lab] GET failed", error);
    return NextResponse.json(
      { error: "Failed to load experiments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateExperimentPayload.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const payload: ExperimentPayload = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const startedAt = Date.now();

    const settings = await getOrCreateSettings();

    const experiment = await prisma.aiExperiment.create({
      data: {
        userId: payload.userId,
        label: payload.label,
        prompt: payload.prompt,
        expectedAnswer: payload.expectedAnswer,
        notes: payload.notes,
        totalTargets: payload.targets.length,
        status: AiExperimentStatus.RUNNING,
        targetConfigs: serializeTargetsForStorage(
          payload.targets
        ) as Prisma.InputJsonValue,
        startedAt: new Date(),
      },
    });

    const queuedResults = await prisma.$transaction(
      payload.targets.map((target, index) =>
        prisma.aiExperimentResult.create({
          data: {
            experimentId: experiment.id,
            slotIndex: index,
            label: target.label,
            color: target.color,
            webhookUrl:
              target.webhookUrl ??
              settings.aiProviderUrl ??
              process.env.AI_PROVIDER_URL ??
              null,
            modelName: target.modelName,
            method: target.method ?? "POST",
          },
        })
      )
    );

    const runOutcomes: RunOutcome[] = await runWithConcurrency(
      payload.maxConcurrency ?? 6,
      queuedResults,
      (result, idx) =>
        executeTarget(
          result.id,
          payload.targets[idx],
          {
            prompt: payload.prompt,
            expectedAnswer: payload.expectedAnswer,
            experimentId: experiment.id,
          },
          settings
        )
    );

    const completed = runOutcomes.filter(
      (outcome) => outcome.status === AiRunStatus.COMPLETED
    ).length;

    const final = await prisma.aiExperiment.update({
      where: { id: experiment.id },
      data: {
        totalCompleted: completed,
        status:
          completed === payload.targets.length
            ? AiExperimentStatus.COMPLETED
            : AiExperimentStatus.FAILED,
        durationMs: Date.now() - startedAt,
        completedAt: new Date(),
      },
      include: {
        results: { orderBy: { slotIndex: "asc" } },
      },
    });

    return NextResponse.json(final, { status: 201 });
  } catch (error) {
    console.error("[ai-lab] POST failed", error);
    return NextResponse.json(
      { error: "Failed to run AI lab experiment" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = FeedbackPayload.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId, resultId, reviewScore, feedbackNotes } = parsed.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resultRecord = await prisma.aiExperimentResult.findUnique({
      where: { id: resultId },
      include: { experiment: true },
    });

    if (!resultRecord) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    if (resultRecord.experiment.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (reviewScore !== undefined) {
      updateData.reviewScore = reviewScore ?? null;
    }
    if (feedbackNotes !== undefined) {
      const trimmed = feedbackNotes?.trim() ?? "";
      updateData.feedbackNotes = trimmed.length ? trimmed : null;
    }

    if (!Object.keys(updateData).length) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await prisma.aiExperimentResult.update({
      where: { id: resultId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[ai-lab] PATCH failed", error);
    return NextResponse.json(
      { error: "Failed to update feedback" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const experimentId = searchParams.get("experimentId");
    const userId = searchParams.get("userId");

    if (!experimentId || !userId) {
      return NextResponse.json(
        { error: "Missing experimentId or userId" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if experiment exists and belongs to the user
    const experiment = await prisma.aiExperiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) {
      return NextResponse.json(
        { error: "Experiment not found" },
        { status: 404 }
      );
    }

    if (experiment.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete the experiment (cascade will delete related results)
    await prisma.aiExperiment.delete({
      where: { id: experimentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ai-lab] DELETE failed", error);
    return NextResponse.json(
      { error: "Failed to delete experiment" },
      { status: 500 }
    );
  }
}
