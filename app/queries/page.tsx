"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import type { NormalizedInsight } from "../../utils/chartConfig";
import type { FollowUp } from "../../types";
import { QueriesHeader } from "./components/QueriesHeader";
import { QueriesList, type SavedQuery } from "./components/QueriesList";
import { QueryDetailsView } from "./components/QueryDetailsView";
import {
  AdvancedSearch,
  type SearchFilters,
} from "./components/AdvancedSearch";

export default function QueriesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<SavedQuery | null>(null); // For the list
  const [selectedItem, setSelectedItem] = useState<
    SavedQuery | FollowUp | null
  >(null); // For details
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    searchTerm: "",
    chartTypes: [],
    dateFrom: "",
    dateTo: "",
    showFavoritesOnly: false,
    sortBy: "recent",
  });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingVisualizationName, setEditingVisualizationName] = useState<
    string | null
  >(null);
  const [editingName, setEditingName] = useState("");
  const [queriesLoaded, setQueriesLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/queries?userId=${user.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load queries");
        return res.json();
      })
      .then(async (data) => {
        const queries: SavedQuery[] = await Promise.all(
          data.map(async (q: unknown) => {
            const query = q as {
              id: string;
              question: string;
              result: NormalizedInsight;
              createdAt: string;
              updatedAt: string;
              isFavorite: boolean;
              visualizationName?: string;
            };

            // Load follow-ups for this query
            let followUps: FollowUp[] = [];
            try {
              const followUpsResponse = await fetch(
                `/api/follow-ups?userId=${user.id}&parentQueryId=${query.id}`
              );
              if (followUpsResponse.ok) {
                const followUpsData = await followUpsResponse.json();
                followUps = followUpsData.map(
                  (f: {
                    id: string;
                    parentQueryId: string;
                    parentFollowUpId?: string;
                    question: string;
                    result: NormalizedInsight;
                    name?: string;
                    isFavorite: boolean;
                    chartType?: string;
                    createdAt: string;
                    updatedAt: string;
                  }) => ({
                    ...f,
                    result: f.result,
                    createdAt: new Date(f.createdAt).getTime(),
                    updatedAt: new Date(f.updatedAt).getTime(),
                  })
                );
              }
            } catch (error) {
              console.error(
                "Failed to load follow-ups for query:",
                query.id,
                error
              );
            }

            return {
              id: query.id,
              question: query.question,
              result: query.result,
              createdAt: new Date(query.createdAt).getTime(),
              updatedAt: new Date(query.updatedAt).getTime(),
              isFavorite: query.isFavorite,
              visualizationName: query.visualizationName,
              followUps,
            };
          })
        );

        setSavedQueries(queries);
        setQueriesLoaded(true);
      })
      .catch((e) => console.error("Failed to load saved queries", e));
  }, [user]);

  // Handle URL parameters to select query on page load/refresh
  useEffect(() => {
    if (!queriesLoaded || savedQueries.length === 0) return;

    const queryId = searchParams.get("id");
    const followUpId = searchParams.get("followUpId");

    if (followUpId) {
      // Find the follow-up across all queries
      for (const query of savedQueries) {
        const followUp = query.followUps?.find((f) => f.id === followUpId);
        if (followUp) {
          setSelectedItem(followUp);
          setSelectedQuery(query);
          return;
        }
      }
    } else if (queryId) {
      const query = savedQueries.find((q) => q.id === queryId);
      if (query) {
        setSelectedQuery(query);
        setSelectedItem(query);
      }
    }
  }, [queriesLoaded, savedQueries, searchParams]);

  // Update URL when selection changes
  const updateURL = (queryId: string, followUpId?: string) => {
    const params = new URLSearchParams();
    params.set("id", queryId);
    if (followUpId) {
      params.set("followUpId", followUpId);
    }
    router.push(`/queries?${params.toString()}`, { scroll: false });
  };

  const handleDeleteQuery = async (id: string) => {
    if (!user) return;
    try {
      const response = await fetch(`/api/queries?id=${id}&userId=${user.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete query");
      setSavedQueries((prev) => prev.filter((q) => q.id !== id));
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    } catch (e) {
      console.error("Failed to delete query", e);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    if (!user) return;

    // Check if it's a saved query
    const query = savedQueries.find((q) => q.id === id);
    if (query) {
      // Toggle favorite for saved query
      await fetch(`/api/queries/${id}?userId=${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !query.isFavorite }),
      });
      const updated = savedQueries.map((q) =>
        q.id === id ? { ...q, isFavorite: !q.isFavorite } : q
      );
      setSavedQueries(updated);
      if (selectedItem && "id" in selectedItem && selectedItem.id === id) {
        setSelectedItem({
          ...selectedItem,
          isFavorite: !selectedItem.isFavorite,
        });
      }
      return;
    }

    // Check if it's a follow-up in the selected query's follow-ups
    if (selectedItem && "followUps" in selectedItem) {
      const followUp = selectedItem.followUps?.find((f) => f.id === id);
      if (followUp) {
        // Toggle favorite for follow-up
        await fetch(`/api/follow-ups/${id}?userId=${user.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isFavorite: !followUp.isFavorite }),
        });
        // Update the follow-up in the selected query
        const updatedQuery = {
          ...selectedItem,
          followUps: selectedItem.followUps?.map((f) =>
            f.id === id ? { ...f, isFavorite: !f.isFavorite } : f
          ),
        };
        setSelectedItem(updatedQuery);
        // Also update in savedQueries
        setSavedQueries((prev) =>
          prev.map((q) => (q.id === selectedItem.id ? updatedQuery : q))
        );
      }
    }
  };

  const handleUpdateVisualizationName = async (id: string, newName: string) => {
    if (!user) return;
    await fetch(`/api/queries/${id}?userId=${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visualizationName: newName }),
    });
    const updated = savedQueries.map((q) =>
      q.id === id ? { ...q, visualizationName: newName } : q
    );
    setSavedQueries(updated);
    if (selectedItem && "id" in selectedItem && selectedItem.id === id) {
      setSelectedItem({
        ...selectedItem,
        visualizationName: newName,
      });
    }
    setEditingVisualizationName(null);
    setEditingName("");
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
    if (!user) return;
    if (
      confirm(
        "Are you sure you want to delete all saved queries? This cannot be undone."
      )
    ) {
      Promise.all(
        savedQueries.map((q) =>
          fetch(`/api/queries/${q.id}?userId=${user.id}`, {
            method: "DELETE",
          })
        )
      ).then(() => {
        setSavedQueries([]);
        setSelectedItem(null);
      });
    }
  };

  const handleToggleFollowUpFavorite = async (id: string) => {
    if (!user) return;
    // Find the follow-up and toggle its favorite status
    const updatedQueries = savedQueries.map((query) => {
      if (query.followUps) {
        const updatedFollowUps = query.followUps.map((followUp) =>
          followUp.id === id
            ? { ...followUp, isFavorite: !followUp.isFavorite }
            : followUp
        );
        return { ...query, followUps: updatedFollowUps };
      }
      return query;
    });
    setSavedQueries(updatedQueries);

    // Update in database
    await fetch(`/api/follow-ups/${id}?userId=${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isFavorite: updatedQueries
          .flatMap((q) => q.followUps || [])
          .find((f) => f.id === id)?.isFavorite,
      }),
    });
  };

  const handleRunQuery = (query: SavedQuery) => {
    // Store the query to be run in the dashboard
    sessionStorage.setItem("pending-query", JSON.stringify(query));
    window.location.href = "/dashboard";
  };

  const handleRunNewQuery = (baseQuestion: string) => {
    // Store the base question to pre-fill the query form in dashboard
    sessionStorage.setItem("pending-question", baseQuestion);
    window.location.href = "/dashboard";
  };

  const findRootParentQuery = (followUp: FollowUp): SavedQuery | null => {
    // Try to find direct parent query
    let parentQuery =
      savedQueries.find((q) => q.id === followUp.parentQueryId) || null;

    // If not found, search through all follow-ups recursively
    if (!parentQuery) {
      const isFollowUpInTree = (f: FollowUp, targetId: string): boolean => {
        if (f.id === targetId) return true;
        return false; // TODO: Handle nested follow-ups if needed
      };

      for (const query of savedQueries) {
        const hasFollowUp = query.followUps?.some((f) =>
          isFollowUpInTree(f, followUp.id)
        );
        if (hasFollowUp) {
          parentQuery = query;
          break;
        }
      }
    }
    return parentQuery;
  };

  const getParentQueryForSelectedItem = (): SavedQuery | null => {
    if (selectedItem && "parentQueryId" in selectedItem) {
      const followUp = selectedItem as FollowUp;
      // First try to find by parentQueryId in savedQueries
      const parent = savedQueries.find((q) => q.id === followUp.parentQueryId);
      if (parent) {
        return parent;
      }
      // If not found directly, try the full search
      return findRootParentQuery(followUp);
    }
    // If selectedItem is a SavedQuery, check if selectedQuery is different (might be parent)
    if (selectedItem && selectedQuery && selectedItem.id !== selectedQuery.id) {
      return selectedQuery;
    }
    return null;
  };

  const handleSelectFollowUp = async (followUp: FollowUp) => {
    setSelectedItem(followUp);

    // Always try to load the parent query to ensure we have the full data
    if (followUp.parentQueryId && user) {
      // First check if it's a direct parent in savedQueries
      let parentQuery = savedQueries.find(
        (q) => q.id === followUp.parentQueryId
      );

      // If not found, search for it as a nested follow-up parent
      if (!parentQuery) {
        for (const query of savedQueries) {
          const foundParent = query.followUps?.find(
            (f) => f.id === followUp.parentFollowUpId
          );
          if (foundParent) {
            parentQuery = query;
            break;
          }
        }
      }

      // If we found the parent in savedQueries, set it
      if (parentQuery) {
        setSelectedQuery(parentQuery);
        updateURL(parentQuery.id, followUp.id);
        return; // We have the parent, no need to fetch from API
      }

      // Parent not found in savedQueries, fetch it from the API
      try {
        const response = await fetch(
          `/api/queries/${followUp.parentQueryId}?userId=${user.id}`
        );
        if (response.ok) {
          const queryData = await response.json();

          // Load follow-ups for this query
          let followUps: FollowUp[] = [];
          try {
            const followUpsResponse = await fetch(
              `/api/follow-ups?userId=${user.id}&parentQueryId=${queryData.id}`
            );
            if (followUpsResponse.ok) {
              const followUpsData = await followUpsResponse.json();
              followUps = followUpsData.map(
                (f: {
                  id: string;
                  parentQueryId: string;
                  parentFollowUpId?: string;
                  question: string;
                  result: NormalizedInsight;
                  name?: string;
                  isFavorite: boolean;
                  chartType?: string;
                  createdAt: string;
                  updatedAt: string;
                }) => ({
                  ...f,
                  result: f.result,
                  createdAt: new Date(f.createdAt).getTime(),
                  updatedAt: new Date(f.updatedAt).getTime(),
                })
              );
            }
          } catch (error) {
            console.error(
              "Failed to load follow-ups for parent query:",
              queryData.id,
              error
            );
          }

          const loadedParentQuery: SavedQuery = {
            id: queryData.id,
            question: queryData.question,
            result: queryData.result,
            createdAt: new Date(queryData.createdAt).getTime(),
            updatedAt: new Date(queryData.updatedAt).getTime(),
            isFavorite: queryData.isFavorite,
            visualizationName: queryData.visualizationName,
            followUps,
          };

          // Add to savedQueries if not already there
          if (!savedQueries.find((q) => q.id === loadedParentQuery.id)) {
            setSavedQueries([...savedQueries, loadedParentQuery]);
          }
          setSelectedQuery(loadedParentQuery);
          updateURL(loadedParentQuery.id, followUp.id);
        }
      } catch (error) {
        console.error("Failed to load parent query:", error);
      }
    }
  };

  // Get all unique chart types from queries
  const availableChartTypes = Array.from(
    new Set(
      savedQueries.map((q) => q.result.chart?.type).filter(Boolean) as string[]
    )
  );

  const filteredQueries = savedQueries
    .filter((q) => {
      // Search term filter (checks name, question, and insight)
      if (searchFilters.searchTerm) {
        const searchLower = searchFilters.searchTerm.toLowerCase();
        const matchesName = (
          q.visualizationName ||
          q.result.chart?.meta?.visualizationName ||
          ""
        )
          .toLowerCase()
          .includes(searchLower);
        const matchesQuestion = q.question.toLowerCase().includes(searchLower);
        const matchesInsight = (q.result.insightText || "")
          .toLowerCase()
          .includes(searchLower);

        if (!matchesName && !matchesQuestion && !matchesInsight) {
          return false;
        }
      }

      // Chart type filter
      if (searchFilters.chartTypes.length > 0) {
        const chartType = q.result.chart?.type;
        if (!chartType || !searchFilters.chartTypes.includes(chartType)) {
          return false;
        }
      }

      // Date range filter
      if (searchFilters.dateFrom) {
        const fromDate = new Date(searchFilters.dateFrom).getTime();
        if (q.updatedAt < fromDate) {
          return false;
        }
      }

      if (searchFilters.dateTo) {
        const toDate = new Date(searchFilters.dateTo).getTime();
        // Add 1 day to include the entire "to" date
        if (q.updatedAt > toDate + 24 * 60 * 60 * 1000) {
          return false;
        }
      }

      // Favorites filter
      if (searchFilters.showFavoritesOnly && !q.isFavorite) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (searchFilters.sortBy === "recent") {
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
        <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-4">
          <QueriesHeader />
          <div className="mb-6">
            <AdvancedSearch
              filters={searchFilters}
              onFiltersChange={setSearchFilters}
              availableChartTypes={availableChartTypes}
            />
            {savedQueries.length > 0 && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-700 rounded-lg transition-colors text-sm whitespace-nowrap"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Queries List */}
            <div className="lg:col-span-1">
              <QueriesList
                queries={filteredQueries}
                selectedQuery={selectedQuery}
                onSelectQuery={(query) => {
                  setSelectedQuery(query);
                  setSelectedItem(query);
                  updateURL(query.id);
                }}
                formatDate={formatDate}
              />
            </div>

            {/* Query Details */}
            <div className="lg:col-span-2">
              <QueryDetailsView
                parentQuery={getParentQueryForSelectedItem()}
                query={selectedItem}
                isEditingVisualizationName={
                  editingVisualizationName ===
                  (selectedItem && "id" in selectedItem
                    ? selectedItem.id
                    : null)
                }
                editingName={editingName}
                isUpdating={
                  updatingId === (selectedItem ? selectedItem.id : null)
                }
                onVisualizationEditStart={() => {
                  if (selectedItem && "visualizationName" in selectedItem) {
                    setEditingVisualizationName(selectedItem.id);
                    setEditingName(
                      selectedItem.visualizationName ||
                        selectedItem.result.chart?.meta?.visualizationName ||
                        ""
                    );
                  }
                }}
                onVisualizationEditCancel={() => {
                  setEditingVisualizationName(null);
                  setEditingName("");
                }}
                onVisualizationEditChange={setEditingName}
                onVisualizationEditSave={(newName) => {
                  if (selectedItem && "visualizationName" in selectedItem) {
                    handleUpdateVisualizationName(selectedItem.id, newName);
                  }
                }}
                onRerun={handleRunQuery}
                onUpdate={handleUpdateGraph}
                onToggleFavorite={handleToggleFavorite}
                onToggleFollowUpFavorite={handleToggleFollowUpFavorite}
                onSelectFollowUp={handleSelectFollowUp}
                onCopy={(query) => {
                  const text = `${query.question}\n\n${JSON.stringify(
                    query.result,
                    null,
                    2
                  )}`;
                  navigator.clipboard.writeText(text);
                }}
                onDelete={handleDeleteQuery}
                onRunNewQuery={handleRunNewQuery}
                formatDate={formatDate}
              />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
