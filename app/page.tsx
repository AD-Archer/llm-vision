"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import ChartRenderer from "../components/ChartRenderer";
import type { ChartType, InsightResponse, QueryRequestBody } from "../types";
import { normalizeInsight, type NormalizedInsight } from "../utils/chartConfig";

const DEFAULT_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ?? "";
const DEFAULT_TIMEOUT_SECONDS = (() => {
  const envValue = process.env.NEXT_PUBLIC_WEBHOOK_TIMEOUT_MS;
  const parsed = Number(envValue);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.round(parsed / 1000);
  }
  return 60;
})();

const SESSION_STORAGE_KEY = "llm-visi-session-id";

const createSessionId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `session-${Math.random().toString(36).slice(2, 11)}`;
};

const extractJsonPayload = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("```")) {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match?.[1]) {
      console.warn("[n8n] Stripped markdown fences from response payload.");
      return match[1];
    }
  }
  return trimmed;
};

const chartTypeOptions: Array<{ value: ChartType; label: string }> = [
  { value: "auto", label: "Let AI decide" },
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "pie", label: "Pie" },
  { value: "scatter", label: "Scatter" },
];

type FetchState = "idle" | "loading" | "success" | "error";

interface SavedItem {
  id: string;
  question: string;
  result: NormalizedInsight;
  timestamp: number;
}

