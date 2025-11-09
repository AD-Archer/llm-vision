import type { SavedQuery } from "./QueriesList";
import { RotateCcw, Sparkles, Star, Copy, Trash2 } from "lucide-react";

interface QueryActionsProps {
  query: SavedQuery;
  onRerun: (query: SavedQuery) => void;
  onUpdate: (query: SavedQuery) => void;
  onToggleFavorite: (id: string) => void;
  onCopy: (query: SavedQuery) => void;
  onDelete: (id: string) => void;
  isUpdating: boolean;
}

export function QueryActions({
  query,
  onRerun,
  onUpdate,
  onToggleFavorite,
  onCopy,
  onDelete,
  isUpdating,
}: QueryActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-slate-700">
      <button
        onClick={() => onRerun(query)}
        className="flex-1 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <RotateCcw className="w-4 h-4" />
        Re-run Query
      </button>
      <button
        onClick={() => onUpdate(query)}
        disabled={isUpdating}
        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Update with Latest Data
      </button>
      <button
        onClick={() => onToggleFavorite(query.id)}
        className={`px-4 py-2 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
          query.isFavorite
            ? "bg-yellow-600 hover:bg-yellow-700 text-white"
            : "bg-slate-700 hover:bg-slate-600 text-slate-200"
        }`}
      >
        <Star className={`w-4 h-4 ${query.isFavorite ? "fill-current" : ""}`} />
        Favorite
      </button>
      <button
        onClick={() => onCopy(query)}
        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Copy className="w-4 h-4" />
        Copy
      </button>
      <button
        onClick={() => onDelete(query.id)}
        className="px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>
    </div>
  );
}
