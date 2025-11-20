import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSettings } from "@/lib/settings";

export const runtime = "nodejs";

const MIN_TIMEOUT_SECONDS = 5;
const MAX_TIMEOUT_SECONDS = 600;

const formatAuthHeader = (
  username?: string | null,
  password?: string | null
) => {
  if (!username || !password) {
    return null;
  }
  const credentials = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${credentials}`;
};

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const settings = await getOrCreateSettings();

  const targetUrl =
    (settings.webhookUrl ?? "").trim() || (settings.aiProviderUrl ?? "").trim();
  const aiProviderKey =
    settings.aiProviderApiKey ?? process.env.AI_PROVIDER_API_KEY ?? undefined;
  if (!targetUrl) {
    return NextResponse.json(
      { error: "No webhook or AI provider URL has been configured yet." },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  let timeoutId: NodeJS.Timeout | null = null;

  if (settings.timeoutEnabled) {
    const timeoutSeconds = Math.min(
      MAX_TIMEOUT_SECONDS,
      Math.max(MIN_TIMEOUT_SECONDS, settings.timeoutSeconds)
    );
    timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
  }

  try {
    const headers = new Headers({ "Content-Type": "application/json" });
    const authHeader = formatAuthHeader(
      settings.webhookUsername,
      settings.webhookPassword
    );
    if (authHeader) {
      headers.set("Authorization", authHeader);
    }
    // If AI provider key is configured and we're using the provider URL, set Authorization header
    if (aiProviderKey && targetUrl === (settings.aiProviderUrl ?? "").trim()) {
      headers.set(
        "Authorization",
        aiProviderKey.startsWith("Bearer ")
          ? aiProviderKey
          : `Bearer ${aiProviderKey}`
      );
    }

    // Modify payload to include system prompt for prompt helper
    const modifiedPayload = {
      ...(payload as Record<string, unknown>),
      system:
        "You are a PROMPT HELPER ONLY. You do NOT analyze data, generate charts, create visualizations, or return JSON. Your ONLY job is to help users improve their data analysis prompts by suggesting better wording, adding clarity, and making them more specific. Respond with plain text or markdown-formatted suggestions. Do not include any code, SQL queries, or data in your response. Focus solely on rephrasing and improving the user's question.",
    };

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(modifiedPayload),
      signal: controller.signal,
    });

    // Get the response content type
    const contentType = response.headers.get("content-type");

    // For streaming responses, we need to proxy the stream
    if (
      contentType?.includes("text/plain") ||
      contentType?.includes("text/event-stream")
    ) {
      // Create a new response with the same headers
      const proxyResponse = new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });

      return proxyResponse;
    } else {
      // For regular responses, return the text
      const responseText = await response.text();
      return new NextResponse(responseText, {
        status: response.status,
        headers: {
          "Content-Type": contentType || "application/json",
        },
      });
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return NextResponse.json(
        { error: "Webhook request timed out" },
        { status: 504 }
      );
    }
    console.error("Prompt helper proxy error:", error);
    return NextResponse.json(
      { error: "Failed to reach webhook" },
      { status: 502 }
    );
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
