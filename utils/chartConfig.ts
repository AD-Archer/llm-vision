import type { ChartConfig, ChartType, InsightResponse } from '../types';

type Primitive = string | number | boolean | null;

const isRecordArray = (value: unknown): value is Array<Record<string, Primitive>> =>
  Array.isArray(value) && value.every((item) => item && typeof item === 'object' && !Array.isArray(item));

const asRecordArray = (value: unknown): Array<Record<string, Primitive>> => {
  if (!isRecordArray(value)) {
    return [];
  }

  return value as Array<Record<string, Primitive>>;
};

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length ? value : undefined;

const pickData = (...candidates: unknown[]): Array<Record<string, Primitive>> => {
  for (const candidate of candidates) {
    const data = asRecordArray(candidate);
    if (data.length) return data;
  }
  return [];
};

const sanitizeJsonString = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('```')) {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match?.[1]) {
      return match[1];
    }
  }
  return trimmed;
};

const parseJsonString = (value: unknown): unknown => {
  if (typeof value !== 'string') return undefined;
  const sanitized = sanitizeJsonString(value);
  if (!sanitized) return undefined;
  try {
    return JSON.parse(sanitized);
  } catch {
    return undefined;
  }
};

const isLikelyDate = (value: Primitive) => {
  if (typeof value !== 'string') return false;
  if (!value) return false;
  const maybeDate = Date.parse(value);
  return Number.isFinite(maybeDate);
};

const chooseXKey = (data: Array<Record<string, Primitive>>) => {
  if (!data.length) return undefined;
  const keyScores: Record<string, number> = {};
  const sample = data.slice(0, 5);

  sample.forEach((item) => {
    Object.entries(item).forEach(([key, value]) => {
      let score = keyScores[key] ?? 0;
      if (typeof value === 'string') score += 2;
      if (typeof value === 'string' && value.length <= 40) score += 1;
      if (isLikelyDate(value)) score += 3;
      if (typeof value === 'number') score -= 1;
      if (key.toLowerCase().match(/(date|time|category|label|name|x)/)) score += 2;
      keyScores[key] = score;
    });
  });

  const sorted = Object.entries(keyScores).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0];
};

const chooseYKeys = (data: Array<Record<string, Primitive>>, exclude?: string) => {
  if (!data.length) return [];
  const keyScores: Record<string, number> = {};
  const sample = data.slice(0, 5);

  sample.forEach((item) => {
    Object.entries(item).forEach(([key, value]) => {
      if (key === exclude) return;
      if (typeof value === 'number') {
        const score = keyScores[key] ?? 0;
        keyScores[key] = score + 2;
        if (key.toLowerCase().match(/(value|amount|total|count|score|y)/)) {
          keyScores[key] += 1;
        }
      }
    });
  });

  return Object.entries(keyScores)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key);
};

const inferChartType = (data: Array<Record<string, Primitive>>, yKeyCount: number, fallback: ChartType): ChartType => {
  if (!data.length || !yKeyCount) return fallback;
  if (yKeyCount === 1 && data.length <= 6) return 'pie';
  if (yKeyCount > 1) return 'area';

  const firstRow = data[0];
  const xValue = firstRow && Object.values(firstRow)[0];
  if (isLikelyDate(xValue)) return 'line';

  return fallback === 'auto' ? 'bar' : fallback;
};

export interface NormalizedInsight {
  raw: InsightResponse;
  insightText: string;
  chart?: ChartConfig;
}

export const normalizeInsight = (response: InsightResponse): NormalizedInsight => {
  const parsedOutput = parseJsonString((response as { output?: unknown }).output);
  const mergedResponse =
    parsedOutput && typeof parsedOutput === 'object' && !Array.isArray(parsedOutput)
      ? ({ ...response, ...(parsedOutput as Record<string, unknown>) } as InsightResponse)
      : response;

  const insightText =
    asString(mergedResponse.insight) ??
    asString((mergedResponse as { summary?: unknown }).summary) ??
    asString((response as { output?: unknown }).output) ??
    '';

  const chartData = pickData(
    mergedResponse.chart?.data,
    mergedResponse.data,
    (mergedResponse as { results?: unknown }).results,
    parsedOutput && Array.isArray(parsedOutput) ? (parsedOutput as Array<Record<string, Primitive>>) : undefined,
  );

  const providedType = mergedResponse.chart?.type ?? 'auto';
  const providedXKey = mergedResponse.chart?.xKey;
  const providedYKeys = mergedResponse.chart?.yKeys;

  const xKey = providedXKey ?? chooseXKey(chartData);
  const yKeys =
    providedYKeys && providedYKeys.length
      ? providedYKeys
      : chooseYKeys(chartData, xKey);

  if (!chartData.length || !xKey || !yKeys.length) {
    return { raw: response, insightText };
  }

  const type = (providedType === 'auto' ? inferChartType(chartData, yKeys.length, providedType) : providedType) as ChartType;

  const chart: ChartConfig = {
    type: type === 'auto' ? 'bar' : type,
    data: chartData,
    xKey,
    yKeys,
    meta: {
      title: asString(mergedResponse.chart?.meta?.title) ?? asString((mergedResponse as { title?: unknown }).title),
      description: asString(mergedResponse.chart?.meta?.description),
      valueKey: asString(mergedResponse.chart?.meta?.valueKey),
    },
  };

  return { raw: response, insightText, chart };
};
