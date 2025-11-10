import type { SavedQuery } from "./QueriesList";
import type { FollowUp } from "../../../types";

interface QueryVisualizationNameProps {
  query: SavedQuery | FollowUp;
  isEditing: boolean;
  editingValue: string;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditChange: (value: string) => void;
  onEditSave: (newName: string) => void;
}

export function QueryVisualizationName({
  query,
  isEditing,
  editingValue,
  onEditStart,
  onEditCancel,
  onEditChange,
  onEditSave,
}: QueryVisualizationNameProps) {
  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <h3 className="text-xs sm:text-sm font-medium text-slate-300">
          Visualization Name
        </h3>
        {isEditing ? (
          <button
            onClick={onEditCancel}
            className="text-xs sm:text-sm text-slate-400 hover:text-slate-200 px-2 py-1"
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={onEditStart}
            className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 px-2 py-1"
          >
            Edit
          </button>
        )}
      </div>
      {isEditing ? (
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3">
          <input
            type="text"
            value={editingValue}
            onChange={(e) => onEditChange(e.target.value)}
            placeholder="Enter visualization name..."
            className="flex-1 px-3 sm:px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={() => onEditSave(editingValue)}
            disabled={!editingValue.trim()}
            className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      ) : (
        <p className="text-slate-300 p-3 sm:p-4 bg-slate-900 rounded-lg text-xs sm:text-sm mt-3">
          {(query as SavedQuery).visualizationName ||
            (query as FollowUp).name ||
            query.result.chart?.meta?.visualizationName ||
            "No name provided"}
        </p>
      )}
    </div>
  );
}
