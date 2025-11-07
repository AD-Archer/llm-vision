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
  const [autoSaveQueries, setAutoSaveQueries] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"settings" | "admin">(
    isAdmin ? "admin" : "settings"
  );

  useEffect(() => {
    setAutoSaveQueries(settings.autoSaveQueries);
    setSaveError(null);
  }, [settings]);

  const handleSaveSettings = async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      await updateSettings(
        {
          autoSaveQueries,
        },
        user!.id
      );
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

  const isModified = autoSaveQueries !== settings.autoSaveQueries;

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

          {/* Admin Panel Tab */}
          {activeTab === "admin" && (
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-3 sm:p-4 md:p-6">
              <AdminPanel />
            </div>
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
