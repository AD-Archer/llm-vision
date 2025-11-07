"use client";

import { useState } from "react";
import { useAdmin } from "../context/AdminContext";
import { useSettings, AppSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { UserStats, UserFeatures } from "../types";

export function AdminPanel() {
  const {
    users,
    totalUsers,
    activeUsers,
    totalQueries,
    generateInvitationCode,
    invitationCodes,
    updateUserFeatures,
    removeUser,
    resetPassword,
    revokeInvitationCode,
  } = useAdmin();
  const { settings, updateSettings } = useSettings();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "invitations" | "settings"
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
                Active Users
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-green-400">
                {activeUsers}
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
              <div className="flex justify-between text-xs sm:text-sm text-slate-300">
                <span>Active Percentage:</span>
                <span className="font-semibold">
                  {totalUsers > 0
                    ? ((activeUsers / totalUsers) * 100).toFixed(0)
                    : 0}
                  %
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
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface ApiConfigurationFormProps {
  settings: AppSettings;
  onUpdateSettings: (
    updates: Partial<AppSettings>,
    userId: string
  ) => Promise<void>;
}

function ApiConfigurationForm({
  settings,
  onUpdateSettings,
}: ApiConfigurationFormProps) {
  const { user } = useAuth();
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl || "");
  const [timeoutSeconds, setTimeoutSeconds] = useState(
    settings.timeoutSeconds || 60
  );
  const [webhookUsername, setWebhookUsername] = useState(
    settings.webhookUsername || ""
  );
  const [webhookPassword, setWebhookPassword] = useState(
    settings.webhookPassword || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateSettings(
        {
          webhookUrl,
          timeoutSeconds,
          webhookUsername,
          webhookPassword,
        },
        user!.id
      );
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
    webhookPassword !== (settings.webhookPassword || "");

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
          Webhook URL
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
        <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2">
          Request Timeout (seconds)
        </label>
        <input
          type="number"
          min="5"
          max="600"
          value={timeoutSeconds || ""}
          onChange={(e) => {
            const value = e.target.value;
            setTimeoutSeconds(value === "" ? 60 : Number(value));
          }}
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-400 mt-1">
          How long to wait for webhook responses (5-600 seconds)
        </p>
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
}

function UserCard({
  user,
  isExpanded,
  onToggle,
  onRemove,
  onResetPassword,
  onUpdateFeatures,
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
          <span className="text-xs sm:text-sm text-slate-300 font-medium">
            {user.queryCount} queries
          </span>
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
            <div>
              <p className="text-slate-400">Last Active:</p>
              <p>{new Date(user.lastActive).toLocaleDateString()}</p>
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
