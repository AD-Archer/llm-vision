export type ChartType = "auto" | "bar" | "line" | "area" | "pie" | "scatter";

export interface ChartConfig {
  type: Exclude<ChartType, "auto">;
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKeys: string[];
  meta?: {
    title?: string;
    description?: string;
    valueKey?: string;
    visualizationName?: string;
  };
}

export interface InsightResponse {
  insight?: string;
  chart?: Partial<ChartConfig> & { type?: ChartType };
  data?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface QueryRequestBody {
  question: string;
  chartType?: ChartType;
  sessionId?: string;
  chatInput?: string;
  [key: string]: unknown;
}

// Admin and User Management Types
export interface UserStats {
  id: string;
  email: string;
  name: string;
  queryCount: number;
  createdAt: string;
  lastActive: string;
  status: "active" | "inactive" | "invited";
  invitationSentAt?: string;
  isAdmin?: boolean;
}

export interface UserFeatures {
  userId: string;
  maxQueriesPerDay: number;
  apiAccessEnabled: boolean;
  advancedChartsEnabled: boolean;
  customWebhooksEnabled: boolean;
}

// Follow-up Types
export interface FollowUp {
  id: string;
  parentQueryId: string;
  parentFollowUpId?: string;
  question: string;
  result: {
    raw: InsightResponse;
    insightText: string;
    chart?: ChartConfig;
  };
  name?: string;
  isFavorite: boolean;
  chartType?: string;
  createdAt: number;
  updatedAt: number;
  followUps?: FollowUp[]; // For nested follow-ups
}

export interface InvitationCode {
  code: string;
  createdAt: string;
  expiresAt: string;
  usedBy?: string;
  usedAt?: string;
}
