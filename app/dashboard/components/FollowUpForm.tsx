import type { FormEvent } from "react";

interface FollowUpFormProps {
  followUpQuestion: string;
  followUpName: string;
  onFollowUpChange: (question: string) => void;
  onFollowUpNameChange: (name: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
}

export function FollowUpForm({
  followUpQuestion,
  followUpName,
  onFollowUpChange,
  onFollowUpNameChange,
  onSubmit,
  disabled,
}: FollowUpFormProps) {
  return (
    <div className="border-t border-slate-700 pt-6">
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label
            htmlFor="followup-name"
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            Follow-up name (optional)
          </label>
          <input
            id="followup-name"
            type="text"
            placeholder="e.g. Regional breakdown"
            value={followUpName}
            onChange={(event) => onFollowUpNameChange(event.target.value)}
            disabled={disabled}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label
            htmlFor="followup"
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            Ask a follow-up question
          </label>
          <textarea
            id="followup"
            placeholder="e.g. Show me the same data by region"
            value={followUpQuestion}
            onChange={(event) => onFollowUpChange(event.target.value)}
            disabled={disabled}
            rows={2}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={disabled || !followUpQuestion.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {disabled ? "Loading…" : "Ask follow-up"}
          </button>
        </div>
      </form>
    </div>
  );
}
