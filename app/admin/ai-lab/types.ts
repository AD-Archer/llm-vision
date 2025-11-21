export type ExperimentStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
export type RunStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";

export interface HeaderPair {
  id: string;
  key: string;
  value: string;
}

export interface TargetSlotState {
  id: string;
  label: string;
  modelName: string;
  color: string;
  timeoutMs: number;

  // Tuning Parameters
  systemPrompt: string;
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  frequencyPenalty: number;
  presencePenalty: number;

  // Optional Overrides
  providerUrl?: string;
  apiKey?: string;

  // Cost & Stats
  inputTokensPerMillion?: number;
  outputTokensPerMillion?: number;
  requestCount?: number;
}

export interface AiLabResult {
  id: string;
  experimentId: string;
  slotIndex: number;
  label: string;
  color?: string | null;
  modelName?: string | null;
  status: RunStatus;
  latencyMs?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  accuracyScore?: number | null;
  speedScore?: number | null;
  costEstimate?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  responsePayload?: Record<string, unknown> | { raw: string } | null;
  errorMessage?: string | null;
  reviewScore?: number | null;
  feedbackNotes?: string | null;
}

export interface AiLabExperiment {
  id: string;
  userId: string;
  label: string;
  prompt: string;
  expectedAnswer?: string | null;
  notes?: string | null;
  totalTargets: number;
  totalCompleted: number;
  status: ExperimentStatus;
  durationMs?: number | null;
  startedAt: string;
  completedAt?: string | null;
  targetConfigs?: unknown;
  results: AiLabResult[];
}

export interface SavedModelConfig {
  id: string;
  name: string;
  label: string;
  modelName: string;

  // Tuning Parameters
  systemPrompt: string;
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  frequencyPenalty: number;
  presencePenalty: number;

  // Optional Overrides
  providerUrl?: string;
  apiKey?: string;

  timeoutMs: number;
  inputTokensPerMillion?: number;
  outputTokensPerMillion?: number;
  requestCount?: number;
  createdAt: string;
  updatedAt: string;
}
