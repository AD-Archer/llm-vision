interface SettingsActionButtonsProps {
  onSave: () => void;
  onReset: () => void;
  isModified: boolean;
}

export function SettingsActionButtons({
  onSave,
  onReset,
  isModified,
}: SettingsActionButtonsProps) {
  return (
    <div className="p-3 sm:p-4 md:p-6 bg-slate-900 flex flex-col sm:flex-row gap-2 sm:gap-4">
      <button
        onClick={onSave}
        disabled={!isModified}
        className="px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Save Changes
      </button>
      <button
        onClick={onReset}
        className="px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-700 hover:bg-slate-600 text-xs sm:text-sm text-slate-200 font-medium rounded-lg transition-colors"
      >
        Reset
      </button>
    </div>
  );
}
