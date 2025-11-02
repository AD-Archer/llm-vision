export type ChartType = 'auto' | 'bar' | 'line' | 'area' | 'pie' | 'scatter';

export interface ChartConfig {
  type: Exclude<ChartType, 'auto'>;
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKeys: string[];
  meta?: {
    title?: string;
    description?: string;
    valueKey?: string;
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
