import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSettings } from "@/lib/settings";

export async function POST(request: NextRequest) {
  try {
    const settings = await getOrCreateSettings();

    const webhookUrl = settings.promptHelperWebhookUrl?.trim();
    // Support fallback to a directly-configured AI provider via settings or env
    const aiProviderUrl =
      settings.aiProviderUrl ?? process.env.AI_PROVIDER_URL ?? undefined;
    const aiProviderApiKey =
      settings.aiProviderApiKey ?? process.env.AI_PROVIDER_API_KEY ?? undefined;
    const targetUrl = aiProviderUrl ?? webhookUrl;
    if (!targetUrl) {
      return NextResponse.json(
        { error: "Prompt helper webhook URL or AI provider not configured" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(targetUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook / AI provider URL configured" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (settings.promptHelperHeaders) {
      Object.assign(headers, settings.promptHelperHeaders);
    }

    // Add basic auth if provided
    if (settings.promptHelperUsername && settings.promptHelperPassword) {
      const auth = btoa(
        `${settings.promptHelperUsername}:${settings.promptHelperPassword}`
      );
      headers.Authorization = `Basic ${auth}`;
    }

    // Build headers for target call
    const effectiveHeaders = { ...headers } as Record<string, string>;
    // If AI provider API key is configured in settings, use it; otherwise fall back to env var
    if (aiProviderApiKey) {
      effectiveHeaders.Authorization = aiProviderApiKey.startsWith("Bearer ")
        ? aiProviderApiKey
        : `Bearer ${aiProviderApiKey}`;
    }

    // Forward the request to the external webhook or AI provider
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: effectiveHeaders,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Webhook responded with ${response.status}: ${response.statusText}`,
        },
        { status: response.status }
      );
    }

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
    console.error("Prompt helper proxy error:", error);
    return NextResponse.json(
      { error: "Failed to proxy request to prompt helper webhook" },
      { status: 500 }
    );
  }
}
