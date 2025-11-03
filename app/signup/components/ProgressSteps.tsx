interface ProgressStepsProps {
  step: "code" | "details";
  isCodeValid: boolean;
}

export default function ProgressSteps({
  step,
  isCodeValid,
}: ProgressStepsProps) {
  return (
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
  );
}
