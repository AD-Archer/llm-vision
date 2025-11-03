import ChartRenderer from "../../../components/ChartRenderer";
import type { SavedQuery } from "./QueriesList";

interface QueryDetailsProps {
  query: SavedQuery;
}

export function QueryDetails({ query }: QueryDetailsProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Question */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
          Query
        </h2>
        <p className="text-slate-300 p-3 sm:p-4 bg-slate-900 rounded-lg text-sm sm:text-base">
          {query.question}
        </p>
      </div>

      {/* Chart Display */}
      {query.result.chart && (
        <div>
          <h3 className="text-xs sm:text-sm font-medium text-slate-300 mb-3">
            Visualization
          </h3>
          <div className="bg-slate-900 rounded-lg p-2 sm:p-4 border border-slate-700 overflow-x-auto">
            <ChartRenderer config={query.result.chart} />
          </div>
        </div>
      )}

      {/* Insight */}
      {query.result.insightText && (
        <div>
          <h3 className="text-xs sm:text-sm font-medium text-slate-300 mb-3">
            Insight
          </h3>
          <p className="text-slate-300 p-3 sm:p-4 bg-slate-900 rounded-lg text-xs sm:text-sm leading-relaxed">
            {query.result.insightText}
          </p>
        </div>
      )}

      {/* Data Points */}
      {query.result.chart?.data && query.result.chart.data.length > 0 && (
        <div>
          <h3 className="text-xs sm:text-sm font-medium text-slate-300 mb-3">
            Data Points ({query.result.chart.data.length})
          </h3>
          <div className="bg-slate-900 rounded-lg p-3 sm:p-4 max-h-[250px] sm:max-h-[300px] overflow-y-auto">
            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words">
              {JSON.stringify(query.result.chart.data.slice(0, 5), null, 2)}
            </pre>
            {query.result.chart.data.length > 5 && (
              <p className="text-xs text-slate-400 mt-2">
                ... and {query.result.chart.data.length - 5} more rows
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
