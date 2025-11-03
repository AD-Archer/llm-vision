"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { Icon } from "../../components/Icon";

function OnboardingContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const steps = [
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

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setIsComplete(true);
      localStorage.setItem("onboarding-complete", "true");
      router.push("/dashboard");
    }
  };

  const handleSkip = () => {
    setIsComplete(true);
    localStorage.setItem("onboarding-complete", "true");
    router.push("/dashboard");
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-3 sm:px-4">
        <div className="w-full max-w-2xl">
          {/* Progress Bar */}
          <div className="mb-6 sm:mb-8">
            <div className="flex gap-1 sm:gap-2">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`flex-1 h-1 sm:h-1.5 rounded-full transition-colors ${
                    idx <= step ? "bg-blue-600" : "bg-slate-700"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Step {step + 1} of {steps.length}
            </p>
          </div>

          {/* Content Card */}
          <div className="bg-slate-800 rounded-lg shadow-2xl p-6 sm:p-8 md:p-12 border border-slate-700">
            {/* Icon */}
            <div className="mb-4 sm:mb-6 animate-bounce">
              <Icon
                name={currentStep.icon as any}
                size={64}
                className="text-blue-400 mx-auto"
              />
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3">
              {currentStep.title}
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base text-slate-400 mb-4 sm:mb-6">
              {currentStep.description}
            </p>

            {/* Content */}
            <div className="bg-slate-900 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {currentStep.content}
              </p>
            </div>

            {/* Tips */}
            {step < steps.length - 1 && (
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 sm:p-4 mb-6 sm:mb-8 flex gap-2">
                <Icon
                  name="help"
                  size={20}
                  className="text-blue-300 flex-shrink-0"
                />
                <p className="text-xs sm:text-sm text-blue-300">
                  <span className="font-semibold">Tip:</span>
                  {step === 0 &&
                    " You can start querying immediately after onboarding."}
                  {step === 1 &&
                    " Try asking natural language questions about your data."}
                  {step === 2 &&
                    " Saved queries help you track your analysis history."}
                  {step === 3 &&
                    " Configure your webhook URL in settings for custom RAG workflows."}
                </p>
              </div>
            )}

            {/* Feature Highlights */}
            {step === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="bg-slate-700 rounded-lg p-3 sm:p-4">
                  <div className="mb-2">
                    <Icon name="barChart" size={24} className="text-blue-400" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-white">
                    Auto Visualize
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Get charts instantly
                  </p>
                </div>
                <div className="bg-slate-700 rounded-lg p-3 sm:p-4">
                  <div className="mb-2">
                    <Icon name="settings" size={24} className="text-blue-400" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-white">
                    Custom Config
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Tailor to your needs
                  </p>
                </div>
                <div className="bg-slate-700 rounded-lg p-3 sm:p-4">
                  <div className="mb-2">
                    <Icon name="calendar" size={24} className="text-blue-400" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-white">
                    Save Queries
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Track your insights
                  </p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={handleSkip}
                className="flex-1 px-4 py-2 sm:py-3 bg-slate-700 hover:bg-slate-600 text-xs sm:text-sm text-slate-200 font-medium rounded-lg transition-colors"
              >
                Skip Tour
              </button>
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm text-white font-medium rounded-lg transition-colors"
              >
                {step === steps.length - 1 ? "Go to Dashboard" : "Next"}
              </button>
            </div>
          </div>

          {/* Footer Info */}
          <p className="text-center text-slate-400 text-xs sm:text-sm mt-6 sm:mt-8">
            You can access this tour again from your settings
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function OnboardingPage() {
  return <OnboardingContent />;
}
