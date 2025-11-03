interface ProgressBarProps {
  step: number;
  totalSteps: number;
}

export function ProgressBar({ step, totalSteps }: ProgressBarProps) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex gap-1 sm:gap-2">
        {Array.from({ length: totalSteps }).map((_, idx) => (
          <div
            key={idx}
            className={`flex-1 h-1 sm:h-1.5 rounded-full transition-colors ${
              idx <= step ? "bg-blue-600" : "bg-slate-700"
            }`}
          />
        ))}
      </div>
      <p className="text-xs sm:text-sm text-slate-400 mt-2">
        Step {step + 1} of {totalSteps}
      </p>
    </div>
  );
}
