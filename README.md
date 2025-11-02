# LLM Visualization Dashboard

This project is a lightweight dashboard that talks to an n8n RAG workflow via webhook, receives a JSON payload with insight data, and renders the best-fit visualization using [Recharts](https://recharts.org). You can let the AI decide which chart to use or override the visualization type manually.

## Quick start

```bash
npm install
npm run dev
```

The dev server runs at http://localhost:5173 by default.

## Configure the webhook

Set the webhook URL either:

- in a `.env` file: `VITE_N8N_WEBHOOK_URL=https://your-instance.n8n.cloud/webhook/...`, or
- directly in the dashboard UI (the input is persisted only in memory).

If your workflow needs more time, set `VITE_WEBHOOK_TIMEOUT_MS` (or adjust the “Request timeout” field in the UI). The dashboard aborts the request once the configured timeout elapses.

The UI keeps a session ID in local storage (`sessionId` in the payload) so memory-aware agents can stitch conversations together. Use the “New ID” button to start a fresh session.

### Recommended LLM system prompt

Give your model clear instructions so it returns chart-ready JSON. A good starting system prompt is:

```
You are a data insights copilot that replies **only** with JSON.
Use retrieved context to answer the user and plan a visualization.
Respond with this structure:
{
  "insight": string,
  "chart": {
    "type": "auto" | "bar" | "line" | "area" | "pie" | "scatter",
    "xKey": string,
    "yKeys": string[],
    "meta"?: {
      "title"?: string,
      "description"?: string,
      "valueKey"?: string
    },
    "data": Array<Record<string, string | number | boolean | null>>
  },
  "data"?: Array<Record<string, string | number | boolean | null>>
}

Guidelines:
- Always include at least three rows in `chart.data` when possible.
- Pick `chart.type` that best fits the data; use "auto" to let the UI decide.
- Use ISO date strings or concise categorical labels for the `xKey`.
- Never add commentary outside of the JSON payload.
```

### Expected webhook payload

The dashboard sends a POST request containing the user's question, preferred chart type, a persistent session identifier (used by memory-enabled agents), and a `chatInput` echo for workflows that expect one:

```json
{
  "question": "Show monthly revenue compared to new customers",
  "chartType": "auto",
  "sessionId": "session-123456789",
  "chatInput": "Show monthly revenue compared to new customers"
}
```

### Accepted webhook response shape

Only three pieces are needed, and the component will infer any missing chart metadata:

```json
{
  "insight": "Revenue grew 18% month-over-month, with steady customer acquisition.",
  "chart": {
    "type": "line",
    "xKey": "month",
    "yKeys": ["revenue", "newCustomers"],
    "meta": {
      "title": "Monthly performance",
      "description": "Data served directly from the RAG workflow."
    },
    "data": [
      { "month": "2024-04", "revenue": 69000, "newCustomers": 126 },
      { "month": "2024-05", "revenue": 74200, "newCustomers": 131 }
    ]
  }
}
```

If the workflow omits the `chart` block, the app will fallback to `response.data` (or `response.results`) and try to infer:

- the `xKey` from categorical or date-like fields,
- one or more numeric `yKeys`,
- the best chart (`pie`, `bar`, `line`, or `area`).

You can force a specific chart type by returning `chart.type` or by selecting an option in the UI.

## Project layout

- `src/App.tsx` — main UI: request form, response handling, and visualization.
- `src/utils/chartConfig.ts` — normalizes raw webhook responses and infers chart configs.
- `src/components/ChartRenderer.tsx` — renders the appropriate Recharts component.
- `src/sampleData.ts` — demo payload used by the “Load demo insight” button.

## Deployment

Build the static bundle with:

```bash
npm run build
```

Then deploy the contents of `dist/` to any static host (Vercel, Netlify, S3, etc.).
