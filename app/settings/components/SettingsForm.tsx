import { UserProfileSection } from "./UserProfileSection";
import { QuerySettingsSection } from "./QuerySettingsSection";
import { SettingsActionButtons } from "./SettingsActionButtons";

interface SettingsFormProps {
  email: string | undefined;
  name: string | undefined;
  autoSaveQueries: boolean;
  onAutoSaveQueriesChange: (value: boolean) => void;
  onSave: () => void | Promise<void>;
  onReset: () => void;
  isModified: boolean;
  isSaving?: boolean;
}

export function SettingsForm({
  email,
  name,
  autoSaveQueries,
  onAutoSaveQueriesChange,
  onSave,
  onReset,
  isModified,
  isSaving,
}: SettingsFormProps) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <UserProfileSection email={email} name={name} />
      <QuerySettingsSection
        autoSaveQueries={autoSaveQueries}
        onAutoSaveQueriesChange={onAutoSaveQueriesChange}
      />
      <SettingsActionButtons
        onSave={onSave}
        onReset={onReset}
        isModified={isModified}
        isSaving={isSaving}
      />
    </div>
  );
}
