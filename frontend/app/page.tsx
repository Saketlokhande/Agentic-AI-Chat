"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2 } from "lucide-react";

interface StreamChunk {
  type: "reasoning" | "tool_call" | "response" | "error";
  content?: string;
  tool?: string;
  service?: string; // The actual service name (Tavily, DuckDuckGo, etc.)
  input?: string;
  output?: string;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<
    Array<{
      type: string;
      content?: string;
      tool?: string;
      service?: string;
      input?: string;
      output?: string;
    }>
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userQuery = query;
    setQuery("");
    setIsLoading(true);
    setMessages([{ type: "user", content: userQuery }]);

    try {
      // const response = await fetch("http://localhost:3001/chat", {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: userQuery }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) {
        throw new Error("No reader available");
      }

      let currentResponse = "";
      let currentReasoning = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              continue;
            }

            try {
              const chunk: StreamChunk = JSON.parse(data);

              if (chunk.type === "reasoning") {
                currentReasoning = chunk.content || "";
                setMessages((prev) => {
                  const filtered = prev.filter((m) => m.type !== "reasoning");
                  return [
                    ...filtered,
                    { type: "reasoning", content: currentReasoning },
                  ];
                });
              } else if (chunk.type === "tool_call") {
                // Update or create tool_call message
                setMessages((prev) => {
                  // Check if a tool_call with the same tool name exists
                  const existingIndex = prev.findIndex(
                    (m) =>
                      m.type === "tool_call" &&
                      chunk.tool &&
                      m.tool === chunk.tool
                  );

                  if (existingIndex !== -1 && chunk.tool) {
                    // Update existing tool_call message - always use new values if provided
                    const updated = [...prev];
                    updated[existingIndex] = {
                      ...updated[existingIndex],
                      tool: chunk.tool,
                      service:
                        chunk.service !== undefined
                          ? chunk.service
                          : updated[existingIndex].service,
                      input:
                        chunk.input !== undefined
                          ? chunk.input
                          : updated[existingIndex].input,
                      output:
                        chunk.output !== undefined
                          ? chunk.output
                          : updated[existingIndex].output,
                    };
                    return updated;
                  } else if (chunk.tool) {
                    // Create new tool_call message
                    return [
                      ...prev,
                      {
                        type: "tool_call",
                        tool: chunk.tool,
                        service: chunk.service,
                        input: chunk.input,
                        output: chunk.output,
                      },
                    ];
                  }
                  return prev;
                });
              } else if (chunk.type === "response") {
                currentResponse = chunk.content || "";
                setMessages((prev) => {
                  const filtered = prev.filter((m) => m.type !== "response");
                  return [
                    ...filtered,
                    { type: "response", content: currentResponse },
                  ];
                });
              } else if (chunk.type === "error") {
                setMessages((prev) => [
                  ...prev,
                  {
                    type: "error",
                    content: chunk.content || "An error occurred",
                  },
                ]);
              }
            } catch (e) {
              console.error("Error parsing chunk:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          content:
            "Failed to connect to the API. Make sure the backend server is running.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div
        className={`container mx-auto px-4 max-w-4xl ${
          messages.length > 0 ? "pt-8 pb-8" : "py-8"
        }`}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh] transition-all duration-500 ease-in-out">
            <div className="text-center mb-8 w-full max-w-2xl transition-all duration-500 ease-in-out">
              <h1 className="text-5xl font-bold mb-3 transition-all duration-500 ease-in-out">
                <span className="text-gray-900 dark:text-white">
                  AI Assistant with{" "}
                </span>
                <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  Superpowers
                </span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-relaxed transition-all duration-500 ease-in-out">
                Interactive demonstration of agentic reasoning with tool
                calling. Experience AI-powered responses with real-time web
                search capabilities.
              </p>
            </div>

            <Card className="w-full max-w-2xl shadow-sm border-gray-200/30 dark:border-gray-800/30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm transition-all duration-500 ease-in-out">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="What's on your mind? Ask me anything... 🚀"
                    disabled={isLoading}
                    className="flex-1 bg-white dark:bg-slate-800/50 border-gray-300/50 dark:border-gray-700/30 shadow-sm focus:bg-white dark:focus:bg-slate-800/70 focus:border-gray-300/50 dark:focus:border-gray-700/30 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none transition-[background-color,color] duration-150"
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !query.trim()}
                    className="bg-black hover:bg-gray-900 text-white shadow-lg transition-colors rounded-md"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <div className="text-center mb-6 mt-8 transition-all duration-500 ease-in-out animate-in slide-in-from-top-4">
              <h1 className="text-5xl font-bold mb-3 transition-all duration-500 ease-in-out">
                <span className="text-gray-900 dark:text-white">
                  AI Assistant with{" "}
                </span>
                <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  Superpowers
                </span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-base font-normal max-w-2xl mx-auto leading-relaxed transition-all duration-500 ease-in-out">
                Interactive demonstration of agentic reasoning with tool
                calling. Experience AI-powered responses with real-time web
                search capabilities.
              </p>
            </div>

            <div className="mb-6 transition-all duration-500 ease-in-out animate-in slide-in-from-top-4">
              <Card className="w-full shadow-sm border-gray-200/50 dark:border-gray-700/50 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md transition-all duration-500 ease-in-out">
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="What's on your mind? Ask me anything... 🚀"
                      disabled={isLoading}
                      className="flex-1 bg-white dark:bg-slate-800/50 border-gray-300/50 dark:border-gray-700/30 shadow-sm focus:bg-white dark:focus:bg-slate-800/70 focus:border-gray-300/50 dark:focus:border-gray-700/30 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none transition-[background-color,color] duration-150"
                    />
                    <Button
                      type="submit"
                      disabled={isLoading || !query.trim()}
                      className="bg-black hover:bg-gray-900 text-white shadow-lg transition-colors rounded-md"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {messages.length > 0 && (
          <Card className="shadow-lg border-gray-200/30 dark:border-gray-800/30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm transition-all duration-500 ease-in-out animate-in slide-in-from-bottom-4 fade-in mb-8">
            <CardHeader>
              <CardTitle className="text-gray-800 dark:text-gray-200">
                Conversation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                {messages.map((message, index) => {
                  if (message.type === "user") {
                    return (
                      <div key={index} className="flex justify-end">
                        <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-lg px-4 py-2 max-w-[80%] shadow-sm border border-gray-700/30">
                          <p className="font-semibold mb-1">You</p>
                          <p>{message.content}</p>
                        </div>
                      </div>
                    );
                  }

                  if (message.type === "reasoning") {
                    return (
                      <div key={index} className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800/50 border border-gray-200/50 dark:border-gray-700/30 rounded-lg px-4 py-2 max-w-[80%] shadow-sm">
                          <p className="font-semibold mb-1 text-gray-900 dark:text-gray-100">
                            Reasoning
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  if (message.type === "tool_call") {
                    const toolName = message.tool || "Unknown Tool";
                    const serviceName = message.service;
                    const isExecuting = message.output === "Executing...";

                    return (
                      <div key={index} className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800/50 border border-gray-200/50 dark:border-gray-700/30 rounded-lg px-4 py-3 max-w-[80%] shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                            {/* <span className="text-2xl">🔧</span> */}
                            <div className="flex-1">
                              <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                                {toolName.charAt(0).toUpperCase() +
                                  toolName.slice(1).replace(/_/g, " ")}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                                  Tool: {toolName}
                                </p>
                                {serviceName &&
                                  serviceName !== "Executing..." &&
                                  serviceName !== "Unknown Service" && (
                                    <>
                                      <span className="text-gray-400 dark:text-gray-500">
                                        •
                                      </span>
                                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded">
                                        Service: {serviceName}
                                      </p>
                                    </>
                                  )}
                                {serviceName === "Executing..." && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                                    (Executing...)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {message.input && (
                            <div className="mb-3">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                📥 Input:
                              </p>
                              <p className="text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded text-sm border border-gray-200/50 dark:border-gray-700/30">
                                {message.input}
                              </p>
                            </div>
                          )}
                          {message.output && (
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                {isExecuting ? "⏳ Status:" : "📤 Output:"}
                              </p>
                              {isExecuting ? (
                                <p className="text-gray-700 dark:text-gray-300 italic">
                                  {message.output}
                                </p>
                              ) : (
                                <pre className="text-xs bg-gray-50 dark:bg-gray-800/50 p-3 rounded overflow-x-auto overflow-y-auto max-h-[400px] custom-scrollbar text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-700/30 whitespace-pre-wrap break-words">
                                  {message.output}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (message.type === "response") {
                    return (
                      <div key={index} className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800/50 border border-gray-200/50 dark:border-gray-700/30 rounded-lg px-4 py-2 max-w-[80%] shadow-sm">
                          <p className="font-semibold mb-1 text-gray-900 dark:text-gray-100">
                            Response
                          </p>
                          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  if (message.type === "error") {
                    return (
                      <div key={index} className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800/50 border border-red-200/50 dark:border-red-800/30 rounded-lg px-4 py-2 max-w-[80%] shadow-sm">
                          <p className="font-semibold mb-1 text-red-700 dark:text-red-400">
                            ❌ Error
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}

                {isLoading && messages.length > 0 && (
                  <div className="flex justify-start items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                    <span className="text-gray-600 dark:text-gray-400 text-sm">
                      thinking...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
