"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { ChartType, InsightResponse, QueryRequestBody } from "../../types";
import {
  normalizeInsight,
  type NormalizedInsight,
} from "../../utils/chartConfig";
import { useSettings } from "../../context/SettingsContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { QueryForm } from "./components/QueryForm";
import { AdvancedSettings } from "./components/AdvancedSettings";
import { ResultDisplay } from "./components/ResultDisplay";
import { FollowUpForm } from "./components/FollowUpForm";
import { SavedQueriesList } from "./components/SavedQueriesList";

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

type FetchState = "idle" | "loading" | "success" | "error";

export interface SavedItem {
  id: string;
  question: string;
  result: NormalizedInsight;
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  visualizationName?: string;
}

const AVERAGE_QUERY_DURATION_SECONDS = 5 * 60;

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

function DashboardContent() {
  const { settings } = useSettings();
  const { user } = useAuth();
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
  const [showRaw] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [updatingQueryId, setUpdatingQueryId] = useState<string | null>(null);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [countdown, setCountdown] = useState(AVERAGE_QUERY_DURATION_SECONDS);

  const disabled = fetchState === "loading";
  const webhookUrl = settings.webhookUrl?.trim();
  const canSubmit = Boolean(webhookUrl);
  const timeoutSeconds = settings.timeoutSeconds;

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
    if (typeof window === "undefined" || !user) return;
    // Load saved queries from API
    fetch(`/api/queries?userId=${user.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load queries");
        return res.json();
      })
      .then((data) => {
        const items: SavedItem[] = data.map((q: unknown) => {
          const query = q as {
            id: string;
            question: string;
            result: NormalizedInsight;
            createdAt: string;
            updatedAt: string;
            isFavorite: boolean;
            visualizationName?: string;
          };
          return {
            id: query.id,
            question: query.question,
            result: query.result,
            createdAt: new Date(query.createdAt).getTime(),
            updatedAt: new Date(query.updatedAt).getTime(),
            isFavorite: query.isFavorite,
            visualizationName: query.visualizationName,
          };
        });
        setSavedItems(items);
      })
      .catch((error) => console.error("Failed to load saved queries:", error));
  }, [user]);

  useEffect(() => {
    let intervalId: number | null = null;
    if (fetchState === "loading") {
      setCountdown(AVERAGE_QUERY_DURATION_SECONDS);
      intervalId = window.setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else {
      setCountdown(AVERAGE_QUERY_DURATION_SECONDS);
    }

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [fetchState]);

  // Warn user before leaving if they have unsaved input or query is running
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (question.trim() || fetchState === "loading") {
        event.preventDefault();
        event.returnValue =
          "You have unsaved changes or a query running. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [question, fetchState]);

  const handleSessionReset = () => {
    setSessionId(createSessionId());
  };

  const handleSaveChart = useCallback(async () => {
    if (!result || !user) return;
    const now = Date.now();

    if (updatingQueryId) {
      // Update existing query
      await fetch(`/api/queries/${updatingQueryId}?userId=${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visualizationName:
            result.chart?.meta?.title || result.chart?.meta?.visualizationName,
        }),
      });
      setSavedItems((prev) =>
        prev.map((item) =>
          item.id === updatingQueryId
            ? {
                ...item,
                result,
                question,
                updatedAt: now,
                visualizationName:
                  result.chart?.meta?.title ||
                  result.chart?.meta?.visualizationName,
              }
            : item
        )
      );
      setUpdatingQueryId(null);
    } else {
      // Save new query
      const response = await fetch("/api/queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          result,
          visualizationName:
            result.chart?.meta?.title || result.chart?.meta?.visualizationName,
          userId: user.id,
        }),
      });
      const newQuery = await response.json();
      const newItem: SavedItem = {
        id: newQuery.id,
        question,
        result,
        createdAt: new Date(newQuery.createdAt).getTime(),
        updatedAt: new Date(newQuery.updatedAt).getTime(),
        isFavorite: false,
        visualizationName: newQuery.visualizationName,
      };
      setSavedItems((prev) => [newItem, ...prev]);
    }
  }, [result, updatingQueryId, question, user]);

  // Auto-save successful results if enabled
  useEffect(() => {
    if (
      !result ||
      fetchState !== "success" ||
      !settings.autoSaveQueries ||
      !question.trim()
    ) {
      return;
    }

    // Check if this result is already saved (to avoid duplicates on mount)
    const alreadySaved = savedItems.some(
      (item) =>
        item.question === question &&
        item.result.insightText === result.insightText
    );

    if (!alreadySaved) {
      handleSaveChart();
    }
  }, [
    result,
    fetchState,
    settings.autoSaveQueries,
    question,
    savedItems,
    handleSaveChart,
  ]);

  const handleLoadSavedItem = (item: SavedItem) => {
    setQuestion(item.question);
    setResult(item.result);
    setFetchState("success");
    setErrorMessage(null);
  };

  const handleDeleteSavedItem = async (itemId: string) => {
    if (!user) return;
    await fetch(`/api/queries/${itemId}?userId=${user.id}`, {
      method: "DELETE",
    });
    setSavedItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!canSubmit) {
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
      console.info("[query] Sending request to internal API", {
        payload,
        timeoutMs,
      });

      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      console.info("[query] API response received", {
        status: response.status,
        statusText: response.statusText,
      });

      const text = await response.text();
      console.debug("[query] Raw response body", text || "(empty)");

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-6">
        <header className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2 px-2">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-slate-400 px-2">
            Ask your RAG workflow for insights and visualize the answers
          </p>
        </header>

        <div className="grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
          <div className="bg-slate-800 rounded-lg sm:rounded-xl border border-slate-700 shadow-lg p-4 sm:p-6">
            <QueryForm
              question={question}
              onQuestionChange={setQuestion}
              chartType={chartType}
              onChartTypeChange={setChartType}
              onSubmit={handleSubmit}
              disabled={disabled}
              errorMessage={errorMessage}
              canSubmit={canSubmit}
            />
            <div className="mt-6">
              <AdvancedSettings
                sessionId={sessionId}
                onSessionIdChange={setSessionId}
                onSessionReset={handleSessionReset}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg sm:rounded-xl border border-slate-700 shadow-lg p-4 sm:p-6 flex flex-col justify-between min-h-[220px]">
            <div>
              <p className="text-base sm:text-lg text-white font-semibold mb-3">
                Run a workflow to visualize data.
              </p>
              <p className="text-sm text-slate-400">
                Average query takes around five minutes. Keep this panel open to
                monitor progress and next steps while your data visualizes.
              </p>
            </div>
            <div className="mt-6 bg-slate-900/40 border border-slate-700/60 rounded-lg p-4 min-h-[120px]">
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                Estimated runtime
              </p>
              <p className="text-3xl font-bold text-white mb-1">
                {formatDuration(countdown)}
              </p>
              <p className="text-xs text-slate-500">
                {fetchState === "loading"
                  ? "Workflow running — countdown reflects the ~5 min average."
                  : "Kick off a workflow to start the countdown."}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-6">
          {fetchState === "idle" && (
            <div className="text-center py-12">
              <p className="text-slate-400">
                Start a workflow to see the latest visualization here.
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
            <>
              <ResultDisplay
                result={result}
                onSaveChart={handleSaveChart}
                showRaw={showRaw}
                updatingQueryId={updatingQueryId}
              />
              <FollowUpForm
                followUpQuestion={followUpQuestion}
                onFollowUpChange={setFollowUpQuestion}
                onSubmit={handleSubmit}
                disabled={disabled}
              />
            </>
          ) : null}
          {fetchState === "error" && !errorMessage && (
            <div className="text-center py-12">
              <p className="text-slate-400">Something went wrong. Try again.</p>
            </div>
          )}
        </div>

        <SavedQueriesList
          savedItems={savedItems}
          onLoadItem={handleLoadSavedItem}
          onDeleteItem={handleDeleteSavedItem}
          disabled={disabled}
        />
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
