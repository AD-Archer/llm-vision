import type { SavedQuery } from "./QueriesList";
import type { FollowUp } from "../../../types";
import { QueryMetadata } from "./QueryMetadata";
import { QueryVisualizationName } from "./QueryVisualizationName";
import { QueryActions } from "./QueryActions";
import { QueryChain } from "./QueryChain";
import { ArrowLeft } from "lucide-react";

interface QueryDetailsViewProps {
  query: SavedQuery | FollowUp | null;
  parentQuery: SavedQuery | null;
  isEditingVisualizationName: boolean;
  editingName: string;
  isUpdating: boolean;
  updateCountdown: number | null;
  onVisualizationEditStart: () => void;
  onVisualizationEditCancel: () => void;
  onVisualizationEditChange: (value: string) => void;
  onVisualizationEditSave: (newName: string) => void;
  onRerun: (query: SavedQuery | FollowUp) => void;
  onUpdate: (query: SavedQuery | FollowUp) => void;
  onToggleFavorite: (id: string) => void;
  onSelectFollowUp: (followUp: FollowUp) => void;
  onCopy: (query: SavedQuery | FollowUp) => void;
  onDelete: (id: string) => void;
  onRunNewQuery?: (baseQuestion: string) => void;
  formatDate: (timestamp: number) => string;
}

export function QueryDetailsView({
  query,
  parentQuery,
  isEditingVisualizationName,
  editingName,
  isUpdating,
  updateCountdown,
  onVisualizationEditStart,
  onVisualizationEditCancel,
  onVisualizationEditChange,
  onVisualizationEditSave,
  onRerun,
  onUpdate,
  onToggleFavorite,
  onSelectFollowUp,
  onCopy,
  onDelete,
  onRunNewQuery,
  formatDate,
}: QueryDetailsViewProps) {
  if (!query) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center h-full flex items-center justify-center">
        <div>
          <ArrowLeft className="w-16 h-16 mx-auto mb-3 text-slate-400" />
          <p className="text-slate-400">Select a query to view details</p>
        </div>
      </div>
    );
  }

  if (isUpdating) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center h-full flex items-center justify-center">
        <div>
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-slate-400 text-lg mb-2">Updating query...</p>
          {updateCountdown !== null && (
            <p className="text-3xl font-bold text-white mb-3">
              {updateCountdown}s
            </p>
          )}
          <p className="text-xs text-slate-500">Processing your request...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
      <QueryMetadata query={query} formatDate={formatDate} />
      {"visualizationName" in query && (
        <QueryVisualizationName
          query={query}
          isEditing={isEditingVisualizationName}
          editingValue={editingName}
          onEditStart={onVisualizationEditStart}
          onEditCancel={onVisualizationEditCancel}
          onEditChange={onVisualizationEditChange}
          onEditSave={onVisualizationEditSave}
        />
      )}
      {"visualizationName" in query && (
        <QueryActions
          query={query}
          onRerun={onRerun}
          onUpdate={onUpdate}
          onToggleFavorite={onToggleFavorite}
          onCopy={onCopy}
          onDelete={onDelete}
          isUpdating={isUpdating}
        />
      )}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Query Chain</h3>
        <QueryChain
          query={query}
          parentQuery={parentQuery}
          selectedItem={query}
          onSelectFollowUp={onSelectFollowUp}
          onRunNewQuery={onRunNewQuery}
          formatDate={formatDate}
        />
      </div>
    </div>
  );
}
