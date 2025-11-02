import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import ChartRenderer from "./components/ChartRenderer";
import type { ChartType, InsightResponse, QueryRequestBody } from "./types";
import { normalizeInsight, type NormalizedInsight } from "./utils/chartConfig";
import "./App.css";

const DEFAULT_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL ?? "";
const DEFAULT_TIMEOUT_SECONDS = (() => {
  const envValue = import.meta.env.VITE_WEBHOOK_TIMEOUT_MS;
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

const App = () => {
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
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>LLM Visualization Dashboard</h1>
          <p className="subtitle">
            Ask your RAG workflow for insights, let it choose how to visualize
            the answer, or override the chart yourself.
          </p>
        </div>
      </header>

      <section className="panel">
        <form className="query-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="question">Ask a question</label>
            <textarea
              id="question"
              placeholder="e.g. Show me weekly active users vs signups"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              required
              disabled={disabled}
              rows={3}
            />
          </div>

          <div className="field-row">
            <div className="field-group">
              <label htmlFor="chartType">Preferred chart</label>
              <select
                id="chartType"
                value={chartType}
                onChange={(event) =>
                  setChartType(event.target.value as ChartType)
                }
                disabled={disabled}
              >
                {chartTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <details className="developer-tools">
            <summary>Developer Tools</summary>
            <div className="developer-fields">
              <div className="field-group">
                <label htmlFor="webhook">n8n webhook URL</label>
                <input
                  id="webhook"
                  type="url"
                  placeholder="https://example.n8n.cloud/webhook/demo"
                  value={webhookUrl}
                  onChange={(event) => setWebhookUrl(event.target.value)}
                  disabled={disabled}
                />
                <small>
                  Leave blank to use `VITE_N8N_WEBHOOK_URL`. Request body:{" "}
                  <code>{"{ question, chartType, sessionId, chatInput }"}</code>
                </small>
              </div>

              <div className="field-group">
                <label htmlFor="timeout">Request timeout (seconds)</label>
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
                      setTimeoutSeconds(Math.max(5, Math.min(600, nextValue)));
                    }
                  }}
                  disabled={disabled}
                />
                <small>
                  Increase if your workflow takes longer to respond. Current
                  wait: {timeoutSeconds} s
                </small>
              </div>

              <div className="field-group">
                <label htmlFor="sessionId">Session ID</label>
                <div className="inline-input">
                  <input
                    id="sessionId"
                    type="text"
                    value={sessionId}
                    onChange={(event) => setSessionId(event.target.value)}
                    disabled={disabled}
                    placeholder="session-123"
                  />
                  <button
                    type="button"
                    className="ghost-button inline"
                    onClick={handleSessionReset}
                    disabled={disabled}
                  >
                    New ID
                  </button>
                </div>
                <small>
                  Persisted locally so your AI memory stays in sync.
                </small>
              </div>
            </div>
          </details>

          <div className="actions">
            <button type="submit" disabled={disabled}>
              {fetchState === "loading"
                ? "Contacting webhook…"
                : "Run workflow"}
            </button>
            {errorMessage ? (
              <p className="error" role="alert">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel">
        {fetchState === "idle" && (
          <p className="placeholder">Run a workflow to visualize data.</p>
        )}
        {fetchState === "loading" && <p className="placeholder">Loading…</p>}
        {fetchState === "success" && result ? (
          <div className="results">
            <div className="insight">
              {resultMeta?.title ? <h2>{resultMeta.title}</h2> : null}
              {result.insightText ? (
                <p className="insight-text">{result.insightText}</p>
              ) : null}
              {resultMeta?.description ? (
                <p className="insight-description">{resultMeta.description}</p>
              ) : null}
            </div>

            {result.chart ? (
              <ChartRenderer config={result.chart} />
            ) : (
              <div className="placeholder">
                <p>The workflow response did not include chartable data.</p>
                <p>
                  Ensure your AI returns the JSON schema described in the
                  README, including <code>chart.data</code> with numeric series.
                </p>
              </div>
            )}

            <div className="result-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={handleSaveChart}
              >
                Save this chart
              </button>
            </div>

            <details
              open={showRaw}
              onToggle={(event) =>
                setShowRaw((event.target as HTMLDetailsElement).open)
              }
            >
              <summary>
                {showRaw ? "Hide raw JSON preview" : "Show raw JSON preview"}
              </summary>
              <pre className="raw-json">
                {JSON.stringify(result.raw, null, 2)}
              </pre>
            </details>

            <form className="followup-form" onSubmit={handleSubmit}>
              <div className="field-group">
                <label htmlFor="followup">Ask a follow-up question</label>
                <textarea
                  id="followup"
                  placeholder="e.g. Show me the same data by region"
                  value={followUpQuestion}
                  onChange={(event) => setFollowUpQuestion(event.target.value)}
                  disabled={disabled}
                  rows={2}
                />
              </div>
              <button
                type="submit"
                disabled={disabled || !followUpQuestion.trim()}
              >
                {disabled ? "Loading…" : "Ask follow-up"}
              </button>
            </form>
          </div>
        ) : null}
        {fetchState === "error" && !errorMessage && (
          <p className="placeholder">Something went wrong. Try again.</p>
        )}
      </section>

      {savedItems.length > 0 && (
        <section className="panel">
          <h2>Saved Charts</h2>
          <div className="saved-items">
            {savedItems.map((item) => (
              <div key={item.id} className="saved-item">
                <div className="saved-item-content">
                  <h3>{item.result.chart?.meta?.title || "Untitled"}</h3>
                  <p className="saved-item-question">{item.question}</p>
                  <p className="saved-item-date">
                    {new Date(item.timestamp).toLocaleDateString()} at{" "}
                    {new Date(item.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="saved-item-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => handleLoadSavedItem(item)}
                    disabled={disabled}
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    className="ghost-button danger"
                    onClick={() => handleDeleteSavedItem(item.id)}
                    disabled={disabled}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default App;
