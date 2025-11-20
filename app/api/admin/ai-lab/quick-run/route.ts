import { NextRequest, NextResponse } from "next/server";
import { performance } from "node:perf_hooks";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const HeaderRecordSchema = z.record(z.string(), z.string());

const QuickRunTargetSchema = z
  .object({
    label: z.string().min(1).max(60),
    webhookUrl: z.string().url(),
    modelName: z.string().min(1).max(120),
    method: z.enum(["POST", "PUT", "PATCH"]).optional(),
    color: z.string().optional(),
    headers: HeaderRecordSchema.optional(),
    timeoutMs: z.number().int().min(1000).max(120000).optional(),
    payloadTemplate: z.record(z.string(), z.any()).optional(),
    inputTokensPerMillion: z.number().nonnegative().optional(),
    outputTokensPerMillion: z.number().nonnegative().optional(),
  })
  .strict();

const QuickRunPayload = z.object({
  userId: z.string().cuid(),
  prompt: z.string().min(1),
  targets: z.array(QuickRunTargetSchema).min(1).max(6),
});

type QuickRunTargetInput = z.infer<typeof QuickRunTargetSchema>;

type QuickRunPayloadType = z.infer<typeof QuickRunPayload>;

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
    if (candidate && typeof candidate === "string") {
      return candidate;
    }
  }
  return fallback;
}

function extractAnswer(payload: unknown, rawText: string) {
  console.log("[extractAnswer] Raw text:", rawText.substring(0, 200));
  console.log(
    "[extractAnswer] Parsed payload:",
    JSON.stringify(payload, null, 2)
  );

  if (payload && typeof payload === "object") {
    const candidate =
      (payload as Record<string, unknown>).answer ??
      (payload as Record<string, unknown>).response ??
      (payload as Record<string, unknown>).content ??
      (payload as Record<string, unknown>).text ??
      (payload as Record<string, unknown>).result ??
      (payload as Record<string, unknown>).message ??
      (payload as Record<string, unknown>).output ??
      null;

    console.log("[extractAnswer] Candidate found:", candidate);

    if (candidate && typeof candidate === "string") {
      return candidate;
    }

    // Try nested structures
    const choices = (payload as Record<string, unknown>).choices;
    if (choices && Array.isArray(choices) && choices.length > 0) {
      const firstChoice = choices[0];
      if (firstChoice && typeof firstChoice === "object") {
        const choiceCandidate =
          (firstChoice as Record<string, unknown>).text ??
          (firstChoice as Record<string, unknown>).message ??
          (firstChoice as Record<string, unknown>).content ??
          null;
        if (choiceCandidate && typeof choiceCandidate === "string") {
          console.log("[extractAnswer] Found in choices:", choiceCandidate);
          return choiceCandidate;
        }
      }
    }
  }

  console.log("[extractAnswer] Falling back to raw text");
  return rawText;
}

type QuickRunResult = {
  label: string;
  modelName: string;
  latencyMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  costEstimate: number | null;
  answer: string;
  responsePayload: unknown;
};

async function runWithConcurrency<T>(
  limit: number,
  items: T[],
  runner: (
    item: T,
    index: number
  ) => Promise<{ success: boolean; data?: QuickRunResult; error?: string }>
): Promise<{ success: boolean; data?: QuickRunResult; error?: string }[]> {
  const results: { success: boolean; data?: QuickRunResult; error?: string }[] =
    new Array(items.length);
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

async function executeQuickTarget(
  target: QuickRunTargetInput,
  prompt: string,
  index: number
): Promise<{ success: boolean; data?: QuickRunResult; error?: string }> {
  const timeout = target.timeoutMs ?? 45000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const startTs = performance.now();

    const payload = {
      ...(target.payloadTemplate ?? {}),
      prompt,
      chatInput: prompt, // Include chatInput for compatibility
      experimentId: `quick-run-${Date.now()}-${index}`,
      slotLabel: target.label,
      model: target.modelName,
      chatId: `quick-run-${Date.now()}`,
      sessionId: `quick-run-session-${Date.now()}-${index}`,
      issuedAt: new Date().toISOString(),
    };

    const headers = {
      "Content-Type": "application/json",
      ...(target.headers ?? {}),
    };

    const response = await fetch(target.webhookUrl, {
      method: target.method ?? "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rawText = await response.text();
    let parsedResponse: unknown = rawText;
    try {
      parsedResponse = JSON.parse(rawText);
    } catch {
      parsedResponse = rawText;
    }

    console.log(`[executeQuickTarget] Webhook response for ${target.label}:`);
    console.log(`[executeQuickTarget] Status: ${response.status}`);
    console.log(`[executeQuickTarget] Raw text length: ${rawText.length}`);
    console.log(
      `[executeQuickTarget] Raw text preview:`,
      rawText.substring(0, 500)
    );
    console.log(
      `[executeQuickTarget] Parsed response type:`,
      typeof parsedResponse
    );
    if (typeof parsedResponse === "object" && parsedResponse !== null) {
      console.log(
        `[executeQuickTarget] Parsed keys:`,
        Object.keys(parsedResponse)
      );
    }

    const latencyMs = Math.round(performance.now() - startTs);
    const { promptTokens, completionTokens, totalTokens } =
      extractTokenCounts(parsedResponse);

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

    const extractedAnswer = extractAnswer(parsedResponse, rawText);
    console.log(
      `[executeQuickTarget] Final extracted answer for ${target.label}:`,
      extractedAnswer.substring(0, 200)
    );

    clearTimeout(timer);
    return {
      success: response.ok,
      data: {
        label: target.label,
        modelName:
          extractModel(parsedResponse, target.modelName) || target.modelName,
        latencyMs,
        promptTokens,
        completionTokens,
        totalTokens,
        costEstimate,
        answer: extractedAnswer,
        responsePayload:
          typeof parsedResponse === "string"
            ? { raw: parsedResponse }
            : parsedResponse,
      },
    };
  } catch (error) {
    clearTimeout(timer);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[quick-run] Received payload:", JSON.stringify(body, null, 2));

    const parsed = QuickRunPayload.safeParse(body);

    if (!parsed.success) {
      console.log("[quick-run] Validation failed:", parsed.error.issues);
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const payload: QuickRunPayloadType = parsed.data;
    console.log("[quick-run] Valid payload parsed successfully");

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user || !user.isAdmin) {
      console.log("[quick-run] Unauthorized user:", payload.userId);
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    console.log(
      "[quick-run] Starting execution for",
      payload.targets.length,
      "targets"
    );
    const startedAt = Date.now();

    const results = await runWithConcurrency(
      6, // Max concurrency for quick runs
      payload.targets,
      (target, index) => executeQuickTarget(target, payload.prompt, index)
    );

    const durationMs = Date.now() - startedAt;
    console.log("[quick-run] Execution completed in", durationMs, "ms");

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    const response = {
      success: true,
      durationMs,
      totalTargets: payload.targets.length,
      successful,
      failed,
      results: results.map((result, index) => ({
        target: payload.targets[index].label,
        ...result,
      })),
    };

    console.log(
      "[quick-run] Sending response:",
      JSON.stringify(response, null, 2)
    );
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[ai-lab-quick-run] POST failed", error);
    return NextResponse.json(
      { error: "Failed to run quick test" },
      { status: 500 }
    );
  }
}
