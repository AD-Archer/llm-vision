interface ApiConfigurationSectionProps {
  webhookUrl: string;
  onWebhookUrlChange: (url: string) => void;
  timeoutSeconds: number;
  onTimeoutChange: (seconds: number) => void;
  webhookUsername?: string;
  onWebhookUsernameChange?: (username: string) => void;
  webhookPassword?: string;
  onWebhookPasswordChange?: (password: string) => void;
}

export function ApiConfigurationSection({
  webhookUrl,
  onWebhookUrlChange,
  timeoutSeconds,
  onTimeoutChange,
  webhookUsername = "",
  onWebhookUsernameChange,
  webhookPassword = "",
  onWebhookPasswordChange,
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

        <div className="pt-2 sm:pt-3 border-t border-slate-600">
          <h3 className="text-sm font-medium text-slate-300 mb-3">
            Webhook Authentication (Optional)
          </h3>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="webhook-username"
                className="block text-xs sm:text-sm font-medium text-slate-300 mb-2"
              >
                Username
              </label>
              <input
                id="webhook-username"
                type="text"
                value={webhookUsername}
                onChange={(e) => onWebhookUsernameChange?.(e.target.value)}
                placeholder="Leave empty if not required"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1 sm:mt-1.5">
                Basic auth username for webhook
              </p>
            </div>

            <div>
              <label
                htmlFor="webhook-password"
                className="block text-xs sm:text-sm font-medium text-slate-300 mb-2"
              >
                Password
              </label>
              <input
                id="webhook-password"
                type="password"
                value={webhookPassword}
                onChange={(e) => onWebhookPasswordChange?.(e.target.value)}
                placeholder="Leave empty if not required"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1 sm:mt-1.5">
                Basic auth password for webhook (stored locally in browser)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
