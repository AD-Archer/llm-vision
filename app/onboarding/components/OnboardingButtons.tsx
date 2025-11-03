interface OnboardingButtonsProps {
  onSkip: () => void;
  onNext: () => void;
  stepIndex: number;
  totalSteps: number;
}

export function OnboardingButtons({
  onSkip,
  onNext,
  stepIndex,
  totalSteps,
}: OnboardingButtonsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
      <button
        onClick={onSkip}
        className="flex-1 px-4 py-2 sm:py-3 bg-slate-700 hover:bg-slate-600 text-xs sm:text-sm text-slate-200 font-medium rounded-lg transition-colors"
      >
        Skip Tour
      </button>
      <button
        onClick={onNext}
        className="flex-1 px-4 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm text-white font-medium rounded-lg transition-colors"
      >
        {stepIndex === totalSteps - 1 ? "Go to Dashboard" : "Next"}
      </button>
    </div>
  );
}
