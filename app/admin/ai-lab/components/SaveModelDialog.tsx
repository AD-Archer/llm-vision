"use client";

import { useState } from "react";
import { TargetSlotState, SavedModelConfig } from "../types";

interface Props {
  slot: TargetSlotState | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}

const STORAGE_KEY = "ai-lab-saved-models";

export function SaveModelDialog({ slot, onClose, onSaved }: Props) {
  const [name, setName] = useState(slot?.label || "");

  if (!slot) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    let models: SavedModelConfig[] = [];
    if (stored) {
      try {
        models = JSON.parse(stored);
      } catch {
        models = [];
      }
    }

    const config: SavedModelConfig = {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2, 10),
      name: name.trim(),
      label: name.trim(),
      modelName: slot.modelName,
      systemPrompt: slot.systemPrompt,
      temperature: slot.temperature,
      topP: slot.topP,
      topK: slot.topK,
      maxTokens: slot.maxTokens,
      frequencyPenalty: slot.frequencyPenalty || 0,
      presencePenalty: slot.presencePenalty || 0,
      providerUrl: slot.providerUrl,
      apiKey: slot.apiKey,
      timeoutMs: slot.timeoutMs,
      inputTokensPerMillion: slot.inputTokensPerMillion,
      outputTokensPerMillion: slot.outputTokensPerMillion,
      requestCount: slot.requestCount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...models, config];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    onSaved?.(config.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold text-white mb-3">Save model</h3>
        <p className="text-sm text-slate-400 mb-4">
          Saving configuration for{" "}
          <strong className="text-white">{slot.label}</strong> ({slot.modelName}
          )
        </p>

        <div className="mb-4">
          <label className="block text-sm text-slate-300 mb-1">Save as</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Enter a name for this configuration"
          />
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            disabled={!name.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
