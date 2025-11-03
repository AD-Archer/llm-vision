interface QueryControlsProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: "recent" | "oldest";
  onSortChange: (sort: "recent" | "oldest") => void;
  onClearAll: () => void;
  hasQueries: boolean;
}

export function QueryControls({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  onClearAll,
  hasQueries,
}: QueryControlsProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <input
        type="text"
        placeholder="Search queries..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as "recent" | "oldest")}
        className="px-3 sm:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        <option value="recent">Most Recent</option>
        <option value="oldest">Oldest First</option>
      </select>
      {hasQueries && (
        <button
          onClick={onClearAll}
          className="px-3 sm:px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-700 rounded-lg transition-colors text-sm"
        >
          Clear All
        </button>
      )}
    </div>
  );
}
