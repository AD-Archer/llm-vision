interface AdminSettingsSectionProps {
  requestTimeoutEnabled: boolean;
  requestTimeoutSeconds: number;
  onRequestTimeoutEnabledChange: (value: boolean) => void;
  onRequestTimeoutSecondsChange: (value: number) => void;
}

export function AdminSettingsSection({
  requestTimeoutEnabled,
  requestTimeoutSeconds,
  onRequestTimeoutEnabledChange,
  onRequestTimeoutSecondsChange,
}: AdminSettingsSectionProps) {
  const formatTimeoutDisplay = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 border-b border-slate-700">
      <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">
        Admin Settings
      </h2>

      {/* Request Timeout Setting */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-3">
          <input
            id="requestTimeout"
            type="checkbox"
            checked={requestTimeoutEnabled}
            onChange={(e) => onRequestTimeoutEnabledChange(e.target.checked)}
            className="w-4 h-4 bg-slate-700 border border-slate-600 rounded focus:ring-blue-500 cursor-pointer"
          />
          <label
            htmlFor="requestTimeout"
            className="text-xs sm:text-sm text-slate-300 cursor-pointer font-medium"
          >
            Enable API Request Timeout
          </label>
        </div>
        <p className="text-xs text-slate-400 mb-3 ml-7">
          When enabled, API requests will be cancelled after the specified time.
          This helps prevent long-running queries from consuming resources.
        </p>

        {requestTimeoutEnabled && (
          <div className="ml-7 space-y-2">
            <label
              htmlFor="timeoutSeconds"
              className="block text-xs sm:text-sm text-slate-300"
            >
              Timeout Duration
            </label>
            <div className="flex items-center gap-2">
              <input
                id="timeoutSeconds"
                type="number"
                min="60"
                max="3600"
                step="60"
                value={requestTimeoutSeconds}
                onChange={(e) =>
                  onRequestTimeoutSecondsChange(parseInt(e.target.value, 10))
                }
                className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-xs sm:text-sm text-slate-400">
                ({formatTimeoutDisplay(requestTimeoutSeconds)})
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Valid range: 60 seconds to 1 hour (3600 seconds)
            </p>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-xs sm:text-sm text-slate-300">
        <p className="font-medium text-blue-400 mb-2">
          ℹ️ About Request Timeouts
        </p>
        <ul className="list-disc list-inside space-y-1 text-slate-400">
          <li>Disabled by default to allow queries to run as long as needed</li>
          <li>Users can manually stop queries via the Cancel Query button</li>
          <li>This setting applies globally to all users</li>
          <li>
            If disabled, users have full control to run queries indefinitely
          </li>
        </ul>
      </div>
    </div>
  );
}
