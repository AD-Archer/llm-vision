# LLM Visualization Dashboard

This project is a lightweight dashboard that talks to an n8n RAG workflow via webhook or can call a configured AI provider directly, receives a JSON payload with insight data, and renders the best-fit visualization using [Recharts](https://recharts.org). You can let the AI decide which chart to use or override the visualization type manually.

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

3. **Create your environment file**

   ```bash
   cp .env.example .env
   ```

   Update the `DATABASE_URL` value so Prisma can connect to your Postgres instance. The default in the example file works with `docker-compose` (postgres/postgres credentials).

4. **Apply database migrations**

   ```bash
   pnpm db:migrate
   ```

   This boots Prisma, creates the `AppSetting` table, and inserts the default row used by the Settings UI.

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

4. **Update the dashboard Settings:**
   Launch the app, head to **Settings → API Configuration**, and paste your webhook URL (plus optional credentials) if using an n8n workflow. If you'd like the app to call a provider directly, set `AI_PROVIDER_URL` and `AI_PROVIDER_API_KEY` via the Settings or environment variables (see `.env.example`). The values are stored in Postgres so they survive deployments without living in `.env`.

## Quick start

```bash
npm run dev
# or
pnpm dev
```

The development server runs at http://localhost:3000 by default.

## Docker

Launch the full stack (Next.js app + Postgres) with:

```bash
docker-compose up --build
```

The compose file provisions a `postgres:16-alpine` container, runs Prisma migrations on startup, and exposes the UI at `http://localhost:3000`. Override the default `DATABASE_URL` by exporting it before running Compose if you need a different password/host.

## Configure the webhook

1. Run the app (`pnpm dev`) and sign in.
2. Open **Settings → API Configuration**.
3. Enter your webhook URL, timeout (5–300 seconds), and optional basic-auth credentials.

These values are written to Postgres via Prisma and never embedded in your client bundle anymore. Every dashboard query now goes through `/api/query`, which proxies the request server-side so the webhook URL, username, and password stay private.

The UI still keeps a session ID in local storage (`sessionId` in the payload) so memory-aware agents can stitch conversations together. Use the "New ID" button to start a fresh session.

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
    "meta": {
      "title"?: string,
      "description"?: string,
      "valueKey"?: string,
      "visualizationName": string
    },
    "data": Array<Record<string, string | number | boolean | null>>
  },
  "data"?: Array<Record<string, string | number | boolean | null>>
}

Guidelines:
- Always include a descriptive `visualizationName` (e.g., "Monthly Revenue Trend", "Customer Distribution by Region").
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

- `app/` — Next.js App Router pages and layouts
  - `page.tsx` — Main dashboard page
  - `layout.tsx` — Root layout component
  - `globals.css` — Global styles
- `components/` — Reusable React components
  - `ChartRenderer.tsx` — Chart rendering component
- `utils/` — Utility functions
  - `chartConfig.ts` — Chart configuration and normalization
- `types.ts` — TypeScript type definitions
- `sampleData.ts` — Demo data for testing
- `workflow.json` — n8n workflow configuration
- `next.config.js` — Next.js configuration

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL` — connection string for your managed Postgres instance (Supabase, Neon, RDS, etc.)
4. Deploy (Prisma migrations run automatically at boot because the Dockerfile and `start` command execute `prisma migrate deploy` before `next start`)

### Other Platforms

Build and start the production server manually:

```bash
pnpm build
DATABASE_URL="postgresql://..." pnpm start
```

Set `DATABASE_URL` in your hosting platform so Prisma can run `migrate deploy` before `next start`.

## Troubleshooting

### Common Issues

1. **Webhook timeout**: Increase the "Request Timeout" field in Settings (values sync to Postgres and control the `/api/query` proxy).
2. **Proxy errors (502/504)**: Ensure your n8n instance is reachable from the Next.js server (or Docker network) and that the credentials you saved in Settings are still valid.
3. **No response**: Check that the workflow is active and credentials are configured
4. **Chart not rendering**: Verify the JSON response matches the expected format

### Development

```bash
# Run in development mode
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```
