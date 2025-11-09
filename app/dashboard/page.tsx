"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import type {
  ChartType,
  InsightResponse,
  QueryRequestBody,
  FollowUp,
} from "../../types";
import {
  normalizeInsight,
  type NormalizedInsight,
} from "../../utils/chartConfig";
import { useSettings } from "../../context/SettingsContext";
import { logger } from "../../utils/logger";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { QueryForm } from "./components/QueryForm";
import { AdvancedSettings } from "./components/AdvancedSettings";
import { ResultDisplay } from "./components/ResultDisplay";
import { FollowUpForm } from "./components/FollowUpForm";
import { SavedQueriesList } from "./components/SavedQueriesList";
import { RawJsonInput } from "./components/RawJsonInput";

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
      logger.warn("[n8n] Stripped markdown fences from response payload.");
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

const AVERAGE_QUERY_DURATION_SECONDS = 7 * 60;

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
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [followUpName, setFollowUpName] = useState("");
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [currentParentQueryId, setCurrentParentQueryId] = useState<
    string | null
  >(null);
  const [updatingQueryId, setUpdatingQueryId] = useState<string | null>(null);
  const [lastAutoSavedQueryId, setLastAutoSavedQueryId] = useState<
    string | null
  >(null);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [countdown, setCountdown] = useState(AVERAGE_QUERY_DURATION_SECONDS);
  const [showRawJsonInput, setShowRawJsonInput] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  const disabled = fetchState === "loading";
  const webhookUrl = settings.webhookUrl?.trim();
  const canSubmit = Boolean(webhookUrl);

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
        logger.error("Failed to parse update payload", e);
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
      .catch((error) => logger.error("Failed to load saved queries:", error));
  }, [user]);

  useEffect(() => {
    let intervalId: number | null = null;
    if (fetchState === "loading") {
      setCountdown(AVERAGE_QUERY_DURATION_SECONDS);
      setTimeoutReached(false);
      intervalId = window.setInterval(() => {
        setCountdown((prev) => {
          const newValue = prev > 0 ? prev - 1 : 0;
          // Check if timeout should be triggered
          if (
            settings.requestTimeoutEnabled &&
            AVERAGE_QUERY_DURATION_SECONDS - newValue >=
              settings.requestTimeoutSeconds
          ) {
            setTimeoutReached(true);
          }
          return newValue;
        });
      }, 1000);
    } else {
      setCountdown(AVERAGE_QUERY_DURATION_SECONDS);
      setTimeoutReached(false);
      setAbortController(null);
    }

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [
    fetchState,
    settings.requestTimeoutEnabled,
    settings.requestTimeoutSeconds,
  ]);

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

  const handleTimeoutCancel = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setFetchState("error");
    setErrorMessage("Query timed out and cancelled by user.");
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
      setLastAutoSavedQueryId(newQuery.id);
    }
  }, [result, updatingQueryId, question, user]);

  const handleSaveRawJson = useCallback(
    async (customQuestion: string, customResult: NormalizedInsight) => {
      logger.info("handleSaveRawJson called", {
        customQuestion,
        customResult,
        user,
      });
      if (!user) {
        logger.error("No user found, cannot save");
        return;
      }

      try {
        const response = await fetch("/api/queries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: customQuestion,
            result: customResult,
            visualizationName:
              customResult.chart?.meta?.title ||
              customResult.chart?.meta?.visualizationName,
            userId: user.id,
          }),
        });

        if (!response.ok) {
          logger.error("Save failed:", response.status, await response.text());
          return;
        }

        const newQuery = await response.json();
        logger.info("Query saved successfully:", newQuery);
        const newItem: SavedItem = {
          id: newQuery.id,
          question: customQuestion,
          result: customResult,
          createdAt: new Date(newQuery.createdAt).getTime(),
          updatedAt: new Date(newQuery.updatedAt).getTime(),
          isFavorite: false,
          visualizationName: newQuery.visualizationName,
        };
        setSavedItems((prev) => [newItem, ...prev]);
      } catch (error) {
        logger.error("Error saving query:", error);
      }
    },
    [user]
  );

  const handleToggleFavorite = useCallback(
    async (queryId: string, isFavorite: boolean) => {
      if (!user) return;
      await fetch(`/api/queries/${queryId}?userId=${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite }),
      });
      setSavedItems((prev) =>
        prev.map((item) =>
          item.id === queryId ? { ...item, isFavorite } : item
        )
      );
    },
    [user]
  );

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

  const handleLoadSavedItem = async (item: SavedItem) => {
    setQuestion(item.question);
    setResult(item.result);
    setFetchState("success");
    setErrorMessage(null);
    setCurrentParentQueryId(item.id);

    // Load follow-ups for this query
    try {
      const response = await fetch(
        `/api/follow-ups?userId=${user!.id}&parentQueryId=${item.id}`
      );
      if (response.ok) {
        const followUpsData = await response.json();
        const formattedFollowUps: FollowUp[] = followUpsData.map(
          (f: {
            id: string;
            parentQueryId: string;
            parentFollowUpId?: string;
            question: string;
            result: NormalizedInsight;
            name?: string;
            isFavorite: boolean;
            chartType?: string;
            createdAt: string;
            updatedAt: string;
          }) => ({
            ...f,
            result: f.result,
            createdAt: new Date(f.createdAt).getTime(),
            updatedAt: new Date(f.updatedAt).getTime(),
          })
        );
        setFollowUps(formattedFollowUps);
      }
    } catch (error) {
      console.error("Failed to load follow-ups:", error);
    }
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
    // Create AbortController for manual cancellation
    const controller = new AbortController();
    setAbortController(controller);

    try {
      logger.info("[query] Sending request to internal API", {
        payload,
      });

      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      logger.info("[query] API response received", {
        status: response.status,
        statusText: response.statusText,
      });

      const text = await response.text();
      logger.debug("[query] Raw response body", text || "(empty)");

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
      setAbortController(null);

      // If this is a follow-up, save it
      if (followUpQuestion.trim() && currentParentQueryId) {
        try {
          const followUpData = {
            parentQueryId: currentParentQueryId,
            question: cleanedQuestion,
            result: normalized,
            name: followUpName.trim() || undefined,
            chartType: chartType !== "auto" ? chartType : undefined,
            userId: user!.id,
          };

          const followUpResponse = await fetch("/api/follow-ups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(followUpData),
          });

          if (followUpResponse.ok) {
            const savedFollowUp = await followUpResponse.json();
            setFollowUps((prev) => [
              ...prev,
              {
                ...savedFollowUp,
                result: savedFollowUp.result,
                createdAt: new Date(savedFollowUp.createdAt).getTime(),
                updatedAt: new Date(savedFollowUp.updatedAt).getTime(),
              },
            ]);
          }
        } catch (error) {
          console.error("Failed to save follow-up:", error);
        }
      }

      setFollowUpName("");
    } catch (error) {
      logger.error("[n8n] Webhook request failed", error);
      if (error instanceof DOMException && error.name === "AbortError") {
        setFetchState("error");
        setErrorMessage("Query cancelled by user.");
        setAbortController(null);
        return;
      }
      setFetchState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to contact webhook."
      );
      setAbortController(null);
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

        {showRawJsonInput && (
          <RawJsonInput
            onClose={() => setShowRawJsonInput(false)}
            onSave={handleSaveRawJson}
          />
        )}

        <div className="grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-stretch">
          <div className="bg-slate-800 rounded-lg sm:rounded-xl border border-slate-700 shadow-lg p-4 sm:p-6 flex flex-col">
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
                isAdmin={user?.isAdmin}
                onShowRawJsonInput={() => setShowRawJsonInput(true)}
              />
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg sm:rounded-xl border border-slate-700 shadow-lg p-4 sm:p-6 flex flex-col">
            <div className="flex flex-col h-full">
              <div>
                <p className="text-base sm:text-lg text-white font-semibold mb-3">
                  Run a workflow to visualize data.
                </p>
                <p className="text-sm text-slate-400">
                  Average query takes around seven minutes. Keep this panel open
                  to monitor progress and next steps while your data visualizes.
                </p>
              </div>
              <div className="mt-auto pt-6 bg-slate-900/40 border border-slate-700/60 rounded-lg p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                  Elapsed time
                </p>
                <p className="text-3xl font-bold text-white mb-3">
                  {formatDuration(countdown)}
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  {fetchState === "loading"
                    ? timeoutReached && settings.requestTimeoutEnabled
                      ? `Timeout period reached (${Math.floor(
                          settings.requestTimeoutSeconds / 60
                        )}m). Consider cancelling.`
                      : "Workflow running — no automatic timeout."
                    : "Kick off a workflow to start timing."}
                </p>
                {fetchState === "loading" && (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setFetchState("error");
                        setErrorMessage("Query cancelled by user.");
                      }}
                      className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
                    >
                      Cancel Query
                    </button>
                    {timeoutReached && settings.requestTimeoutEnabled && (
                      <button
                        onClick={handleTimeoutCancel}
                        className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded transition-colors"
                      >
                        Cancel this flow - not recommended
                      </button>
                    )}
                  </div>
                )}
              </div>
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
                autoSaveQueries={settings.autoSaveQueries}
                savedQueryId={
                  updatingQueryId || lastAutoSavedQueryId || undefined
                }
                onToggleFavorite={handleToggleFavorite}
              />
              <FollowUpForm
                followUpQuestion={followUpQuestion}
                followUpName={followUpName}
                onFollowUpChange={setFollowUpQuestion}
                onFollowUpNameChange={setFollowUpName}
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
