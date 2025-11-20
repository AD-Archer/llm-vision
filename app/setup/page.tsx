"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export const dynamic = "force-dynamic";

function SetupPageContent() {
  const [aiProviderUrl, setAiProviderUrl] = useState("");
  const [aiProviderApiKey, setAiProviderApiKey] = useState("");
  const [timeoutSeconds, setTimeoutSeconds] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    } else if (user && !user.isAdmin) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!aiProviderUrl.trim()) {
        throw new Error("AI Provider URL is required");
      }

      if (timeoutSeconds < 10 || timeoutSeconds > 300) {
        throw new Error("Timeout must be between 10 and 300 seconds");
      }

      // Save settings
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiProviderUrl: aiProviderUrl.trim(),
          aiProviderApiKey: aiProviderApiKey.trim(),
          timeoutSeconds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save settings");
      }

      // Mark setup as complete and redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !user.isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome, {user.name}!
            </h1>
            <p className="text-slate-400 text-sm mb-4">
              As the first user, you need to configure your AI provider
              settings.
            </p>
            <div className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg">
              You have been granted admin privileges.
            </div>
          </div>

          <form onSubmit={handleSetup} className="space-y-6">
            <div>
              <label
                htmlFor="aiProviderUrl"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                AI Provider URL
              </label>
              <input
                id="aiProviderUrl"
                type="url"
                value={aiProviderUrl}
                onChange={(e) => setAiProviderUrl(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="https://api.your-provider.com/v1/chat/completions"
                required
              />
              <p className="text-slate-500 text-xs mt-1">
                The URL for your AI provider endpoint
              </p>
              <label
                htmlFor="aiProviderApiKey"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                AI Provider API Key{" "}
                <span className="text-slate-400 text-xs">(Optional)</span>
              </label>
              <input
                id="aiProviderApiKey"
                type="text"
                value={aiProviderApiKey}
                onChange={(e) => setAiProviderApiKey(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Bearer <token>"
              />
            </div>

            <div>
              <label
                htmlFor="timeoutSeconds"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Timeout (seconds)
              </label>
              <input
                id="timeoutSeconds"
                type="number"
                value={timeoutSeconds}
                onChange={(e) =>
                  setTimeoutSeconds(parseInt(e.target.value) || 60)
                }
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                min={10}
                max={300}
                required
              />
              <p className="text-slate-500 text-xs mt-1">
                How long to wait for webhook responses (10-300 seconds)
              </p>
            </div>

            {error && (
              <div className="bg-red-600 text-white text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {isLoading ? "Saving Settings..." : "Complete Setup"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return <SetupPageContent />;
}
