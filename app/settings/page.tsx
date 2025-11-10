"use client";

import { useState, useEffect } from "react";
import { useSettings } from "../../context/SettingsContext";
import { useAuth } from "../../context/AuthContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { AdminPanel } from "../../components/AdminPanel";
import { SettingsHeader } from "./components/SettingsHeader";
import { SettingsTabs } from "./components/SettingsTabs";
import { SettingsForm } from "./components/SettingsForm";

export const dynamic = "force-dynamic";
import { SaveSuccessMessage } from "./components/SaveSuccessMessage";

function SettingsContent() {
  const { user, isAdmin } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [autoSaveQueries, setAutoSaveQueries] = useState(true);
  const [timeoutEnabled, setTimeoutEnabled] = useState(false);
  const [timeoutSeconds, setTimeoutSeconds] = useState(1800);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "admin">(
    isAdmin ? "admin" : "settings"
  );

  useEffect(() => {
    setAutoSaveQueries(settings.autoSaveQueries);
    setTimeoutEnabled(settings.timeoutEnabled);
    setTimeoutSeconds(settings.timeoutSeconds);
    setSaveError(null);
  }, [settings]);

  const handleSaveSettings = async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      const updatePayload: Record<string, unknown> = {
        autoSaveQueries,
      };

      if (isAdmin) {
        updatePayload.timeoutEnabled = timeoutEnabled;
        updatePayload.timeoutSeconds = timeoutSeconds;
      }

      await updateSettings(updatePayload, user!.id);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save settings."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const isModified =
    autoSaveQueries !== settings.autoSaveQueries ||
    (isAdmin && timeoutEnabled !== settings.timeoutEnabled) ||
    (isAdmin && timeoutSeconds !== settings.timeoutSeconds);

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
              autoSaveQueries={autoSaveQueries}
              onAutoSaveQueriesChange={setAutoSaveQueries}
              onSave={handleSaveSettings}
              onReset={() => {
                setAutoSaveQueries(settings.autoSaveQueries);
              }}
              isModified={isModified}
              isSaving={isSaving}
            />
          )}

          {/* Admin Panel Content */}
          {activeTab === "admin" && isAdmin && (
            <AdminPanel
              timeoutEnabled={timeoutEnabled}
              onTimeoutEnabledChange={setTimeoutEnabled}
              timeoutSeconds={timeoutSeconds}
              onTimeoutSecondsChange={setTimeoutSeconds}
            />
          )}

          {/* Validation/Error Feedback */}
          {saveError ? (
            <div className="mt-4 bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
              {saveError}
            </div>
          ) : null}

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
