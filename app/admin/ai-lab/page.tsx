"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlayCircle, ShieldCheck, Sparkles, Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { TargetSlotCard } from "./components/TargetSlotCard";
import { MetricsGrid } from "./components/MetricsGrid";
import { ResultsVisualizer } from "./components/ResultsVisualizer";
import { HistoryPanel } from "./components/HistoryPanel";
import { ModelManager } from "./components/ModelManager";
import { SaveModelDialog } from "./components/SaveModelDialog";
import type {
  AiLabExperiment,
  TargetSlotState,
  SavedModelConfig,
} from "./types";

const COLOR_PALETTE = [
  "#22d3ee",
  "#f472b6",
  "#a855f7",
  "#34d399",
  "#f97316",
  "#eab308",
];
export const dynamic = "force-dynamic";

const MAX_TARGETS = 6;
const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;
type TabKey = "matrix" | "responses";

type FeedbackDraftState = Record<
  string,
  { score: number | null; notes: string }
>;
type FeedbackStatusState = Record<
  string,
  { saving?: boolean; error?: string | null; success?: string | null }
>;

type QuickRunResult = {
  target: string;
  success: boolean;
  data?: {
    label: string;
    modelName: string;
    latencyMs: number;
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
    costEstimate: number | null;
    answer: string;
    responsePayload: unknown;
  };
  error?: string;
};

type QuickRunResponse = {
  success: boolean;
  durationMs: number;
  totalTargets: number;
  successful: number;
  failed: number;
  results: QuickRunResult[];
};

const makeId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const createSlot = (index: number): TargetSlotState => ({
  id: makeId(),
  label: `AI Target ${index + 1}`,
  modelName: "",
  method: "POST",
  color: COLOR_PALETTE[index % COLOR_PALETTE.length],
  timeoutMs: 45000,
  headers: [],
  payloadTemplateRaw: "",
  requestCount: 1,
});

const formatResponsePayload = (
  payload: AiLabExperiment["results"][number]["responsePayload"]
) => {
  if (!payload) return "No response captured";
  if (typeof payload === "string") return payload;
  if ("raw" in payload && typeof payload.raw === "string") {
    return payload.raw;
  }
  return JSON.stringify(payload, null, 2);
};

const tabs: { id: TabKey; label: string }[] = [
  { id: "matrix", label: "Benchmark Matrix" },
  { id: "responses", label: "Responses & Feedback" },
];

export default function AiLabPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AiLabPageInner />
    </Suspense>
  );
}

function AiLabPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams?.toString() ?? "";
  const { user, isAdmin } = useAuth();

  const [label, setLabel] = useState("Benchmark matrix");
  const [prompt, setPrompt] = useState("Explain how our Q4 pipeline looks.");
  const [expectedAnswer, setExpectedAnswer] = useState("Q4 pipeline summary");
  const [notes, setNotes] = useState("Compare best of GPT vs Claude wehooks.");
  const [maxConcurrency, setMaxConcurrency] = useState(3);
  const [slots, setSlots] = useState<TargetSlotState[]>([
    createSlot(0),
    createSlot(1),
  ]);
  const [currentExperiment, setCurrentExperiment] =
    useState<AiLabExperiment | null>(null);
  const [quickRunResults, setQuickRunResults] =
    useState<QuickRunResponse | null>(null);
  const [showFailedResults, setShowFailedResults] = useState(true);
  const [saveDialogSlotId, setSaveDialogSlotId] = useState<string | null>(null);
  const [savedRefreshKey, setSavedRefreshKey] = useState<number>(0);
  const [history, setHistory] = useState<AiLabExperiment[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<FeedbackDraftState>({});
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatusState>({});

  const rawTab = searchParams?.get("tab");
  const currentTab: TabKey = rawTab === "responses" ? "responses" : "matrix";

  const ensureTabInUrl = useCallback(() => {
    if (rawTab) return;
    const params = new URLSearchParams(searchParamsString);
    params.set("tab", "matrix");
    router.replace(`/admin/ai-lab?${params.toString()}`, { scroll: false });
  }, [rawTab, router, searchParamsString]);

  useEffect(() => {
    if (!isAdmin) return;
    ensureTabInUrl();
  }, [ensureTabInUrl, isAdmin]);

  const changeTab = (tabId: TabKey) => {
    const params = new URLSearchParams(searchParamsString);
    params.set("tab", tabId);
    router.replace(`/admin/ai-lab?${params.toString()}`, { scroll: false });
  };

  const openSaveDialogForSlot = (slotId: string) => {
    setSaveDialogSlotId(slotId);
  };

  const closeSaveDialog = () => setSaveDialogSlotId(null);

  const handleSavedModel = () => {
    // bump the refresh key to tell ModelManager to reload saved models
    setSavedRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    if (!currentExperiment) {
      setFeedbackDrafts({});
      return;
    }
    const draftEntries: FeedbackDraftState = {};
    currentExperiment.results.forEach((result) => {
      draftEntries[result.id] = {
        score: result.reviewScore ?? null,
        notes: result.feedbackNotes ?? "",
      };
    });
    setFeedbackDrafts(draftEntries);
  }, [currentExperiment]);

  useEffect(() => {
    setFeedbackStatus({});
  }, [currentExperiment]);

  const availableTargets = useMemo(
    () => slots.filter((slot) => slot.modelName.trim()),
    [slots]
  );

  const headersToRecord = (slot: TargetSlotState) => {
    if (!slot.headers.length) return undefined;
    const entries = slot.headers
      .map(({ key, value }) => [key.trim(), value] as const)
      .filter(([key]) => key.length > 0);
    if (!entries.length) return undefined;
    return Object.fromEntries(entries);
  };

  const parsePayloadTemplate = (raw: string, slotLabel: string) => {
    if (!raw.trim()) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(
        `Target ${slotLabel}: payload template must be valid JSON.`
      );
    }
  };

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch(
        `/api/admin/ai-lab?userId=${user.id}&limit=${MAX_TARGETS}`
      );
      if (!response.ok) {
        throw new Error("Unable to load experiments");
      }
      const experiments: AiLabExperiment[] = await response.json();
      setHistory(experiments);
      setCurrentExperiment((prev) => prev ?? experiments[0] ?? null);
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : "Unexpected error"
      );
    } finally {
      setIsHistoryLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchHistory();
  }, [fetchHistory, isAdmin]);

  const handleSlotChange = (
    slotId: string,
    patch: Partial<TargetSlotState>
  ) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot))
    );
  };

  const handleSlotRemove = (slotId: string) => {
    setSlots((prev) =>
      prev.length === 1 ? prev : prev.filter((slot) => slot.id !== slotId)
    );
  };

  const handleAddSlot = () => {
    if (slots.length >= MAX_TARGETS) return;
    setSlots((prev) => [...prev, createSlot(prev.length)]);
  };

  const handleLoadModel = (
    config: Omit<SavedModelConfig, "id" | "createdAt" | "updatedAt">
  ) => {
    // Find the first empty slot or create a new one
    const emptySlotIndex = slots.findIndex((slot) => !slot.modelName.trim());
    if (emptySlotIndex >= 0) {
      // Update existing empty slot
      handleSlotChange(slots[emptySlotIndex].id, {
        ...config,
        label: config.label, // Use the saved label as the display name
      });
    } else if (slots.length < MAX_TARGETS) {
      // Create new slot with the config
      const newSlot = createSlot(slots.length);
      setSlots((prev) => [
        ...prev,
        { ...newSlot, ...config, label: config.label },
      ]);
    } else {
      // Replace the first slot if max reached
      handleSlotChange(slots[0].id, {
        ...config,
        label: config.label,
      });
    }
  };

  const handleQuickRun = async (models: SavedModelConfig[]) => {
    if (!user || !prompt.trim()) return;
    setRunError(null);
    setRunMessage(null);

    // Filter out invalid models
    const validModels = models.filter(
      (model) =>
        model &&
        typeof model.label === "string" &&
        model.label.trim() &&
        typeof model.modelName === "string" &&
        model.modelName.trim()
    );

    if (validModels.length === 0) {
      setRunError("No valid models found for quick run");
      return;
    }

    try {
      const targetsPayload = validModels.flatMap((model) => {
        const requestCount = model.requestCount || 1;
        return Array.from({ length: requestCount }, (_, index) => {
          const payloadTemplate = parsePayloadTemplate(
            model.payloadTemplateRaw,
            model.label
          );

          const headers = model.headers.reduce((acc, header) => {
            if (header.key.trim()) {
              acc[header.key.trim()] = header.value;
            }
            return acc;
          }, {} as Record<string, string>);

          const target: {
            label: string;
            modelName: string;
            method?: "POST" | "PUT" | "PATCH";
            color?: string;
            timeoutMs?: number;
            headers?: Record<string, string>;
            inputTokensPerMillion?: number;
            outputTokensPerMillion?: number;
            payloadTemplate?: Record<string, unknown>;
          } = {
            label:
              requestCount > 1 ? `${model.label} (${index + 1})` : model.label,
            // No per-target webhook: the server will call the configured AI provider
            modelName: model.modelName,
            method: model.method,
            color: "#22d3ee", // Default color for quick runs
            timeoutMs: model.timeoutMs,
            inputTokensPerMillion: model.inputTokensPerMillion,
            outputTokensPerMillion: model.outputTokensPerMillion,
          };

          if (Object.keys(headers).length > 0) {
            target.headers = headers;
          }

          if (payloadTemplate !== undefined) {
            target.payloadTemplate = payloadTemplate;
          }

          return target;
        });
      });

      setIsRunning(true);
      console.log(
        "[frontend] Sending quick run request with",
        targetsPayload.length,
        "targets from",
        validModels.length,
        "models"
      );
      console.log("[frontend] Models:", validModels);

      const requestPayload = {
        userId: user.id,
        prompt,
        targets: targetsPayload,
      };
      console.log("[frontend] Request payload:", requestPayload);

      const response = await fetch("/api/admin/ai-lab/quick-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      console.log("[frontend] Response status:", response.status);
      console.log("[frontend] Response ok:", response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log("[frontend] Error response:", errorData);
        if (errorData.issues) {
          const issuesText = (
            errorData.issues as Array<{ path: string[]; message: string }>
          )
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(", ");
          throw new Error(`Invalid payload: ${issuesText}`);
        }
        throw new Error(errorData.error || "Quick run failed");
      }

      const quickRunResult: QuickRunResponse = await response.json();
      console.log("[frontend] Success response:", quickRunResult);
      console.log("[frontend] Individual results:");
      quickRunResult.results.forEach((result, index) => {
        console.log(`[frontend] Result ${index} (${result.target}):`, {
          success: result.success,
          error: result.error,
          data: result.data
            ? {
                answer: result.data.answer.substring(0, 200),
                modelName: result.data.modelName,
                latencyMs: result.data.latencyMs,
              }
            : null,
        });
      });
      setQuickRunResults(quickRunResult);
      setRunMessage(
        `Quick run completed in ${
          quickRunResult.durationMs
            ? `${(quickRunResult.durationMs / 1000).toFixed(2)}s`
            : "--"
        } (${quickRunResult.successful}/${
          quickRunResult.totalTargets
        } successful)`
      );
      // For now, we'll just show the message. Could add a separate quick run results display later
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Quick run failed");
    } finally {
      setIsRunning(false);
    }
  };

  const handleRun = async () => {
    if (!user) return;
    setRunError(null);
    setRunMessage(null);

    if (!prompt.trim()) {
      setRunError("Prompt is required.");
      return;
    }

    if (!availableTargets.length) {
      setRunError("Configure at least one target with a model name.");
      return;
    }

    try {
      const normalizedConcurrency = Math.round(
        Math.min(MAX_TARGETS, Math.max(1, maxConcurrency))
      );
      const targetsPayload = availableTargets.map((slot) => ({
        label: slot.label.trim(),
        modelName: slot.modelName.trim(),
        method: slot.method,
        color: slot.color,
        timeoutMs: slot.timeoutMs,
        headers: headersToRecord(slot),
        costPer1kTokens: slot.costPer1kTokens,
        payloadTemplate: parsePayloadTemplate(
          slot.payloadTemplateRaw,
          slot.label
        ),
      }));

      setIsRunning(true);
      const response = await fetch("/api/admin/ai-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          label: label.trim() || "Experiment",
          prompt,
          expectedAnswer: expectedAnswer.trim() || undefined,
          notes: notes.trim() || undefined,
          maxConcurrency: normalizedConcurrency,
          targets: targetsPayload,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Run failed");
      }

      const experiment: AiLabExperiment = await response.json();
      setCurrentExperiment(experiment);
      setRunMessage(
        `Experiment "${experiment.label}" completed in ${
          experiment.durationMs
            ? `${(experiment.durationMs / 1000).toFixed(2)}s`
            : "--"
        }`
      );
      fetchHistory();
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Run failed");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSelectExperiment = (experiment: AiLabExperiment) => {
    setCurrentExperiment(experiment);
  };

  const handleDeleteExperiment = async (experimentId: string) => {
    if (!user) return;

    try {
      const response = await fetch(
        `/api/admin/ai-lab?experimentId=${experimentId}&userId=${user.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete experiment");
      }

      // Remove from local state
      setHistory((prev) => prev.filter((exp) => exp.id !== experimentId));

      // If the deleted experiment was selected, clear selection
      if (currentExperiment?.id === experimentId) {
        setCurrentExperiment(null);
      }
    } catch (error) {
      console.error("Failed to delete experiment:", error);
      alert("Failed to delete experiment. Please try again.");
    }
  };

  const handleFeedbackDraftChange = (
    resultId: string,
    patch: Partial<{ score: number | null; notes: string }>
  ) => {
    setFeedbackDrafts((prev) => ({
      ...prev,
      [resultId]: {
        score: patch.score ?? prev[resultId]?.score ?? null,
        notes: patch.notes ?? prev[resultId]?.notes ?? "",
      },
    }));
  };

  const handleSaveFeedback = async (resultId: string) => {
    if (!user) return;
    const draft = feedbackDrafts[resultId];
    if (!draft || (draft.score === null && !draft.notes.trim())) {
      setFeedbackStatus((prev) => ({
        ...prev,
        [resultId]: {
          ...prev[resultId],
          error: "Add a rating or feedback first.",
          success: null,
          saving: false,
        },
      }));
      return;
    }

    setFeedbackStatus((prev) => ({
      ...prev,
      [resultId]: {
        ...prev[resultId],
        saving: true,
        error: null,
        success: null,
      },
    }));

    try {
      const response = await fetch("/api/admin/ai-lab", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          resultId,
          reviewScore: draft.score,
          feedbackNotes: draft.notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save feedback");
      }

      const updatedResult: AiLabExperiment["results"][number] =
        await response.json();

      setCurrentExperiment((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          results: prev.results.map((result) =>
            result.id === updatedResult.id
              ? { ...result, ...updatedResult }
              : result
          ),
        };
      });

      setFeedbackStatus((prev) => ({
        ...prev,
        [resultId]: {
          saving: false,
          error: null,
          success: "Feedback saved",
        },
      }));

      fetchHistory();
    } catch (error) {
      setFeedbackStatus((prev) => ({
        ...prev,
        [resultId]: {
          saving: false,
          success: null,
          error:
            error instanceof Error ? error.message : "Failed to save feedback",
        },
      }));
    }
  };

  const matrixTabContent = (
    <div className="space-y-6">
      <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Test scenario
            </p>
            <h2 className="text-2xl font-semibold text-white">
              Craft your benchmark
            </h2>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-slate-500">Concurrency</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={MAX_TARGETS}
                value={maxConcurrency}
                onChange={(event) =>
                  setMaxConcurrency(() => {
                    const next = Number(event.target.value);
                    if (!Number.isFinite(next)) return 1;
                    return Math.min(MAX_TARGETS, Math.max(1, next));
                  })
                }
                className="w-16 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-400">parallel slots</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Experiment name
            <input
              type="text"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              className="px-3 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Prompt / instruction
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              className="px-3 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Expected answer (optional, used for accuracy)
            <textarea
              value={expectedAnswer}
              onChange={(event) => setExpectedAnswer(event.target.value)}
              rows={3}
              className="px-3 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              className="px-3 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Benchmark matrix
            </p>
            <h3 className="text-xl font-semibold text-white">
              Configure up to six AI endpoints
            </h3>
          </div>
          <button
            onClick={handleAddSlot}
            disabled={slots.length >= MAX_TARGETS}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500 text-blue-300 hover:bg-blue-500/10 disabled:opacity-40"
          >
            <Sparkles className="h-4 w-4" />
            Add target
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {slots.map((slot, index) => (
            <TargetSlotCard
              key={slot.id}
              slot={slot}
              index={index}
              disableRemove={slots.length === 1}
              onChange={handleSlotChange}
              onRemove={handleSlotRemove}
              onSave={openSaveDialogForSlot}
            />
          ))}
        </div>

        <ModelManager
          slots={slots}
          onLoadModel={handleLoadModel}
          refreshKey={savedRefreshKey}
          currentPrompt={prompt}
          onQuickRun={handleQuickRun}
        />
        {saveDialogSlotId && (
          <SaveModelDialog
            slot={slots.find((s) => s.id === saveDialogSlotId) ?? null}
            onClose={closeSaveDialog}
            onSaved={handleSavedModel}
          />
        )}
      </section>

      <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        {runError && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3">
            {runError}
          </p>
        )}
        {runMessage && (
          <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3">
            {runMessage}
          </p>
        )}
        {quickRunResults && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Quick Run Results (
                {quickRunResults.results.filter((r) => r.success).length}/
                {quickRunResults.results.length} successful)
              </h3>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showFailedResults}
                    onChange={(e) => setShowFailedResults(e.target.checked)}
                    className="rounded"
                  />
                  Show failed
                </label>
                <button
                  onClick={() => setQuickRunResults(null)}
                  className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                >
                  Clear All
                </button>
                <button
                  onClick={() => {
                    if (quickRunResults) {
                      const filteredResults = quickRunResults.results.filter(
                        (r) => r.success
                      );
                      setQuickRunResults({
                        ...quickRunResults,
                        results: filteredResults,
                        totalTargets: filteredResults.length,
                        successful: filteredResults.length,
                        failed: 0,
                        durationMs: quickRunResults.durationMs,
                      });
                    }
                  }}
                  className="px-3 py-1 text-xs bg-red-700 hover:bg-red-600 text-white rounded"
                  disabled={
                    !quickRunResults ||
                    quickRunResults.results.filter((r) => !r.success).length ===
                      0
                  }
                >
                  Clear Failed
                </button>
                <button
                  onClick={() => {
                    if (quickRunResults) {
                      const filteredResults = quickRunResults.results.filter(
                        (r) =>
                          r.success ||
                          (r.error &&
                            !r.error.includes("aborted") &&
                            !r.error.includes("Aborted"))
                      );
                      const failedCount = filteredResults.filter(
                        (r) => !r.success
                      ).length;
                      setQuickRunResults({
                        ...quickRunResults,
                        results: filteredResults,
                        totalTargets: filteredResults.length,
                        successful: filteredResults.length - failedCount,
                        failed: failedCount,
                        durationMs: quickRunResults.durationMs,
                      });
                    }
                  }}
                  className="px-3 py-1 text-xs bg-orange-700 hover:bg-orange-600 text-white rounded"
                  disabled={
                    !quickRunResults ||
                    !quickRunResults.results.some(
                      (r) =>
                        !r.success &&
                        r.error &&
                        (r.error.includes("aborted") ||
                          r.error.includes("Aborted"))
                    )
                  }
                >
                  Clear Aborted
                </button>
              </div>
            </div>
            <div className="grid gap-3">
              {quickRunResults.results
                .filter((result) => showFailedResults || result.success)
                .map((result, index) => (
                  <div
                    key={index}
                    className="bg-slate-900/50 rounded-lg p-3 border border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">
                        {result.target}
                      </h4>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          result.success
                            ? "bg-green-500/20 text-green-300 border border-green-500/30"
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                        }`}
                      >
                        {result.success ? "Success" : "Failed"}
                      </span>
                    </div>
                    {result.success && result.data ? (
                      <div className="space-y-1 text-sm text-slate-300">
                        <p>
                          <span className="text-slate-400">Model:</span>{" "}
                          {result.data.modelName}
                        </p>
                        <p>
                          <span className="text-slate-400">Latency:</span>{" "}
                          {result.data.latencyMs}ms
                        </p>
                        <p>
                          <span className="text-slate-400">Tokens:</span>{" "}
                          {result.data.promptTokens || 0} in,{" "}
                          {result.data.completionTokens || 0} out
                        </p>
                        {result.data.costEstimate !== null && (
                          <p>
                            <span className="text-slate-400">Cost:</span> $
                            {result.data.costEstimate}
                          </p>
                        )}
                        <div className="mt-2">
                          <p className="text-slate-400 text-xs mb-1">
                            Response:
                          </p>
                          <p className="text-white bg-slate-950/50 rounded p-2 text-xs max-h-20 overflow-y-auto">
                            {result.data.answer.length > 200
                              ? `${result.data.answer.substring(0, 200)}...`
                              : result.data.answer}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-red-300 font-medium">
                          Failed
                        </p>
                        <p className="text-sm text-red-400 bg-red-900/20 p-2 rounded">
                          {result.error || "Unknown error"}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="w-full inline-flex items-center justify-center gap-3 px-4 py-4 rounded-3xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-lg shadow-lg hover:opacity-90 disabled:opacity-60"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Running experiment...
            </>
          ) : (
            <>
              <PlayCircle className="h-5 w-5" />
              Launch benchmark
            </>
          )}
        </button>
        <p className="text-xs text-center text-slate-500">
          We fire each webhook in parallel (max {MAX_TARGETS}) and capture
          tokens, latency, accuracy, and errors.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Live metrics
            </p>
            <h3 className="text-xl font-semibold text-white">
              {currentExperiment ? currentExperiment.label : "No run yet"}
            </h3>
          </div>
          {currentExperiment && (
            <p className="text-xs text-slate-500">
              Started {new Date(currentExperiment.startedAt).toLocaleString()}
            </p>
          )}
        </div>
        <MetricsGrid experiment={currentExperiment} />
        <ResultsVisualizer experiment={currentExperiment} />
      </section>
    </div>
  );

  const responsesTabContent = (
    <div className="space-y-4">
      {!currentExperiment ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 text-slate-300">
          Select a run from &ldquo;Recent runs&rdquo; to review responses.
        </div>
      ) : (
        <>
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-lg">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Reviewing
                </p>
                <h3 className="text-xl font-semibold text-white">
                  {currentExperiment.label}
                </h3>
                <p className="text-xs text-slate-500">
                  Started{" "}
                  {new Date(currentExperiment.startedAt).toLocaleString()}
                </p>
              </div>
              <div className="text-xs text-slate-500">
                Completed targets: {currentExperiment.totalCompleted}/
                {currentExperiment.totalTargets}
              </div>
            </div>
          </div>

          {currentExperiment.results.length === 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 text-slate-300">
              No responses recorded for this experiment yet.
            </div>
          )}

          {currentExperiment.results.map((result, index) => {
            const draft = feedbackDrafts[result.id] ?? {
              score: result.reviewScore ?? null,
              notes: result.feedbackNotes ?? "",
            };
            const status = feedbackStatus[result.id];
            return (
              <div
                key={result.id}
                className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-lg space-y-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Target #{index + 1}
                    </p>
                    <h4 className="text-lg font-semibold text-white">
                      {result.label}
                    </h4>
                    <p className="text-xs text-slate-500">{result.modelName}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium self-start ${
                      result.status === "COMPLETED"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : result.status === "RUNNING"
                        ? "bg-blue-500/20 text-blue-300"
                        : result.status === "FAILED"
                        ? "bg-red-500/20 text-red-300"
                        : "bg-slate-700 text-slate-200"
                    }`}
                  >
                    {result.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">Latency</p>
                    <p className="font-semibold">
                      {result.latencyMs
                        ? result.latencyMs < 1000
                          ? `${result.latencyMs} ms`
                          : `${(result.latencyMs / 1000).toFixed(2)} s`
                        : "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Tokens (total)</p>
                    <p className="font-semibold">
                      {result.totalTokens ?? "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Accuracy score</p>
                    <p className="font-semibold">
                      {typeof result.accuracyScore === "number"
                        ? `${(result.accuracyScore * 100).toFixed(1)}%`
                        : "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Cost estimate</p>
                    <p className="font-semibold">
                      {result.costEstimate !== null &&
                      result.costEstimate !== undefined
                        ? `$${result.costEstimate.toFixed(4)}`
                        : "--"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Rate this response
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {RATING_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            handleFeedbackDraftChange(result.id, {
                              score: option,
                            })
                          }
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            draft.score === option
                              ? "bg-blue-500/20 border-blue-400 text-blue-100"
                              : "border-slate-600 text-slate-200 hover:border-blue-400"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          handleFeedbackDraftChange(result.id, { score: null })
                        }
                        className="text-xs text-slate-400 underline-offset-2 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Written feedback
                    </p>
                    <textarea
                      value={draft.notes}
                      onChange={(event) =>
                        handleFeedbackDraftChange(result.id, {
                          notes: event.target.value,
                        })
                      }
                      placeholder="Share what worked or what needs to improve..."
                      rows={3}
                      className="mt-2 w-full px-3 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {status?.error && (
                    <p className="text-sm text-red-300">{status.error}</p>
                  )}
                  {status?.success && (
                    <p className="text-sm text-emerald-300">{status.success}</p>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSaveFeedback(result.id)}
                    disabled={status?.saving}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-2xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
                  >
                    {status?.saving ? "Saving..." : "Save feedback"}
                  </button>
                </div>

                <details className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                  <summary className="cursor-pointer text-sm text-slate-200">
                    View response payload
                  </summary>
                  <pre className="mt-3 text-xs text-slate-200 whitespace-pre-wrap break-words overflow-x-auto">
                    {formatResponsePayload(result.responsePayload)}
                  </pre>
                </details>

                {result.errorMessage && (
                  <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                    {result.errorMessage}
                  </p>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );

  const adminOnlyView = (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 py-10">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        <header className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold">
            <ShieldCheck className="h-4 w-4" />
            Admin only
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            AI Validation Lab
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-3xl mx-auto">
            Spin up parallel probes across up to six AI endpoints, capture
            latency, token usage, quality and cost metrics, and compare them
            side by side.
          </p>
        </header>

        <section className="space-y-3">
          <HistoryPanel
            experiments={history}
            selectedExperimentId={currentExperiment?.id}
            isLoading={isHistoryLoading}
            onRefresh={fetchHistory}
            onSelect={handleSelectExperiment}
            onDelete={handleDeleteExperiment}
          />
          {historyError && (
            <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3">
              {historyError}
            </p>
          )}
        </section>

        <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-2 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => changeTab(tab.id)}
              className={`flex-1 min-w-[150px] px-4 py-2 rounded-2xl text-sm font-semibold transition-colors ${
                currentTab === tab.id
                  ? "bg-blue-500 text-white"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </section>

        {currentTab === "matrix" ? matrixTabContent : responsesTabContent}
      </div>
    </div>
  );

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-4">
            <ShieldCheck className="h-10 w-10 text-blue-400 mx-auto" />
            <h1 className="text-2xl font-semibold text-white">
              Admin access required
            </h1>
            <p className="text-slate-400">
              You need elevated permissions to access the AI Validation Lab.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return <ProtectedRoute>{adminOnlyView}</ProtectedRoute>;
}
