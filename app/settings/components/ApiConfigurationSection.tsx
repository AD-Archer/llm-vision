interface ApiConfigurationSectionProps {
  webhookUrl: string;
  onWebhookUrlChange: (url: string) => void;
  timeoutSeconds: number;
  onTimeoutChange: (seconds: number) => void;
}

export function ApiConfigurationSection({
  webhookUrl,
  onWebhookUrlChange,
  timeoutSeconds,
  onTimeoutChange,
}: ApiConfigurationSectionProps) {
  return (
    <div className="p-3 sm:p-4 md:p-6 border-b border-slate-700">
      <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">
        API Configuration
      </h2>
      <div className="space-y-3 sm:space-y-4">
        <div>
          <label
            htmlFor="webhook"
            className="block text-xs sm:text-sm font-medium text-slate-300 mb-2"
          >
            Webhook URL
          </label>
          <input
            id="webhook"
            type="url"
            value={webhookUrl}
            onChange={(e) => onWebhookUrlChange(e.target.value)}
            placeholder="https://n8n.example.com/webhook/..."
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-400 mt-1 sm:mt-1.5">
            Your n8n webhook URL for RAG workflow queries
          </p>
        </div>

        <div>
          <label
            htmlFor="timeout"
            className="block text-xs sm:text-sm font-medium text-slate-300 mb-2"
          >
            Request Timeout (seconds)
          </label>
          <input
            id="timeout"
            type="number"
            min="10"
            max="300"
            value={timeoutSeconds}
            onChange={(e) => onTimeoutChange(Number(e.target.value))}
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-400 mt-1 sm:mt-1.5">
            How long to wait for webhook responses (10-300 seconds)
          </p>
        </div>
      </div>
    </div>
  );
}
