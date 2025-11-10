# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- OpenAI API key (required)
- Tavily API key (optional, but recommended for better search results)

## Setup Steps

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```bash
PORT=3001
OPENAI_API_KEY=sk-your-key-here
TAVILY_API_KEY=tvly-your-key-here  # Optional
```

Start the backend:

```bash
npm run dev
```

The backend will run on `http://localhost:3001`

### 2. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`

### 3. Test the Application

1. Open `http://localhost:3000` in your browser
2. Try asking: "Explain the state of AI in 2025?"
3. Watch the agentic flow:
   - Reasoning messages (yellow)
   - Tool calls (purple) - web search if needed
   - Final response (green)

## API Keys

### OpenAI API Key

- Get your key from: https://platform.openai.com/api-keys
- Required for LLM functionality

### Tavily API Key (Optional)

- Get your key from: https://tavily.com/
- Provides better search results
- If not provided, the system will use a basic fallback

## Troubleshooting

- **Backend not starting**: Check that PORT 3001 is not in use
- **Frontend can't connect**: Ensure backend is running on port 3001
- **API errors**: Verify your OpenAI API key is correct and has credits
- **Search not working**: If Tavily key is missing, search will use fallback (may be limited)
