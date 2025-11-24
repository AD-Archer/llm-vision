"use client";

import { AiLabExperiment } from "../types";
import { Trash2 } from "lucide-react";

interface HistoryPanelProps {
  experiments: AiLabExperiment[];
  selectedExperimentId?: string;
  isLoading: boolean;
  onSelect: (experiment: AiLabExperiment) => void;
  onRefresh: () => void;
  onDelete: (experimentId: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  allUsers: boolean;
  onAllUsersChange: (value: boolean) => void;
  isAdmin: boolean;
}

const StatusStyles: Record<string, string> = {
  COMPLETED: "text-emerald-300 bg-emerald-500/10",
  FAILED: "text-red-300 bg-red-500/10",
  RUNNING: "text-blue-300 bg-blue-500/10",
  PENDING: "text-slate-200 bg-slate-500/10",
};

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString();
}

export function HistoryPanel({
  experiments,
  isLoading,
  onSelect,
  onRefresh,
  onDelete,
  selectedExperimentId,
  search,
  onSearchChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  allUsers,
  onAllUsersChange,
  isAdmin,
}: HistoryPanelProps) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Recent runs
            </p>
            <h4 className="text-lg font-semibold text-white">
              Experiment history
            </h4>
          </div>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-3 py-1 text-xs rounded-full border border-slate-600 text-slate-200 hover:border-blue-500 hover:text-blue-200 disabled:opacity-40"
          >
            {isLoading ? "Updating..." : "Refresh"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={allUsers}
                onChange={(e) => onAllUsersChange(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500"
              />
              Show all users
            </label>
          )}
        </div>
      </div>

      {experiments.length === 0 ? (
        <p className="text-sm text-slate-500">
          No experiments yet. Configure targets and run your first benchmark.
        </p>
      ) : (
        <div className="space-y-3">
          {experiments.map((experiment) => (
            <div
              key={experiment.id}
              className={`rounded-2xl border p-4 transition-all cursor-pointer ${
                experiment.id === selectedExperimentId
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-800 hover:border-slate-600"
              }`}
              onClick={() => onSelect(experiment)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    {experiment.label}
                  </p>
                  {experiment.user?.email && (
                    <p className="text-xs text-blue-400 mb-0.5">
                      {experiment.user.email}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    Started {formatTimestamp(experiment.startedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      StatusStyles[experiment.status] ??
                      "bg-slate-700 text-slate-200"
                    }`}
                  >
                    {experiment.status}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm(
                          `Are you sure you want to delete "${experiment.label}"? This action cannot be undone.`
                        )
                      ) {
                        onDelete(experiment.id);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    title="Delete experiment"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Targets</span>
                  <span className="text-white font-semibold">
                    {experiment.totalCompleted}/{experiment.totalTargets}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Duration</span>
                  <span className="text-white font-semibold">
                    {experiment.durationMs
                      ? `${(experiment.durationMs / 1000).toFixed(2)}s`
                      : "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Finished</span>
                  <span className="text-white font-semibold">
                    {experiment.completedAt
                      ? new Date(experiment.completedAt).toLocaleTimeString()
                      : "--"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
