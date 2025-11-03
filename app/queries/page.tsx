"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import ChartRenderer from "../../components/ChartRenderer";
import type { NormalizedInsight } from "../../utils/chartConfig";

interface SavedQuery {
  id: string;
  question: string;
  result: NormalizedInsight;
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
}

export default function QueriesPage() {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<SavedQuery | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "oldest">("recent");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("llm-visi-saved-items");
    if (stored) {
      try {
        setSavedQueries(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse saved queries", e);
      }
    }
  }, []);

  const handleDeleteQuery = (id: string) => {
    const updated = savedQueries.filter((q) => q.id !== id);
    setSavedQueries(updated);
    localStorage.setItem("llm-visi-saved-items", JSON.stringify(updated));
    if (selectedQuery?.id === id) {
      setSelectedQuery(null);
    }
  };

  const handleToggleFavorite = (id: string) => {
    const updated = savedQueries.map((q) =>
      q.id === id ? { ...q, isFavorite: !q.isFavorite } : q
    );
    setSavedQueries(updated);
    localStorage.setItem("llm-visi-saved-items", JSON.stringify(updated));
    if (selectedQuery?.id === id) {
      setSelectedQuery({
        ...selectedQuery,
        isFavorite: !selectedQuery.isFavorite,
      });
    }
  };

  const handleUpdateGraph = async (query: SavedQuery) => {
    setUpdatingId(query.id);
    // Store the query with previous data so we can update it
    const updatePayload = {
      id: query.id,
      question: query.question,
      previousData: query.result,
    };
    sessionStorage.setItem("update-query", JSON.stringify(updatePayload));
    window.location.href = "/dashboard";
  };

  const handleClearAll = () => {
    if (
      confirm(
        "Are you sure you want to delete all saved queries? This cannot be undone."
      )
    ) {
      setSavedQueries([]);
      localStorage.removeItem("llm-visi-saved-items");
      setSelectedQuery(null);
    }
  };

  const handleRunQuery = (query: SavedQuery) => {
    // Store the query to be run in the dashboard
    sessionStorage.setItem("pending-query", JSON.stringify(query));
    window.location.href = "/dashboard";
  };

  const filteredQueries = savedQueries
    .filter((q) => q.question.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "recent") {
        return b.updatedAt - a.updatedAt;
      }
      return a.updatedAt - b.updatedAt;
    });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-900">
        <div className="max-w-7xl mx-auto py-8 px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Saved Queries
            </h1>
            <p className="text-slate-400">
              View and manage your saved analysis queries
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <input
              type="text"
              placeholder="Search queries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "recent" | "oldest")}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
            </select>
            {savedQueries.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-700 rounded-lg transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Queries List */}
            <div className="lg:col-span-1">
              <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                {filteredQueries.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-slate-400">
                      {savedQueries.length === 0
                        ? "No saved queries yet. Start by asking questions in the dashboard!"
                        : "No queries match your search."}
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[600px] overflow-y-auto">
                    {filteredQueries.map((query) => (
                      <button
                        key={query.id}
                        onClick={() => setSelectedQuery(query)}
                        className={`w-full text-left p-4 border-b border-slate-700 hover:bg-slate-700 transition-colors ${
                          selectedQuery?.id === query.id ? "bg-slate-700" : ""
                        }`}
                      >
                        <p className="text-sm font-medium text-white line-clamp-2 flex items-center gap-2">
                          {query.isFavorite && (
                            <span className="text-yellow-400">★</span>
                          )}
                          {query.question}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          Updated {formatDate(query.updatedAt)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Query Details */}
            <div className="lg:col-span-2">
              {selectedQuery ? (
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                  {/* Question */}
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-white mb-2">
                      Query
                    </h2>
                    <p className="text-slate-300 p-4 bg-slate-900 rounded-lg">
                      {selectedQuery.question}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-300 mb-3">
                      Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-900 p-3 rounded-lg">
                        <p className="text-xs text-slate-400">Created</p>
                        <p className="text-sm text-white mt-1">
                          {formatDate(selectedQuery.createdAt)}
                        </p>
                      </div>
                      <div className="bg-slate-900 p-3 rounded-lg">
                        <p className="text-xs text-slate-400">Last Updated</p>
                        <p className="text-sm text-white mt-1">
                          {formatDate(selectedQuery.updatedAt)}
                        </p>
                      </div>
                      <div className="bg-slate-900 p-3 rounded-lg">
                        <p className="text-xs text-slate-400">Chart Type</p>
                        <p className="text-sm text-white mt-1 capitalize">
                          {selectedQuery.result.chart?.type || "Unknown"}
                        </p>
                      </div>
                      <div className="bg-slate-900 p-3 rounded-lg">
                        <p className="text-xs text-slate-400">Status</p>
                        <p className="text-sm text-white mt-1">
                          {selectedQuery.isFavorite ? "⭐ Favorite" : "Regular"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chart Display */}
                  {selectedQuery.result.chart && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-slate-300 mb-3">
                        Visualization
                      </h3>
                      <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                        <ChartRenderer config={selectedQuery.result.chart} />
                      </div>
                    </div>
                  )}

                  {/* Insight */}
                  {selectedQuery.result.insightText && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-slate-300 mb-3">
                        Insight
                      </h3>
                      <p className="text-slate-300 p-4 bg-slate-900 rounded-lg text-sm leading-relaxed">
                        {selectedQuery.result.insightText}
                      </p>
                    </div>
                  )}

                  {/* Data Points */}
                  {selectedQuery.result.chart?.data &&
                    selectedQuery.result.chart.data.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm font-medium text-slate-300 mb-3">
                          Data Points ({selectedQuery.result.chart.data.length})
                        </h3>
                        <div className="bg-slate-900 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-words">
                            {JSON.stringify(
                              selectedQuery.result.chart.data.slice(0, 5),
                              null,
                              2
                            )}
                          </pre>
                          {selectedQuery.result.chart.data.length > 5 && (
                            <p className="text-xs text-slate-400 mt-2">
                              ... and{" "}
                              {selectedQuery.result.chart.data.length - 5} more
                              rows
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-700">
                    <button
                      onClick={() => handleRunQuery(selectedQuery)}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                      🔄 Re-run Query
                    </button>
                    <button
                      onClick={() => handleUpdateGraph(selectedQuery)}
                      disabled={updatingId === selectedQuery.id}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      ✨ Update with Latest Data
                    </button>
                    <button
                      onClick={() => handleToggleFavorite(selectedQuery.id)}
                      className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                        selectedQuery.isFavorite
                          ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                          : "bg-slate-700 hover:bg-slate-600 text-slate-200"
                      }`}
                    >
                      {selectedQuery.isFavorite ? "★ Favorite" : "☆ Favorite"}
                    </button>
                    <button
                      onClick={() => {
                        const text = `${
                          selectedQuery.question
                        }\n\n${JSON.stringify(selectedQuery.result, null, 2)}`;
                        navigator.clipboard.writeText(text);
                      }}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-colors"
                    >
                      📋 Copy
                    </button>
                    <button
                      onClick={() => handleDeleteQuery(selectedQuery.id)}
                      className="px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-700 font-medium rounded-lg transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center h-full flex items-center justify-center">
                  <div>
                    <div className="text-4xl mb-3">👈</div>
                    <p className="text-slate-400">
                      Select a query to view details
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
