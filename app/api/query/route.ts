import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSettings } from "@/lib/settings";

export const runtime = "nodejs";

const MIN_TIMEOUT_SECONDS = 5;
const MAX_TIMEOUT_SECONDS = 600;

const logCurlCommand = (
  url: string,
  method: string,
  headers: Headers,
  body: unknown
) => {
  console.log("\n--- Outgoing Request Debug ---");
  let curl = `curl -X ${method} "${url}"`;

  headers.forEach((value, key) => {
    if (key.toLowerCase() === "authorization") {
      // Mask part of the token for security in logs
      const maskedValue =
        value.length > 20 ? `${value.substring(0, 15)}...` : "*****";
      curl += ` \\\n  -H "${key}: ${maskedValue}"`;
    } else {
      curl += ` \\\n  -H "${key}: ${value}"`;
    }
  });

  if (body) {
    try {
      curl += ` \\\n  -d '${JSON.stringify(body, null, 2)}'`;
    } catch {
      curl += ` \\\n  -d '[Unserializable Body]'`;
    }
  }

  console.log(curl);
  console.log("------------------------------\n");
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

  // Only use AI Provider URL
  const targetUrl = (settings.aiProviderUrl ?? "").trim();
  const aiProviderKey =
    settings.aiProviderApiKey ?? process.env.AI_PROVIDER_API_KEY ?? undefined;

  if (!targetUrl) {
    return NextResponse.json(
      { error: "AI provider URL has not been configured." },
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

    // Set Authorization header for AI provider
    if (aiProviderKey) {
      const cleanKey = aiProviderKey.replace(/^Bearer\s+/i, "").trim();
      headers.set("Authorization", `Bearer ${cleanKey}`);
    }

    // Construct payload for AI provider (OpenAI Chat Completions format)
    const inputPayload = payload as Record<string, unknown>;
    const userMessage = (inputPayload.question ||
      inputPayload.chatInput ||
      "") as string;

    const messages = [];

    // Add system prompt if configured
    // if (settings.aiSystemPrompt) {
    //   messages.push({
    //     role: "system",
    //     content: settings.aiSystemPrompt,
    //   });
    // }

    // Add user message
    messages.push({
      role: "user",
      content: userMessage,
    });

    const modifiedPayload: Record<string, unknown> = {
      messages,
      // AI Generation Parameters
      temperature: settings.aiTemperature ?? 0.7,
      top_p: settings.aiTopP ?? 1.0,
      max_tokens: settings.aiMaxTokens ?? 4096,
      stream: settings.aiStream ?? false,
    };

    // Add optional parameters if they are set
    if (settings.aiFrequencyPenalty)
      modifiedPayload.frequency_penalty = settings.aiFrequencyPenalty;
    if (settings.aiPresencePenalty)
      modifiedPayload.presence_penalty = settings.aiPresencePenalty;
    if (settings.aiStop) modifiedPayload.stop = settings.aiStop;

    if (settings.aiDisableTokenCount) {
      modifiedPayload.stream_options = { include_usage: false };
    } else if (settings.aiStreamOptions) {
      modifiedPayload.stream_options = settings.aiStreamOptions;
    }

    // Log the request before sending
    logCurlCommand(targetUrl, "POST", headers, modifiedPayload);

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(modifiedPayload),
      signal: controller.signal,
    });
    const rawBody = await response.text();

    // Log response for debugging
    console.log(`[query] Response status: ${response.status}`);
    if (!response.ok) {
      console.log(`[query] Error response body: ${rawBody}`);
    }

    // If dual-step is enabled (and configured), perform a second request to structure JSON
    if (
      aiProviderKey &&
      rawBody &&
      !response.headers.get("content-type")?.includes("text/event-stream")
    ) {
      try {
        // Extract content from the first response if it's in OpenAI format
        let contentToStructure = rawBody;
        try {
          const jsonResponse = JSON.parse(rawBody);
          if (
            jsonResponse.choices &&
            jsonResponse.choices[0]?.message?.content
          ) {
            contentToStructure = jsonResponse.choices[0].message.content;
          }
        } catch {
          // If parsing fails, use raw body
        }

        // const defaultStructuringPrompt = `You are a Data Visualization Expert and JSON formatter. You will receive a raw text response from another AI assistant. Your task is to analyze this text, extract the key data points, and structure them into a JSON format suitable for frontend visualization. You must determine the best way to visualize this data (e.g., bar chart, line chart, etc.) and populate the JSON accordingly.

        // Convert the input into the following strict JSON schema without additional commentary or explanation:
        // {
        //   "insight": string, // A brief summary or insight derived from the data
        //   "chart": {
        //     "type": "auto" | "bar" | "line" | "area" | "pie" | "scatter",
        //     "xKey": string, // The key in the data objects to use for the X-axis (categories/time)
        //     "yKeys": string[], // The keys in the data objects to use for the Y-axis (values)
        //     "meta": { "title"?: string, "description"?: string, "visualizationName"?: string },
        //     "data": Array<Record<string, string | number | boolean | null>> // The actual data points extracted from the text
        //   },
        //   "data"?: Array<Record<string, string | number | boolean | null>> // Optional: raw tabular data if different from chart data
        // }
        // Please ensure all keys appear exactly as above. If any fields are missing, infer sensible defaults and keep arrays of at least three rows where possible.`;

        const step2Messages = [
          // {
          //   role: "system",
          //   content: defaultStructuringPrompt,
          // },
          {
            role: "user",
            content: `Here is the raw text to structure:\n\n${contentToStructure}`,
          },
        ];

        const step2Payload: Record<string, unknown> = {
          messages: step2Messages,
          temperature: 0.2, // Lower temperature for structured output
          stream: false,
        };

        // If the user has asked to disable token counting, retain the stream options
        if (settings.aiDisableTokenCount) {
          step2Payload.stream_options = { include_usage: false };
        }

        // Log the step 2 request
        logCurlCommand(targetUrl, "POST (Step 2)", headers, step2Payload);

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

          // Handle OpenAI format for step 2 response
          if (
            jsonResponse.choices &&
            jsonResponse.choices[0]?.message?.content
          ) {
            // If the provider returned OpenAI format, we need to extract the content string
            // which should be our JSON structure
            try {
              const innerContent = JSON.parse(
                jsonResponse.choices[0].message.content
              );
              // Add debug info to the inner content
              innerContent._debug_step1_response = rawBody;
              finalResponseBody = JSON.stringify(innerContent);
            } catch {
              // If inner content isn't valid JSON, just return the outer structure but add debug
              jsonResponse._debug_step1_response = rawBody;
              finalResponseBody = JSON.stringify(jsonResponse);
            }
          } else {
            // Direct JSON response (not wrapped in choices)
            jsonResponse._debug_step1_response = rawBody;
            finalResponseBody = JSON.stringify(jsonResponse);
          }
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
