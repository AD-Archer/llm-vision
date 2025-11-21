import { NextRequest, NextResponse } from "next/server";
import { getOrCreateSettings } from "@/lib/settings";

export const runtime = "nodejs";

const MIN_TIMEOUT_SECONDS = 5;
const MAX_TIMEOUT_SECONDS = 600;

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

    // const defaultHelperSystem =
    //   "You are a PROMPT HELPER ONLY. You do NOT analyze data, generate charts, create visualizations, or return JSON. Your ONLY job is to help users improve their data analysis prompts by suggesting better wording, adding clarity, and making them more specific. Respond with markdown-formatted suggestions. Do not include any code, SQL queries, or data in your response. Focus solely on rephrasing and improving the user's question.";

    const messages = [
      // {
      //   role: "system",
      //   content: settings.aiHelperSystemPrompt?.trim() || defaultHelperSystem,
      // },
      {
        role: "user",
        content: userMessage,
      },
    ];

    const modifiedPayload = {
      messages,
      temperature: 0.7, // Default temperature for helper
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
      // For regular responses, parse the JSON and extract the content
      const responseText = await response.text();
      let finalContent = responseText;

      try {
        const jsonResponse = JSON.parse(responseText);
        // Check for OpenAI format
        if (jsonResponse.choices && jsonResponse.choices[0]?.message?.content) {
          finalContent = jsonResponse.choices[0].message.content;
        }
      } catch (e) {
        // If parsing fails, return the original text
        console.warn("Failed to parse AI response as JSON:", e);
      }

      return new NextResponse(finalContent, {
        status: response.status,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
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
