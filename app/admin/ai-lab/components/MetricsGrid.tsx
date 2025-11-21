"use client";

import { AiLabExperiment } from "../types";

interface MetricsGridProps {
  experiment?: AiLabExperiment | null;
}

const formatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 1,
});

function formatDuration(ms?: number | null) {
  if (!ms && ms !== 0) return "--";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function MetricsGrid({ experiment }: MetricsGridProps) {
  if (!experiment) return null;

  const results = experiment.results ?? [];

  // Calculate accuracy based on manual review scores (1-5)
  const reviewScores = results
    .map((result) => result.reviewScore)
    .filter((score): score is number => typeof score === "number" && score > 0);

  const avgAccuracy =
    reviewScores.length > 0
      ? reviewScores.reduce((sum, score) => sum + score / 5, 0) /
        reviewScores.length
      : null;

  const latencyValues = results
    .map((result) => result.latencyMs)
    .filter((value): value is number => typeof value === "number");
  const avgLatency =
    latencyValues.length > 0
      ? Math.round(
          latencyValues.reduce((sum, value) => sum + value, 0) /
            latencyValues.length
        )
      : null;

  const totalTokens = results.reduce((sum, result) => {
    return sum + (result.totalTokens ?? 0);
  }, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4 shadow-lg">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Manual Accuracy
        </p>
        <p className="text-3xl font-bold text-white mt-2">
          {avgAccuracy !== null ? percentFormatter.format(avgAccuracy) : "--"}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Based on manual feedback scores
        </p>
      </div>
      <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4 shadow-lg">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Avg Latency
        </p>
        <p className="text-3xl font-bold text-white mt-2">
          {avgLatency !== null ? formatDuration(avgLatency) : "--"}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Across {latencyValues.length || "0"} completed targets
        </p>
      </div>
      <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4 shadow-lg">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Total Tokens
        </p>
        <p className="text-3xl font-bold text-white mt-2">
          {formatter.format(totalTokens)}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Includes prompt + completion tokens when provided
        </p>
      </div>
    </div>
  );
}
