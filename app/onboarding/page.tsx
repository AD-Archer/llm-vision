"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { OnboardingContainer } from "./components/OnboardingContainer";
import { ProgressBar } from "./components/ProgressBar";
import { StepContent, type OnboardingStep } from "./components/StepContent";
import { OnboardingButtons } from "./components/OnboardingButtons";

export const dynamic = "force-dynamic";
import { OnboardingFooter } from "./components/OnboardingFooter";

function OnboardingContent() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const [step, setStep] = useState(0);

  const steps: OnboardingStep[] = [
    {
      title: "Welcome to LLM Vision",
      description: `Hi ${
        user?.name || "there"
      }! We're excited to have you on board.`,
      content:
        "LLM Vision is an invite-only platform for visualizing and analyzing data through LLM-powered RAG workflows.",
      icon: "zap",
    },
    {
      title: "Create Your First Query",
      description:
        "Ask your RAG workflow a question and get instant visualizations.",
      content:
        "Head to the Queries page to get started. Ask any question and see your data come to life.",
      icon: "search",
    },
    {
      title: "Explore Your Saved Queries",
      description: "Save and manage your most important analyses.",
      content:
        "Visit the Saved Queries page to review your previous inquiries and track your analytics journey.",
      icon: "calendar",
    },
    {
      title: "Configure Your Settings",
      description: "Set up your API and query preferences.",
      content:
        "Go to Settings to configure your webhook URL and customize your experience.",
      icon: "settings",
    },
    {
      title: "You're All Set!",
      description: "Ready to start visualizing your data?",
      content:
        "Click below to go to your dashboard and start creating amazing insights.",
      icon: "arrowRight",
    },
  ];

  const currentStep = steps[step];
  const hasWebhookUrl = settings?.webhookUrl?.trim();

  const handleNext = () => {
    // Check if we're on the settings step (step 3)
    if (step === 3) {
      // If webhook is not configured, redirect to settings page instead of proceeding
      if (!hasWebhookUrl) {
        router.push("/settings");
        return;
      }
    }

    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem("onboarding-complete", "true");
      router.push("/dashboard");
    }
  };

  const handleSkip = () => {
    // If webhook is not configured and user tries to skip, redirect to settings
    if (!hasWebhookUrl) {
      router.push("/settings");
      return;
    }
    localStorage.setItem("onboarding-complete", "true");
    router.push("/dashboard");
  };

  return (
    <ProtectedRoute>
      <OnboardingContainer>
        <ProgressBar step={step} totalSteps={steps.length} />
        <StepContent
          step={currentStep}
          stepIndex={step}
          totalSteps={steps.length}
        />
        <OnboardingButtons
          onSkip={handleSkip}
          onNext={handleNext}
          stepIndex={step}
          totalSteps={steps.length}
        />
        <OnboardingFooter />
      </OnboardingContainer>
    </ProtectedRoute>
  );
}

export default function OnboardingPage() {
  return <OnboardingContent />;
}
