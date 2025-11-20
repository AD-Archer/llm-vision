"use client";

import { TargetSlotState } from "../types";

interface TargetSlotCardProps {
  slot: TargetSlotState;
  index: number;
  disableRemove: boolean;
  onChange: (slotId: string, patch: Partial<TargetSlotState>) => void;
  onRemove: (slotId: string) => void;
  onSave?: (slotId: string) => void;
}

const METHOD_OPTIONS: TargetSlotState["method"][] = ["POST", "PUT", "PATCH"];

const generateHeaderId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

export function TargetSlotCard({
  slot,
  index,
  disableRemove,
  onChange,
  onRemove,
  onSave,
}: TargetSlotCardProps) {
  const handleHeaderChange = (
    headerId: string,
    field: "key" | "value",
    value: string
  ) => {
    const updated = slot.headers.map((header) =>
      header.id === headerId ? { ...header, [field]: value } : header
    );
    onChange(slot.id, { headers: updated });
  };

  const handleHeaderAdd = () => {
    const newHeader = {
      id: generateHeaderId(),
      key: "",
      value: "",
    };
    onChange(slot.id, { headers: [...slot.headers, newHeader] });
  };

  const handleHeaderRemove = (headerId: string) => {
    onChange(slot.id, {
      headers: slot.headers.filter((header) => header.id !== headerId),
    });
  };

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
        <label className="flex flex-col gap-1 text-sm text-slate-300">
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
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Model identifier
          <input
            type="text"
            value={slot.modelName}
            placeholder="e.g. gpt-4o, claude-3-sonnet"
            onChange={(event) =>
              onChange(slot.id, { modelName: event.target.value })
            }
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        {/* Webhook URL was deprecated; use global AI Provider URL configured in Settings */}
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          HTTP method
          <select
            value={slot.method}
            onChange={(event) =>
              onChange(slot.id, {
                method: event.target.value as TargetSlotState["method"],
              })
            }
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {METHOD_OPTIONS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Timeout (ms)
          <input
            type="number"
            min={1000}
            max={120000}
            step={500}
            value={slot.timeoutMs}
            onChange={(event) =>
              onChange(slot.id, { timeoutMs: Number(event.target.value) })
            }
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Input tokens / million (USD)
          <input
            type="number"
            min={0}
            step={0.001}
            value={slot.inputTokensPerMillion ?? ""}
            onChange={(event) =>
              onChange(slot.id, {
                inputTokensPerMillion: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              })
            }
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Output tokens / million (USD)
          <input
            type="number"
            min={0}
            step={0.001}
            value={slot.outputTokensPerMillion ?? ""}
            onChange={(event) =>
              onChange(slot.id, {
                outputTokensPerMillion: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              })
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
            value={slot.requestCount ?? 1}
            onChange={(event) =>
              onChange(slot.id, {
                requestCount: Number(event.target.value) || 1,
              })
            }
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-white">Custom headers</p>
            <button
              type="button"
              onClick={handleHeaderAdd}
              className="text-xs px-3 py-1 rounded-full bg-slate-700 text-white hover:bg-slate-600"
            >
              + Header
            </button>
          </div>
          {slot.headers.length === 0 && (
            <p className="text-xs text-slate-500">
              Add Authorization or extra headers to include with the provider
              request, if your provider supports custom headers.
            </p>
          )}
          <div className="space-y-2">
            {slot.headers.map((header) => (
              <div key={header.id} className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  placeholder="Header key"
                  value={header.key}
                  onChange={(event) =>
                    handleHeaderChange(header.id, "key", event.target.value)
                  }
                  className="col-span-4 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Header value"
                  value={header.value}
                  onChange={(event) =>
                    handleHeaderChange(header.id, "value", event.target.value)
                  }
                  className="col-span-7 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleHeaderRemove(header.id)}
                  className="col-span-1 text-sm text-red-400 hover:text-red-200"
                  aria-label="Remove header"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm text-slate-300">
          Payload overrides (JSON)
          <textarea
            value={slot.payloadTemplateRaw}
            onChange={(event) =>
              onChange(slot.id, { payloadTemplateRaw: event.target.value })
            }
            placeholder='{"system":"You are...","metadata":{"team":"Ops"}}'
            rows={4}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-500">
            Additional JSON merged into the webhook payload. Leave blank to
            skip.
          </span>
        </label>
      </div>
    </div>
  );
}
