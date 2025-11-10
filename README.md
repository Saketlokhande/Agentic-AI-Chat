# Agentic Chat API

A full-stack application demonstrating an agentic chat endpoint that can use external tools (like web search) to provide enhanced responses.

## Features

- **Agentic Reasoning**: The LLM decides when to use tools based on the query using OpenAI's native function calling
- **Web Search Tool**:
  - Uses **Tavily API** (if configured) for high-quality search results
  - Falls back to **DuckDuckGo** if Tavily API key is not set
- **Service Name Display**: Shows which actual service is being used (e.g., "Tavily", "DuckDuckGo")
- **Streaming Responses**: Real-time streaming of reasoning, tool calls, and responses
- **Modern UI**: Clean, minimalistic Next.js interface with Shadcn components

## Project Structure

```
.
├── backend/          # Express.js backend with TypeScript
│   ├── src/
│   │   ├── index.ts          # Main server file
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   └── tools/            # External tool integrations
│   └── package.json
└── frontend/         # Next.js frontend
    ├── app/          # Next.js app directory
    ├── components/   # UI components (Shadcn)
    └── package.json
```

## Setup

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file:

```bash
cp .env.example .env
```

4. Add your API keys to `.env`:

```
PORT=3001
OPENAI_API_KEY=your_openai_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here  # Optional, for better search results (uses DuckDuckGo if not set)
```

5. Run the development server:

```bash
npm run dev
```

The backend will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## API Endpoint

### POST /chat

**Request:**

```json
{
  "query": "Explain the state of AI in 2025?"
}
```

**Response:** Server-Sent Events (SSE) stream with JSON objects:

```json
{"type":"reasoning","content":"Thinking about relevant factors..."}
{"type":"tool_call","tool":"web_search","input":"AI 2025","output":"<search results>"}
{"type":"response","content":"In 2025, AI continues to..."}
```

## How It Works

1. **Query Analysis**: The system analyzes the query to determine if web search is needed
2. **Tool Decision**: If current information is required, it triggers a web search
3. **Context Integration**: Search results are integrated into the LLM context
4. **Streaming Response**: The final answer is streamed back in real-time

## Tech Stack

### Backend

- Express.js
- TypeScript
- OpenAI API
- Tavily API (for web search)

### Frontend

- Next.js 14
- React
- TypeScript
- Tailwind CSS
- Shadcn UI components

## Notes

- The web search tool uses Tavily API if available, with a fallback to DuckDuckGo
- For production use, need to implement proper error handling and rate limiting
- The streaming implementation uses Server-Sent Events (SSE)
