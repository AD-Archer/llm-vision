import { useState } from "react";
import { Search, Filter, X, Calendar, BarChart3, Star } from "lucide-react";

export interface SearchFilters {
  searchTerm: string;
  chartTypes: string[];
  dateFrom: string;
  dateTo: string;
  showFavoritesOnly: boolean;
  showAllUsers: boolean;
  sortBy: "recent" | "oldest";
}

interface AdvancedSearchProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availableChartTypes: string[];
  isAdmin?: boolean;
}

export function AdvancedSearch({
  filters,
  onFiltersChange,
  availableChartTypes,
  isAdmin = false,
}: AdvancedSearchProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleChartType = (chartType: string) => {
    const newTypes = filters.chartTypes.includes(chartType)
      ? filters.chartTypes.filter((t) => t !== chartType)
      : [...filters.chartTypes, chartType];
    updateFilter("chartTypes", newTypes);
  };

  const clearFilters = () => {
    onFiltersChange({
      searchTerm: "",
      chartTypes: [],
      dateFrom: "",
      dateTo: "",
      showFavoritesOnly: false,
      showAllUsers: false,
      sortBy: "recent",
    });
  };

  const hasActiveFilters =
    filters.searchTerm ||
    filters.chartTypes.length > 0 ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.showFavoritesOnly ||
    filters.showAllUsers;

  return (
    <div className="w-full space-y-4">
      {/* Main Search Bar */}
      <div className="w-full flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, question, or description..."
            value={filters.searchTerm}
            onChange={(e) => updateFilter("searchTerm", e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-4 py-2.5 rounded-lg border transition-colors flex items-center gap-2 whitespace-nowrap ${
              showAdvanced || hasActiveFilters
                ? "bg-blue-900/30 border-blue-700 text-blue-400"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {
                  [
                    filters.searchTerm,
                    ...filters.chartTypes,
                    filters.dateFrom,
                    filters.dateTo,
                    filters.showFavoritesOnly,
                    filters.showAllUsers,
                  ].filter(Boolean).length
                }
              </span>
            )}
          </button>

          <select
            value={filters.sortBy}
            onChange={(e) =>
              updateFilter("sortBy", e.target.value as "recent" | "oldest")
            }
            className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="recent">Most Recent</option>
            <option value="oldest">Oldest First</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-red-400 hover:border-red-700 transition-colors flex items-center gap-2"
              title="Clear all filters"
            >
              <X className="w-4 h-4" />
              <span className="hidden md:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Date Range */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Calendar className="w-4 h-4" />
              Date Range
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  From
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter("dateFrom", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter("dateTo", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Chart Types */}
          {availableChartTypes.length > 0 && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <BarChart3 className="w-4 h-4" />
                Chart Types
              </label>
              <div className="flex flex-wrap gap-2">
                {availableChartTypes.map((chartType) => (
                  <button
                    key={chartType}
                    onClick={() => toggleChartType(chartType)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      filters.chartTypes.includes(chartType)
                        ? "bg-blue-900/30 border-blue-700 text-blue-400"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    {chartType}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Favorites Toggle */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Star className="w-4 h-4" />
              Show Favorites Only
            </label>
            <button
              onClick={() =>
                updateFilter("showFavoritesOnly", !filters.showFavoritesOnly)
              }
              className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                filters.showFavoritesOnly
                  ? "bg-yellow-900/30 border-yellow-700 text-yellow-400"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              {filters.showFavoritesOnly
                ? "Showing favorites only"
                : "Show all queries"}
            </button>
          </div>

          {/* Show All Users Toggle (Admin Only) */}
          {isAdmin && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Search className="w-4 h-4" />
                Show All Users&apos; Queries
              </label>
              <button
                onClick={() =>
                  updateFilter("showAllUsers", !filters.showAllUsers)
                }
                className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                  filters.showAllUsers
                    ? "bg-purple-900/30 border-purple-700 text-purple-400"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                {filters.showAllUsers
                  ? "Showing all users' queries"
                  : "Show my queries only"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
