# LLM Visualization Dashboard

This project is a lightweight dashboard that talks to an n8n RAG workflow via webhook, receives a JSON payload with insight data, and renders the best-fit visualization using [Recharts](https://recharts.org). You can let the AI decide which chart to use or override the visualization type manually.

## Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- An n8n instance (cloud or self-hosted)

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/AD-Archer/llm-visi-dash.git
   cd llm-visi-dash
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Create environment file:**
   Create a `.env` file in the root directory:

   ```bash
   touch .env
   ```

   Add your n8n webhook URL and optional timeout:

   ```env
   VITE_N8N_WEBHOOK_URL=https://your-instance.n8n.cloud/webhook/your-webhook-id
   VITE_WEBHOOK_TIMEOUT_MS=30000
   ```

## Setup n8n Workflow

1. **Import the workflow:**

   - Go to your n8n instance
   - Click "Import" → "From URL"
   - Paste this URL: `https://raw.githubusercontent.com/AD-Archer/llm-visi-dash/main/workflow.json`
   - Click "Import"

2. **Configure credentials:**
   The workflow requires several credentials to be set up:

   - **Google Drive OAuth2 API**: For accessing Google Drive files
   - **Google Gemini (PaLM) API**: For AI chat and embeddings
   - **Qdrant API**: For vector database storage

3. **Activate the workflow:**

   - After importing and configuring credentials, activate the workflow
   - Note the webhook URL from the "Webhook" node (it should end with `/webhook/llm-visi-dash`)

4. **Update your `.env` file:**
   Replace the placeholder webhook URL with your actual n8n webhook URL.

## Quick start

```bash
npm run dev
# or
pnpm dev
```

The dev server runs at http://localhost:5173 by default.

## Configure the webhook

Set the webhook URL either:

- in a `.env` file: `VITE_N8N_WEBHOOK_URL=https://your-instance.n8n.cloud/webhook/...`, or
- directly in the dashboard UI (the input is persisted only in memory).

If your workflow needs more time, set `VITE_WEBHOOK_TIMEOUT_MS` (or adjust the "Request timeout" field in the UI). The dashboard aborts the request once the configured timeout elapses.

The UI keeps a session ID in local storage (`sessionId` in the payload) so memory-aware agents can stitch conversations together. Use the "New ID" button to start a fresh session.

## Features

- **AI-Powered Insights**: Ask questions in natural language and get visualized responses
- **Multiple Chart Types**: Support for bar, line, area, pie, and scatter charts
- **Follow-up Questions**: Ask follow-up questions about your data
- **Saved Charts**: Save and revisit your favorite charts and questions
- **Developer Tools**: Access to webhook URL, timeout settings, and session management
- **Responsive Design**: Works on desktop and mobile devices

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
- `src/sampleData.ts` — demo payload used by the "Load demo insight" button.
- `workflow.json` — n8n workflow configuration for RAG and AI processing.
- `.env` — environment variables (webhook URL, timeout settings).

## Workflow Overview

The included n8n workflow provides:

- **RAG (Retrieval-Augmented Generation)**: Processes documents from Google Drive
- **AI Agent**: Uses Google Gemini for intelligent responses
- **Vector Storage**: Qdrant for document embeddings and retrieval
- **File Processing**: Supports PDF, Excel, and Google Docs files
- **Memory**: Maintains conversation context across requests

### Required Credentials

1. **Google Drive OAuth2 API**: Access to Google Drive files
2. **Google Gemini API**: AI chat and text embeddings
3. **Qdrant API**: Vector database for document storage

## Deployment

Build the static bundle with:

```bash
npm run build
```

Then deploy the contents of `dist/` to any static host (Vercel, Netlify, S3, etc.).

## Troubleshooting

### Common Issues

1. **Webhook timeout**: Increase `VITE_WEBHOOK_TIMEOUT_MS` in your `.env` file
2. **CORS errors**: Ensure your n8n instance allows requests from your dashboard domain
3. **No response**: Check that the workflow is active and credentials are configured
4. **Chart not rendering**: Verify the JSON response matches the expected format

### Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```
