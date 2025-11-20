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

    // Modify payload to include AI settings when using AI provider
    let modifiedPayload = payload;
    if (aiProviderKey && targetUrl === (settings.aiProviderUrl ?? "").trim()) {
      modifiedPayload = {
        ...(payload as Record<string, unknown>),
        // AI Generation Parameters
        temperature: settings.aiTemperature ?? 0.7,
        top_p: settings.aiTopP ?? 1.0,
        max_tokens: settings.aiMaxTokens ?? 4096,
        stream: settings.aiStream ?? false,
        // Retrieval settings
        k: settings.aiK ?? 5,
        retrieval_method: settings.aiRetrievalMethod ?? "none",
        // Penalties
        frequency_penalty: settings.aiFrequencyPenalty ?? 0.0,
        presence_penalty: settings.aiPresencePenalty ?? 0.0,
        // System prompts
        system: settings.aiSystemPrompt || undefined,
        // Stream options - disable usage if token count is disabled
        stream_options: settings.aiDisableTokenCount
          ? { include_usage: false }
          : settings.aiStreamOptions ?? undefined,
        // Other settings
        stop: settings.aiStop ?? undefined,
      };
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(modifiedPayload),
      signal: controller.signal,
    });
    const rawBody = await response.text();
    // If dual-step is enabled (and configured), perform a second request to structure JSON
    if (
      aiProviderKey &&
      rawBody &&
      !response.headers.get("content-type")?.includes("text/event-stream")
    ) {
      try {
        const defaultStructuringPrompt = `You are a Data Visualization Expert and JSON formatter. You will receive a raw text response from another AI assistant in the field 'original_ai_response'. Your task is to analyze this text, extract the key data points, and structure them into a JSON format suitable for frontend visualization. You must determine the best way to visualize this data (e.g., bar chart, line chart, etc.) and populate the JSON accordingly.

Convert the input into the following strict JSON schema without additional commentary or explanation:
{
  "insight": string, // A brief summary or insight derived from the data
  "chart": {
    "type": "auto" | "bar" | "line" | "area" | "pie" | "scatter",
    "xKey": string, // The key in the data objects to use for the X-axis (categories/time)
    "yKeys": string[], // The keys in the data objects to use for the Y-axis (values)
    "meta": { "title"?: string, "description"?: string, "visualizationName"?: string },
    "data": Array<Record<string, string | number | boolean | null>> // The actual data points extracted from the text
  },
  "data"?: Array<Record<string, string | number | boolean | null>> // Optional: raw tabular data if different from chart data
}
Please ensure all keys appear exactly as above. If any fields are missing, infer sensible defaults and keep arrays of at least three rows where possible.`;

        const step2Payload: Record<string, unknown> = {
          ...(modifiedPayload as Record<string, unknown>),
          // ensure the system prompt instructs the model to transform output to JSON
          system: defaultStructuringPrompt,
          // include the raw AI response from step 1 as input for transformation
          original_ai_response: rawBody,
          // disable streaming for second step unless explicitly requested
          stream: false,
        };

        // If the user has asked to disable token counting, retain the stream options
        if (settings.aiDisableTokenCount) {
          step2Payload.stream_options = (
            modifiedPayload as Record<string, unknown>
          ).stream_options;
        }

        const step2Response = await fetch(targetUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(step2Payload),
          signal: controller.signal,
        });

        const step2ContentType = step2Response.headers.get("content-type");
        const step2Text = await step2Response.text();

        // Inject the original AI response for debugging purposes (admin only feature on frontend)
        let finalResponseBody = step2Text;
        try {
          const jsonResponse = JSON.parse(step2Text);
          // Add the original response as a hidden field
          jsonResponse._debug_step1_response = rawBody;
          finalResponseBody = JSON.stringify(jsonResponse);
        } catch (e) {
          console.warn(
            "[query] Failed to inject debug info into step 2 response",
            e
          );
        }

        return new NextResponse(finalResponseBody, {
          status: step2Response.status,
          headers: { "Content-Type": step2ContentType ?? "application/json" },
        });
      } catch (err) {
        console.error(
          "[query] Dual-step structuring failed, returning first response:",
          err
        );
        // Fallthrough to return original rawBody
      }
    }

    return new NextResponse(rawBody, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return NextResponse.json(
        { error: "Webhook request timed out" },
        { status: 504 }
      );
    }
    console.error("[query] Failed to reach webhook", error);
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
