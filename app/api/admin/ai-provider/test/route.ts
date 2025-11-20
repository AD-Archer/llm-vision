import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSettings } from "@/lib/settings";
import { invokeAiProvider } from "@/lib/aiClient";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;
    if (!userId)
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isAdmin)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const settings = await getOrCreateSettings();
    const aiProviderUrl =
      settings.aiProviderUrl ?? process.env.AI_PROVIDER_URL ?? undefined;
    const aiProviderApiKey =
      settings.aiProviderApiKey ?? process.env.AI_PROVIDER_API_KEY ?? undefined;

    if (!aiProviderUrl)
      return NextResponse.json(
        { error: "No AI provider configured" },
        { status: 400 }
      );

    // Try a minimal validation call
    try {
      const res = await invokeAiProvider(
        aiProviderUrl,
        aiProviderApiKey,
        { prompt: "Hello" },
        undefined,
        "POST",
        5000
      );
      return NextResponse.json(
        { ok: res.ok, status: res.status, body: res.body },
        { status: 200 }
      );
    } catch (error) {
      console.error("AI provider test failed:", error);
      return NextResponse.json(
        { error: "Failed to contact AI provider" },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("AI provider test error:", error);
    return NextResponse.json(
      { error: "Failed to test AI provider" },
      { status: 500 }
    );
  }
}
