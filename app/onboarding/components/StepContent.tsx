import { Icon, type IconName } from "../../../components/Icon";

export interface OnboardingStep {
  title: string;
  description: string;
  content: string;
  icon: IconName;
}

interface StepContentProps {
  step: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
}

export function StepContent({ step, stepIndex, totalSteps }: StepContentProps) {
  return (
    <div className="bg-slate-800 rounded-lg shadow-2xl p-6 sm:p-8 md:p-12 border border-slate-700">
      {/* Icon */}
      <div className="mb-4 sm:mb-6 animate-bounce">
        <Icon name={step.icon} size={64} className="text-blue-400 mx-auto" />
      </div>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3">
        {step.title}
      </h1>

      {/* Description */}
      <p className="text-sm sm:text-base text-slate-400 mb-4 sm:mb-6">
        {step.description}
      </p>

      {/* Content */}
      <div className="bg-slate-900 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {step.content}
        </p>
      </div>

      {/* Tips */}
      {stepIndex < totalSteps - 1 && (
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 sm:p-4 mb-6 sm:mb-8 flex gap-2">
          <Icon name="help" size={20} className="text-blue-300 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-blue-300">
            <span className="font-semibold">Tip:</span>
            {stepIndex === 0 &&
              " You can start querying immediately after onboarding."}
            {stepIndex === 1 &&
              " Try asking natural language questions about your data."}
            {stepIndex === 2 &&
              " Saved queries help you track your analysis history."}
            {stepIndex === 3 &&
              " Configure your webhook URL in settings for custom RAG workflows."}
          </p>
        </div>
      )}

      {/* Feature Highlights - Only show on first step */}
      {stepIndex === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-slate-700 rounded-lg p-3 sm:p-4">
            <div className="mb-2">
              <Icon name="barChart" size={24} className="text-blue-400" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-white">
              Auto Visualize
            </p>
            <p className="text-xs text-slate-400 mt-1">Get charts instantly</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-3 sm:p-4">
            <div className="mb-2">
              <Icon name="settings" size={24} className="text-blue-400" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-white">
              Custom Config
            </p>
            <p className="text-xs text-slate-400 mt-1">Tailor to your needs</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-3 sm:p-4">
            <div className="mb-2">
              <Icon name="calendar" size={24} className="text-blue-400" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-white">
              Save Queries
            </p>
            <p className="text-xs text-slate-400 mt-1">Track your insights</p>
          </div>
        </div>
      )}
    </div>
  );
}
