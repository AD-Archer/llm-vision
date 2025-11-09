import type { SavedQuery } from "./QueriesList";
import { Star } from "lucide-react";

interface QueryMetadataProps {
  query: SavedQuery;
  formatDate: (timestamp: number) => string;
}

export function QueryMetadata({ query, formatDate }: QueryMetadataProps) {
  return (
    <div className="mb-4 sm:mb-6">
      <h3 className="text-xs sm:text-sm font-medium text-slate-300 mb-3">
        Details
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div className="bg-slate-900 p-2 sm:p-3 rounded-lg">
          <p className="text-xs text-slate-400">Created</p>
          <p className="text-xs sm:text-sm text-white mt-1">
            {formatDate(query.createdAt)}
          </p>
        </div>
        <div className="bg-slate-900 p-2 sm:p-3 rounded-lg">
          <p className="text-xs text-slate-400">Last Updated</p>
          <p className="text-xs sm:text-sm text-white mt-1">
            {formatDate(query.updatedAt)}
          </p>
        </div>
        <div className="bg-slate-900 p-2 sm:p-3 rounded-lg">
          <p className="text-xs text-slate-400">Chart Type</p>
          <p className="text-xs sm:text-sm text-white mt-1 capitalize">
            {query.result.chart?.type || "Unknown"}
          </p>
        </div>
        <div className="bg-slate-900 p-2 sm:p-3 rounded-lg">
          <p className="text-xs text-slate-400">Status</p>
          <p className="text-xs sm:text-sm text-white mt-1 flex items-center gap-1">
            {query.isFavorite ? (
              <>
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                Favorite
              </>
            ) : (
              "Regular"
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
