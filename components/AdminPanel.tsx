"use client";

import { useState, useEffect } from "react";
import { useAdmin } from "../context/AdminContext";
import { useSettings, AppSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
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
                isExpanded={expandedUser === user.id}
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
            <PromptHelperConfigurationForm
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
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl || "");
  const [webhookUsername, setWebhookUsername] = useState(
    settings.webhookUsername || ""
  );
  const [webhookPassword, setWebhookPassword] = useState(
    settings.webhookPassword || ""
  );
  const [webhookHeaders, setWebhookHeaders] = useState<Record<string, string>>(
    settings.webhookHeaders || {}
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Partial<AppSettings> = {
        webhookUrl,
        timeoutSeconds,
        webhookUsername,
        webhookPassword,
      };
      if (Object.keys(webhookHeaders).length > 0) {
        updates.webhookHeaders = webhookHeaders;
      } else if (
        settings.webhookHeaders &&
        Object.keys(settings.webhookHeaders).length > 0
      ) {
        updates.webhookHeaders = null;
      }
      await onUpdateSettings(updates, user!.id);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save settings", error);
    } finally {
      setIsSaving(false);
    }
  };

  const isModified =
    webhookUrl !== (settings.webhookUrl || "") ||
    timeoutSeconds !== (settings.timeoutSeconds || 60) ||
    webhookUsername !== (settings.webhookUsername || "") ||
    webhookPassword !== (settings.webhookPassword || "") ||
    JSON.stringify(webhookHeaders) !==
      JSON.stringify(settings.webhookHeaders || {});

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
          Rag Webhook URL
        </label>
        <input
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://n8n.example.com/webhook/..."
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-400 mt-1">
          Your n8n webhook URL for RAG workflow queries
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

      <div className="border-t border-slate-600 pt-4">
        <h4 className="text-sm font-medium text-slate-300 mb-3">
          Webhook Authentication (Optional)
        </h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={webhookUsername}
              onChange={(e) => setWebhookUsername(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={webhookPassword}
              onChange={(e) => setWebhookPassword(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-600 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-slate-300">
            Custom Headers (Optional)
          </h4>
          <button
            onClick={() => {
              const key = `header${Object.keys(webhookHeaders).length + 1}`;
              setWebhookHeaders({ ...webhookHeaders, [key]: "" });
            }}
            className="px-3 py-1 text-xs bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors"
          >
            Add Header
          </button>
        </div>
        <div className="space-y-2">
          {Object.entries(webhookHeaders).map(([key, value]) => (
            <div key={key} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Header name"
                value={key}
                onChange={(e) => {
                  const newKey = e.target.value;
                  const newHeaders = { ...webhookHeaders };
                  delete newHeaders[key];
                  newHeaders[newKey] = value;
                  setWebhookHeaders(newHeaders);
                }}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Header value"
                value={value}
                onChange={(e) =>
                  setWebhookHeaders({
                    ...webhookHeaders,
                    [key]: e.target.value,
                  })
                }
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  const newHeaders = { ...webhookHeaders };
                  delete newHeaders[key];
                  setWebhookHeaders(newHeaders);
                }}
                className="px-2 py-2 text-red-400 hover:text-red-300 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Add custom headers for OAuth or other authentication requirements
        </p>
      </div>

      <div className="flex gap-2 pt-4 border-t border-slate-600">
        <button
          onClick={handleSave}
          disabled={!isModified || isSaving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
        {saveSuccess && (
          <span className="text-green-400 text-sm self-center">
            Settings saved!
          </span>
        )}
      </div>
    </div>
  );
}

interface PromptHelperConfigurationFormProps {
  settings: AppSettings;
  onUpdateSettings: (
    updates: Partial<AppSettings>,
    userId: string
  ) => Promise<void>;
}

function PromptHelperConfigurationForm({
  settings,
  onUpdateSettings,
}: PromptHelperConfigurationFormProps) {
  const { user } = useAuth();
  const [webhookUrl, setWebhookUrl] = useState(
    settings.promptHelperWebhookUrl || ""
  );
  const [webhookUsername, setWebhookUsername] = useState(
    settings.promptHelperUsername || ""
  );
  const [webhookPassword, setWebhookPassword] = useState(
    settings.promptHelperPassword || ""
  );
  const [headers, setHeaders] = useState<Record<string, string>>(
    settings.promptHelperHeaders || {}
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Partial<AppSettings> = {
        promptHelperWebhookUrl: webhookUrl,
        promptHelperUsername: webhookUsername,
        promptHelperPassword: webhookPassword,
      };
      if (Object.keys(headers).length > 0) {
        updates.promptHelperHeaders = headers;
      }
      await onUpdateSettings(updates, user!.id);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save settings", error);
    } finally {
      setIsSaving(false);
    }
  };

  const isModified =
    webhookUrl !== (settings.promptHelperWebhookUrl || "") ||
    webhookUsername !== (settings.promptHelperUsername || "") ||
    webhookPassword !== (settings.promptHelperPassword || "") ||
    JSON.stringify(headers) !==
      JSON.stringify(settings.promptHelperHeaders || {});

  const addHeader = () => {
    const key = `header${Object.keys(headers).length + 1}`;
    setHeaders({ ...headers, [key]: "" });
  };

  const updateHeader = (key: string, value: string) => {
    setHeaders({ ...headers, [key]: value });
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...headers };
    delete newHeaders[key];
    setHeaders(newHeaders);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
          Prompt Helper Webhook URL
        </label>
        <input
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://n8n.example.com/webhook/prompt-helper"
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-400 mt-1">
          Webhook URL for the prompt helper AI chat
        </p>
      </div>

      <div className="border-t border-slate-600 pt-4">
        <h4 className="text-sm font-medium text-slate-300 mb-3">
          Authentication (Optional)
        </h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={webhookUsername}
              onChange={(e) => setWebhookUsername(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={webhookPassword}
              onChange={(e) => setWebhookPassword(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-600 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-slate-300">
            Custom Headers (Optional)
          </h4>
          <button
            onClick={addHeader}
            className="px-3 py-1 text-xs bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors"
          >
            Add Header
          </button>
        </div>
        <div className="space-y-2">
          {Object.entries(headers).map(([key, value]) => (
            <div key={key} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Header name"
                value={key}
                onChange={(e) => {
                  const newKey = e.target.value;
                  const newHeaders = { ...headers };
                  delete newHeaders[key];
                  newHeaders[newKey] = value;
                  setHeaders(newHeaders);
                }}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Header value"
                value={value}
                onChange={(e) => updateHeader(key, e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={() => removeHeader(key)}
                className="px-2 py-2 text-red-400 hover:text-red-300 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Add custom headers for webhook authentication or other requirements
        </p>
      </div>

      <div className="flex gap-2 pt-4 border-t border-slate-600">
        <button
          onClick={handleSave}
          disabled={!isModified || isSaving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
        {saveSuccess && (
          <span className="text-green-400 text-sm self-center">
            Settings saved!
          </span>
        )}
      </div>
    </div>
  );
}

interface UserCardProps {
  user: UserStats;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: (userId: string) => void;
  onResetPassword: (userId: string, newPassword: string) => Promise<void>;
  onUpdateFeatures: (userId: string, features: Partial<UserFeatures>) => void;
  onMakeAdmin?: (userId: string) => Promise<void>;
}

function UserCard({
  user,
  isExpanded,
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs sm:text-sm font-semibold text-white truncate">
              {user.name}
            </h3>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                user.status === "active"
                  ? "bg-green-900/30 text-green-400"
                  : user.status === "inactive"
                  ? "bg-yellow-900/30 text-yellow-400"
                  : "bg-blue-900/30 text-blue-400"
              }`}
            >
              {user.status}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 truncate">
            {user.email}
          </p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <svg
            className={`w-4 h-4 sm:w-5 sm:h-5 text-slate-400 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 sm:px-4 py-3 sm:py-4 bg-slate-800 border-t border-slate-600 space-y-3 sm:space-y-4">
          {/* User Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm text-slate-300">
            <div>
              <p className="text-slate-400">Created:</p>
              <p>{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Feature Controls */}
          <div className="space-y-2 sm:space-y-3 border-t border-slate-600 pt-3 sm:pt-4">
            <h4 className="text-xs sm:text-sm font-semibold text-white">
              Features
            </h4>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`api-${user.id}`}
                checked={features.apiAccessEnabled !== false}
                onChange={(e) =>
                  handleFeatureChange("apiAccessEnabled", e.target.checked)
                }
                className="w-4 h-4 bg-slate-700 border border-slate-600 rounded"
              />
              <label
                htmlFor={`api-${user.id}`}
                className="text-xs sm:text-sm text-slate-300 cursor-pointer"
              >
                API Access
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`charts-${user.id}`}
                checked={features.advancedChartsEnabled !== false}
                onChange={(e) =>
                  handleFeatureChange("advancedChartsEnabled", e.target.checked)
                }
                className="w-4 h-4 bg-slate-700 border border-slate-600 rounded"
              />
              <label
                htmlFor={`charts-${user.id}`}
                className="text-xs sm:text-sm text-slate-300 cursor-pointer"
              >
                Advanced Charts
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`webhooks-${user.id}`}
                checked={features.customWebhooksEnabled !== false}
                onChange={(e) =>
                  handleFeatureChange("customWebhooksEnabled", e.target.checked)
                }
                className="w-4 h-4 bg-slate-700 border border-slate-600 rounded"
              />
              <label
                htmlFor={`webhooks-${user.id}`}
                className="text-xs sm:text-sm text-slate-300 cursor-pointer"
              >
                Custom Webhooks
              </label>
            </div>

            <div>
              <label
                htmlFor={`max-queries-${user.id}`}
                className="block text-xs sm:text-sm text-slate-300 mb-1"
              >
                Max Queries/Day
              </label>
              <input
                id={`max-queries-${user.id}`}
                type="number"
                min="10"
                max="10000"
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

          {/* Actions */}
          <div className="flex gap-2 border-t border-slate-600 pt-3 sm:pt-4">
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
      )}
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
