import OpenAI from "openai";
import { webSearch } from "../tools/webSearch";

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not set. Please set it in your .env file."
    );
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Get the model to use - defaults to gpt-4.1-mini
function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

interface StreamChunk {
  type: "reasoning" | "tool_call" | "response";
  content?: string;
  tool?: string;
  service?: string; // The actual service name (Tavily, DuckDuckGo, etc.)
  input?: string;
  output?: string;
}

type StreamCallback = (chunk: StreamChunk) => void;

// Define the web_search tool for OpenAI function calling
const tools = [
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description:
        "Search the web for current, real-time information. Use this tool when you need up-to-date information, recent events, current statistics, or any data that may have changed recently. This uses Tavily API (if configured) or DuckDuckGo as fallback.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The search query to find relevant information on the web",
          },
        },
        required: ["query"],
      },
    },
  },
];

export async function agenticChat(
  query: string,
  onChunk: StreamCallback
): Promise<void> {
  const openai = getOpenAIClient();
  const model = getModel();

  // Initial reasoning
  onChunk({
    type: "reasoning",
    content: `Analyzing query: "${query}". The AI will decide if tools are needed...`,
  });

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a helpful assistant with access to web search tools. When you need current, real-time, or up-to-date information, use the web_search tool. Otherwise, answer directly using your knowledge.",
    },
    {
      role: "user",
      content: query,
    },
  ];

  let maxIterations = 5; // Prevent infinite loops
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    // Call OpenAI with function calling enabled
    const stream = await openai.chat.completions.create({
      model: model,
      messages: messages,
      tools: tools,
      tool_choice: "auto", // Let the model decide when to use tools
      stream: true,
    });

    let assistantMessage = "";
    let toolCalls: Array<{
      id: string;
      name: string;
      arguments: string;
    }> = [];

    // Process the stream
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      // Handle content (reasoning/response)
      if (delta?.content) {
        assistantMessage += delta.content;
        // Stream reasoning as we go
        if (iteration === 1 && assistantMessage.length < 200) {
          onChunk({
            type: "reasoning",
            content: assistantMessage,
          });
        }
      }

      // Handle tool calls
      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          const index = toolCall.index;
          if (!toolCalls[index]) {
            toolCalls[index] = {
              id: toolCall.id || "",
              name: toolCall.function?.name || "",
              arguments: toolCall.function?.arguments || "",
            };
          } else {
            toolCalls[index].arguments += toolCall.function?.arguments || "";
          }
        }
      }
    }

    // If we have tool calls, execute them
    if (toolCalls.length > 0) {
      // Add assistant message with tool calls to conversation
      messages.push({
        role: "assistant",
        content: assistantMessage || null,
        tool_calls: toolCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: {
            name: tc.name,
            arguments: tc.arguments,
          },
        })),
      });

      // Execute each tool call
      for (const toolCall of toolCalls) {
        const toolName = toolCall.name;
        let toolArguments: { query?: string } = {};

        try {
          toolArguments = JSON.parse(toolCall.arguments);
        } catch (e) {
          console.error("Error parsing tool arguments:", e);
        }

        // Determine input display value
        const inputValue = toolArguments.query || JSON.stringify(toolArguments);

        // Emit tool call start
        onChunk({
          type: "tool_call",
          tool: toolName,
          service: "Executing...",
          input: inputValue,
          output: "Executing...",
        });

        // Execute the tool and get result with service name
        let toolResult = "";
        let serviceName = "";

        if (toolName === "web_search") {
          const searchQuery = toolArguments.query || query;
          const result = await webSearch(searchQuery);
          toolResult = result.results;
          serviceName = result.service; // 'Tavily', 'DuckDuckGo', or 'None'
        } else {
          toolResult = `Unknown tool: ${toolName}`;
          serviceName = "Unknown";
        }

        // Emit tool call result with service name
        onChunk({
          type: "tool_call",
          tool: toolName,
          service: serviceName,
          input: inputValue,
          output: toolResult,
        });

        // Add tool result to conversation
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }

      // Continue the loop to get the final response after tool execution
      continue;
    }

    // No tool calls - we have the final response
    if (assistantMessage) {
      // Stream the response as we received it from OpenAI
      let fullResponse = "";
      const words = assistantMessage.split(" ");
      for (let i = 0; i < words.length; i++) {
        fullResponse += (i > 0 ? " " : "") + words[i];
        onChunk({
          type: "response",
          content: fullResponse,
        });
        // Small delay for better streaming effect (only if message is short)
        if (assistantMessage.length < 500) {
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      }
    }

    break; // Exit the loop
  }
}
