# System Prompts Removal

This file documents the temporary removal of system prompts from the application for testing purposes.

## Changes Made

### 1. `app/api/prompt-helper/route.ts`

The system prompt injection for the prompt helper has been commented out.

**Original Code:**

```typescript
const messages = [
  {
    role: "system",
    content: settings.aiHelperSystemPrompt?.trim() || defaultHelperSystem,
  },
  {
    role: "user",
    content: userMessage,
  },
];
```

**Modified Code:**

```typescript
const messages = [
  // {
  //   role: "system",
  //   content: settings.aiHelperSystemPrompt?.trim() || defaultHelperSystem,
  // },
  {
    role: "user",
    content: userMessage,
  },
];
```

**Original Prompt (`defaultHelperSystem`):**

> You are a PROMPT HELPER ONLY. You do NOT analyze data, generate charts, create visualizations, or return JSON. Your ONLY job is to help users improve their data analysis prompts by suggesting better wording, adding clarity, and making them more specific. Respond with plain text or markdown-formatted suggestions. Do not include any code, SQL queries, or data in your response. Focus solely on rephrasing and improving the user's question.

### 2. `app/api/query/route.ts` (Main Query)

The system prompt injection for the main query has been commented out.

**Original Code:**

```typescript
// Add system prompt if configured
if (settings.aiSystemPrompt) {
  messages.push({
    role: "system",
    content: settings.aiSystemPrompt,
  });
}
```

**Modified Code:**

```typescript
// Add system prompt if configured
// if (settings.aiSystemPrompt) {
//   messages.push({
//     role: "system",
//     content: settings.aiSystemPrompt,
//   });
// }
```

**Original Prompt:**
The prompt is dynamically loaded from `settings.aiSystemPrompt`.

### 3. `app/api/query/route.ts` (Structuring Step)

The system prompt for the JSON structuring step (if enabled) has been commented out.

**Original Code:**

```typescript
const step2Messages = [
  {
    role: "system",
    content: defaultStructuringPrompt,
  },
  {
    role: "user",
    content: `Here is the raw text to structure:\n\n${contentToStructure}`,
  },
];
```

**Modified Code:**

```typescript
const step2Messages = [
  // {
  //   role: "system",
  //   content: defaultStructuringPrompt,
  // },
  {
    role: "user",
    content: `Here is the raw text to structure:\n\n${contentToStructure}`,
  },
];
```

**Original Prompt (`defaultStructuringPrompt`):**

> You are a Data Visualization Expert and JSON formatter. You will receive a raw text response from another AI assistant. Your task is to analyze this text, extract the key data points, and structure them into a JSON format suitable for frontend visualization. You must determine the best way to visualize this data (e.g., bar chart, line chart, etc.) and populate the JSON accordingly.
>
> Convert the input into the following strict JSON schema without additional commentary or explanation:
> {
> "insight": string, // A brief summary or insight derived from the data
> "chart": {
> "type": "auto" | "bar" | "line" | "area" | "pie" | "scatter",
> "xKey": string, // The key in the data objects to use for the X-axis (categories/time)
> "yKeys": string[], // The keys in the data objects to use for the Y-axis (values)
> "meta": { "title"?: string, "description"?: string, "visualizationName"?: string },
> "data": Array<Record<string, string | number | boolean | null>> // The actual data points extracted from the text
> },
> "data"?: Array<Record<string, string | number | boolean | null>> // Optional: raw tabular data if different from chart data
> }
> Please ensure all keys appear exactly as above. If any fields are missing, infer sensible defaults and keep arrays of at least three rows where possible.

## How to Undo

To restore the system prompts, simply uncomment the lines mentioned above in the respective files.
