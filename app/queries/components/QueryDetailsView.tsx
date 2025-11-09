import type { SavedQuery } from "./QueriesList";
import { QueryDetails } from "./QueryDetails";
import { QueryMetadata } from "./QueryMetadata";
import { QueryVisualizationName } from "./QueryVisualizationName";
import { QueryActions } from "./QueryActions";
import { ArrowLeft } from "lucide-react";

interface QueryDetailsViewProps {
  query: SavedQuery | null;
  isEditingVisualizationName: boolean;
  editingName: string;
  isUpdating: boolean;
  onVisualizationEditStart: () => void;
  onVisualizationEditCancel: () => void;
  onVisualizationEditChange: (value: string) => void;
  onVisualizationEditSave: (newName: string) => void;
  onRerun: (query: SavedQuery) => void;
  onUpdate: (query: SavedQuery) => void;
  onToggleFavorite: (id: string) => void;
  onCopy: (query: SavedQuery) => void;
  onDelete: (id: string) => void;
  formatDate: (timestamp: number) => string;
}

export function QueryDetailsView({
  query,
  isEditingVisualizationName,
  editingName,
  isUpdating,
  onVisualizationEditStart,
  onVisualizationEditCancel,
  onVisualizationEditChange,
  onVisualizationEditSave,
  onRerun,
  onUpdate,
  onToggleFavorite,
  onCopy,
  onDelete,
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

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
      <QueryMetadata query={query} formatDate={formatDate} />
      <QueryVisualizationName
        query={query}
        isEditing={isEditingVisualizationName}
        editingValue={editingName}
        onEditStart={onVisualizationEditStart}
        onEditCancel={onVisualizationEditCancel}
        onEditChange={onVisualizationEditChange}
        onEditSave={onVisualizationEditSave}
      />
      <QueryDetails query={query} />
      <QueryActions
        query={query}
        onRerun={onRerun}
        onUpdate={onUpdate}
        onToggleFavorite={onToggleFavorite}
        onCopy={onCopy}
        onDelete={onDelete}
        isUpdating={isUpdating}
      />
    </div>
  );
}
