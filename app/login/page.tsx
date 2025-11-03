"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-3 sm:px-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">
            LLM Visi<span className="text-blue-500">on</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Ask your RAG workflow for insights
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800 rounded-lg shadow-2xl p-4 sm:p-6 md:p-8 border border-slate-700">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                required
              />
            </div>

            {error && (
              <div className="p-2.5 sm:p-3 bg-red-900/20 border border-red-700 rounded-lg text-xs sm:text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 sm:py-2.5 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-700">
            <p className="text-xs text-slate-400 text-center mb-2 sm:mb-3">
              Demo credentials (use any email & password):
            </p>
            <div className="bg-slate-900 rounded p-2.5 sm:p-3 text-xs text-slate-300">
              <p>
                📧 <span className="font-mono text-xs">demo@example.com</span>
              </p>
              <p>
                🔐 <span className="font-mono text-xs">password123</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-xs sm:text-sm mt-4 sm:mt-6">
          Built with Next.js & Recharts
        </p>
      </div>
    </div>
  );
}
