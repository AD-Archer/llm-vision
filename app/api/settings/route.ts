import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateSettings, toSerializableSettings } from "@/lib/settings";

const SettingsPayload = z.object({
  webhookUrl: z.string().trim().optional(),
  timeoutSeconds: z.coerce.number().int().min(60).max(3600).optional(),
  timeoutEnabled: z.boolean().optional(),
  autoSaveQueries: z.boolean().optional(),
  webhookUsername: z.string().nullable().optional(),
  webhookPassword: z.string().nullable().optional(),
  webhookHeaders: z
    .union([z.record(z.string(), z.string()), z.null()])
    .optional(),
  promptHelperWebhookUrl: z.string().trim().or(z.literal("")).optional(),
  promptHelperUsername: z.string().nullable().optional(),
  promptHelperPassword: z.string().nullable().optional(),
  promptHelperHeaders: z
    .union([z.record(z.string(), z.string()), z.null()])
    .optional(),
  aiProviderUrl: z.string().trim().optional(),
  aiProviderApiKey: z.string().nullable().optional(),
  userId: z.string(), // Add userId for admin check
});

export async function GET() {
  const settings = await getOrCreateSettings();
  return NextResponse.json(toSerializableSettings(settings));
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = SettingsPayload.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // Validate webhookUrl format if provided and not empty
    if (parsed.data.webhookUrl && parsed.data.webhookUrl.trim() !== "") {
      try {
        new URL(parsed.data.webhookUrl);
      } catch {
        return NextResponse.json(
          { error: "Invalid webhookUrl format. Must be a valid URL." },
          { status: 400 }
        );
      }
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId, ...updateData } = parsed.data;

    const normalizedData: Record<string, unknown> = {};

    // Only include fields that were provided
    console.log("[settings] Received updateData:", updateData);
    if (updateData.webhookUrl !== undefined) {
      normalizedData.webhookUrl = updateData.webhookUrl?.trim() || "";
    }
    if (updateData.webhookUsername !== undefined) {
      normalizedData.webhookUsername =
        updateData.webhookUsername?.trim() || null;
    }
    if (updateData.webhookPassword !== undefined) {
      normalizedData.webhookPassword =
        updateData.webhookPassword?.trim() || null;
    }
    if (updateData.timeoutSeconds !== undefined) {
      normalizedData.timeoutSeconds = updateData.timeoutSeconds;
    }
    if (updateData.timeoutEnabled !== undefined) {
      normalizedData.timeoutEnabled = updateData.timeoutEnabled;
    }
    if (updateData.autoSaveQueries !== undefined) {
      normalizedData.autoSaveQueries = updateData.autoSaveQueries;
    }
    if (updateData.promptHelperWebhookUrl !== undefined) {
      normalizedData.promptHelperWebhookUrl =
        updateData.promptHelperWebhookUrl?.trim() || "";
    }
    if (updateData.promptHelperUsername !== undefined) {
      normalizedData.promptHelperUsername =
        updateData.promptHelperUsername?.trim() || null;
    }
    if (updateData.promptHelperPassword !== undefined) {
      normalizedData.promptHelperPassword =
        updateData.promptHelperPassword?.trim() || null;
    }
    if (updateData.webhookHeaders !== undefined) {
      normalizedData.webhookHeaders = updateData.webhookHeaders;
    }
    if (updateData.promptHelperHeaders !== undefined) {
      normalizedData.promptHelperHeaders = updateData.promptHelperHeaders;
    }
    if (updateData.aiProviderUrl !== undefined) {
      normalizedData.aiProviderUrl = updateData.aiProviderUrl?.trim() || "";
    }
    if (updateData.aiProviderApiKey !== undefined) {
      normalizedData.aiProviderApiKey =
        updateData.aiProviderApiKey?.trim() || null;
    }
    if (updateData.aiProviderUrl !== undefined) {
      normalizedData.aiProviderUrl = updateData.aiProviderUrl?.trim() || "";
    }
    if (updateData.aiProviderApiKey !== undefined) {
      normalizedData.aiProviderApiKey =
        updateData.aiProviderApiKey?.trim() || null;
    }

    // Update settings
    console.log("[settings] Normalized data:", normalizedData);
    let settings;
    try {
      const existing = await getOrCreateSettings();
      settings = await prisma.appSetting.update({
        where: { id: existing.id },
        data: normalizedData,
      });
    } catch {
      // If update fails, create new
      settings = await prisma.appSetting.create({
        data: normalizedData,
      });
    }

    return NextResponse.json(toSerializableSettings(settings));
  } catch (error) {
    console.error("[settings] Failed to update settings", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to update settings: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = SettingsPayload.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // Validate webhookUrl format if provided and not empty
    if (parsed.data.webhookUrl && parsed.data.webhookUrl.trim() !== "") {
      try {
        new URL(parsed.data.webhookUrl);
      } catch {
        return NextResponse.json(
          { error: "Invalid webhookUrl format. Must be a valid URL." },
          { status: 400 }
        );
      }
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId, ...updateData } = parsed.data;

    const normalizedData: Record<string, unknown> = {};

    // Only include fields that were provided
    if (updateData.webhookUrl !== undefined) {
      normalizedData.webhookUrl = updateData.webhookUrl?.trim() || "";
    }
    if (updateData.webhookUsername !== undefined) {
      normalizedData.webhookUsername =
        updateData.webhookUsername?.trim() || null;
    }
    if (updateData.webhookPassword !== undefined) {
      normalizedData.webhookPassword =
        updateData.webhookPassword?.trim() || null;
    }
    if (updateData.timeoutSeconds !== undefined) {
      normalizedData.timeoutSeconds = updateData.timeoutSeconds;
    }
    if (updateData.timeoutEnabled !== undefined) {
      normalizedData.timeoutEnabled = updateData.timeoutEnabled;
    }
    if (updateData.autoSaveQueries !== undefined) {
      normalizedData.autoSaveQueries = updateData.autoSaveQueries;
    }
    if (updateData.promptHelperWebhookUrl !== undefined) {
      normalizedData.promptHelperWebhookUrl =
        updateData.promptHelperWebhookUrl?.trim() || "";
    }
    if (updateData.promptHelperUsername !== undefined) {
      normalizedData.promptHelperUsername =
        updateData.promptHelperUsername?.trim() || null;
    }
    if (updateData.promptHelperPassword !== undefined) {
      normalizedData.promptHelperPassword =
        updateData.promptHelperPassword?.trim() || null;
    }
    if (updateData.webhookHeaders !== undefined) {
      normalizedData.webhookHeaders = updateData.webhookHeaders;
    }
    if (updateData.promptHelperHeaders !== undefined) {
      normalizedData.promptHelperHeaders = updateData.promptHelperHeaders;
    }

    // Try to find existing settings, create if not found
    console.log("[settings] Received createData:", updateData);
    console.log("[settings] Normalized createData:", normalizedData);
    let settings;
    try {
      settings = await getOrCreateSettings();
      settings = await prisma.appSetting.update({
        where: { id: settings.id },
        data: normalizedData,
      });
    } catch {
      // If update fails (maybe no existing settings), create new
      settings = await prisma.appSetting.create({
        data: normalizedData,
      });
    }

    return NextResponse.json(toSerializableSettings(settings));
  } catch (error) {
    console.error("[settings] Failed to save settings", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
