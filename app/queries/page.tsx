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
    showAllUsers: false,
    sortBy: "recent",
  });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateCountdown, setUpdateCountdown] = useState<number | null>(null);
  const [editingVisualizationName, setEditingVisualizationName] = useState<
    string | null
  >(null);
  const [editingName, setEditingName] = useState("");
  const [queriesLoaded, setQueriesLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    // Determine if we should load all users' queries
    const shouldLoadAllUsers = user.isAdmin && searchFilters.showAllUsers;

    fetch(
      shouldLoadAllUsers
        ? `/api/admin/queries`
        : `/api/queries?userId=${user.id}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load queries");
        return res.json();
      })
      .then(async (data) => {
        // If loading all users' queries, data is an array of user objects with their queries
        // If loading current user's queries, data is an array of queries
        const queriesData = shouldLoadAllUsers
          ? data.flatMap(
              (userData: {
                user: { name: string; email: string };
                queries: unknown[];
              }) =>
                userData.queries.map((q: unknown) => ({
                  ...(q as object),
                  userName: userData.user.name,
                  userEmail: userData.user.email,
                }))
            )
          : data;

        const queries: SavedQuery[] = await Promise.all(
          queriesData.map(async (q: unknown) => {
            const query = q as {
              id: string;
              question: string;
              result: NormalizedInsight;
              createdAt: string;
              updatedAt: string;
              isFavorite: boolean;
              visualizationName?: string;
              userName?: string;
              userEmail?: string;
            };

            // Load follow-ups for this query (now with nested structure)
            let followUps: FollowUp[] = [];
            try {
              const followUpsResponse = await fetch(
                `/api/follow-ups?userId=${
                  shouldLoadAllUsers ? query.userEmail : user.id
                }&parentQueryId=${query.id}`
              );
              if (followUpsResponse.ok) {
                const followUpsData = await followUpsResponse.json();

                // Recursive function to map follow-ups with nested children
                type FollowUpResponse = {
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
                  followUps?: FollowUpResponse[];
                };

                const mapFollowUp = (f: FollowUpResponse): FollowUp => ({
                  ...f,
                  result: f.result,
                  createdAt: new Date(f.createdAt).getTime(),
                  updatedAt: new Date(f.updatedAt).getTime(),
                  followUps: f.followUps
                    ? f.followUps.map(mapFollowUp)
                    : undefined,
                });

                followUps = followUpsData.map(mapFollowUp);
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
              userName: query.userName,
              userEmail: query.userEmail,
              followUps,
            };
          })
        );

        setSavedQueries(queries);
        setQueriesLoaded(true);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error("Failed to load saved queries", e);
        setIsLoading(false);
      });
  }, [user, searchFilters.showAllUsers]);

  // Handle URL parameters to select query on page load/refresh
  useEffect(() => {
    if (!queriesLoaded || savedQueries.length === 0) return;

    const queryId = searchParams.get("id");
    const followUpId = searchParams.get("followUpId");

    if (followUpId) {
      // Find the follow-up across all queries (recursively search nested structure)
      const findFollowUpRecursive = (
        followUps: FollowUp[]
      ): FollowUp | null => {
        for (const followUp of followUps) {
          if (followUp.id === followUpId) {
            return followUp;
          }
          if (followUp.followUps && followUp.followUps.length > 0) {
            const found = findFollowUpRecursive(followUp.followUps);
            if (found) return found;
          }
        }
        return null;
      };

      for (const query of savedQueries) {
        if (query.followUps) {
          const followUp = findFollowUpRecursive(query.followUps);
          if (followUp) {
            setSelectedItem(followUp);
            setSelectedQuery(query);
            return;
          }
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

  // Countdown for update (now counting up)
  useEffect(() => {
    if (updateCountdown === null) return;

    const timer = setTimeout(() => {
      setUpdateCountdown((prev) => (prev !== null ? prev + 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [updateCountdown]);

  const handleDeleteQuery = async (id: string) => {
    if (!user) return;
    try {
      const response = await fetch(`/api/queries/${id}?userId=${user.id}`, {
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

    // Check if this is a saved query or a follow-up
    const isSavedQuery = savedQueries.some((q) => q.id === id);
    const isFollowUp =
      selectedItem && "parentQueryId" in selectedItem && selectedItem.id === id;

    if (isSavedQuery) {
      // Update saved query
      await fetch(`/api/queries/${id}?userId=${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visualizationName: newName }),
      });
      const updated = savedQueries.map((q) =>
        q.id === id ? { ...q, visualizationName: newName } : q
      );
      setSavedQueries(updated);
    } else if (isFollowUp) {
      // Update follow-up
      await fetch(`/api/follow-ups/${id}?userId=${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      // Update the follow-up in the saved queries state
      const updated = savedQueries.map((q) => {
        if (q.followUps) {
          const updatedFollowUps = updateFollowUpInTree(q.followUps, id, {
            name: newName,
          });
          if (updatedFollowUps !== q.followUps) {
            return { ...q, followUps: updatedFollowUps };
          }
        }
        return q;
      });
      setSavedQueries(updated);
    }

    // Update selected item
    if (selectedItem && "id" in selectedItem && selectedItem.id === id) {
      setSelectedItem({
        ...selectedItem,
        ...(isSavedQuery ? { visualizationName: newName } : { name: newName }),
      });
    }
    setEditingVisualizationName(null);
    setEditingName("");
  };

  // Helper function to update a follow-up in the nested tree structure
  const updateFollowUpInTree = (
    followUps: FollowUp[],
    id: string,
    updates: Partial<FollowUp>
  ): FollowUp[] => {
    return followUps.map((followUp) => {
      if (followUp.id === id) {
        return { ...followUp, ...updates };
      }
      if (followUp.followUps) {
        const updatedNested = updateFollowUpInTree(
          followUp.followUps,
          id,
          updates
        );
        if (updatedNested !== followUp.followUps) {
          return { ...followUp, followUps: updatedNested };
        }
      }
      return followUp;
    });
  };

  const handleUpdateGraph = async (query: SavedQuery) => {
    if (!user) return;
    setUpdatingId(query.id);
    setUpdateCountdown(0); // Start counting up from 0
    try {
      // Send the update request to the API
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: query.question,
          chatInput: query.question,
          chartType: query.result.chart?.type || "bar",
          sessionId: `update-${query.id}`,
          previousData: query.result,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update query");
      }

      const updatedResult = await response.json();

      // Update the query in the state
      const updated = savedQueries.map((q) =>
        q.id === query.id
          ? {
              ...q,
              result: updatedResult,
              updatedAt: Date.now(),
            }
          : q
      );
      setSavedQueries(updated);

      // If currently viewing a follow-up of this query, switch to the updated query
      if (
        selectedItem &&
        "parentQueryId" in selectedItem &&
        selectedItem.parentQueryId === query.id
      ) {
        const updatedQuery = updated.find((q) => q.id === query.id);
        if (updatedQuery) {
          setSelectedItem(updatedQuery);
          setSelectedQuery(updatedQuery);
          updateURL(updatedQuery.id);
        }
      }

      // Update selected item if it's the one being updated
      if (
        selectedItem &&
        "id" in selectedItem &&
        selectedItem.id === query.id
      ) {
        setSelectedItem({
          ...selectedItem,
          result: updatedResult,
          updatedAt: Date.now(),
        });
      }
    } catch (error) {
      console.error("Failed to update query:", error);
    } finally {
      setUpdatingId(null);
      setUpdateCountdown(null);
    }
  };

  const handleClearAll = () => {
    if (!user) return;
    if (
      confirm(
        "Are you sure you want to delete all non-favorite saved queries? This cannot be undone."
      )
    ) {
      // Only delete non-favorite queries
      const nonFavoriteQueries = savedQueries.filter((q) => !q.isFavorite);

      Promise.all(
        nonFavoriteQueries.map((q) =>
          fetch(`/api/queries/${q.id}?userId=${user.id}`, {
            method: "DELETE",
          })
        )
      ).then(() => {
        // Keep only favorite queries in the state
        setSavedQueries((prev) => prev.filter((q) => q.isFavorite));
        // Clear selection if the selected item was deleted (either directly or as a follow-up of a deleted query)
        if (selectedItem) {
          const isSelectedItemDeleted =
            "isFavorite" in selectedItem && !selectedItem.isFavorite;
          const isParentQueryDeleted =
            "parentQueryId" in selectedItem &&
            nonFavoriteQueries.some((q) => q.id === selectedItem.parentQueryId);

          if (isSelectedItemDeleted || isParentQueryDeleted) {
            setSelectedItem(null);
          }
        }
      });
    }
  };

  const handleRunQuery = (query: SavedQuery) => {
    // Store the query question to pre-fill the query form in dashboard
    sessionStorage.setItem("pending-question", query.question);
    window.location.href = "/dashboard";
  };

  const handleRunNewQuery = (baseQuestion: string) => {
    // Find the root query for follow-up mode
    const getRootQueryForItem = (): SavedQuery | null => {
      if (selectedItem && "parentQueryId" in selectedItem) {
        // It's a follow-up, find its root parent query
        const followUp = selectedItem as FollowUp;
        return (
          savedQueries.find((q) => q.id === followUp.parentQueryId) || null
        );
      } else if (selectedItem && "visualizationName" in selectedItem) {
        // It's a SavedQuery, use it as the root query
        return selectedItem as SavedQuery;
      }
      return null;
    };

    const rootQuery = getRootQueryForItem();
    if (rootQuery) {
      // Store the root query id to load in follow-up mode
      sessionStorage.setItem("follow-up-query", rootQuery.id);
      sessionStorage.setItem("pending-question", baseQuestion);
      window.location.href = "/dashboard";
    } else {
      // Fallback to normal mode
      sessionStorage.setItem("pending-question", baseQuestion);
      window.location.href = "/dashboard";
    }
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

          // Load follow-ups for this query (now with nested structure)
          let followUps: FollowUp[] = [];
          try {
            const followUpsResponse = await fetch(
              `/api/follow-ups?userId=${user.id}&parentQueryId=${queryData.id}`
            );
            if (followUpsResponse.ok) {
              const followUpsData = await followUpsResponse.json();

              // Recursive function to map follow-ups with nested children
              type FollowUpResponse = {
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
                followUps?: FollowUpResponse[];
              };

              const mapFollowUp = (f: FollowUpResponse): FollowUp => ({
                ...f,
                result: f.result,
                createdAt: new Date(f.createdAt).getTime(),
                updatedAt: new Date(f.updatedAt).getTime(),
                followUps: f.followUps
                  ? f.followUps.map(mapFollowUp)
                  : undefined,
              });

              followUps = followUpsData.map(mapFollowUp);
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

          {/* Loading Screen */}
          {isLoading && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-slate-400 text-lg">
                  Loading your queries...
                </p>
              </div>
            </div>
          )}

          {/* Main Content - Only show when not loading */}
          {!isLoading && (
            <>
              <div className="mb-6">
                <AdvancedSearch
                  filters={searchFilters}
                  onFiltersChange={setSearchFilters}
                  availableChartTypes={availableChartTypes}
                  isAdmin={user?.isAdmin}
                />
                {savedQueries.length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleClearAll}
                      className="px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-700 rounded-lg transition-colors text-sm whitespace-nowrap"
                    >
                      Clear Non-Favorites
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
                    updateCountdown={updateCountdown}
                    onVisualizationEditStart={() => {
                      if (selectedItem && "visualizationName" in selectedItem) {
                        setEditingVisualizationName(selectedItem.id);
                        setEditingName(
                          selectedItem.visualizationName ||
                            selectedItem.result.chart?.meta
                              ?.visualizationName ||
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
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
