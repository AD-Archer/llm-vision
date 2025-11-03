interface SettingsTabsProps {
  activeTab: "settings" | "admin";
  onTabChange: (tab: "settings" | "admin") => void;
  isAdmin: boolean;
}

export function SettingsTabs({
  activeTab,
  onTabChange,
  isAdmin,
}: SettingsTabsProps) {
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 sm:gap-2 mb-6 sm:mb-8 border-b border-slate-700">
      <button
        onClick={() => onTabChange("settings")}
        className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
          activeTab === "settings"
            ? "border-blue-500 text-blue-400"
            : "border-transparent text-slate-400 hover:text-slate-300"
        }`}
      >
        My Settings
      </button>
      <button
        onClick={() => onTabChange("admin")}
        className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
          activeTab === "admin"
            ? "border-blue-500 text-blue-400"
            : "border-transparent text-slate-400 hover:text-slate-300"
        }`}
      >
        Admin Panel
      </button>
    </div>
  );
}
