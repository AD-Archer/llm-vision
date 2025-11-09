"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import type { NormalizedInsight } from "../../utils/chartConfig";
import type { FollowUp } from "../../types";
import { QueriesHeader } from "./components/QueriesHeader";
import { QueryControls } from "./components/QueryControls";
import { QueriesList, type SavedQuery } from "./components/QueriesList";
import { QueryDetailsView } from "./components/QueryDetailsView";

export default function QueriesPage() {
  const { user } = useAuth();
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<SavedQuery | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "oldest">("recent");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingVisualizationName, setEditingVisualizationName] = useState<
    string | null
  >(null);
  const [editingName, setEditingName] = useState("");

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
      })
      .catch((e) => console.error("Failed to load saved queries", e));
  }, [user]);

  const handleDeleteQuery = async (id: string) => {
    if (!user) return;
    await fetch(`/api/queries/${id}?userId=${user.id}`, {
      method: "DELETE",
    });
    const updated = savedQueries.filter((q) => q.id !== id);
    setSavedQueries(updated);
    if (selectedQuery?.id === id) {
      setSelectedQuery(null);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    if (!user) return;
    const current = savedQueries.find((q) => q.id === id);
    if (!current) return;
    await fetch(`/api/queries/${id}?userId=${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !current.isFavorite }),
    });
    const updated = savedQueries.map((q) =>
      q.id === id ? { ...q, isFavorite: !q.isFavorite } : q
    );
    setSavedQueries(updated);
    if (selectedQuery?.id === id) {
      setSelectedQuery({
        ...selectedQuery,
        isFavorite: !selectedQuery.isFavorite,
      });
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
    if (selectedQuery?.id === id) {
      setSelectedQuery({
        ...selectedQuery,
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
        setSelectedQuery(null);
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

  const handleSelectFollowUp = (followUp: FollowUp) => {
    // For now, just log. Later we can show follow-up details
    console.log("Selected follow-up:", followUp);
  };

  const handleChangeFollowUpChartType = async (
    id: string,
    chartType: string
  ) => {
    if (!user) return;
    // Update local state
    const updatedQueries = savedQueries.map((query) => {
      if (query.followUps) {
        const updatedFollowUps = query.followUps.map((followUp) =>
          followUp.id === id
            ? {
                ...followUp,
                chartType: chartType === "auto" ? undefined : chartType,
              }
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
        chartType: chartType === "auto" ? undefined : chartType,
      }),
    });
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
        <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-4">
          <QueriesHeader />
          <QueryControls
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onClearAll={handleClearAll}
            hasQueries={savedQueries.length > 0}
          />

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Queries List */}
            <div className="lg:col-span-1">
              <QueriesList
                queries={filteredQueries}
                selectedQuery={selectedQuery}
                onSelectQuery={setSelectedQuery}
                formatDate={formatDate}
              />
            </div>

            {/* Query Details */}
            <div className="lg:col-span-2">
              <QueryDetailsView
                query={selectedQuery}
                isEditingVisualizationName={
                  editingVisualizationName === selectedQuery?.id
                }
                editingName={editingName}
                isUpdating={updatingId === selectedQuery?.id}
                onVisualizationEditStart={() => {
                  if (selectedQuery) {
                    setEditingVisualizationName(selectedQuery.id);
                    setEditingName(
                      selectedQuery.visualizationName ||
                        selectedQuery.result.chart?.meta?.visualizationName ||
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
                  if (selectedQuery) {
                    handleUpdateVisualizationName(selectedQuery.id, newName);
                  }
                }}
                onRerun={handleRunQuery}
                onUpdate={handleUpdateGraph}
                onToggleFavorite={handleToggleFavorite}
                onToggleFollowUpFavorite={handleToggleFollowUpFavorite}
                onRenameFollowUp={handleRenameFollowUp}
                onChangeFollowUpChartType={handleChangeFollowUpChartType}
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
                formatDate={formatDate}
              />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
