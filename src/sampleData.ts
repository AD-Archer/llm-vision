import type { InsightResponse } from './types';

export const demoInsight: InsightResponse = {
  insight:
    'Website traffic increased 18% week-over-week. Organic search continues to be the leading acquisition channel.',
  chart: {
    type: 'line',
    xKey: 'week',
    yKeys: ['visitors', 'signups'],
    data: [
      { week: '2024-07-01', visitors: 820, signups: 96 },
      { week: '2024-07-08', visitors: 940, signups: 104 },
      { week: '2024-07-15', visitors: 1020, signups: 131 },
      { week: '2024-07-22', visitors: 1105, signups: 142 },
    ],
    meta: {
      title: 'Weekly acquisition performance',
      description: 'Visitors and signups captured through the n8n RAG workflow demo.',
    },
  },
};
