import type { SavedQuery } from "./QueriesList";
import type { FollowUp } from "../../../types";
import type { NormalizedInsight } from "../../../utils/chartConfig";
import ChartRenderer from "../../../components/ChartRenderer";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";

interface ChainItem {
  id: string;
  type: "query" | "followup" | "parent";
  question: string;
  result: NormalizedInsight;
  name?: string;
  isFavorite: boolean;
  chartType?: string;
  createdAt: number;
  updatedAt: number;
  item: SavedQuery | FollowUp;
}

interface QueryChainItemProps {
  chainItem: ChainItem;
  index: number;
  total: number;
  onSelect?: () => void;
  onRunNewQuery?: () => void;
  formatDate: (timestamp: number) => string;
  isSelected?: boolean;
  initialExpanded?: boolean;
}

export function QueryChainItem({
  chainItem,
  index,
  total,
  onSelect,
  onRunNewQuery,
  formatDate,
  isSelected,
  initialExpanded = false,
}: QueryChainItemProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [showRawJson, setShowRawJson] = useState(false);

  return (
    <div className="relative">
      {/* Chain connector line */}
      {index < total - 1 && (
        <div className="absolute left-6 top-12 w-0.5 h-8 bg-slate-600 z-0" />
      )}

      <div
        className={`relative bg-slate-750 border border-slate-600 rounded-lg p-4 hover:bg-slate-700 transition-colors group cursor-pointer ${
          isSelected ? "ring-2 ring-blue-500" : ""
        }`}
        onClick={() => {
          setIsExpanded(!isExpanded);
          if (onSelect) {
            onSelect();
          }
        }}
      >
        {/* Chain indicator */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-6 h-6 flex items-center justify-center rounded flex-shrink-0 transition-colors ${
              isExpanded ? "bg-slate-600" : "bg-slate-700"
            }`}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div
            className={`w-3 h-3 rounded-full flex-shrink-0 ${
              chainItem.type === "query"
                ? "bg-blue-500"
                : chainItem.type === "parent"
                ? "bg-purple-500"
                : "bg-green-500"
            }`}
          />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            {chainItem.type === "query"
              ? "Original Query"
              : chainItem.type === "parent"
              ? "Parent Follow-up"
              : `Follow-up ${index}`}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white line-clamp-1">
              {chainItem.name || chainItem.question}
            </h3>
          </div>
          {onRunNewQuery && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRunNewQuery();
              }}
              className="flex-shrink-0 mr-2"
              title="Run new query based on this"
            >
              <Plus className="w-4 h-4 text-slate-400 hover:text-blue-400 transition-colors" />
            </button>
          )}
        </div>

        {/* Question */}
        <div className="mb-4">
          <p className="text-xs text-slate-400 mb-2">{chainItem.question}</p>
          <p className="text-xs text-slate-500">
            {formatDate(chainItem.updatedAt)}
          </p>
        </div>

        {/* Content - Conditionally shown based on isExpanded */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-600 space-y-4">
            {/* Chart Display */}
            {chainItem.result.chart && (
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">
                  Visualization
                </h4>
                <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 overflow-x-auto">
                  <ChartRenderer config={chainItem.result.chart} />
                </div>
              </div>
            )}

            {/* Insight */}
            {chainItem.result.insightText && (
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">
                  Insight
                </h4>
                <p className="text-slate-300 p-3 bg-slate-900 rounded-lg text-sm leading-relaxed">
                  {chainItem.result.insightText}
                </p>
              </div>
            )}

            {/* Data Points */}
            {chainItem.result.chart?.data &&
              chainItem.result.chart.data.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">
                    Data Points ({chainItem.result.chart.data.length})
                  </h4>
                  <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-700">
                          {Object.keys(
                            chainItem.result.chart.data[0] || {}
                          ).map((key) => (
                            <th
                              key={key}
                              className="text-left p-2 text-slate-300 font-medium"
                            >
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {chainItem.result.chart.data
                          .slice(0, 10)
                          .map((row, idx) => (
                            <tr key={idx} className="border-b border-slate-700">
                              {Object.values(row).map((value, cellIdx) => (
                                <td
                                  key={cellIdx}
                                  className="p-2 text-slate-400"
                                >
                                  {String(value)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        {chainItem.result.chart.data.length > 10 && (
                          <tr>
                            <td
                              colSpan={
                                Object.keys(
                                  chainItem.result.chart.data[0] || {}
                                ).length
                              }
                              className="p-2 text-slate-500 text-center"
                            >
                              ... and {chainItem.result.chart.data.length - 10}{" "}
                              more rows
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Raw JSON Toggle */}
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRawJson(!showRawJson);
                }}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded transition-colors"
              >
                {showRawJson ? "Hide" : "View"} Raw JSON
              </button>
              {showRawJson && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">
                    Raw Response
                  </h4>
                  <pre className="bg-slate-900 rounded-lg p-3 border border-slate-700 overflow-x-auto text-xs text-slate-300 whitespace-pre-wrap">
                    {JSON.stringify(chainItem.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
