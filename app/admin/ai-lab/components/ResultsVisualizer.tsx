"use client";

import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Cell,
} from "recharts";
import { AiLabExperiment } from "../types";

interface ResultsVisualizerProps {
  experiment?: AiLabExperiment | null;
}

const FALLBACK_COLORS = [
  "#22d3ee",
  "#f472b6",
  "#a855f7",
  "#34d399",
  "#f97316",
  "#94a3b8",
];

const StatusBadge: Record<string, string> = {
  COMPLETED: "bg-emerald-500/20 text-emerald-300",
  RUNNING: "bg-blue-500/20 text-blue-300",
  FAILED: "bg-red-500/20 text-red-300",
  QUEUED: "bg-slate-500/20 text-slate-200",
};

function formatLatency(value?: number | null) {
  if (value === null || value === undefined) return "--";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(2)} s`;
}

export function ResultsVisualizer({ experiment }: ResultsVisualizerProps) {
  if (!experiment || !experiment.results?.length) {
    return null;
  }

  const chartData = experiment.results.map((result, index) => ({
    name: result.label,
    latency: result.latencyMs ?? 0,
    accuracy:
      typeof result.reviewScore === "number"
        ? Number(((result.reviewScore / 5) * 100).toFixed(1))
        : null,
    color: result.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Latency (ms)
              </p>
              <h4 className="text-lg font-semibold text-white">
                Speed per target
              </h4>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #1e293b",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Bar dataKey="latency" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`latency-${entry.name}-${index}`}
                      fill={entry.color}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Accuracy (%)
              </p>
              <h4 className="text-lg font-semibold text-white">
                Quality vs. expectation
              </h4>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Accuracy"]}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #1e293b",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`accuracy-${entry.name}-${index}`}
                      fill={entry.color}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {experiment.results.map((result, index) => (
          <div
            key={result.id}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Target #{index + 1}
                </p>
                <h5 className="text-lg font-semibold text-white">
                  {result.label}
                </h5>
                <p className="text-xs text-slate-400">{result.modelName}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  StatusBadge[result.status] ?? "bg-slate-600/40 text-slate-200"
                }`}
              >
                {result.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
              <div>
                <p className="text-xs text-slate-500">Latency</p>
                <p className="font-semibold">
                  {formatLatency(result.latencyMs)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Tokens</p>
                <p className="font-semibold">{result.totalTokens ?? "--"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Accuracy</p>
                <p className="font-semibold">
                  {typeof result.accuracyScore === "number"
                    ? `${(result.accuracyScore * 100).toFixed(1)}%`
                    : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Speed Score</p>
                <p className="font-semibold">
                  {typeof result.speedScore === "number"
                    ? (result.speedScore * 100).toFixed(0)
                    : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Cost</p>
                <p className="font-semibold">
                  {result.costEstimate !== null &&
                  result.costEstimate !== undefined
                    ? `$${result.costEstimate.toFixed(4)}`
                    : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">
                  Tokens (prompt / completion)
                </p>
                <p className="font-semibold">
                  {result.promptTokens ?? "--"} /{" "}
                  {result.completionTokens ?? "--"}
                </p>
              </div>
            </div>
            {result.errorMessage && (
              <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                {result.errorMessage}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