const SAVED_ITEMS_STORAGE_KEY = "llm-visi-saved-items";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [chartType, setChartType] = useState<ChartType>("auto");
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_WEBHOOK_URL);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(
    DEFAULT_TIMEOUT_SECONDS
  );
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window === "undefined") {
      return createSessionId();
    }
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return stored && stored.trim() ? stored : createSessionId();
  });
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<NormalizedInsight | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = window.localStorage.getItem(SAVED_ITEMS_STORAGE_KEY);
    try {
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const disabled = fetchState === "loading";
  const effectiveUrl = webhookUrl.trim() || DEFAULT_WEBHOOK_URL.trim();

  useEffect(() => {
    if (typeof window === "undefined" || !sessionId) return;
    window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SAVED_ITEMS_STORAGE_KEY,
      JSON.stringify(savedItems)
    );
  }, [savedItems]);

  const handleSessionReset = () => {
    setSessionId(createSessionId());
  };

  const handleSaveChart = () => {
    if (!result) return;
    const newItem: SavedItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      question,
      result,
      timestamp: Date.now(),
    };
    setSavedItems((prev) => [newItem, ...prev]);
  };

  const handleLoadSavedItem = (item: SavedItem) => {
    setQuestion(item.question);
    setResult(item.result);
    setFetchState("success");
    setErrorMessage(null);
  };

  const handleDeleteSavedItem = (itemId: string) => {
    setSavedItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!effectiveUrl) {
      setErrorMessage("Provide an n8n webhook URL.");
      return;
    }

    setFetchState("loading");

    const normalizedSession = sessionId.trim() || createSessionId();
    if (!sessionId.trim()) {
      setSessionId(normalizedSession);
    }

    const cleanedQuestion = followUpQuestion.trim() || question.trim();

    const payload: QueryRequestBody = {
      question: cleanedQuestion,
      chartType,
      sessionId: normalizedSession,
      chatInput: cleanedQuestion,
    };
    const timeoutMs = Math.max(5, timeoutSeconds) * 1000;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      console.info("[n8n] Sending request to webhook", {
        url: effectiveUrl,
        payload,
        timeoutMs,
      });

      const response = await fetch(effectiveUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      console.info("[n8n] Webhook response received", {
        status: response.status,
        statusText: response.statusText,
      });

      const text = await response.text();
      console.debug("[n8n] Raw response body", text || "(empty)");

      if (!response.ok) {
        throw new Error(
          `Webhook request failed (${response.status})${
            text ? `: ${text}` : ""
          }`
        );
      }

      const sanitizedBody = extractJsonPayload(text);

      if (!sanitizedBody) {
        throw new Error("Webhook returned an empty response body.");
      }

      let json: InsightResponse;
      try {
        json = JSON.parse(sanitizedBody) as InsightResponse;
      } catch {
        throw new Error(
          "Webhook returned invalid JSON. Check the workflow output."
        );
      }

      const normalized = normalizeInsight(json);
      setResult(normalized);
      setFollowUpQuestion("");
      setFetchState("success");
    } catch (error) {
      window.clearTimeout(timeoutId);
      console.error("[n8n] Webhook request failed", error);
      if (error instanceof DOMException && error.name === "AbortError") {
        setFetchState("error");
        setErrorMessage(
          `Canceled after waiting ${timeoutSeconds} seconds. Increase the timeout or try again.`
        );
        return;
      }
      setFetchState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to contact webhook."
      );
    }
  };

  const resultMeta = useMemo(() => {
    if (!result) return null;
    const meta = result.chart?.meta;
    return {
      title: meta?.title ?? "Visualization",
      description: meta?.description ?? "",
    };
  }, [result]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            LLM Visualization Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Ask your RAG workflow for insights and visualize the answers
          </p>
        </header>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="question"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Ask a question
              </label>
              <textarea
                id="question"
                placeholder="e.g. Show me weekly active users vs signups"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                required
                disabled={disabled}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="chartType"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Preferred chart
                </label>
                <select
                  id="chartType"
                  value={chartType}
                  onChange={(event) =>
                    setChartType(event.target.value as ChartType)
                  }
                  disabled={disabled}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {chartTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <details className="bg-gray-50 rounded-lg p-4">
              <summary className="cursor-pointer font-medium text-gray-700 hover:text-blue-600">
                Developer Tools
              </summary>
              <div className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="webhook"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    n8n webhook URL
                  </label>
                  <input
                    id="webhook"
                    type="url"
                    placeholder="https://example.n8n.cloud/webhook/demo"
                    value={webhookUrl}
                    onChange={(event) => setWebhookUrl(event.target.value)}
                    disabled={disabled}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Leave blank to use `NEXT_PUBLIC_N8N_WEBHOOK_URL`. Request
                    body:{" "}
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {"{ question, chartType, sessionId, chatInput }"}
                    </code>
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="timeout"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Request timeout (seconds)
                  </label>
                  <input
                    id="timeout"
                    type="number"
                    min={5}
                    max={600}
                    step={5}
                    value={timeoutSeconds}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      if (Number.isFinite(nextValue)) {
                        setTimeoutSeconds(
                          Math.max(5, Math.min(600, nextValue))
                        );
                      }
                    }}
                    disabled={disabled}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Increase if your workflow takes longer to respond. Current
                    wait: {timeoutSeconds}s
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="sessionId"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Session ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="sessionId"
                      type="text"
                      value={sessionId}
                      onChange={(event) => setSessionId(event.target.value)}
                      disabled={disabled}
                      placeholder="session-123"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                      onClick={handleSessionReset}
                      disabled={disabled}
                    >
                      New ID
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Persisted locally so your AI memory stays in sync.
                  </p>
                </div>
              </div>
            </details>

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={disabled}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {disabled ? "Contacting webhook…" : "Run workflow"}
              </button>
            </div>
            {errorMessage ? (
              <div className="text-center">
                <p
                  className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3"
                  role="alert"
                >
                  {errorMessage}
                </p>
              </div>
            ) : null}
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          {fetchState === "idle" && (
            <div className="text-center py-12">
              <p className="text-gray-500">Run a workflow to visualize data.</p>
            </div>
          )}
          {fetchState === "loading" && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading…</p>
            </div>
          )}
          {fetchState === "success" && result ? (
            <div className="space-y-6">
              <div>
                {resultMeta?.title ? (
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {resultMeta.title}
                  </h2>
                ) : null}
                {result.insightText ? (
                  <p className="text-gray-700 mb-4">{result.insightText}</p>
                ) : null}
                {resultMeta?.description ? (
                  <p className="text-gray-600">{resultMeta.description}</p>
                ) : null}
              </div>

              {result.chart ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <ChartRenderer config={result.chart} />
                </div>
              ) : (
                <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 mb-2">
                    The workflow response did not include chartable data.
                  </p>
                  <p className="text-yellow-700 text-sm">
                    Ensure your AI returns the JSON schema described in the
                    README, including{" "}
                    <code className="bg-yellow-100 px-2 py-1 rounded text-xs">
                      chart.data
                    </code>{" "}
                    with numeric series.
                  </p>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleSaveChart}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  Save this chart
                </button>
              </div>

              <details className="bg-gray-50 rounded-lg p-4">
                <summary className="cursor-pointer font-medium text-gray-700 hover:text-blue-600">
                  {showRaw ? "Hide raw JSON preview" : "Show raw JSON preview"}
                </summary>
                <pre className="mt-4 bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm">
                  {JSON.stringify(result.raw, null, 2)}
                </pre>
              </details>

              <div className="border-t pt-6">
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label
                      htmlFor="followup"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Ask a follow-up question
                    </label>
                    <textarea
                      id="followup"
                      placeholder="e.g. Show me the same data by region"
                      value={followUpQuestion}
                      onChange={(event) =>
                        setFollowUpQuestion(event.target.value)
                      }
                      disabled={disabled}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="submit"
                      disabled={disabled || !followUpQuestion.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {disabled ? "Loading…" : "Ask follow-up"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
          {fetchState === "error" && !errorMessage && (
            <div className="text-center py-12">
              <p className="text-gray-500">Something went wrong. Try again.</p>
            </div>
          )}
        </div>

        {savedItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Saved Charts
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {savedItems.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {item.result.chart?.meta?.title || "Untitled"}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {item.question}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {new Date(item.timestamp).toLocaleDateString()} at{" "}
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadSavedItem(item)}
                      disabled={disabled}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSavedItem(item.id)}
                      disabled={disabled}
                      className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
