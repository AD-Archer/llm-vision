"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { AdminDataInput } from "@/components/AdminDataInput";

export default function AdminDataInputPage() {
  const { user } = useAuth();
  const [importedCount, setImportedCount] = useState(0);

  if (!user?.isAdmin) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg">
                You do not have permission to access this page.
              </p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-6">
          <header className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2 px-2">
              Admin Data Input
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-slate-400 px-2">
              Import AI-generated data directly to create visualizations
            </p>
          </header>

          {importedCount > 0 && (
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
              <p className="text-green-300 text-sm">
                ✓ Successfully imported {importedCount} visualization
                {importedCount !== 1 ? "s" : ""}. View them in the{" "}
                <a href="/dashboard" className="underline hover:no-underline">
                  Dashboard
                </a>{" "}
                or{" "}
                <a href="/queries" className="underline hover:no-underline">
                  Queries
                </a>{" "}
                page.
              </p>
            </div>
          )}

          <AdminDataInput
            onDataImported={(count: number) => setImportedCount(count)}
          />

          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">How to Use</h2>
            <div className="space-y-4 text-sm text-slate-300">
              <div>
                <h3 className="font-semibold text-white mb-2">
                  1. Prepare Your Data
                </h3>
                <p>
                  Get your AI workflow output as a JSON array. Each item should
                  have an{" "}
                  <code className="bg-slate-700 px-2 py-1 rounded">
                    &quot;output&quot;
                  </code>{" "}
                  field containing the insight JSON.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">
                  2. Enter Question
                </h3>
                <p>
                  Type the question that describes your data (e.g., &quot;Show
                  me PCEP exam results&quot;).
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">3. Paste JSON</h3>
                <p>
                  Paste your JSON array into the data field. You can paste the
                  raw output directly from your n8n workflow.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">
                  4. Preview & Import
                </h3>
                <p>
                  Click &quot;Preview&quot; to validate your JSON, then click
                  &quot;Import Data&quot; to save the visualizations.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">
                  5. View Results
                </h3>
                <p>
                  Your imported queries will appear on the Dashboard and Queries
                  page immediately.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              Example Format
            </h2>
            <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto text-xs text-slate-300">
              {`[
  {
    "output": "{\\"insight\\":\\"Your insight text\\",\\"chart\\":{\\"type\\":\\"bar\\",\\"xKey\\":\\"Category\\",\\"yKeys\\":[\\"Value\\"],\\"meta\\":{\\"title\\":\\"Chart Title\\"},\\"data\\":[]}}"
  }
]`}
            </pre>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
