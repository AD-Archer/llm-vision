"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";
import {
  SignupHeader,
  ProgressSteps,
  InvitationCodeForm,
  AccountDetailsForm,
  SignupCard,
  SignupFooter,
} from "./components";

function SignupPageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"code" | "details">("code");
  const [isCodeValid, setIsCodeValid] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const { useInvitationCode: verifyInvitationCode } = useAdmin();
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
      const isValid = await verifyInvitationCode(
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
        <SignupHeader />

        <SignupCard>
          <ProgressSteps step={step} isCodeValid={isCodeValid} />

          {step === "code" ? (
            <InvitationCodeForm
              invitationCode={invitationCode}
              error={error}
              isLoading={isLoading}
              onCodeChange={(code) => {
                setInvitationCode(code);
                if (code.length === 8) {
                  validateCode(code);
                }
              }}
              onSubmit={handleCodeSubmit}
            />
          ) : (
            <AccountDetailsForm
              email={email}
              password={password}
              error={error}
              isLoading={isLoading}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onBack={() => {
                setStep("code");
                setError(null);
              }}
              onSubmit={handleSignup}
            />
          )}
        </SignupCard>

        <SignupFooter />
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageContent />
    </Suspense>
  );
}
