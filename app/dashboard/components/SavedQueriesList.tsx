import type { SavedItem } from "../page";

interface SavedQueriesListProps {
  savedItems: SavedItem[];
  onLoadItem: (item: SavedItem) => void;
  onDeleteItem: (itemId: string) => void;
  disabled: boolean;
}

export function SavedQueriesList({
  savedItems,
  onLoadItem,
  onDeleteItem,
  disabled,
}: SavedQueriesListProps) {
  if (savedItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Recent Queries</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {savedItems.slice(0, 6).map((item) => (
          <div
            key={item.id}
            className="bg-slate-700 border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors"
          >
            <div className="mb-3">
              <h3 className="font-semibold text-white mb-1 line-clamp-2">
                {item.visualizationName ||
                  item.result.chart?.meta?.visualizationName ||
                  item.result.chart?.meta?.title ||
                  "Untitled"}
              </h3>
              <p className="text-slate-300 text-xs mb-2 line-clamp-1 overflow-hidden text-ellipsis">
                {item.question}
              </p>
              <p className="text-slate-400 text-xs">
                {new Date(item.updatedAt).toLocaleDateString()} at{" "}
                {new Date(item.updatedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onLoadItem(item)}
                disabled={disabled}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors disabled:opacity-50 truncate"
              >
                Load
              </button>
              <button
                type="button"
                onClick={() => onDeleteItem(item.id)}
                disabled={disabled}
                className="px-3 py-2 bg-red-900/30 hover:bg-red-900/40 text-red-400 text-sm rounded border border-red-700 transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
