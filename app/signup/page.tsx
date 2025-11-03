"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"code" | "details">("code");
  const [isCodeValid, setIsCodeValid] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const { useInvitationCode } = useAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Use useEffect for redirect to avoid setState during render
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/onboarding");
    }
  }, [isAuthenticated, router]);

  // Check if invitation code was passed in URL
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl) {
      setInvitationCode(codeFromUrl.toUpperCase());
      // Auto-validate if provided in URL
      validateCode(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

  const validateCode = (code: string) => {
    // This will be validated properly when submitting
    if (code && code.length === 8) {
      setIsCodeValid(true);
      setError(null);
    } else {
      setIsCodeValid(false);
      setError("Invitation code must be 8 characters");
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (invitationCode.length !== 8) {
      setError("Please enter a valid 8-character code");
      return;
    }

    // Move to details step - actual validation happens on signup
    validateCode(invitationCode);
    if (isCodeValid || invitationCode.length === 8) {
      setStep("details");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      // Verify invitation code
      const isValid = await useInvitationCode(
        invitationCode.toUpperCase(),
        email
      );

      if (!isValid) {
        throw new Error(
          "Invalid or expired invitation code. Please check and try again."
        );
      }

      // Log in the user
      await login(email, password);
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
      setIsLoading(false);
    }
  };

  // Show nothing while redirecting
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-3 sm:px-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">
            LLM Visi<span className="text-blue-500">on</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Join our invite-only platform
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-slate-800 rounded-lg shadow-2xl p-4 sm:p-6 md:p-8 border border-slate-700">
          {/* Progress Steps */}
          <div className="flex gap-2 mb-6 sm:mb-8">
            <div
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                step === "code"
                  ? "bg-blue-600"
                  : isCodeValid
                  ? "bg-green-600"
                  : "bg-slate-700"
              }`}
            />
            <div
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                step === "details" ? "bg-blue-600" : "bg-slate-700"
              }`}
            />
          </div>

          {step === "code" ? (
            <form
              onSubmit={handleCodeSubmit}
              className="space-y-4 sm:space-y-6"
            >
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
                  Enter Invitation Code
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mb-4">
                  You should have received an 8-character code from your admin
                </p>
              </div>

              <div>
                <label
                  htmlFor="code"
                  className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5 sm:mb-2"
                >
                  Invitation Code
                </label>
                <input
                  id="code"
                  type="text"
                  value={invitationCode}
                  onChange={(e) => {
                    const code = e.target.value.toUpperCase().slice(0, 8);
                    setInvitationCode(code);
                    if (code.length === 8) {
                      validateCode(code);
                    }
                  }}
                  placeholder="XXXXXXXX"
                  disabled={isLoading}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 uppercase tracking-widest text-center font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  required
                  maxLength={8}
                />
              </div>

              {error && (
                <div className="p-2.5 sm:p-3 bg-red-900/20 border border-red-700 rounded-lg text-xs sm:text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || invitationCode.length !== 8}
                className="w-full py-2 sm:py-2.5 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>

              <div className="text-center">
                <p className="text-xs sm:text-sm text-slate-400">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    Login here
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4 sm:space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
                  Create Your Account
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mb-4">
                  Set up your login credentials
                </p>
              </div>

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
                <p className="text-xs text-slate-400 mt-1">
                  At least 6 characters
                </p>
              </div>

              {error && (
                <div className="p-2.5 sm:p-3 bg-red-900/20 border border-red-700 rounded-lg text-xs sm:text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("code");
                    setError(null);
                  }}
                  disabled={isLoading}
                  className="flex-1 py-2 sm:py-2.5 px-3 sm:px-4 bg-slate-700 hover:bg-slate-600 text-xs sm:text-sm text-slate-200 font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 sm:py-2.5 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Creating account..." : "Sign Up"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-xs sm:text-sm mt-4 sm:mt-6">
          Built with Next.js & Recharts
        </p>
      </div>
    </div>
  );
}
