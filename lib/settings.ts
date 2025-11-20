import type { AppSetting } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SerializableSettings = {
  id: string;
  webhookUrl: string;
  aiProviderUrl?: string;
  aiProviderApiKey?: string;
  timeoutSeconds: number;
  timeoutEnabled: boolean;
  autoSaveQueries: boolean;
  webhookUsername: string;
  webhookPassword: string;
  webhookHeaders: Record<string, string> | null;
  promptHelperWebhookUrl: string;
  promptHelperUsername: string;
  promptHelperPassword: string;
  promptHelperHeaders: Record<string, string> | null;
};

export async function getOrCreateSettings(): Promise<AppSetting> {
  try {
    const existing = await prisma.appSetting.findFirst();
    if (existing) {
      return existing;
    }

    return prisma.appSetting.create({
      data: {},
    });
  } catch (error) {
    // If Prisma cannot initialize (database unreachable) return a sensible
    // in-memory fallback so the API doesn't return 500 for the whole app.
    // We still surface the error in the server logs so it can be fixed.
    // Use environment variables when available so local development can
    // continue without a running database.
    console.error(
      "prisma: failed to access database, returning fallback settings:",
      error
    );

    const fallback: AppSetting = {
      id: "fallback",
      webhookUrl: process.env.N8N_WEBHOOK_URL ?? "",
      aiProviderUrl: process.env.AI_PROVIDER_URL ?? undefined,
      aiProviderApiKey: process.env.AI_PROVIDER_API_KEY ?? undefined,
      webhookUsername: process.env.N8N_WEBHOOK_USERNAME ?? null,
      webhookPassword: process.env.N8N_WEBHOOK_PASSWORD ?? null,
      webhookHeaders: null,
      promptHelperWebhookUrl: "",
      promptHelperUsername: null,
      promptHelperPassword: null,
      promptHelperHeaders: null,
      timeoutSeconds: Number(
        process.env.N8N_WEBHOOK_TIMEOUT_MS ??
          process.env.NEXT_PUBLIC_WEBHOOK_TIMEOUT_MS ??
          60
      ),
      timeoutEnabled: false,
      autoSaveQueries: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as AppSetting;

    return fallback;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSerializableSettings(
  settings: unknown
): SerializableSettings {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = settings as any;
  return {
    id: s.id,
    webhookUrl: s.webhookUrl,
    aiProviderUrl: s.aiProviderUrl ?? undefined,
    aiProviderApiKey: s.aiProviderApiKey ?? undefined,
    timeoutSeconds: s.timeoutSeconds,
    timeoutEnabled: s.timeoutEnabled ?? false,
    autoSaveQueries: s.autoSaveQueries,
    webhookUsername: s.webhookUsername ?? "",
    webhookPassword: s.webhookPassword ?? "",
    webhookHeaders: s.webhookHeaders ?? null,
    promptHelperWebhookUrl: s.promptHelperWebhookUrl ?? "",
    promptHelperUsername: s.promptHelperUsername ?? "",
    promptHelperPassword: s.promptHelperPassword ?? "",
    promptHelperHeaders: s.promptHelperHeaders ?? null,
  };
}
