import type { FollowUp } from "../../../types";
import { Star, Edit2, Check, X } from "lucide-react";
import { useState } from "react";

interface FollowUpListProps {
  followUps: FollowUp[];
  onSelectFollowUp: (followUp: FollowUp) => void;
  onToggleFavorite: (id: string) => void;
  onRenameFollowUp: (id: string, newName: string) => void;
  onChangeChartType: (id: string, chartType: string) => void;
  formatDate: (timestamp: number) => string;
}

export function FollowUpList({
  followUps,
  onSelectFollowUp,
  onToggleFavorite,
  onRenameFollowUp,
  onChangeChartType,
  formatDate,
}: FollowUpListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const startEditing = (followUp: FollowUp) => {
    setEditingId(followUp.id);
    setEditingName(followUp.name || "");
  };

  const saveEditing = () => {
    if (editingId) {
      onRenameFollowUp(editingId, editingName.trim());
      setEditingId(null);
      setEditingName("");
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };
  if (followUps.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 border-t border-slate-700 pt-6">
      <h3 className="text-lg font-semibold text-white mb-4">Follow-ups</h3>
      <div className="space-y-3">
        {followUps.map((followUp) => (
          <div
            key={followUp.id}
            className="border border-slate-600 rounded-lg p-3 hover:bg-slate-700 transition-colors group"
          >
            <div className="flex items-start gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(followUp.id);
                }}
                className="flex-shrink-0 mt-0.5"
              >
                <Star
                  className={`w-4 h-4 ${
                    followUp.isFavorite
                      ? "text-yellow-400 fill-current"
                      : "text-slate-400 hover:text-yellow-400"
                  } transition-colors`}
                />
              </button>
              <div className="flex-1 min-w-0">
                {editingId === followUp.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditing();
                        if (e.key === "Escape") cancelEditing();
                      }}
                      className="flex-1 px-2 py-1 bg-slate-600 border border-slate-500 text-white text-sm rounded"
                      autoFocus
                    />
                    <button
                      onClick={saveEditing}
                      className="text-green-400 hover:text-green-300"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectFollowUp(followUp)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-sm font-semibold text-white line-clamp-2">
                        {followUp.name || followUp.question}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1 overflow-hidden text-ellipsis">
                        {followUp.question}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Updated {formatDate(followUp.updatedAt)}
                      </p>
                    </button>
                    <button
                      onClick={() => startEditing(followUp)}
                      className="flex-shrink-0 text-slate-400 hover:text-slate-300"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <select
                      value={followUp.chartType || "auto"}
                      onChange={(e) =>
                        onChangeChartType(followUp.id, e.target.value)
                      }
                      className="flex-shrink-0 bg-slate-600 border border-slate-500 text-white text-xs rounded px-1 py-0.5"
                    >
                      <option value="auto">Auto</option>
                      <option value="bar">Bar</option>
                      <option value="line">Line</option>
                      <option value="area">Area</option>
                      <option value="pie">Pie</option>
                      <option value="scatter">Scatter</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
