"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { ChartType, QueryRequestBody, FollowUp } from "../../types";
import type { NormalizedInsight } from "../../utils/chartConfig";
import { useSettings } from "../../context/SettingsContext";
import { useQuery } from "../../context/QueryContext";
import { logger } from "../../utils/logger";
import { ProtectedRoute } from "../../components/ProtectedRoute";

export const dynamic = "force-dynamic";
import { useAuth } from "../../context/AuthContext";
import { QueryForm } from "./components/QueryForm";
import { AdvancedSettings } from "./components/AdvancedSettings";
import { ResultDisplay } from "./components/ResultDisplay";
import { FollowUpForm } from "./components/FollowUpForm";
import { SavedQueriesList } from "./components/SavedQueriesList";
import { RawJsonInput } from "./components/RawJsonInput";
import { PromptHelperChat } from "./components/PromptHelperChat";

const createSessionId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `session-${Math.random().toString(36).slice(2, 11)}`;
};

export interface SavedItem {
  id: string;
  question: string;
  result: NormalizedInsight;
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  visualizationName?: string;
}

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
  const { queryState, startQuery, cancelQuery, updateQueryState } = useQuery();
  const question = queryState.question;
  const setQuestion = (q: string) => updateQueryState({ question: q });
  const chartType = queryState.chartType;
  const setChartType = (ct: ChartType) => updateQueryState({ chartType: ct });
  const sessionId = queryState.sessionId;
  const setSessionId = (sid: string) => updateQueryState({ sessionId: sid });
  const fetchState = queryState.fetchState;
  const errorMessage = queryState.errorMessage;
  const result = queryState.result;
  const countdown = queryState.countdown;
  const timeoutReached = queryState.timeoutReached;

  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [followUps, setFollowUps] = useState<FollowUp[]>([]); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [currentParentQueryId, setCurrentParentQueryId] = useState<
    string | null
  >(null);
  const [updatingQueryId, setUpdatingQueryId] = useState<string | null>(null);
  const [lastAutoSavedQueryId, setLastAutoSavedQueryId] = useState<
    string | null
  >(null);
  const [followUpQueryLoaded, setFollowUpQueryLoaded] = useState(false);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [showRawJsonInput, setShowRawJsonInput] = useState(false);

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

    // Check if we have a pending question to pre-fill
    const pendingQuestion = sessionStorage.getItem("pending-question");
    if (pendingQuestion) {
      setQuestion(pendingQuestion);
      sessionStorage.removeItem("pending-question");
    }

    // Check if we need to load a query in follow-up mode
    const followUpQueryId = sessionStorage.getItem("follow-up-query");
    if (followUpQueryId && user) {
      // Load the query for follow-up mode
      fetch(`/api/queries/${followUpQueryId}?userId=${user.id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load query");
          return res.json();
        })
        .then((queryData) => {
          setQuestion(queryData.question);
          updateQueryState({
            result: queryData.result,
            fetchState: "success",
            errorMessage: null,
          });
          setCurrentParentQueryId(queryData.id);
          // Load follow-ups
          return fetch(
            `/api/follow-ups?userId=${user.id}&parentQueryId=${queryData.id}`
          );
        })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load follow-ups");
          return res.json();
        })
        .then((followUpsData) => {
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
        })
        .catch((e) => {
          logger.error("Failed to load follow-up query", e);
        })
        .finally(() => {
          sessionStorage.removeItem("follow-up-query");
          setFollowUpQueryLoaded(true);
        });
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to follow-up form when follow-up query is loaded
  useEffect(() => {
    if (followUpQueryLoaded && currentParentQueryId) {
      // Small delay to ensure the form is rendered
      setTimeout(() => {
        const followUpTextarea = document.getElementById("followup");
        if (followUpTextarea) {
          followUpTextarea.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          followUpTextarea.focus();
        }
      }, 100);
      setFollowUpQueryLoaded(false); // Reset for next time
    }
  }, [followUpQueryLoaded, currentParentQueryId]);

  // Warn user before leaving if they have unsaved input or query is running
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (queryState.question.trim() || queryState.fetchState === "loading") {
        event.preventDefault();
        event.returnValue =
          "You have unsaved changes or a query running. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [queryState.question, queryState.fetchState]);

  const handleSessionReset = () => {
    updateQueryState({ sessionId: createSessionId() });
  };

  const handleTimeoutCancel = () => {
    cancelQuery();
    updateQueryState({
      errorMessage: "Query timed out and cancelled by user.",
    });
  };

  const handleSaveChart = useCallback(async () => {
    if (!queryState.result || !user) return;
    const now = Date.now();

    if (updatingQueryId) {
      // Update existing query
      await fetch(`/api/queries/${updatingQueryId}?userId=${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visualizationName:
            queryState.result.chart?.meta?.title ||
            queryState.result.chart?.meta?.visualizationName,
        }),
      });
      setSavedItems((prev) =>
        prev.map((item) =>
          item.id === updatingQueryId
            ? {
                ...item,
                result: queryState.result!,
                question: queryState.question,
                updatedAt: now,
                visualizationName:
                  queryState.result!.chart?.meta?.title ||
                  queryState.result!.chart?.meta?.visualizationName,
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
          question: queryState.question,
          result: queryState.result,
          visualizationName:
            queryState.result.chart?.meta?.title ||
            queryState.result.chart?.meta?.visualizationName,
          userId: user.id,
        }),
      });
      const newQuery = await response.json();
      const newItem: SavedItem = {
        id: newQuery.id,
        question: queryState.question,
        result: queryState.result!,
        createdAt: new Date(newQuery.createdAt).getTime(),
        updatedAt: new Date(newQuery.updatedAt).getTime(),
        isFavorite: false,
        visualizationName: newQuery.visualizationName,
      };
      setSavedItems((prev) => [newItem, ...prev]);
      setLastAutoSavedQueryId(newQuery.id);
    }
  }, [queryState.result, updatingQueryId, queryState.question, user]);

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
      !queryState.result ||
      queryState.fetchState !== "success" ||
      !settings.autoSaveQueries ||
      !queryState.question.trim() ||
      currentParentQueryId // Don't auto-save when in follow-up mode
    ) {
      return;
    }

    // Check if this result is already saved (to avoid duplicates on mount)
    const alreadySaved = savedItems.some(
      (item) =>
        item.question === queryState.question &&
        item.result.insightText === queryState.result!.insightText
    );

    if (!alreadySaved) {
      handleSaveChart();
    }
  }, [
    queryState.result,
    queryState.fetchState,
    settings.autoSaveQueries,
    queryState.question,
    savedItems,
    handleSaveChart,
    currentParentQueryId,
  ]);

  const handleLoadSavedItem = async (item: SavedItem) => {
    setQuestion(item.question);
    updateQueryState({
      result: item.result,
      fetchState: "success",
      errorMessage: null,
    });
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
    updateQueryState({ errorMessage: null });

    if (!canSubmit) {
      updateQueryState({
        errorMessage: "Provide an n8n webhook URL in settings.",
      });
      return;
    }

    const cleanedQuestion = followUpQuestion.trim() || question.trim();

    const payload: QueryRequestBody = {
      question: cleanedQuestion,
      chartType,
      sessionId,
      chatInput: cleanedQuestion,
    };

    await startQuery(payload);
    setFollowUpQuestion("");

    // If this is a follow-up, save it
    if (followUpQuestion.trim() && currentParentQueryId) {
      try {
        const followUpData = {
          parentQueryId: currentParentQueryId,
          question: cleanedQuestion,
          result: queryState.result,
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
                    ? timeoutReached && settings.timeoutEnabled
                      ? `Timeout period reached (${Math.floor(
                          settings.timeoutSeconds / 60
                        )}m). Consider cancelling.`
                      : "Workflow running — no automatic timeout."
                    : "Kick off a workflow to start timing."}
                </p>
                {fetchState === "loading" && (
                  <div className="space-y-2">
                    <button
                      onClick={cancelQuery}
                      className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
                    >
                      Cancel Query
                    </button>
                    {timeoutReached && settings.timeoutEnabled && (
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

        <PromptHelperChat onPromptGenerated={setQuestion} />

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
