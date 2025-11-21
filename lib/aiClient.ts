export type AiInvokeResult = {
  ok: boolean;
  status: number;
  statusText?: string;
  body: unknown;
};

export async function invokeAiProvider(
  providerUrl: string | undefined,
  apiKey: string | undefined,
  payload: unknown,
  headers?: Record<string, string>,
  method: string = "POST",
  timeoutMs: number = 45000
): Promise<AiInvokeResult> {
  if (!providerUrl) {
    throw new Error("AI provider URL is not configured");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const defaultHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    };

    if (apiKey) {
      // Support both 'Bearer <token>' strings or raw tokens
      const cleanKey = apiKey.replace(/^Bearer\s+/i, "").trim();
      defaultHeaders["Authorization"] = `Bearer ${cleanKey}`;
    }

    const response = await fetch(providerUrl, {
      method,
      headers: defaultHeaders,
      signal: controller.signal,
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    clearTimeout(timer);

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: parsed,
    };
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}
