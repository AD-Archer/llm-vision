"use client";

import { useState, useMemo } from "react";
import type { FormEvent } from "react";
import { marked } from "marked";
import { useSettings } from "../../../context/SettingsContext";
import { logger } from "../../../utils/logger";

const createSessionId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `session-${Math.random().toString(36).slice(2, 11)}`;
};

const PROMPT_SUGGESTIONS = [
  "What are the key metrics for student success?",
  "How can I analyze partner engagement?",
  "What questions should I ask about attendance?",
  "Generate a query for certification rates.",
];

interface PromptHelperChatProps {
  onPromptGenerated?: (prompt: string) => void;
}

export function PromptHelperChat({}: PromptHelperChatProps) {
  // onPromptGenerated is kept for interface compatibility but not used since we removed SQL extraction
  const { settings } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [sessionId] = useState(createSessionId);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const webhookUrl = settings.promptHelperWebhookUrl?.trim();
  const canSubmit = Boolean(webhookUrl);

  const renderedResponse = useMemo(() => {
    if (!response) return null;
    return marked(response);
  }, [response]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Validate URL
      try {
        new URL(webhookUrl);
      } catch {
        throw new Error("Invalid webhook URL");
      }

      const payload = {
        question: question.trim(),
        sessionId,
        chatInput: question.trim(),
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...settings.promptHelperHeaders,
      };

      // Add basic auth if provided
      if (settings.promptHelperUsername && settings.promptHelperPassword) {
        const auth = btoa(
          `${settings.promptHelperUsername}:${settings.promptHelperPassword}`
        );
        headers.Authorization = `Basic ${auth}`;
      }

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      // Check if response is streaming
      const contentType = res.headers.get("content-type");
      if (
        contentType?.includes("text/plain") ||
        contentType?.includes("text/event-stream")
      ) {
        // Handle streaming response
        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        let accumulatedResponse = "";
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Split by newlines to get complete JSON objects
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const event = JSON.parse(line.trim());
                  if (event.content) {
                    accumulatedResponse += event.content;
                    // Update response in real-time
                    setResponse(accumulatedResponse);
                  }
                } catch {
                  // If not valid JSON, treat as raw text
                  accumulatedResponse += line;
                  setResponse(accumulatedResponse);
                }
              }
            }
          }

          // Process any remaining buffer
          if (buffer.trim()) {
            try {
              const event = JSON.parse(buffer.trim());
              if (event.content) {
                accumulatedResponse += event.content;
                setResponse(accumulatedResponse);
              }
            } catch {
              accumulatedResponse += buffer;
              setResponse(accumulatedResponse);
            }
          }
        } finally {
          reader.releaseLock();
        }

        // Response is complete - just display the accumulated markdown
        setResponse(accumulatedResponse);
      } else {
        // Handle single POST response
        const responseText = await res.text();

        // Check if it's the JSON event stream format
        if (responseText.includes('{"type":"item","content":')) {
          // Parse JSON event stream and extract content
          const lines = responseText.split("\n").filter((line) => line.trim());
          let fullContent = "";

          for (const line of lines) {
            try {
              const event = JSON.parse(line.trim());
              if (event.content) {
                fullContent += event.content;
              }
            } catch {
              // Skip invalid JSON lines
            }
          }

          setResponse(fullContent);
        } else {
          // Try to parse as regular JSON response
          try {
            const data = JSON.parse(responseText);
            setResponse(
              data.response ||
                data.answer ||
                data.content ||
                data.output ||
                "Response received"
            );
          } catch {
            // If not JSON, treat as raw markdown response
            setResponse(responseText);
          }
        }
      }
    } catch (err) {
      logger.error("Prompt helper error:", err);
      setError(err instanceof Error ? err.message : "Failed to get response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuestion(suggestion);
  };

  if (!isExpanded) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-lg p-6">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full text-left flex items-center justify-between text-white hover:bg-slate-700 p-3 rounded transition-colors"
        >
          <span className="text-sm font-medium">
            Get help crafting your prompt
          </span>
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-lg p-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Prompt Helper</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Ask for help with your data analysis question
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. How can I analyze student progress?"
            required
            disabled={isLoading}
            rows={2}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading || !canSubmit || !question.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isLoading ? "Getting help..." : "Get Help"}
          </button>
        </div>

        {error && (
          <div className="text-red-400 bg-red-900/20 border border-red-700 rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}
      </form>

      <div>
        <p className="text-xs text-slate-400 mb-3">Quick suggestions:</p>
        <div className="grid grid-cols-1 gap-3">
          {PROMPT_SUGGESTIONS.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-left px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs rounded transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {(isLoading || response) && (
        <div className="p-6 bg-slate-700 rounded-lg">
          <p className="text-xs text-slate-400 mb-4">AI Response:</p>
          {isLoading && !response ? (
            <div className="flex items-center space-x-3 py-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <p className="text-sm text-slate-300">Getting AI assistance...</p>
            </div>
          ) : (
            <div
              className="text-sm text-white prose prose-invert prose-sm max-w-none leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderedResponse || "" }}
            />
          )}
        </div>
      )}
    </div>
  );
}
