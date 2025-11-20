"use client";

import { useState, useEffect } from "react";
import { Save, Trash2, Play } from "lucide-react";
import { TargetSlotState, SavedModelConfig } from "../types";

interface ModelManagerProps {
  slots: TargetSlotState[];
  onLoadModel: (
    config: Omit<SavedModelConfig, "id" | "createdAt" | "updatedAt">
  ) => void;
  refreshKey?: number;
  currentPrompt?: string;
  onQuickRun?: (models: SavedModelConfig[]) => void;
}

const STORAGE_KEY = "ai-lab-saved-models";

export function ModelManager({
  slots,
  onLoadModel,
  refreshKey,
  currentPrompt,
  onQuickRun,
}: ModelManagerProps) {
  const [savedModels, setSavedModels] = useState<SavedModelConfig[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Fix and validate models, adding defaults for missing fields
          const fixedModels = parsed
            .filter(
              (model) =>
                model &&
                typeof model === "object" &&
                typeof model.label === "string" &&
                model.label.trim() !== "" &&
                typeof model.modelName === "string" &&
                model.modelName.trim() !== "" &&
                typeof model.webhookUrl === "string" &&
                model.webhookUrl.trim() !== ""
            )
            .map((model) => ({
              id: model.id || crypto.randomUUID(),
              name: model.name || model.label,
              label: model.label,
              modelName: model.modelName,
              webhookUrl: model.webhookUrl,
              method: model.method || "POST",
              timeoutMs: model.timeoutMs || 45000,
              headers: model.headers || [],
              inputTokensPerMillion: model.inputTokensPerMillion,
              outputTokensPerMillion: model.outputTokensPerMillion,
              payloadTemplateRaw: model.payloadTemplateRaw || "",
              createdAt: model.createdAt || new Date().toISOString(),
              updatedAt: model.updatedAt || new Date().toISOString(),
            }));
          setSavedModels(fixedModels);
        }
      } catch (error) {
        console.error("Failed to load saved models:", error);
        setSavedModels([]);
      }
    } else {
      setSavedModels([]);
    }
  }, [refreshKey]);

  const saveToStorage = (models: SavedModelConfig[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
    setSavedModels(models);
  };

  const handleSaveModel = () => {
    if (!selectedSlotId) return;

    const slot = slots.find((s) => s.id === selectedSlotId);
    if (
      !slot ||
      !slot.label.trim() ||
      !slot.modelName.trim() ||
      !slot.webhookUrl.trim()
    )
      return;

    const config: SavedModelConfig = {
      id: crypto.randomUUID(),
      name: slot.label.trim(),
      label: slot.label.trim(),
      modelName: slot.modelName,
      webhookUrl: slot.webhookUrl,
      method: slot.method,
      timeoutMs: slot.timeoutMs,
      headers: slot.headers,
      inputTokensPerMillion: slot.inputTokensPerMillion,
      outputTokensPerMillion: slot.outputTokensPerMillion,
      payloadTemplateRaw: slot.payloadTemplateRaw,
      requestCount: slot.requestCount || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedModels = [...savedModels, config];
    saveToStorage(updatedModels);
    setShowSaveDialog(false);
    setSelectedSlotId("");
  };

  const handleLoadModel = (config: SavedModelConfig) => {
    onLoadModel({
      name: config.name || config.label,
      label: config.label,
      modelName: config.modelName,
      webhookUrl: config.webhookUrl,
      method: config.method || "POST",
      timeoutMs: config.timeoutMs || 45000,
      headers: config.headers || [],
      inputTokensPerMillion: config.inputTokensPerMillion,
      outputTokensPerMillion: config.outputTokensPerMillion,
      payloadTemplateRaw: config.payloadTemplateRaw || "",
      requestCount: config.requestCount || 1,
    });
  };

  const handleDeleteModel = (id: string) => {
    const updatedModels = savedModels.filter((m) => m.id !== id);
    setSavedModels(updatedModels);
    saveToStorage(updatedModels);
    // Remove from selection if it was selected
    setSelectedModelIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleModelSelection = (modelId: string, selected: boolean) => {
    setSelectedModelIds((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(modelId);
      } else {
        newSet.delete(modelId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedModelIds(new Set(savedModels.map((m) => m.id)));
  };

  const handleDeselectAll = () => {
    setSelectedModelIds(new Set());
  };

  const handleQuickRun = () => {
    if (!currentPrompt?.trim() || selectedModelIds.size === 0) return;
    const selectedModels = savedModels.filter((m) =>
      selectedModelIds.has(m.id)
    );
    onQuickRun?.(selectedModels);
  };

  const availableSlots = slots.filter(
    (slot) => slot.modelName.trim() && slot.webhookUrl.trim()
  );

  return (
    <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white">Saved Models</h3>
        <div className="flex gap-2">
          {savedModels.length > 0 && (
            <div className="flex gap-1 mr-2">
              <button
                onClick={handleSelectAll}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                title="Select all models"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded"
                title="Deselect all models"
              >
                Deselect All
              </button>
            </div>
          )}
          <button
            onClick={handleQuickRun}
            disabled={!currentPrompt?.trim() || selectedModelIds.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              selectedModelIds.size === 0
                ? "Select models to run"
                : `Run ${selectedModelIds.size} selected model${
                    selectedModelIds.size === 1 ? "" : "s"
                  }`
            }
          >
            <Play className="w-4 h-4" />
            Quick Run ({selectedModelIds.size})
          </button>
          {savedModels.length > 0 && (
            <button
              onClick={() => {
                if (
                  confirm("Are you sure you want to delete all saved models?")
                ) {
                  saveToStorage([]);
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
      <div className="flex justify-center mb-4">
        <button
          onClick={() => setShowSaveDialog(true)}
          disabled={availableSlots.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          Save Model
        </button>
      </div>

      {savedModels.length === 0 ? (
        <p className="text-slate-400 text-center py-8">
          No saved models yet. Configure a model above and save it here.
        </p>
      ) : (
        <div className="space-y-3">
          {savedModels.map((model) => (
            <div
              key={model.id}
              className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedModelIds.has(model.id)}
                    onChange={(e) =>
                      handleModelSelection(model.id, e.target.checked)
                    }
                    className="mt-1 w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-white text-lg">
                      {model.label}
                    </h4>
                    <p className="text-sm text-slate-400 mt-1">
                      {model.modelName}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {model.webhookUrl}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>Input: ${model.inputTokensPerMillion || 0}/M</span>
                      <span>
                        Output: ${model.outputTokensPerMillion || 0}/M
                      </span>
                      <span>Timeout: {model.timeoutMs}ms</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoadModel(model)}
                      className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                      title="Load this model configuration"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Are you sure you want to delete "${model.label}"?`
                          )
                        ) {
                          handleDeleteModel(model.id);
                        }
                      }}
                      className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
                      title="Delete this model"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {savedModels.length > 0 && (
        <div className="flex justify-center mt-6 pt-4 border-t border-slate-700">
          <button
            onClick={() => {
              if (
                confirm(
                  "Are you sure you want to delete ALL saved models? This action cannot be undone."
                )
              ) {
                saveToStorage([]);
              }
            }}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Clear Entire Suite
          </button>
        </div>
      )}

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">
              Save Model Configuration
            </h3>
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm text-slate-300">
                  Select Slot to Save
                </span>
                <select
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a configured slot...</option>
                  {availableSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.label} ({slot.modelName})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModel}
                disabled={!selectedSlotId}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
