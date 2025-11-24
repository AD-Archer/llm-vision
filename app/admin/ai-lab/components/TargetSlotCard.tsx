"use client";

import { TargetSlotState } from "../types";
import { InfoTooltip } from "./InfoTooltip";

interface TargetSlotCardProps {
  slot: TargetSlotState;
  index: number;
  disableRemove: boolean;
  onChange: (slotId: string, patch: Partial<TargetSlotState>) => void;
  onRemove: (slotId: string) => void;
  onSave?: (slotId: string) => void;
}

export function TargetSlotCard({
  slot,
  index,
  disableRemove,
  onChange,
  onRemove,
  onSave,
}: TargetSlotCardProps) {
  return (
    <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Target #{index + 1}
          </p>
          <h3 className="text-xl font-semibold text-white">{slot.label}</h3>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={slot.color}
            onChange={(event) =>
              onChange(slot.id, { color: event.target.value })
            }
            className="h-10 w-10 rounded-full border border-slate-600 bg-slate-900 cursor-pointer"
            aria-label="Accent color"
          />
          <button
            onClick={() => onRemove(slot.id)}
            disabled={disableRemove}
            className="px-3 py-1 text-xs font-medium rounded-full border border-slate-600 text-slate-300 hover:border-red-500 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Remove
          </button>
          <button
            onClick={() => onSave?.(slot.id)}
            title="Save model"
            className="px-3 py-1 text-xs font-medium rounded-full border border-slate-600 text-slate-300 hover:border-green-500 hover:text-green-300"
          >
            Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate-300 lg:col-span-2">
          Display name
          <input
            type="text"
            value={slot.label}
            onChange={(event) =>
              onChange(slot.id, { label: event.target.value })
            }
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-300 lg:col-span-2">
          Model ID
          <input
            type="text"
            value={slot.modelName}
            onChange={(event) =>
              onChange(slot.id, { modelName: event.target.value })
            }
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. gpt-4o, claude-3-opus-20240229"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-300 lg:col-span-2">
          System Prompt
          <textarea
            value={slot.systemPrompt}
            onChange={(event) =>
              onChange(slot.id, { systemPrompt: event.target.value })
            }
            placeholder="You are a helpful assistant..."
            rows={3}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            Temperature ({slot.temperature})
            <InfoTooltip text="Controls randomness in output. Higher values (e.g., 1.0) make output more random and creative, lower values (e.g., 0.1) make it more deterministic and focused." />
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={slot.temperature}
            onChange={(event) =>
              onChange(slot.id, { temperature: Number(event.target.value) })
            }
            className="w-full"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            Top P ({slot.topP})
            <InfoTooltip text="Controls diversity by limiting token selection to the top percentage of probability mass. Lower values (e.g., 0.1) make output more focused, higher values (e.g., 0.9) allow more diversity." />
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={slot.topP}
            onChange={(event) =>
              onChange(slot.id, { topP: Number(event.target.value) })
            }
            className="w-full"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            Top K
            <InfoTooltip text="Limits token selection to the top K most probable tokens. Lower values reduce randomness, higher values increase diversity. Set to 0 to disable." />
          </div>
          <input
            type="number"
            min={0}
            value={slot.topK || ""}
            onChange={(event) =>
              onChange(slot.id, { topK: Number(event.target.value) })
            }
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            Max Tokens
            <InfoTooltip text="Maximum number of tokens the model can generate in its response. Higher values allow longer responses but increase cost and latency." />
          </div>
          <input
            type="number"
            min={1}
            value={slot.maxTokens || ""}
            onChange={(event) =>
              onChange(slot.id, { maxTokens: Number(event.target.value) })
            }
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            Frequency Penalty ({slot.frequencyPenalty})
            <InfoTooltip text="Reduces repetition of frequent tokens. Positive values decrease likelihood of repeating the same words, negative values increase it." />
          </div>
          <input
            type="range"
            min={-2}
            max={2}
            step={0.1}
            value={slot.frequencyPenalty}
            onChange={(event) =>
              onChange(slot.id, {
                frequencyPenalty: Number(event.target.value),
              })
            }
            className="w-full"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            Presence Penalty ({slot.presencePenalty})
            <InfoTooltip text="Reduces repetition of any tokens that have appeared. Positive values encourage talking about new topics, negative values allow more repetition." />
          </div>
          <input
            type="range"
            min={-2}
            max={2}
            step={0.1}
            value={slot.presencePenalty}
            onChange={(event) =>
              onChange(slot.id, { presencePenalty: Number(event.target.value) })
            }
            className="w-full"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            Timeout (ms)
            <InfoTooltip text="Maximum time to wait for a response from the AI model before timing out. Increase for slower models or complex requests." />
          </div>
          <input
            type="number"
            min={1000}
            max={120000}
            step={500}
            value={slot.timeoutMs || ""}
            onChange={(event) =>
              onChange(slot.id, { timeoutMs: Number(event.target.value) })
            }
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Request count
          <input
            type="number"
            min={1}
            max={10}
            value={slot.requestCount || ""}
            onChange={(event) =>
              onChange(slot.id, {
                requestCount: Number(event.target.value),
              })
            }
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
      </div>
    </div>
  );
}
