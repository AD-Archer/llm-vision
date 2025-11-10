"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface AppSettings {
  webhookUrl: string;
  timeoutSeconds: number;
  timeoutEnabled: boolean;
  autoSaveQueries: boolean;
  webhookUsername?: string;
  webhookPassword?: string;
  webhookHeaders?: Record<string, string> | null;
  promptHelperWebhookUrl: string;
  promptHelperUsername?: string;
  promptHelperPassword?: string;
  promptHelperHeaders?: Record<string, string> | null;
}

export interface SettingsContextType {
  settings: AppSettings;
  isLoading: boolean;
  updateSettings: (
    updates: Partial<AppSettings>,
    userId: string
  ) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  webhookUrl: "",
  timeoutSeconds: 1800, // 30 minutes - consolidated timeout
  timeoutEnabled: false, // disabled by default
  autoSaveQueries: true,
  webhookUsername: "",
  webhookPassword: "",
  webhookHeaders: null,
  promptHelperWebhookUrl: "",
  promptHelperUsername: "",
  promptHelperPassword: "",
  promptHelperHeaders: null,
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetchError, setLastFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/settings", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          throw new Error(`Failed to load settings (${response.status})`);
        }
        const data = (await response.json()) as AppSettings;
        if (!cancelled) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...data,
          });
          setLastFetchError(null);
        }
      } catch (error) {
        console.error("[settings] Failed to load settings", error);
        if (!cancelled) {
          setLastFetchError(
            error instanceof Error ? error.message : "Unknown error"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = async (
    updates: Partial<AppSettings>,
    userId: string
  ) => {
    const previousSettings = settings;
    const payload = { ...settings, ...updates, userId };
    setSettings(payload);

    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      const error = message || "Failed to update settings.";
      console.error("[settings] Update failed", error);
      setSettings(previousSettings);
      throw new Error(error);
    }

    const data = (await response.json()) as AppSettings;
    setSettings({ ...DEFAULT_SETTINGS, ...data });
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        isLoading,
      }}
    >
      {children}
      {lastFetchError ? (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white text-sm px-4 py-2 rounded shadow-lg">
          Failed to load settings: {lastFetchError}
        </div>
      ) : null}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
