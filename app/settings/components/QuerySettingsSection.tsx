interface QuerySettingsSectionProps {
  autoSaveQueries: boolean;
  onAutoSaveQueriesChange: (value: boolean) => void;
}

export function QuerySettingsSection({
  autoSaveQueries,
  onAutoSaveQueriesChange,
}: QuerySettingsSectionProps) {
  return (
    <div className="p-3 sm:p-4 md:p-6 border-b border-slate-700">
      <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">
        Query Settings
      </h2>
      <div className="space-y-4">
        <div>
          <div className="flex items-center space-x-3">
            <input
              id="autoSave"
              type="checkbox"
              checked={autoSaveQueries}
              onChange={(e) => onAutoSaveQueriesChange(e.target.checked)}
              className="w-4 h-4 bg-slate-700 border border-slate-600 rounded focus:ring-blue-500 cursor-pointer"
            />
            <label
              htmlFor="autoSave"
              className="text-xs sm:text-sm text-slate-300 cursor-pointer"
            >
              Automatically save queries to history
            </label>
          </div>
          <p className="text-xs text-slate-400 mt-2 sm:mt-2.5">
            When enabled, all queries will be saved to your Saved Queries page
          </p>
        </div>
      </div>
    </div>
  );
}
