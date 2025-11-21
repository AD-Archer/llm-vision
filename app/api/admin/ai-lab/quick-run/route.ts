import { NextRequest, NextResponse } from "next/server";
import { performance } from "node:perf_hooks";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { AppSetting } from "@prisma/client";
import { invokeAiProvider } from "@/lib/aiClient";
import { getOrCreateSettings } from "@/lib/settings";

const QuickRunTargetSchema = z
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
  if (payload && typeof payload === "object") {
    // OpenAI format
    const choices = (payload as Record<string, unknown>).choices;
    if (choices && Array.isArray(choices) && choices.length > 0) {
      const firstChoice = choices[0];
      if (firstChoice && typeof firstChoice === "object") {
        const message = (firstChoice as Record<string, unknown>).message;
        if (message && typeof message === "object") {
          const content = (message as Record<string, unknown>).content;
          if (typeof content === "string") return content;
        }
        const text = (firstChoice as Record<string, unknown>).text;
        if (typeof text === "string") return text;
      }
    }

    // Fallback candidates
    const candidate =
      (payload as Record<string, unknown>).answer ??
      (payload as Record<string, unknown>).response ??
      (payload as Record<string, unknown>).content ??
      (payload as Record<string, unknown>).text ??
      (payload as Record<string, unknown>).result ??
      (payload as Record<string, unknown>).message ??
      (payload as Record<string, unknown>).output ??
      null;

    if (candidate && typeof candidate === "string") {
      return candidate;
    }
  }

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
  index: number,
  globalSettings: AppSetting
): Promise<{ success: boolean; data?: QuickRunResult; error?: string }> {
  const timeout = target.timeoutMs ?? 45000;

  // Determine provider URL and Key
  const providerUrl = target.providerUrl || globalSettings.aiProviderUrl;
  const apiKey = target.apiKey || globalSettings.aiProviderApiKey || undefined;

  if (!providerUrl) {
    return { success: false, error: "No AI Provider URL configured" };
  }

  try {
    const startTs = performance.now();

    // Construct OpenAI-compatible payload
    const messages = [];
    if (target.systemPrompt) {
      messages.push({ role: "system", content: target.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const payload = {
      model: target.modelName || "gpt-4o",
      messages,
      temperature: target.temperature ?? 0.7,
      top_p: target.topP ?? 1.0,
      max_tokens: target.maxTokens ?? 1024,
      // Add top_k if supported by provider (OpenAI doesn't standardly support it in top level, but some do)
      // We'll add it if it's set, some providers might ignore it.
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
    // If body is string, try to parse it again just in case invokeAiProvider didn't
    if (typeof parsedResponse === "string") {
      try {
        parsedResponse = JSON.parse(parsedResponse);
      } catch {}
    }

    if (!result.ok) {
      return {
        success: false,
        error: `Provider returned ${result.status}: ${
          result.statusText || "Unknown error"
        }`,
        data: {
          label: target.label,
          modelName: target.modelName || "unknown",
          latencyMs,
          promptTokens: null,
          completionTokens: null,
          totalTokens: null,
          costEstimate: null,
          answer: "",
          responsePayload: parsedResponse,
        },
      };
    }

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

    const extractedAnswer = extractAnswer(
      parsedResponse,
      JSON.stringify(parsedResponse)
    );

    return {
      success: true,
      data: {
        label: target.label,
        modelName:
          extractModel(parsedResponse, target.modelName || "unknown") ||
          target.modelName ||
          "unknown",
        latencyMs,
        promptTokens,
        completionTokens,
        totalTokens,
        costEstimate,
        answer: extractedAnswer,
        responsePayload: parsedResponse,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = QuickRunPayload.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const payload: QuickRunPayloadType = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const settings = await getOrCreateSettings();

    const startedAt = Date.now();

    const results = await runWithConcurrency(
      6, // Max concurrency for quick runs
      payload.targets,
      (target, index) =>
        executeQuickTarget(target, payload.prompt, index, settings)
    );

    const durationMs = Date.now() - startedAt;

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

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[ai-lab-quick-run] POST failed", error);
    return NextResponse.json(
      { error: "Failed to run quick test" },
      { status: 500 }
    );
  }
}
