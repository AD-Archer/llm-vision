interface AdvancedSettingsProps {
  sessionId: string;
  onSessionIdChange: (id: string) => void;
  onSessionReset: () => void;
  disabled: boolean;
}

export function AdvancedSettings({
  sessionId,
  onSessionIdChange,
  onSessionReset,
  disabled,
}: AdvancedSettingsProps) {
  return (
    <details className="bg-slate-700 rounded-lg p-4 border border-slate-600">
      <summary className="cursor-pointer font-medium text-slate-300 hover:text-blue-400">
        Advanced Settings
      </summary>
      <div className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="sessionId"
            className="block text-xs sm:text-sm font-medium text-slate-300 mb-2"
          >
            Session ID
          </label>
          <div className="flex gap-2">
            <input
              id="sessionId"
              type="text"
              value={sessionId}
              onChange={(event) => onSessionIdChange(event.target.value)}
              disabled={disabled}
              placeholder="session-123"
              className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-slate-600 border border-slate-500 text-white placeholder-slate-400 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              className="px-3 sm:px-4 py-2 sm:py-3 bg-slate-600 hover:bg-slate-500 text-slate-300 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors whitespace-nowrap"
              onClick={onSessionReset}
              disabled={disabled}
            >
              New ID
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Persisted locally so your AI memory stays in sync.
          </p>
        </div>
      </div>
    </details>
  );
}
