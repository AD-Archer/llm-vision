import { NextRequest, NextResponse } from "next/server";
import { performance } from "node:perf_hooks";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma, AppSetting } from "@prisma/client";
import { invokeAiProvider } from "@/lib/aiClient";
import { getOrCreateSettings } from "@/lib/settings";

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

const TargetSchema = z
  .object({
    label: z.string().min(1).max(60),
    modelName: z.string().max(120).optional(),
    color: z.string().optional(),
    timeoutMs: z.number().int().min(1000).max(120000).optional(),

    // Tuning params
    systemPrompt: z.string().optional(),
    temperature: z.number().optional(),
    topP: z.number().optional(),
    topK: z.number().optional(),
    maxTokens: z.number().optional(),
    frequencyPenalty: z.number().optional(),
    presencePenalty: z.number().optional(),

    // Overrides
    providerUrl: z.string().optional(),
    apiKey: z.string().optional(),

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
  limit: z.coerce.number().int().min(1).max(100).optional(),
  experimentId: z.string().cuid().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  allUsers: z.enum(["true", "false"]).optional(),
});

const FeedbackPayload = z
  .object({
    userId: z.string().cuid(),
    resultId: z.string().cuid(),
    reviewScore: z.number().int().min(1).max(5).nullable().optional(),
    feedbackNotes: z.string().max(2000).nullable().optional(),
    responseText: z.string().max(10000).nullable().optional(),
    expectedAnswer: z.string().max(10000).nullable().optional(),
    accuracyRating: z.number().int().min(1).max(5).nullable().optional(),
    accuracyPercent: z.number().min(0).max(100).nullable().optional(),
  })
  .refine(
    (data) =>
      data.reviewScore !== undefined ||
      data.feedbackNotes !== undefined ||
      data.responseText !== undefined ||
      data.expectedAnswer !== undefined ||
      data.accuracyRating !== undefined ||
      data.accuracyPercent !== undefined,
    {
      message:
        "reviewScore, feedbackNotes, expectedAnswer, responseText, accuracyRating, or accuracyPercent required",
      path: ["reviewScore"],
    }
  );

type TargetInput = z.infer<typeof TargetSchema>;

type ExperimentPayload = z.infer<typeof CreateExperimentPayload>;

type RunOutcome = {
  resultId: string;
  status: AiRunStatus;
};

function maskSensitiveData(target: TargetInput) {
  const masked = { ...target };
  if (masked.apiKey) {
    masked.apiKey = "••••";
  }
  return masked;
}

