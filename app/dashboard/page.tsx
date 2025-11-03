"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import ChartRenderer from "../../components/ChartRenderer";
import type { ChartType, InsightResponse, QueryRequestBody } from "../../types";
import {
  normalizeInsight,
  type NormalizedInsight,
} from "../../utils/chartConfig";
import { useSettings } from "../../context/SettingsContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";

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
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
}

const SAVED_ITEMS_STORAGE_KEY = "llm-visi-saved-items";

function DashboardContent() {
  const { settings } = useSettings();
  const [question, setQuestion] = useState("");
  const [chartType, setChartType] = useState<ChartType>("auto");
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
  const [updatingQueryId, setUpdatingQueryId] = useState<string | null>(null);
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
  const webhookUrl = settings.webhookUrl;
  const timeoutSeconds = settings.timeoutSeconds;
  const effectiveUrl = webhookUrl.trim();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Check if we're updating a query
    const updatePayload = sessionStorage.getItem("update-query");
    if (updatePayload) {
      try {
        const { id, question: updateQuestion } = JSON.parse(updatePayload);
        setQuestion(updateQuestion);
        setUpdatingQueryId(id);
        sessionStorage.removeItem("update-query");
      } catch (e) {
        console.error("Failed to parse update payload", e);
      }
    }
  }, []);

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
    const now = Date.now();

    if (updatingQueryId) {
      // Update existing query
      setSavedItems((prev) =>
        prev.map((item) =>
          item.id === updatingQueryId
            ? {
                ...item,
                result,
                question,
                updatedAt: now,
              }
            : item
        )
      );
      setUpdatingQueryId(null);
    } else {
      // Save new query
      const newItem: SavedItem = {
        id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
        question,
        result,
        createdAt: now,
        updatedAt: now,
        isFavorite: false,
      };
      setSavedItems((prev) => [newItem, ...prev]);
    }
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
      setErrorMessage("Provide an n8n webhook URL in settings.");
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
          `Canceled after waiting ${timeoutSeconds} seconds. Increase the timeout in settings or try again.`
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <header className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2 px-2">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-slate-400 px-2">
            Ask your RAG workflow for insights and visualize the answers
          </p>
        </header>

        <div className="bg-slate-800 rounded-lg sm:rounded-xl border border-slate-700 shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="question"
                className="block text-xs sm:text-sm font-medium text-slate-300 mb-2"
              >
                Ask a question
              </label>
              <textarea
                id="question"
                placeholder="e.g. Show me how many students we had enrolled before July 2025"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                required
                disabled={disabled}
                rows={3}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label
                  htmlFor="chartType"
                  className="block text-xs sm:text-sm font-medium text-slate-300 mb-2"
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
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {chartTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <details className="bg-slate-700 rounded-lg p-4 border border-slate-600">
              <summary className="cursor-pointer font-medium text-slate-300 hover:text-blue-400">
                Advanced Settings
              </summary>
              <div className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="sessionId"
                    className="block text-xs sm:text-sm font-medium text-slate-300 mb-2"
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
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-slate-600 border border-slate-500 text-white placeholder-slate-400 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      className="px-3 sm:px-4 py-2 sm:py-3 bg-slate-600 hover:bg-slate-500 text-slate-300 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors whitespace-nowrap"
                      onClick={handleSessionReset}
                      disabled={disabled}
                    >
                      New ID
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Persisted locally so your AI memory stays in sync.
                  </p>
                </div>
              </div>
            </details>

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={disabled || !effectiveUrl}
                className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm sm:text-base font-medium rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {disabled ? "Contacting webhook…" : "Run workflow"}
              </button>
            </div>
            {errorMessage ? (
              <div className="text-center">
                <p
                  className="text-red-400 bg-red-900/20 border border-red-700 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm"
                  role="alert"
                >
                  {errorMessage}
                </p>
              </div>
            ) : null}
          </form>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-6 mb-6">
          {fetchState === "idle" && (
            <div className="text-center py-12">
              <p className="text-slate-400">
                Run a workflow to visualize data.
              </p>
            </div>
          )}
          {fetchState === "loading" && (
            <div className="text-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-10 sm:h-12 w-10 sm:w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-400 text-sm sm:text-base">Loading…</p>
            </div>
          )}
          {fetchState === "success" && result ? (
            <div className="space-y-4 sm:space-y-6">
              <div className="px-2 sm:px-0">
                {resultMeta?.title ? (
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                    {resultMeta.title}
                  </h2>
                ) : null}
                {result.insightText ? (
                  <p className="text-slate-300 mb-4 text-sm sm:text-base">
                    {result.insightText}
                  </p>
                ) : null}
                {resultMeta?.description ? (
                  <p className="text-slate-400 text-sm sm:text-base">
                    {resultMeta.description}
                  </p>
                ) : null}
              </div>

              {result.chart ? (
                <div className="bg-slate-900 rounded-lg p-2 sm:p-4 border border-slate-700 overflow-x-auto">
                  <ChartRenderer config={result.chart} />
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8 bg-yellow-900/20 border border-yellow-700 rounded-lg px-3 sm:px-0">
                  <p className="text-yellow-400 mb-2 text-sm sm:text-base">
                    The workflow response did not include chartable data.
                  </p>
                  <p className="text-yellow-500 text-xs sm:text-sm">
                    Ensure your AI returns the JSON schema described in the
                    README, including{" "}
                    <code className="bg-yellow-900/30 px-2 py-1 rounded text-xs">
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
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base rounded-lg focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  {updatingQueryId ? "✨ Update Query" : "💾 Save this query"}
                </button>
              </div>

              <details className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                <summary className="cursor-pointer font-medium text-slate-300 hover:text-blue-400">
                  {showRaw ? "Hide raw JSON preview" : "Show raw JSON preview"}
                </summary>
                <pre className="mt-4 bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto text-sm border border-slate-600">
                  {JSON.stringify(result.raw, null, 2)}
                </pre>
              </details>

              <div className="border-t border-slate-700 pt-6">
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label
                      htmlFor="followup"
                      className="block text-sm font-medium text-slate-300 mb-2"
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
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="submit"
                      disabled={disabled || !followUpQuestion.trim()}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              <p className="text-slate-400">Something went wrong. Try again.</p>
            </div>
          )}
        </div>

        {savedItems.length > 0 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">
              Recent Queries
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {savedItems.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-700 border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors"
                >
                  <div className="mb-3">
                    <h3 className="font-semibold text-white mb-1">
                      {item.result.chart?.meta?.title || "Untitled"}
                    </h3>
                    <p className="text-slate-300 text-sm mb-2 line-clamp-2">
                      {item.question}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {new Date(item.updatedAt).toLocaleDateString()} at{" "}
                      {new Date(item.updatedAt).toLocaleTimeString([], {
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
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors disabled:opacity-50"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSavedItem(item.id)}
                      disabled={disabled}
                      className="px-3 py-2 bg-red-900/30 hover:bg-red-900/40 text-red-400 text-sm rounded border border-red-700 transition-colors disabled:opacity-50"
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

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
