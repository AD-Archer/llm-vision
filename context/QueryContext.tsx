"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import type { ChartType, InsightResponse, QueryRequestBody } from "../types";
import type { NormalizedInsight } from "../utils/chartConfig";
import { normalizeInsight } from "../utils/chartConfig";
import { useSettings } from "./SettingsContext";
import { logger } from "../utils/logger";

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

const AVERAGE_QUERY_DURATION_SECONDS = 7 * 60;

export interface QueryState {
  question: string;
  chartType: ChartType;
  sessionId: string;
  fetchState: FetchState;
  result: NormalizedInsight | null;
  errorMessage: string | null;
  countdown: number;
  timeoutReached: boolean;
  abortController: AbortController | null;
}

export interface QueryContextType {
  queryState: QueryState;
  startQuery: (payload: QueryRequestBody) => Promise<void>;
  cancelQuery: () => void;
  resetQuery: () => void;
  updateQueryState: (updates: Partial<QueryState>) => void;
}

const QueryContext = createContext<QueryContextType | undefined>(undefined);

export const QueryProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { settings } = useSettings();

  const [queryState, setQueryState] = useState<QueryState>({
    question: "",
    chartType: "auto",
    sessionId: (() => {
      if (typeof window === "undefined") {
        return createSessionId();
      }
      const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
      return stored && stored.trim() ? stored : createSessionId();
    })(),
    fetchState: "idle",
    result: null,
    errorMessage: null,
    countdown: AVERAGE_QUERY_DURATION_SECONDS,
    timeoutReached: false,
    abortController: null,
  });

  // Persist sessionId
  useEffect(() => {
    if (typeof window === "undefined" || !queryState.sessionId) return;
    window.localStorage.setItem(SESSION_STORAGE_KEY, queryState.sessionId);
  }, [queryState.sessionId]);

  // Countdown timer
  useEffect(() => {
    let intervalId: number | null = null;
    if (queryState.fetchState === "loading") {
      setQueryState((prev) => ({
        ...prev,
        countdown: AVERAGE_QUERY_DURATION_SECONDS,
        timeoutReached: false,
      }));
      intervalId = window.setInterval(() => {
        setQueryState((prev) => {
          const newCountdown = prev.countdown > 0 ? prev.countdown - 1 : 0;
          const timeoutReached =
            settings.timeoutEnabled &&
            AVERAGE_QUERY_DURATION_SECONDS - newCountdown >=
              settings.timeoutSeconds;
          return { ...prev, countdown: newCountdown, timeoutReached };
        });
      }, 1000);
    } else {
      setQueryState((prev) => ({
        ...prev,
        countdown: AVERAGE_QUERY_DURATION_SECONDS,
        timeoutReached: false,
        abortController: null,
      }));
    }

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [queryState.fetchState, settings.timeoutEnabled, settings.timeoutSeconds]);

  const startQuery = useCallback(async (payload: QueryRequestBody) => {
    setQueryState((prev) => ({
      ...prev,
      errorMessage: null,
      fetchState: "loading",
    }));

    const normalizedSession =
      (payload.sessionId || "").trim() || createSessionId();
    if (!(payload.sessionId || "").trim()) {
      setQueryState((prev) => ({ ...prev, sessionId: normalizedSession }));
    }

    const controller = new AbortController();
    setQueryState((prev) => ({ ...prev, abortController: controller }));

    try {
      logger.info("[query] Sending request to internal API", { payload });

      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      setQueryState((prev) => ({
        ...prev,
        result: normalized,
        fetchState: "success",
        abortController: null,
      }));
    } catch (error) {
      logger.error("[n8n] Webhook request failed", error);
      if (error instanceof DOMException && error.name === "AbortError") {
        setQueryState((prev) => ({
          ...prev,
          fetchState: "error",
          errorMessage: "Query cancelled by user.",
          abortController: null,
        }));
        return;
      }
      setQueryState((prev) => ({
        ...prev,
        fetchState: "error",
        errorMessage:
          error instanceof Error ? error.message : "Failed to contact webhook.",
        abortController: null,
      }));
    }
  }, []);

  const cancelQuery = useCallback(() => {
    if (queryState.abortController) {
      queryState.abortController.abort();
      setQueryState((prev) => ({
        ...prev,
        fetchState: "error",
        errorMessage: "Query cancelled by user.",
        abortController: null,
      }));
    }
  }, [queryState.abortController]);

  const resetQuery = useCallback(() => {
    setQueryState((prev) => ({
      ...prev,
      fetchState: "idle",
      result: null,
      errorMessage: null,
      countdown: AVERAGE_QUERY_DURATION_SECONDS,
      timeoutReached: false,
      abortController: null,
    }));
  }, []);

  const updateQueryState = useCallback((updates: Partial<QueryState>) => {
    setQueryState((prev) => ({ ...prev, ...updates }));
  }, []);

  const value: QueryContextType = {
    queryState,
    startQuery,
    cancelQuery,
    resetQuery,
    updateQueryState,
  };

  return (
    <QueryContext.Provider value={value}>{children}</QueryContext.Provider>
  );
};

export const useQuery = () => {
  const context = useContext(QueryContext);
  if (context === undefined) {
    throw new Error("useQuery must be used within a QueryProvider");
  }
  return context;
};
