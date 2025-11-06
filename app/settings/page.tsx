"use client";

import { useState, useEffect } from "react";
import { useSettings } from "../../context/SettingsContext";
import { useAuth } from "../../context/AuthContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { AdminPanel } from "../../components/AdminPanel";
import { SettingsHeader } from "./components/SettingsHeader";
import { SettingsTabs } from "./components/SettingsTabs";
import { SettingsForm } from "./components/SettingsForm";
import { SaveSuccessMessage } from "./components/SaveSuccessMessage";

function SettingsContent() {
  const { user, isAdmin } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [timeoutSeconds, setTimeoutSeconds] = useState(60);
  const [autoSaveQueries, setAutoSaveQueries] = useState(true);
  const [webhookUsername, setWebhookUsername] = useState("");
  const [webhookPassword, setWebhookPassword] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "admin">(
    isAdmin ? "admin" : "settings"
  );

  useEffect(() => {
    setWebhookUrl(settings.webhookUrl);
    setTimeoutSeconds(settings.timeoutSeconds);
    setAutoSaveQueries(settings.autoSaveQueries);
    setWebhookUsername(settings.webhookUsername || "");
    setWebhookPassword(settings.webhookPassword || "");
  }, [settings]);

  const handleSaveSettings = () => {
    updateSettings({
      webhookUrl,
      timeoutSeconds,
      autoSaveQueries,
      webhookUsername,
      webhookPassword,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const isModified =
    webhookUrl !== settings.webhookUrl ||
    timeoutSeconds !== settings.timeoutSeconds ||
    autoSaveQueries !== settings.autoSaveQueries ||
    webhookUsername !== (settings.webhookUsername || "") ||
    webhookPassword !== (settings.webhookPassword || "");

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-900">
        <div className="max-w-4xl mx-auto py-4 sm:py-8 px-3 sm:px-4">
          <SettingsHeader />
          <SettingsTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isAdmin={isAdmin || false}
          />

          {/* Settings Content */}
          {activeTab === "settings" && (
            <SettingsForm
              email={user?.email}
              name={user?.name}
              webhookUrl={webhookUrl}
              onWebhookUrlChange={setWebhookUrl}
              timeoutSeconds={timeoutSeconds}
              onTimeoutChange={setTimeoutSeconds}
              autoSaveQueries={autoSaveQueries}
              onAutoSaveQueriesChange={setAutoSaveQueries}
              webhookUsername={webhookUsername}
              onWebhookUsernameChange={setWebhookUsername}
              webhookPassword={webhookPassword}
              onWebhookPasswordChange={setWebhookPassword}
              onSave={handleSaveSettings}
              onReset={() => {
                setWebhookUrl(settings.webhookUrl);
                setTimeoutSeconds(settings.timeoutSeconds);
                setAutoSaveQueries(settings.autoSaveQueries);
                setWebhookUsername(settings.webhookUsername || "");
                setWebhookPassword(settings.webhookPassword || "");
              }}
              isModified={isModified}
            />
          )}

          {/* Admin Panel Tab */}
          {activeTab === "admin" && (
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 sm:p-4 md:p-6">
              <AdminPanel />
            </div>
          )}

          {/* Success Message */}
          {saveSuccess && <SaveSuccessMessage />}
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
