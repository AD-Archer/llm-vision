import type { NormalizedInsight } from "../../../utils/chartConfig";
import ChartRenderer from "../../../components/ChartRenderer";
import { useMemo, useState } from "react";

interface ResultDisplayProps {
  result: NormalizedInsight;
  onSaveChart: () => Promise<void>;
  autoSaveQueries?: boolean;
  savedQueryId?: string;
  onToggleFavorite?: (queryId: string, isFavorite: boolean) => Promise<void>;
}

export function ResultDisplay({
  result,
  onSaveChart,
  autoSaveQueries = false,
  savedQueryId,
  onToggleFavorite,
}: ResultDisplayProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const resultMeta = useMemo(() => {
    const meta = result.chart?.meta;
    return {
      title: meta?.title ?? "Visualization",
      description: meta?.description ?? "",
    };
  }, [result]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveChart();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!savedQueryId || !onToggleFavorite) return;
    setIsSaving(true);
    try {
      await onToggleFavorite(savedQueryId, !isFavorite);
      setIsFavorite(!isFavorite);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="px-2 sm:px-0">
        {resultMeta?.title ? (
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            {resultMeta.title}
          </h2>
        ) : null}
        {result.insightText ? (
          <p className="text-slate-300 mb-4 text-sm sm:text-base">
            {result.insightText}
          </p>
        ) : null}
        {resultMeta?.description ? (
          <p className="text-slate-400 text-sm sm:text-base">
            {resultMeta.description}
          </p>
        ) : null}
      </div>

      {result.chart ? (
        <div className="bg-slate-900 rounded-lg p-2 sm:p-4 border border-slate-700 overflow-x-auto">
          <ChartRenderer config={result.chart} />
        </div>
      ) : (
        <div className="text-center py-6 sm:py-8 bg-yellow-900/20 border border-yellow-700 rounded-lg px-3 sm:px-0">
          <p className="text-yellow-400 mb-2 text-sm sm:text-base">
            The workflow response did not include chartable data.
          </p>
          <p className="text-yellow-500 text-xs sm:text-sm">
            Ensure your AI returns the JSON schema described in the README,
            including{" "}
            <code className="bg-yellow-900/30 px-2 py-1 rounded text-xs">
              chart.data
            </code>{" "}
            with numeric series.
          </p>
        </div>
      )}

      {/* Save/Favorite Button */}
      <div className="flex justify-center">
        {autoSaveQueries && savedQueryId ? (
          <button
            onClick={handleToggleFavorite}
            disabled={isSaving}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <span>{isFavorite ? "★" : "☆"}</span>
            {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          </button>
        ) : !autoSaveQueries ? (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <span>💾</span>
            {isSaving ? "Saving..." : "Save Query"}
          </button>
        ) : null}
      </div>

      <details className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <summary
          className="cursor-pointer font-medium text-slate-300 hover:text-blue-400"
          onClick={() => setShowRaw(!showRaw)}
        >
          {showRaw ? "Hide raw JSON preview" : "Show raw JSON preview"}
        </summary>
        {showRaw && (
          <pre className="mt-4 bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto text-sm border border-slate-600">
            {JSON.stringify(result.raw, null, 2)}
          </pre>
        )}
      </details>
    </div>
  );
}
