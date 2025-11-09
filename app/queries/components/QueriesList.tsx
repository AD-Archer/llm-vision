import type { NormalizedInsight } from "../../../utils/chartConfig";
import { Star, Inbox } from "lucide-react";

export interface SavedQuery {
  id: string;
  question: string;
  result: NormalizedInsight;
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  visualizationName?: string;
}

interface QueriesListProps {
  queries: SavedQuery[];
  selectedQuery: SavedQuery | null;
  onSelectQuery: (query: SavedQuery) => void;
  formatDate: (timestamp: number) => string;
}

export function QueriesList({
  queries,
  selectedQuery,
  onSelectQuery,
  formatDate,
}: QueriesListProps) {
  if (queries.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="p-6 sm:p-8 text-center">
          <Inbox className="w-16 h-16 mx-auto mb-3 text-slate-400" />
          <p className="text-slate-400 text-sm sm:text-base">
            No saved queries yet. Start by asking questions in the dashboard!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <div className="max-h-[600px] overflow-y-auto">
        {queries.map((query) => (
          <button
            key={query.id}
            onClick={() => onSelectQuery(query)}
            className={`w-full text-left p-4 border-b border-slate-700 hover:bg-slate-700 transition-colors ${
              selectedQuery?.id === query.id ? "bg-slate-700" : ""
            }`}
          >
            <div className="flex items-start gap-2">
              {query.isFavorite && (
                <Star className="text-yellow-400 flex-shrink-0 mt-0.5 w-4 h-4 fill-current" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white line-clamp-2">
                  {query.visualizationName ||
                    query.result.chart?.meta?.visualizationName ||
                    "Untitled"}
                </p>
                <p className="text-xs text-slate-400 mt-1 line-clamp-1 overflow-hidden text-ellipsis">
                  {query.question}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Updated {formatDate(query.updatedAt)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
