interface AiSettingsSectionProps {
  aiTemperature?: number;
  aiTopP?: number;
  aiMaxTokens?: number;
  aiStream?: boolean;
  aiK?: number;
  aiRetrievalMethod?: string;
  aiFrequencyPenalty?: number;
  aiPresencePenalty?: number;
  aiFilterKbContentByQueryMetadata?: boolean;
  aiIncludeFunctionsInfo?: boolean;
  aiIncludeRetrievalInfo?: boolean;
  aiIncludeGuardrailsInfo?: boolean;
  aiProvideCitations?: boolean;
  aiDisableTokenCount?: boolean;
  aiSystemPrompt?: string;
  aiHelperSystemPrompt?: string;
  onAiTemperatureChange?: (value: number) => void;
  onAiTopPChange?: (value: number) => void;
  onAiMaxTokensChange?: (value: number) => void;
  onAiStreamChange?: (value: boolean) => void;
  onAiKChange?: (value: number) => void;
  onAiRetrievalMethodChange?: (value: string) => void;
  onAiFrequencyPenaltyChange?: (value: number) => void;
  onAiPresencePenaltyChange?: (value: number) => void;
  onAiFilterKbContentByQueryMetadataChange?: (value: boolean) => void;
  onAiIncludeFunctionsInfoChange?: (value: boolean) => void;
  onAiIncludeRetrievalInfoChange?: (value: boolean) => void;
  onAiIncludeGuardrailsInfoChange?: (value: boolean) => void;
  onAiProvideCitationsChange?: (value: boolean) => void;
  onAiDisableTokenCountChange?: (value: boolean) => void;
  onAiSystemPromptChange?: (value: string) => void;
  onAiHelperSystemPromptChange?: (value: string) => void;
  onResetToDefaults?: () => void;
}

// Default values for reset functionality
const DEFAULTS = {
  aiTemperature: 0.7,
  aiTopP: 1.0,
  aiMaxTokens: 4096,
  aiStream: false,
  aiK: 5,
  aiRetrievalMethod: "none",
  aiFrequencyPenalty: 0.0,
  aiPresencePenalty: 0.0,
  aiFilterKbContentByQueryMetadata: false,
  aiIncludeFunctionsInfo: false,
  aiIncludeRetrievalInfo: false,
  aiIncludeGuardrailsInfo: false,
  aiProvideCitations: false,
  aiDisableTokenCount: false,
  aiSystemPrompt: "",
  aiHelperSystemPrompt: "",
} as const;

