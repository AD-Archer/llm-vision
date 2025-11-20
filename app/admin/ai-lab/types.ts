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
  webhookUrl?: string;
  modelName: string;
  method: "POST" | "PUT" | "PATCH";
  color: string;
  timeoutMs: number;
  headers: HeaderPair[];
  costPer1kTokens?: number; // no longer used
  inputTokensPerMillion?: number;
  outputTokensPerMillion?: number;
  payloadTemplateRaw: string;
  requestCount?: number;
}

export interface AiLabResult {
  id: string;
  experimentId: string;
  slotIndex: number;
  label: string;
  color?: string | null;
  webhookUrl?: string;
  modelName?: string | null;
  method: string;
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
  webhookUrl?: string;
  method: "POST" | "PUT" | "PATCH";
  timeoutMs: number;
  headers: HeaderPair[];
  inputTokensPerMillion?: number;
  outputTokensPerMillion?: number;
  payloadTemplateRaw: string;
  requestCount?: number;
  createdAt: string;
  updatedAt: string;
}