function serializeTargetsForStorage(targets: TargetInput[]) {
  return targets.map(maskSensitiveData);
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


async function executeTarget(
  resultId: string,
  target: TargetInput,
  params: { prompt: string; expectedAnswer?: string; experimentId: string },
  globalSettings: AppSetting
): Promise<RunOutcome> {
  const timeout = target.timeoutMs ?? 45000;

  // Determine provider URL and Key
  const providerUrl = target.providerUrl || globalSettings.aiProviderUrl;
  const apiKey = target.apiKey || globalSettings.aiProviderApiKey || undefined;

  if (!providerUrl) {
    await prisma.aiExperimentResult.update({
      where: { id: resultId },
      data: {
        status: AiRunStatus.FAILED,
        errorMessage: "No AI Provider URL configured",
        completedAt: new Date(),
      },
    });
    return { resultId, status: AiRunStatus.FAILED };
  }

  try {
    const startTs = performance.now();
    await prisma.aiExperimentResult.update({
      where: { id: resultId },
      data: { status: AiRunStatus.RUNNING, startedAt: new Date() },
    });

    // Construct OpenAI-compatible payload
    const messages = [];
    if (target.systemPrompt) {
      messages.push({ role: "system", content: target.systemPrompt });
    }
    messages.push({ role: "user", content: params.prompt });

    const payload = {
      model: target.modelName,
      messages,
      temperature: target.temperature ?? 0.7,
      top_p: target.topP ?? 1.0,
      max_tokens: target.maxTokens ?? 1024,
      ...(target.topK ? { top_k: target.topK } : {}),
      ...(target.frequencyPenalty
        ? { frequency_penalty: target.frequencyPenalty }
        : {}),
      ...(target.presencePenalty
        ? { presence_penalty: target.presencePenalty }
        : {}),
    };

    const result = await invokeAiProvider(
      providerUrl,
      apiKey,
      payload,
      {}, // headers
      "POST",
      timeout
    );

    const latencyMs = Math.round(performance.now() - startTs);

    let parsedResponse: unknown = result.body;
    if (typeof parsedResponse === "string") {
      try {
        parsedResponse = JSON.parse(parsedResponse);
      } catch {}
    }

    if (!result.ok) {
      await prisma.aiExperimentResult.update({
        where: { id: resultId },
        data: {
          status: AiRunStatus.FAILED,
          errorMessage: `Provider returned ${result.status}: ${
            result.statusText || "Unknown error"
          }`,
          completedAt: new Date(),
          latencyMs,
          responsePayload: (typeof parsedResponse === "string"
            ? { raw: parsedResponse }
            : parsedResponse) as Prisma.InputJsonValue,
        },
      });
      return { resultId, status: AiRunStatus.FAILED };
    }

    const { promptTokens, completionTokens, totalTokens } =
      extractTokenCounts(parsedResponse);
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
        status: AiRunStatus.COMPLETED,
        latencyMs,
        completionTokens,
        promptTokens,
        totalTokens,
        // accuracyScore intentionally not set here — it should be provided manually via PATCH
        speedScore,
        costEstimate,
        completedAt: new Date(),
        errorMessage: null,
        responsePayload: (typeof parsedResponse === "string"
          ? { raw: parsedResponse }
          : parsedResponse) as Prisma.InputJsonValue,
        modelName: extractModel(parsedResponse, target.modelName),
      },
    });

    return {
      resultId,
      status: AiRunStatus.COMPLETED,
    };
  } catch (error) {
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

    const {
      userId,
      limit,
      experimentId,
      search,
      startDate,
      endDate,
      allUsers,
    } = parsed.data;
    const limitValue = limit ?? 20;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (experimentId) {
      const experiment = await prisma.aiExperiment.findUnique({
        where: { id: experimentId },
        include: {
          results: { orderBy: { slotIndex: "asc" } },
          user: { select: { email: true } },
        },
      });

      if (!experiment) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return NextResponse.json(experiment);
    }

    const where: Prisma.AiExperimentWhereInput = {};

    if (allUsers !== "true") {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { label: { contains: search, mode: "insensitive" } },
        { prompt: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        {
          results: {
            some: {
              feedbackNotes: { contains: search, mode: "insensitive" },
            },
          },
        },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const experiments = await prisma.aiExperiment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limitValue,
      include: {
        results: { orderBy: { slotIndex: "asc" } },
        user: { select: { email: true } },
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

    const settings = await getOrCreateSettings();

    const startedAt = Date.now();

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
            webhookUrl: "", // No longer used, but required by schema? Let's check schema.
            modelName: target.modelName,
            method: "POST", // Default
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

    // Compute calculated accuracy over last 10 results and update experiment accordingly
    const recentResultsForExperiment = await prisma.aiExperimentResult.findMany(
      {
        where: { experimentId: experiment.id, accuracyScore: { not: null } },
        orderBy: { completedAt: "desc" },
        take: 10,
      }
    );
    const avgLast10 =
      recentResultsForExperiment.length > 0
        ? recentResultsForExperiment.reduce(
            (sum, r) => sum + (r.accuracyScore ?? 0),
            0
          ) / recentResultsForExperiment.length
        : null;

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
        calculatedAccuracyLast10: avgLast10,
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

    const {
      userId,
      resultId,
      reviewScore,
      feedbackNotes,
      responseText,
      expectedAnswer,
      accuracyRating,
      accuracyPercent,
    } = parsed.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resultRecord = await prisma.aiExperimentResult.findUnique({
      where: { id: resultId },
      include: { experiment: true },
    });

    if (!resultRecord) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    // Allow admins to edit any result, otherwise ensure the requestor owns the experiment
    if (!user.isAdmin && resultRecord.experiment.userId !== userId) {
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
    if (responseText !== undefined) {
      const trimmed = responseText?.trim() ?? "";
      updateData.responseText = trimmed.length ? trimmed : null;
    }
    if (expectedAnswer !== undefined) {
      const trimmed = expectedAnswer?.trim() ?? "";
      updateData.expectedAnswer = trimmed.length ? trimmed : null;
    }
    if (accuracyRating !== undefined) {
      updateData.accuracyRating = accuracyRating ?? null;
    }
    if (accuracyPercent !== undefined) {
      const num = accuracyPercent;
      updateData.accuracyScore =
        num !== null && num !== undefined ? Number(num) / 100 : null;
    }

    if (!Object.keys(updateData).length) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await prisma.aiExperimentResult.update({
      where: { id: resultId },
      data: updateData,
    });

    // Recompute experiment-level calculatedAccuracyLast10
    try {
      const recentResults = await prisma.aiExperimentResult.findMany({
        where: {
          experimentId: resultRecord.experiment.id,
          accuracyScore: { not: null },
        },
        orderBy: { completedAt: "desc" },
        take: 10,
      });
      const newAvgLast10 =
        recentResults.length > 0
          ? recentResults.reduce((sum, r) => sum + (r.accuracyScore ?? 0), 0) /
            recentResults.length
          : null;
      await prisma.aiExperiment.update({
        where: { id: resultRecord.experiment.id },
        data: { calculatedAccuracyLast10: newAvgLast10 },
      });
    } catch (err) {
      console.error("Failed to update experiment average accuracy:", err);
    }

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
