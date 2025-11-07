import type { ChartType } from "../../../types";
import type { FormEvent } from "react";

const chartTypeOptions: Array<{ value: ChartType; label: string }> = [
  { value: "auto", label: "Let AI decide" },
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "pie", label: "Pie" },
  { value: "scatter", label: "Scatter" },
];

interface QueryFormProps {
  question: string;
  onQuestionChange: (question: string) => void;
  chartType: ChartType;
  onChartTypeChange: (chartType: ChartType) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
  errorMessage: string | null;
  canSubmit: boolean;
}

export function QueryForm({
  question,
  onQuestionChange,
  chartType,
  onChartTypeChange,
  onSubmit,
  disabled,
  errorMessage,
  canSubmit,
}: QueryFormProps) {
  return (
    <form className="space-y-4 sm:space-y-6" onSubmit={onSubmit}>
      <div>
        <label
          htmlFor="question"
          className="block text-xs sm:text-sm font-medium text-slate-300 mb-2"
        >
          Ask a question
        </label>
        <textarea
          id="question"
          placeholder="e.g. Show me how many students we had enrolled before July 2025"
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          required
          disabled={disabled}
          rows={3}
          className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label
            htmlFor="chartType"
            className="block text-xs sm:text-sm font-medium text-slate-300 mb-2"
          >
            Preferred chart
          </label>
          <select
            id="chartType"
            value={chartType}
            onChange={(event) =>
              onChartTypeChange(event.target.value as ChartType)
            }
            disabled={disabled}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {chartTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          type="submit"
          disabled={disabled || !canSubmit}
          className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm sm:text-base font-medium rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {disabled ? "Contacting webhook…" : "Run workflow"}
        </button>
      </div>
      {errorMessage ? (
        <div className="text-center">
          <p
            className="text-red-400 bg-red-900/20 border border-red-700 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm"
            role="alert"
          >
            {errorMessage}
          </p>
        </div>
      ) : null}
    </form>
  );
}
