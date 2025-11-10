"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";

interface AdminDataInputProps {
  onDataImported?: (count: number) => void;
}

export function AdminDataInput({ onDataImported }: AdminDataInputProps) {
  const { user } = useAuth();
  const [jsonInput, setJsonInput] = useState("");
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [previewCount, setPreviewCount] = useState(0);

  if (!user?.isAdmin) {
    return null;
  }

  const handlePreview = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (Array.isArray(parsed)) {
        setPreviewCount(parsed.length);
        setMessage({
          type: "success",
          text: `Valid JSON array with ${parsed.length} item(s)`,
        });
      } else {
        setMessage({
          type: "error",
          text: "Input must be a JSON array",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Invalid JSON format",
      });
    }
  };

  const handleSubmit = async () => {
    if (!jsonInput.trim() || !question.trim()) {
      setMessage({
        type: "error",
        text: "Please enter both a question and JSON data",
      });
      return;
    }

    try {
      setIsLoading(true);
      const parsed = JSON.parse(jsonInput);

      if (!Array.isArray(parsed)) {
        setMessage({
          type: "error",
          text: "Input must be a JSON array",
        });
        return;
      }

      const response = await fetch("/api/admin/data-input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          question,
          dataArray: parsed,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to import data");
      }

      setMessage({
        type: "success",
        text: `Successfully imported ${result.queries.length} queries!`,
      });

      // Reset form
      setJsonInput("");
      setQuestion("");
      setPreviewCount(0);

      // Notify parent component
      if (onDataImported) {
        onDataImported(result.queries.length);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to import data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Import AI Data</h2>
      <p className="text-slate-400 text-sm mb-6">
        Paste JSON data from your AI workflow to create visualizations directly
      </p>

      <div className="space-y-4">
        {/* Question Input */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Question
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Show me the PCEP exam results"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* JSON Input */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            JSON Data
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='Paste your JSON array here, e.g., [{"output": "..."}]'
            rows={8}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono resize-none"
          />
        </div>

        {/* Preview Info */}
        {previewCount > 0 && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
            <p className="text-sm text-blue-300">
              ✓ Valid JSON with {previewCount} item(s) ready to import
            </p>
          </div>
        )}

        {/* Message */}
        {message && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              message.type === "success"
                ? "bg-green-900/20 border border-green-700 text-green-300"
                : "bg-red-900/20 border border-red-700 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handlePreview}
            disabled={!jsonInput.trim() || isLoading}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!jsonInput.trim() || !question.trim() || isLoading}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Importing..." : "Import Data"}
          </button>
        </div>
      </div>
    </div>
  );
}
