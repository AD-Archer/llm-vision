import type { NormalizedInsight } from "../../../utils/chartConfig";
import ChartRenderer from "../../../components/ChartRenderer";
import { useMemo } from "react";

interface ResultDisplayProps {
  result: NormalizedInsight;
  onSaveChart: () => void;
  showRaw: boolean;
  updatingQueryId: string | null;
}

export function ResultDisplay({
  result,
  showRaw,
}: ResultDisplayProps) {
  const resultMeta = useMemo(() => {
    const meta = result.chart?.meta;
    return {
      title: meta?.title ?? "Visualization",
      description: meta?.description ?? "",
    };
  }, [result]);

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

      <div className="flex justify-center">
      </div>

      <details className="bg-slate-700 rounded-lg p-4 border border-slate-600">
        <summary className="cursor-pointer font-medium text-slate-300 hover:text-blue-400">
          {showRaw ? "Hide raw JSON preview" : "Show raw JSON preview"}
        </summary>
        <pre className="mt-4 bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto text-sm border border-slate-600">
          {JSON.stringify(result.raw, null, 2)}
        </pre>
      </details>
    </div>
  );
}
