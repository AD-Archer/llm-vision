"use client";

import { useState, useEffect } from "react";
import { useSettings } from "../../context/SettingsContext";
import { useAuth } from "../../context/AuthContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";

function SettingsContent() {
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [timeoutSeconds, setTimeoutSeconds] = useState(60);
  const [autoSaveQueries, setAutoSaveQueries] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setWebhookUrl(settings.webhookUrl);
    setTimeoutSeconds(settings.timeoutSeconds);
    setAutoSaveQueries(settings.autoSaveQueries);
  }, [settings]);

  const handleSaveSettings = () => {
    updateSettings({
      webhookUrl,
      timeoutSeconds,
      autoSaveQueries,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const isModified =
    webhookUrl !== settings.webhookUrl ||
    timeoutSeconds !== settings.timeoutSeconds ||
    autoSaveQueries !== settings.autoSaveQueries;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-900">
        <div className="max-w-4xl mx-auto py-4 sm:py-8 px-3 sm:px-4">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
              Settings
            </h1>
            <p className="text-sm sm:text-base text-slate-400">
              Manage your preferences and configuration
            </p>
          </div>

          {/* Settings Card */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            {/* User Profile Section */}
            <div className="p-4 sm:p-6 border-b border-slate-700">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">
                Account
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full px-3 sm:px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 text-sm cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Your account email
                  </p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={user?.name || ""}
                    disabled
                    className="w-full px-3 sm:px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 text-sm cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Derived from your email
                  </p>
                </div>
              </div>
            </div>

            {/* API Configuration Section */}
            <div className="p-3 sm:p-4 md:p-6 border-b border-slate-700">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">
                API Configuration
              </h2>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label
                    htmlFor="webhook"
                    className="block text-xs sm:text-sm font-medium text-slate-300 mb-2"
                  >
                    Webhook URL
                  </label>
                  <input
                    id="webhook"
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://n8n.example.com/webhook/..."
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-400 mt-1 sm:mt-1.5">
                    Your n8n webhook URL for RAG workflow queries
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="timeout"
                    className="block text-xs sm:text-sm font-medium text-slate-300 mb-2"
                  >
                    Request Timeout (seconds)
                  </label>
                  <input
                    id="timeout"
                    type="number"
                    min="10"
                    max="300"
                    value={timeoutSeconds}
                    onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-400 mt-1 sm:mt-1.5">
                    How long to wait for webhook responses (10-300 seconds)
                  </p>
                </div>
              </div>
            </div>

            {/* Query Settings Section */}
            <div className="p-3 sm:p-4 md:p-6 border-b border-slate-700">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">
                Query Settings
              </h2>
              <div className="flex items-center space-x-3">
                <input
                  id="autoSave"
                  type="checkbox"
                  checked={autoSaveQueries}
                  onChange={(e) => setAutoSaveQueries(e.target.checked)}
                  className="w-4 h-4 bg-slate-700 border border-slate-600 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label
                  htmlFor="autoSave"
                  className="text-xs sm:text-sm text-slate-300 cursor-pointer"
                >
                  Automatically save queries to history
                </label>
              </div>
              <p className="text-xs text-slate-400 mt-2 sm:mt-2.5">
                When enabled, all queries will be saved to your Saved Queries
                page
              </p>
            </div>

            {/* Buttons */}
            <div className="p-3 sm:p-4 md:p-6 bg-slate-900 flex flex-col sm:flex-row gap-2 sm:gap-4">
              <button
                onClick={handleSaveSettings}
                disabled={!isModified}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setWebhookUrl(settings.webhookUrl);
                  setTimeoutSeconds(settings.timeoutSeconds);
                  setAutoSaveQueries(settings.autoSaveQueries);
                }}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-700 hover:bg-slate-600 text-xs sm:text-sm text-slate-200 font-medium rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Success Message */}
          {saveSuccess && (
            <div className="fixed bottom-3 sm:bottom-4 right-3 sm:right-4 left-3 sm:left-auto p-3 sm:p-4 bg-green-900/30 border border-green-700 rounded-lg text-xs sm:text-sm text-green-400 flex items-center gap-2">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Settings saved successfully!
            </div>
          )}
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
