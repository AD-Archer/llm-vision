"use client";

import { useState, useEffect } from "react";
import { useAdmin } from "../context/AdminContext";
import { useSettings, AppSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { AiSettingsSection } from "../app/settings/components/AiSettingsSection";
import { UserStats, UserFeatures } from "../types";

interface AdminPanelProps {
  timeoutEnabled: boolean;
  onTimeoutEnabledChange: (enabled: boolean) => void;
  timeoutSeconds: number;
  onTimeoutSecondsChange: (seconds: number) => void;
}

export function AdminPanel({
  timeoutEnabled,
  onTimeoutEnabledChange,
  timeoutSeconds,
  onTimeoutSecondsChange,
}: AdminPanelProps) {
  const {
    users,
    totalUsers,
    totalQueries,
    generateInvitationCode,
    invitationCodes,
    updateUserFeatures,
    removeUser,
    makeAdmin,
    resetPassword,
    revokeInvitationCode,
  } = useAdmin();
  const { settings, updateSettings } = useSettings();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "invitations" | "settings" | "deleted"
  >("overview");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [newInvitation, setNewInvitation] = useState<{
    code: string;
    createdAt: string;
    expiresAt: string;
  } | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const handleGenerateInvite = async () => {
    const invitation = await generateInvitationCode();
    setNewInvitation(invitation);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert("Invitation code copied to clipboard!");
  };

  const handleCopyInviteLink = (code: string) => {
    const inviteUrl = `${
      typeof window !== "undefined" ? window.location.origin : ""
    }/signup?code=${code}`;
    navigator.clipboard.writeText(inviteUrl);
    alert("Invitation link copied to clipboard!");
  };

  const adminUsersCount = users.filter((user) => user.isAdmin).length;

  const toggleUserExpanded = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-slate-700">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
            activeTab === "overview"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
            activeTab === "users"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          Users ({totalUsers})
        </button>
        <button
          onClick={() => setActiveTab("invitations")}
          className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
            activeTab === "invitations"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          Invitations
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
            activeTab === "settings"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveTab("deleted")}
          className={`px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
            activeTab === "deleted"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          Deleted Queries
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-slate-700 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-slate-400 mb-1">
                Total Users
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {totalUsers}
              </p>
            </div>
            <div className="bg-slate-700 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-slate-400 mb-1">
                Admin Users
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-green-400">
                {adminUsersCount}
              </p>
            </div>
            <div className="bg-slate-700 rounded-lg p-3 sm:p-4 col-span-2 sm:col-span-1">
              <p className="text-xs sm:text-sm text-slate-400 mb-1">
                Total Queries
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-400">
                {totalQueries}
              </p>
            </div>
          </div>

          <div className="bg-slate-700 rounded-lg p-3 sm:p-4">
            <h3 className="text-sm sm:text-base font-semibold text-white mb-2">
              Quick Stats
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm text-slate-300">
                <span>Average Queries per User:</span>
                <span className="font-semibold">
                  {totalUsers > 0 ? (totalQueries / totalUsers).toFixed(1) : 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-2 sm:space-y-3">
          {users.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6 sm:py-8">
              No users yet. Generate an invitation code to add users.
            </p>
          ) : (
            users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onToggle={() => toggleUserExpanded(user.id)}
                onRemove={removeUser}
                onResetPassword={async (
                  userId: string,
                  newPassword: string
                ) => {
                  if (currentUser) {
                    await resetPassword(userId, newPassword, currentUser.id);
                    alert("Password reset successfully!");
                  }
                }}
                onUpdateFeatures={updateUserFeatures}
                onMakeAdmin={async (userId: string) => {
                  if (currentUser) {
                    await makeAdmin(userId, currentUser.id);
                    alert("User has been made an admin!");
                  }
                }}
              />
            ))
          )}
        </div>
      )}

      {/* Invitations Tab */}
      {activeTab === "invitations" && (
        <div className="space-y-3 sm:space-y-4">
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="w-full px-4 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm text-white font-medium rounded-lg transition-colors"
          >
            {showInviteForm ? "Cancel" : "+ Generate Invitation Code"}
          </button>

          {showInviteForm && (
            <div className="bg-slate-700 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-slate-300 mb-3">
                Click the button below to generate a new invitation code that
                will expire in 7 days.
              </p>
              <button
                onClick={handleGenerateInvite}
                className="w-full px-4 py-2 sm:py-2.5 bg-green-600 hover:bg-green-700 text-xs sm:text-sm text-white font-medium rounded-lg transition-colors"
              >
                Generate Code
              </button>

              {newInvitation && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-slate-800 rounded-lg">
                  <p className="text-xs sm:text-sm text-slate-300 mb-2">
                    New Invitation Code:
                  </p>
                  <div className="flex gap-2">
                    <code className="flex-1 px-3 py-2 bg-slate-900 rounded text-xs sm:text-sm text-yellow-400 font-mono break-all">
                      {newInvitation.code}
                    </code>
                    <button
                      onClick={() => handleCopyCode(newInvitation.code)}
                      className="px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded text-xs sm:text-sm text-white transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Expires:{" "}
                    {new Date(newInvitation.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm sm:text-base font-semibold text-white">
              Active Invitations
            </h3>
            {invitationCodes.filter((inv) => !inv.usedBy).length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-400">
                No active invitations
              </p>
            ) : (
              invitationCodes
                .filter((inv) => !inv.usedBy)
                .map((invitation) => {
                  const inviteUrl = `${
                    typeof window !== "undefined" ? window.location.origin : ""
                  }/signup?code=${invitation.code}`;
                  return (
                    <div
                      key={invitation.code}
                      className="bg-slate-700 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3"
                    >
                      <div>
                        <p className="text-xs sm:text-sm text-slate-400 mb-1">
                          Invitation Code
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyCode(invitation.code)}
                            className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs bg-slate-600 hover:bg-slate-500 rounded text-white transition-colors"
                          >
                            Copy
                          </button>
                          <button
                            onClick={() =>
                              revokeInvitationCode(invitation.code)
                            }
                            className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs sm:text-sm text-slate-400 mb-1">
                          Full Invite Link
                        </p>
                        <div className="flex gap-2 flex-col sm:flex-row">
                          <code className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs text-blue-400 font-mono bg-slate-800 rounded break-all">
                            {inviteUrl}
                          </code>
                          <button
                            onClick={() =>
                              handleCopyInviteLink(invitation.code)
                            }
                            className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors whitespace-nowrap"
                          >
                            Copy Link
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400">
                        Expires:{" "}
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  );
                })
            )}

            <h3 className="text-sm sm:text-base font-semibold text-white mt-4 sm:mt-6">
              Used Invitations
            </h3>
            {invitationCodes.filter((inv) => inv.usedBy).length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-400">
                No used invitations yet
              </p>
            ) : (
              invitationCodes
                .filter((inv) => inv.usedBy)
                .map((invitation) => (
                  <div
                    key={invitation.code}
                    className="bg-slate-700 rounded-lg p-2 sm:p-3"
                  >
                    <code className="text-xs sm:text-sm text-blue-400 font-mono">
                      {invitation.code}
                    </code>
                    <p className="text-xs text-slate-400 mt-1">
                      Used by: {invitation.usedBy}
                    </p>
                    <p className="text-xs text-slate-400">
                      {invitation.usedAt &&
                        `Used: ${new Date(
                          invitation.usedAt
                        ).toLocaleDateString()}`}
                    </p>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-3 sm:space-y-4">
          <div className="bg-slate-700 rounded-lg p-3 sm:p-4">
            <h3 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">
              API Configuration
            </h3>
            <ApiConfigurationForm
              settings={settings}
              onUpdateSettings={updateSettings}
              timeoutEnabled={timeoutEnabled}
              onTimeoutEnabledChange={onTimeoutEnabledChange}
              timeoutSeconds={timeoutSeconds}
              onTimeoutSecondsChange={onTimeoutSecondsChange}
            />
          </div>
          <div className="bg-slate-700 rounded-lg p-3 sm:p-4">
            <h3 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">
              Prompt Helper Webhook
            </h3>
            <PromptHelperConfigurationForm />
          </div>
          <div className="bg-slate-700 rounded-lg p-3 sm:p-4">
            <h3 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">
              AI Settings
            </h3>
            <AiSettingsForm
              settings={settings}
              onUpdateSettings={updateSettings}
            />
          </div>
        </div>
      )}

      {/* Deleted Queries Tab */}
      {activeTab === "deleted" && <DeletedQueriesTab />}
    </div>
  );
}

interface ApiConfigurationFormProps {
  settings: AppSettings;
  onUpdateSettings: (
    updates: Partial<AppSettings>,
    userId: string
  ) => Promise<void>;
  timeoutEnabled: boolean;
  onTimeoutEnabledChange: (enabled: boolean) => void;
  timeoutSeconds: number;
  onTimeoutSecondsChange: (seconds: number) => void;
}

function ApiConfigurationForm({
  settings,
  onUpdateSettings,
  timeoutEnabled,
  onTimeoutEnabledChange,
  timeoutSeconds,
  onTimeoutSecondsChange,
}: ApiConfigurationFormProps) {
  const { user } = useAuth();
  // Deprecated: per-target webhooks removed. Use AI provider below.
  const [aiProviderUrl, setAiProviderUrl] = useState(
    settings.aiProviderUrl || ""
  );
  const [aiProviderApiKey, setAiProviderApiKey] = useState(
    settings.aiProviderApiKey || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Partial<AppSettings> = {
        aiProviderUrl,
        aiProviderApiKey,
        timeoutSeconds,
      };
      // custom webhook headers removed; no action needed
      await onUpdateSettings(updates, user!.id);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save settings", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestProvider = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/ai-provider/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user!.id }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setTestResult(`Success: ${data.status}`);
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : "Test failed");
    } finally {
      setIsTesting(false);
    }
  };

  const isModified =
    aiProviderUrl !== (settings.aiProviderUrl || "") ||
    aiProviderApiKey !== (settings.aiProviderApiKey || "") ||
    timeoutSeconds !== (settings.timeoutSeconds || 60);

  return (
    <div className="space-y-4">
      {/* RAG webhook removed - use AI Provider URL instead */}

      <div className="mt-3">
        <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
          AI Provider URL
        </label>
        <input
          type="url"
          value={aiProviderUrl}
          onChange={(e) => setAiProviderUrl(e.target.value)}
          placeholder="https://agents.do-ai.run/api/v1/chat/completions"
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-400 mt-1">
          Optional: Direct AI provider endpoint to replace external webhooks.
        </p>
      </div>

      <div className="mt-3">
        <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
          AI Provider API Key
        </label>
        <input
          type="text"
          value={aiProviderApiKey}
          onChange={(e) => setAiProviderApiKey(e.target.value)}
          placeholder="Bearer <your-token>"
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-400 mt-1">
          Optional: API key for the AI provider. Sensitive values will be stored
          and displayed masked.
        </p>
      </div>

      <div>
        <div className="flex items-center space-x-3 mb-3">
          <input
            id="timeoutEnabled"
            type="checkbox"
            checked={timeoutEnabled}
            onChange={(e) => onTimeoutEnabledChange(e.target.checked)}
            className="w-4 h-4 bg-slate-700 border border-slate-600 rounded focus:ring-blue-500 cursor-pointer"
          />
          <label
            htmlFor="timeoutEnabled"
            className="text-xs sm:text-sm text-slate-300 cursor-pointer font-medium"
          >
            Enable Request Timeout
          </label>
        </div>
        <p className="text-xs text-slate-400 mb-3 ml-7">
          When enabled, API requests will be cancelled after the specified time.
          This helps prevent long-running queries from consuming resources.
        </p>

        {timeoutEnabled && (
          <>
            <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2 ml-7">
              Timeout Duration
            </label>
            <div className="ml-7 flex items-center gap-2">
              <input
                type="number"
                min="60"
                max="3600"
                step="60"
                value={timeoutSeconds}
                onChange={(e) =>
                  onTimeoutSecondsChange(parseInt(e.target.value, 10))
                }
                className="w-20 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-xs sm:text-sm text-slate-400">
                ({Math.floor(timeoutSeconds / 60)} minute
                {Math.floor(timeoutSeconds / 60) !== 1 ? "s" : ""})
              </span>
            </div>
            <p className="text-xs text-slate-500 ml-7">
              Valid range: 60 seconds to 1 hour (3600 seconds)
            </p>
          </>
        )}
      </div>

      {/* Webhook Authentication and Custom Headers removed; AI Provider authentication uses API Key */}

      {/* Custom headers removed */}

      <div className="flex gap-2 pt-4 border-t border-slate-600">
        <button
          onClick={handleSave}
          disabled={!isModified || isSaving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
        <button
          onClick={handleTestProvider}
          disabled={isTesting || !aiProviderUrl}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isTesting ? "Testing..." : "Test AI Provider"}
        </button>
        {testResult && (
          <span className="ml-2 text-sm text-slate-300">{testResult}</span>
        )}
        {saveSuccess && (
          <span className="text-green-400 text-sm self-center">
            Settings saved!
          </span>
        )}
      </div>
    </div>
  );
}

function PromptHelperConfigurationForm() {
  // Prompt helper webhook settings removed. Use AI Provider configuration above.
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Prompt helper functionality uses the configured AI Provider. No
        additional webhook configuration is required.
      </p>
    </div>
  );
}

interface UserCardProps {
  user: UserStats;
  onToggle: () => void;
  onRemove: (userId: string) => void;
  onResetPassword: (userId: string, newPassword: string) => Promise<void>;
  onUpdateFeatures: (userId: string, features: Partial<UserFeatures>) => void;
  onMakeAdmin?: (userId: string) => Promise<void>;
}

function AiSettingsForm({
  settings,
  onUpdateSettings,
}: {
  settings: AppSettings;
  onUpdateSettings: (
    updates: Partial<AppSettings>,
    userId: string
  ) => Promise<void>;
}) {
  const { user } = useAuth();
  const [aiTemperature, setAiTemperature] = useState(
    settings.aiTemperature ?? 0.7
  );
  const [aiTopP, setAiTopP] = useState(settings.aiTopP ?? 1.0);
  const [aiMaxTokens, setAiMaxTokens] = useState(settings.aiMaxTokens ?? 4096);
  const [aiStream, setAiStream] = useState(settings.aiStream ?? false);
  const [aiK, setAiK] = useState(settings.aiK ?? 5);
  const [aiRetrievalMethod, setAiRetrievalMethod] = useState(
    settings.aiRetrievalMethod ?? "none"
  );
  const [aiFrequencyPenalty, setAiFrequencyPenalty] = useState(
    settings.aiFrequencyPenalty ?? 0.0
  );
  const [aiPresencePenalty, setAiPresencePenalty] = useState(
    settings.aiPresencePenalty ?? 0.0
  );
  const [
    aiFilterKbContentByQueryMetadata,
    setAiFilterKbContentByQueryMetadata,
  ] = useState(settings.aiFilterKbContentByQueryMetadata ?? false);
  const [aiIncludeFunctionsInfo, setAiIncludeFunctionsInfo] = useState(
    settings.aiIncludeFunctionsInfo ?? false
  );
  const [aiIncludeRetrievalInfo, setAiIncludeRetrievalInfo] = useState(
    settings.aiIncludeRetrievalInfo ?? false
  );
  const [aiIncludeGuardrailsInfo, setAiIncludeGuardrailsInfo] = useState(
    settings.aiIncludeGuardrailsInfo ?? false
  );
  const [aiProvideCitations, setAiProvideCitations] = useState(
    settings.aiProvideCitations ?? false
  );
  const [aiDisableTokenCount, setAiDisableTokenCount] = useState(
    settings.aiDisableTokenCount ?? false
  );
  const [aiSystemPrompt, setAiSystemPrompt] = useState(
    settings.aiSystemPrompt ?? ""
  );
  const [aiHelperSystemPrompt, setAiHelperSystemPrompt] = useState(
    settings.aiHelperSystemPrompt ?? ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Partial<AppSettings> = {
        aiTemperature,
        aiTopP,
        aiMaxTokens,
        aiStream,
        aiK,
        aiRetrievalMethod,
        aiFrequencyPenalty,
        aiPresencePenalty,
        aiFilterKbContentByQueryMetadata,
        aiIncludeFunctionsInfo,
        aiIncludeRetrievalInfo,
        aiIncludeGuardrailsInfo,
        aiProvideCitations,
        aiDisableTokenCount,
        aiSystemPrompt,
        aiHelperSystemPrompt,
      };
      await onUpdateSettings(updates, user!.id);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save AI settings", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setAiTemperature(0.7);
    setAiTopP(1.0);
    setAiMaxTokens(4096);
    setAiStream(false);
    setAiK(5);
    setAiRetrievalMethod("none");
    setAiFrequencyPenalty(0.0);
    setAiPresencePenalty(0.0);
    setAiFilterKbContentByQueryMetadata(false);
    setAiIncludeFunctionsInfo(false);
    setAiIncludeRetrievalInfo(false);
    setAiIncludeGuardrailsInfo(false);
    setAiProvideCitations(false);
    setAiDisableTokenCount(false);
    setAiSystemPrompt("");
    setAiHelperSystemPrompt("");
  };

  return (
    <div className="space-y-4">
      <AiSettingsSection
        aiTemperature={aiTemperature}
        aiTopP={aiTopP}
        aiMaxTokens={aiMaxTokens}
        aiStream={aiStream}
        aiK={aiK}
        aiRetrievalMethod={aiRetrievalMethod}
        aiFrequencyPenalty={aiFrequencyPenalty}
        aiPresencePenalty={aiPresencePenalty}
        aiFilterKbContentByQueryMetadata={aiFilterKbContentByQueryMetadata}
        aiIncludeFunctionsInfo={aiIncludeFunctionsInfo}
        aiIncludeRetrievalInfo={aiIncludeRetrievalInfo}
        aiIncludeGuardrailsInfo={aiIncludeGuardrailsInfo}
        aiProvideCitations={aiProvideCitations}
        aiDisableTokenCount={aiDisableTokenCount}
        aiSystemPrompt={aiSystemPrompt}
        aiHelperSystemPrompt={aiHelperSystemPrompt}
        onAiTemperatureChange={setAiTemperature}
        onAiTopPChange={setAiTopP}
        onAiMaxTokensChange={setAiMaxTokens}
        onAiStreamChange={setAiStream}
        onAiKChange={setAiK}
        onAiRetrievalMethodChange={setAiRetrievalMethod}
        onAiFrequencyPenaltyChange={setAiFrequencyPenalty}
        onAiPresencePenaltyChange={setAiPresencePenalty}
        onAiFilterKbContentByQueryMetadataChange={
          setAiFilterKbContentByQueryMetadata
        }
        onAiIncludeFunctionsInfoChange={setAiIncludeFunctionsInfo}
        onAiIncludeRetrievalInfoChange={setAiIncludeRetrievalInfo}
        onAiIncludeGuardrailsInfoChange={setAiIncludeGuardrailsInfo}
        onAiProvideCitationsChange={setAiProvideCitations}
        onAiDisableTokenCountChange={setAiDisableTokenCount}
        onAiSystemPromptChange={setAiSystemPrompt}
        onAiHelperSystemPromptChange={setAiHelperSystemPrompt}
        onResetToDefaults={handleResetToDefaults}
      />
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isSaving ? "Saving..." : "Save AI Settings"}
        </button>
        {saveSuccess && (
          <span className="ml-2 text-green-400 text-sm self-center">
            Settings saved!
          </span>
        )}
      </div>
    </div>
  );
}

function UserCard({
  user,

  onToggle,
  onRemove,
  onResetPassword,
  onUpdateFeatures,
  onMakeAdmin,
}: UserCardProps) {
  const [features, setFeatures] = useState<Partial<UserFeatures>>({
    maxQueriesPerDay: 100,
    apiAccessEnabled: true,
    advancedChartsEnabled: true,
    customWebhooksEnabled: true,
  });
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const handleFeatureChange = (
    key: keyof UserFeatures,
    value: string | boolean | number
  ) => {
    const updated = { ...features, [key]: value };
    setFeatures(updated);
    onUpdateFeatures(user.id, updated);
  };

  return (
    <div className="bg-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-3 sm:px-4 py-3 sm:py-4 text-left hover:bg-slate-600 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
      >
        <div className="flex items-center gap-3">
          <div className="text-white font-medium">{user.name}</div>
          <div className="text-xs text-slate-400">{user.email}</div>
        </div>
        <div className="text-xs text-slate-400">
          {user.isAdmin ? "Administrator" : "User"}
        </div>
      </button>

      <div className="p-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-300">Advanced Charts</label>
            <input
              type="checkbox"
              checked={features.advancedChartsEnabled !== false}
              onChange={(e) =>
                handleFeatureChange("advancedChartsEnabled", e.target.checked)
              }
              className="ml-2"
            />
          </div>
          <div>
            <label className="text-xs text-slate-300">Custom Webhooks</label>
            <input
              type="checkbox"
              checked={features.customWebhooksEnabled !== false}
              onChange={(e) =>
                handleFeatureChange("customWebhooksEnabled", e.target.checked)
              }
              className="ml-2"
            />
          </div>
          <div>
            <label className="text-xs text-slate-300">Max Queries/Day</label>
            <input
              type="number"
              min={10}
              max={10000}
              value={features.maxQueriesPerDay || 100}
              onChange={(e) =>
                handleFeatureChange(
                  "maxQueriesPerDay",
                  parseInt(e.target.value)
                )
              }
              className="w-full px-2 py-1 text-xs sm:text-sm bg-slate-700 border border-slate-600 rounded text-white"
            />
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-600 pt-3 sm:pt-4 mt-3">
          <button
            onClick={() => setShowResetPassword(!showResetPassword)}
            className="flex-1 px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors"
          >
            {showResetPassword ? "Cancel Reset" : "Reset Password"}
          </button>
          {onMakeAdmin && !user.isAdmin && (
            <button
              onClick={() => onMakeAdmin(user.id)}
              className="flex-1 px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-purple-600 hover:bg-purple-700 text-white font-medium rounded transition-colors"
            >
              Make Admin
            </button>
          )}
          <button
            onClick={() => onRemove(user.id)}
            className="flex-1 px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors"
          >
            Remove User
          </button>
        </div>

        {showResetPassword && (
          <div className="mt-3 space-y-2">
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400"
            />
            <button
              onClick={async () => {
                if (newPassword.length < 6) {
                  alert("Password must be at least 6 characters");
                  return;
                }
                try {
                  await onResetPassword(user.id, newPassword);
                  setNewPassword("");
                  setShowResetPassword(false);
                } catch (error) {
                  alert(
                    "Failed to reset password: " + (error as Error).message
                  );
                }
              }}
              className="w-full px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors"
            >
              Confirm Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DeletedQueriesTab() {
  interface DeletedQuery {
    id: string;
    question: string;
    deleted: boolean;
    updatedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }

  const [deletedQueries, setDeletedQueries] = useState<DeletedQuery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeletedQueries = async () => {
      try {
        const response = await fetch("/api/admin/queries");
        if (response.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data: any[] = await response.json();
          // Filter for deleted queries
          const allDeletedQueries: DeletedQuery[] = data.flatMap(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (userData: any) =>
              userData.queries
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((query: any) => query.deleted)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((query: any) => ({
                  ...query,
                  user: userData.user,
                }))
          );
          setDeletedQueries(allDeletedQueries);
        }
      } catch (error) {
        console.error("Failed to fetch deleted queries:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeletedQueries();
  }, []);

  const handleRestoreQuery = async (queryId: string, userId: string) => {
    try {
      const response = await fetch(
        `/api/queries/${queryId}?userId=${userId}&action=restore`,
        {
          method: "PATCH",
        }
      );

      if (response.ok) {
        // Remove from deleted queries list
        setDeletedQueries((prev) =>
          prev.filter((query) => query.id !== queryId)
        );
        alert("Query restored successfully!");
      } else {
        alert("Failed to restore query");
      }
    } catch (error) {
      console.error("Failed to restore query:", error);
      alert("Failed to restore query");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-6 sm:py-8">
        <p className="text-sm text-slate-400">Loading deleted queries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {deletedQueries.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6 sm:py-8">
          No deleted queries found.
        </p>
      ) : (
        deletedQueries.map((query) => (
          <div key={query.id} className="bg-slate-700 rounded-lg p-3 sm:p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <p className="text-sm text-white font-medium mb-1">
                  {query.question}
                </p>
                <p className="text-xs text-slate-400">
                  User: {query.user.name} ({query.user.email})
                </p>
                <p className="text-xs text-slate-400">
                  Deleted: {new Date(query.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleRestoreQuery(query.id, query.user.id)}
                className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors"
              >
                Restore
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
