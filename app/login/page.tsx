"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { LoginHeader } from "./components/LoginHeader";
import { LoginForm } from "./components/LoginForm";
import { SignUpLink } from "./components/SignUpLink";
import { LoginFooter } from "./components/LoginFooter";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  // Use useEffect for redirect to avoid setState during render
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const requiresSetup = await login(email, password);

      // Redirect based on whether setup is required
      if (requiresSetup) {
        router.push("/setup");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
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
        <LoginHeader />

        {/* Login Card */}
        <div className="bg-slate-800 rounded-lg shadow-2xl p-4 sm:p-6 md:p-8 border border-slate-700">
          <LoginForm
            email={email}
            onEmailChange={setEmail}
            password={password}
            onPasswordChange={setPassword}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            error={error}
          />
          <SignUpLink />
        </div>

        <LoginFooter />
      </div>
    </div>
  );
}
