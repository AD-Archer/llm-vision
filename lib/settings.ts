import type { AppSetting } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SerializableSettings = {
  id: string;
  webhookUrl: string;
  timeoutSeconds: number;
  autoSaveQueries: boolean;
  webhookUsername: string;
  webhookPassword: string;
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
      webhookUsername: process.env.N8N_WEBHOOK_USERNAME ?? null,
      webhookPassword: process.env.N8N_WEBHOOK_PASSWORD ?? null,
      timeoutSeconds: Number(
        process.env.N8N_WEBHOOK_TIMEOUT_MS ??
          process.env.NEXT_PUBLIC_WEBHOOK_TIMEOUT_MS ??
          60
      ),
      autoSaveQueries: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as AppSetting;

    return fallback;
  }
}

export function toSerializableSettings(
  settings: AppSetting
): SerializableSettings {
  return {
    id: settings.id,
    webhookUrl: settings.webhookUrl,
    timeoutSeconds: settings.timeoutSeconds,
    autoSaveQueries: settings.autoSaveQueries,
    webhookUsername: settings.webhookUsername ?? "",
    webhookPassword: settings.webhookPassword ?? "",
  };
}
