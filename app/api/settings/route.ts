import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateSettings, toSerializableSettings } from "@/lib/settings";

const SettingsPayload = z.object({
  webhookUrl: z.string().trim().url().or(z.literal("")),
  timeoutSeconds: z.coerce.number().int().min(60).max(3600),
  timeoutEnabled: z.boolean(),
  autoSaveQueries: z.boolean(),
  webhookUsername: z.string().optional(),
  webhookPassword: z.string().optional(),
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

    const normalizedData = {
      ...updateData,
      webhookUsername: updateData.webhookUsername?.trim() || null,
      webhookPassword: updateData.webhookPassword?.trim() || null,
    };

    // Update settings
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
    return NextResponse.json(
      { error: "Failed to update settings" },
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

    const normalizedData = {
      ...updateData,
      webhookUsername: updateData.webhookUsername?.trim() || null,
      webhookPassword: updateData.webhookPassword?.trim() || null,
    };

    // Try to find existing settings, create if not found
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
