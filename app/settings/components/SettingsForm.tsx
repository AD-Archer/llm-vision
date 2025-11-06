import { UserProfileSection } from "./UserProfileSection";
import { ApiConfigurationSection } from "./ApiConfigurationSection";
import { QuerySettingsSection } from "./QuerySettingsSection";
import { SettingsActionButtons } from "./SettingsActionButtons";

interface SettingsFormProps {
  email: string | undefined;
  name: string | undefined;
  webhookUrl: string;
  onWebhookUrlChange: (url: string) => void;
  timeoutSeconds: number;
  onTimeoutChange: (seconds: number) => void;
  autoSaveQueries: boolean;
  onAutoSaveQueriesChange: (value: boolean) => void;
  onSave: () => void;
  onReset: () => void;
  isModified: boolean;
  webhookUsername?: string;
  onWebhookUsernameChange?: (username: string) => void;
  webhookPassword?: string;
  onWebhookPasswordChange?: (password: string) => void;
}

export function SettingsForm({
  email,
  name,
  webhookUrl,
  onWebhookUrlChange,
  timeoutSeconds,
  onTimeoutChange,
  autoSaveQueries,
  onAutoSaveQueriesChange,
  onSave,
  onReset,
  isModified,
  webhookUsername,
  onWebhookUsernameChange,
  webhookPassword,
  onWebhookPasswordChange,
}: SettingsFormProps) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <UserProfileSection email={email} name={name} />
      <ApiConfigurationSection
        webhookUrl={webhookUrl}
        onWebhookUrlChange={onWebhookUrlChange}
        timeoutSeconds={timeoutSeconds}
        onTimeoutChange={onTimeoutChange}
        webhookUsername={webhookUsername}
        onWebhookUsernameChange={onWebhookUsernameChange}
        webhookPassword={webhookPassword}
        onWebhookPasswordChange={onWebhookPasswordChange}
      />
      <QuerySettingsSection
        autoSaveQueries={autoSaveQueries}
        onAutoSaveQueriesChange={onAutoSaveQueriesChange}
      />
      <SettingsActionButtons
        onSave={onSave}
        onReset={onReset}
        isModified={isModified}
      />
    </div>
  );
}