export function AiSettingsSection({
  aiTemperature = 0.7,
  aiTopP = 1.0,
  aiMaxTokens = 4096,
  aiStream = false,
  aiK = 5,
  aiRetrievalMethod = "none",
  aiFrequencyPenalty = 0.0,
  aiPresencePenalty = 0.0,
  aiFilterKbContentByQueryMetadata = false,
  aiIncludeFunctionsInfo = false,
  aiIncludeRetrievalInfo = false,
  aiIncludeGuardrailsInfo = false,
  aiProvideCitations = false,
  aiDisableTokenCount = false,
  aiSystemPrompt = "",
  aiHelperSystemPrompt = "",
  onAiTemperatureChange,
  onAiTopPChange,
  onAiMaxTokensChange,
  onAiStreamChange,
  onAiKChange,
  onAiRetrievalMethodChange,
  onAiFrequencyPenaltyChange,
  onAiPresencePenaltyChange,
  onAiFilterKbContentByQueryMetadataChange,
  onAiIncludeFunctionsInfoChange,
  onAiIncludeRetrievalInfoChange,
  onAiIncludeGuardrailsInfoChange,
  onAiProvideCitationsChange,
  onAiDisableTokenCountChange,
  onAiSystemPromptChange,
  onAiHelperSystemPromptChange,
  onResetToDefaults,
}: AiSettingsSectionProps) {
  return (
    <div className="p-4 sm:p-6 md:p-8 border-b border-slate-600 bg-slate-800/50 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-white">
          AI Settings
        </h2>
        {onResetToDefaults && (
          <button
            onClick={onResetToDefaults}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md transition-colors"
            title="Reset all AI settings to defaults"
          >
            Reset to Defaults
          </button>
        )}
      </div>
      <div className="space-y-6 sm:space-y-8">
        {/* System Prompts */}
        <div className="space-y-4 bg-slate-800/30 p-4 rounded-lg border border-slate-600">
          <h3 className="text-base font-semibold text-slate-200 flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            System Prompts
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="ai-system-prompt"
                  className="block text-sm font-medium text-slate-200"
                >
                  Default AI System Prompt
                </label>
                <button
                  onClick={() =>
                    onAiSystemPromptChange?.(DEFAULTS.aiSystemPrompt)
                  }
                  className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors"
                  title="Reset to default"
                >
                  Reset
                </button>
              </div>
              <textarea
                id="ai-system-prompt"
                value={aiSystemPrompt}
                onChange={(e) => onAiSystemPromptChange?.(e.target.value)}
                placeholder="Enter system prompt for the default AI..."
                rows={4}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-vertical"
              />
              <p className="text-xs text-slate-500 mt-2">
                Instructions for the AI to understand its role and expected
                output format.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="ai-helper-system-prompt"
                  className="block text-sm font-medium text-slate-200"
                >
                  AI Helper System Prompt
                </label>
                <button
                  onClick={() =>
                    onAiHelperSystemPromptChange?.(
                      DEFAULTS.aiHelperSystemPrompt
                    )
                  }
                  className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors"
                  title="Reset to default"
                >
                  Reset
                </button>
              </div>
              <textarea
                id="ai-helper-system-prompt"
                value={aiHelperSystemPrompt}
                onChange={(e) => onAiHelperSystemPromptChange?.(e.target.value)}
                placeholder="Enter system prompt for the AI helper..."
                rows={4}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-vertical"
              />
              <p className="text-xs text-slate-500 mt-2">
                Instructions for the AI helper/assistant.
              </p>
            </div>
          </div>
        </div>

        {/* Generation Parameters */}
        <div className="space-y-4 bg-slate-800/30 p-4 rounded-lg border border-slate-600">
          <h3 className="text-base font-semibold text-slate-200 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Generation Parameters
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="ai-temperature"
                  className="block text-sm font-medium text-slate-200"
                >
                  Temperature ({aiTemperature})
                </label>
                <button
                  onClick={() =>
                    onAiTemperatureChange?.(DEFAULTS.aiTemperature)
                  }
                  className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors"
                  title="Reset to default (0.7)"
                >
                  Reset
                </button>
              </div>
              <input
                id="ai-temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={aiTemperature}
                onChange={(e) =>
                  onAiTemperatureChange?.(Number(e.target.value))
                }
                className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer slider accent-blue-500"
              />
              <p className="text-xs text-slate-500">
                Controls randomness (0 = deterministic, 2 = very random)
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="ai-top-p"
                  className="block text-sm font-medium text-slate-200"
                >
                  Top P ({aiTopP})
                </label>
                <button
                  onClick={() => onAiTopPChange?.(DEFAULTS.aiTopP)}
                  className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors"
                  title="Reset to default (1.0)"
                >
                  Reset
                </button>
              </div>
              <input
                id="ai-top-p"
                type="range"
                min="0.01"
                max="1"
                step="0.01"
                value={aiTopP}
                onChange={(e) => onAiTopPChange?.(Number(e.target.value))}
                className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer slider accent-blue-500"
              />
              <p className="text-xs text-slate-500">
                Nucleus sampling threshold
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="ai-max-tokens"
                  className="block text-sm font-medium text-slate-200"
                >
                  Max Tokens
                </label>
                <button
                  onClick={() => onAiMaxTokensChange?.(DEFAULTS.aiMaxTokens)}
                  className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors"
                  title="Reset to default (4096)"
                >
                  Reset
                </button>
              </div>
              <input
                id="ai-max-tokens"
                type="number"
                min="1"
                max="32768"
                value={aiMaxTokens}
                onChange={(e) => onAiMaxTokensChange?.(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-xs text-slate-500">
                Maximum tokens to generate
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="ai-k"
                  className="block text-sm font-medium text-slate-200"
                >
                  K (Top Results)
                </label>
                <button
                  onClick={() => onAiKChange?.(DEFAULTS.aiK)}
                  className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors"
                  title="Reset to default (5)"
                >
                  Reset
                </button>
              </div>
              <input
                id="ai-k"
                type="number"
                min="0"
                max="20"
                value={aiK}
                onChange={(e) => onAiKChange?.(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-xs text-slate-500">
                Top results from knowledge bases
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="ai-frequency-penalty"
                  className="block text-sm font-medium text-slate-200"
                >
                  Frequency Penalty ({aiFrequencyPenalty})
                </label>
                <button
                  onClick={() =>
                    onAiFrequencyPenaltyChange?.(DEFAULTS.aiFrequencyPenalty)
                  }
                  className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors"
                  title="Reset to default (0.0)"
                >
                  Reset
                </button>
              </div>
              <input
                id="ai-frequency-penalty"
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={aiFrequencyPenalty}
                onChange={(e) =>
                  onAiFrequencyPenaltyChange?.(Number(e.target.value))
                }
                className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer slider accent-blue-500"
              />
              <p className="text-xs text-slate-500">
                Reduces repetition of frequent tokens
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="ai-presence-penalty"
                  className="block text-sm font-medium text-slate-200"
                >
                  Presence Penalty ({aiPresencePenalty})
                </label>
                <button
                  onClick={() =>
                    onAiPresencePenaltyChange?.(DEFAULTS.aiPresencePenalty)
                  }
                  className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors"
                  title="Reset to default (0.0)"
                >
                  Reset
                </button>
              </div>
              <input
                id="ai-presence-penalty"
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={aiPresencePenalty}
                onChange={(e) =>
                  onAiPresencePenaltyChange?.(Number(e.target.value))
                }
                className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer slider accent-blue-500"
              />
              <p className="text-xs text-slate-500">
                Encourages discussion of new topics
              </p>
            </div>
          </div>
        </div>

        {/* Retrieval and Output Options */}
        <div className="space-y-4 bg-slate-800/30 p-4 rounded-lg border border-slate-600">
          <h3 className="text-base font-semibold text-slate-200 flex items-center">
            <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
            Retrieval & Output Options
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="ai-retrieval-method"
                  className="block text-sm font-medium text-slate-200"
                >
                  Retrieval Method
                </label>
                <button
                  onClick={() =>
                    onAiRetrievalMethodChange?.(DEFAULTS.aiRetrievalMethod)
                  }
                  className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors"
                  title="Reset to default (none)"
                >
                  Reset
                </button>
              </div>
              <select
                id="ai-retrieval-method"
                value={aiRetrievalMethod}
                onChange={(e) => onAiRetrievalMethodChange?.(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="none">None</option>
                <option value="rewrite">Rewrite Query</option>
                <option value="step_back">Step Back</option>
                <option value="sub_queries">Sub Queries</option>
              </select>
              <p className="text-xs text-slate-500 mt-2">
                Strategy for retrieval-augmented generation
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex items-center space-x-3">
                  <input
                    id="ai-stream"
                    type="checkbox"
                    checked={aiStream}
                    onChange={(e) => onAiStreamChange?.(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 accent-blue-500"
                  />
                  <label
                    htmlFor="ai-stream"
                    className="text-sm font-medium text-slate-200 cursor-pointer"
                  >
                    Stream Response
                  </label>
                </div>
                <button
                  onClick={() => onAiStreamChange?.(DEFAULTS.aiStream)}
                  className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors"
                  title="Reset to default (false)"
                >
                  Reset
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex items-center space-x-3">
                  <input
                    id="ai-filter-metadata"
                    type="checkbox"
                    checked={aiFilterKbContentByQueryMetadata}
                    onChange={(e) =>
                      onAiFilterKbContentByQueryMetadataChange?.(
                        e.target.checked
                      )
                    }
                    className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 accent-blue-500"
                  />
                  <label
                    htmlFor="ai-filter-metadata"
                    className="text-sm font-medium text-slate-200 cursor-pointer"
                  >
                    Filter KB by Query Metadata
                  </label>
                </div>
                <button
                  onClick={() =>
                    onAiFilterKbContentByQueryMetadataChange?.(
                      DEFAULTS.aiFilterKbContentByQueryMetadata
                    )
                  }
                  className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors"
                  title="Reset to default (false)"
                >
                  Reset
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex items-center space-x-3">
                  <input
                    id="ai-include-functions"
                    type="checkbox"
                    checked={aiIncludeFunctionsInfo}
                    onChange={(e) =>
                      onAiIncludeFunctionsInfoChange?.(e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 accent-blue-500"
                  />
                  <label
                    htmlFor="ai-include-functions"
                    className="text-sm font-medium text-slate-200 cursor-pointer"
                  >
                    Include Functions Info
                  </label>
                </div>
                <button
                  onClick={() =>
                    onAiIncludeFunctionsInfoChange?.(
                      DEFAULTS.aiIncludeFunctionsInfo
                    )
                  }
                  className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors"
                  title="Reset to default (false)"
                >
                  Reset
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex items-center space-x-3">
                  <input
                    id="ai-include-retrieval"
                    type="checkbox"
                    checked={aiIncludeRetrievalInfo}
                    onChange={(e) =>
                      onAiIncludeRetrievalInfoChange?.(e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 accent-blue-500"
                  />
                  <label
                    htmlFor="ai-include-retrieval"
                    className="text-sm font-medium text-slate-200 cursor-pointer"
                  >
                    Include Retrieval Info
                  </label>
                </div>
                <button
                  onClick={() =>
                    onAiIncludeRetrievalInfoChange?.(
                      DEFAULTS.aiIncludeRetrievalInfo
                    )
                  }
                  className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors"
                  title="Reset to default (false)"
                >
                  Reset
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex items-center space-x-3">
                  <input
                    id="ai-include-guardrails"
                    type="checkbox"
                    checked={aiIncludeGuardrailsInfo}
                    onChange={(e) =>
                      onAiIncludeGuardrailsInfoChange?.(e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 accent-blue-500"
                  />
                  <label
                    htmlFor="ai-include-guardrails"
                    className="text-sm font-medium text-slate-200 cursor-pointer"
                  >
                    Include Guardrails Info
                  </label>
                </div>
                <button
                  onClick={() =>
                    onAiIncludeGuardrailsInfoChange?.(
                      DEFAULTS.aiIncludeGuardrailsInfo
                    )
                  }
                  className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors"
                  title="Reset to default (false)"
                >
                  Reset
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex items-center space-x-3">
                  <input
                    id="ai-provide-citations"
                    type="checkbox"
                    checked={aiProvideCitations}
                    onChange={(e) =>
                      onAiProvideCitationsChange?.(e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 accent-blue-500"
                  />
                  <label
                    htmlFor="ai-provide-citations"
                    className="text-sm font-medium text-slate-200 cursor-pointer"
                  >
                    Provide Citations
                  </label>
                </div>
                <button
                  onClick={() =>
                    onAiProvideCitationsChange?.(DEFAULTS.aiProvideCitations)
                  }
                  className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors"
                  title="Reset to default (false)"
                >
                  Reset
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex items-center space-x-3">
                  <input
                    id="ai-disable-token-count"
                    type="checkbox"
                    checked={aiDisableTokenCount}
                    onChange={(e) =>
                      onAiDisableTokenCountChange?.(e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 accent-blue-500"
                  />
                  <label
                    htmlFor="ai-disable-token-count"
                    className="text-sm font-medium text-slate-200 cursor-pointer"
                  >
                    Disable Token Count
                  </label>
                </div>
                <button
                  onClick={() =>
                    onAiDisableTokenCountChange?.(DEFAULTS.aiDisableTokenCount)
                  }
                  className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1 rounded border border-slate-600 hover:border-slate-500 transition-colors"
                  title="Reset to default (false)"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
