"use client";

import { useState } from "react";
import { normalizeInsight } from "@/utils/chartConfig";
import type { InsightResponse } from "@/types";
import type { NormalizedInsight } from "@/utils/chartConfig";
import { ResultDisplay } from "./ResultDisplay";

const extractJsonPayload = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("```")) {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match?.[1]) {
      return match[1];
    }
  }
  return trimmed;
};

interface RawJsonInputProps {
  onClose: () => void;
}

export function RawJsonInput({ onClose }: RawJsonInputProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NormalizedInsight | null>(null);
  const [isValidated, setIsValidated] = useState(false);

  const handleValidate = () => {
    setError(null);
    try {
      const sanitized = extractJsonPayload(jsonInput);
      if (!sanitized) {
        setError("Please enter JSON data");
        return;
      }

      const parsed = JSON.parse(sanitized) as InsightResponse;
      const normalized = normalizeInsight(parsed);

      if (!normalized.chart && !normalized.raw) {
        setError(
          "Invalid response format. Please ensure your JSON contains insight data."
        );
        return;
      }

      setResult(normalized);
      setIsValidated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse JSON");
      setResult(null);
      setIsValidated(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Raw JSON Input</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 transition-colors text-2xl"
        >
          ✕
        </button>
      </div>

      {!isValidated ? (
        <>
          <p className="text-slate-400 text-sm">
            Paste raw JSON from your AI workflow response to preview results
            without sending data to a webhook.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              JSON Response
            </label>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`Paste your JSON here, e.g.:
{
  "insight": "...",
  "chart": { ... }
}`}
              rows={10}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleValidate}
              disabled={!jsonInput.trim()}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Preview
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
            <p className="text-green-300 text-sm">
              ✓ JSON validated successfully
            </p>
          </div>

          {result && (
            <div>
              <ResultDisplay
                result={result}
                onSaveChart={async () => {
                  // User can manually save from dashboard if needed
                }}
                autoSaveQueries={false}
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setJsonInput("");
                setResult(null);
                setIsValidated(false);
                setError(null);
              }}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Try Another
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-medium rounded-lg transition-all"
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}
