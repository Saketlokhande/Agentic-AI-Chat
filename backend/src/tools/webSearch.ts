import axios from "axios";

export interface WebSearchResult {
  results: string;
  service: string; // 'Tavily', 'DuckDuckGo', etc.
}

export async function webSearch(query: string): Promise<WebSearchResult> {
  // Try Tavily API first if available
  if (process.env.TAVILY_API_KEY) {
    try {
      const response = await axios.post(
        "https://api.tavily.com/search",
        {
          api_key: process.env.TAVILY_API_KEY,
          query,
          search_depth: "basic",
          max_results: 5,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const results = response.data.results || [];
      const formattedResults = results
        .map((result: any, index: number) => {
          return `[${index + 1}] ${result.title}\n${result.content}\nSource: ${
            result.url
          }`;
        })
        .join("\n\n");
      return {
        results: formattedResults,
        service: "Tavily",
      };
    } catch (error) {
      console.error("Tavily API error:", error);
      // Fall through to alternative
    }
  }

  // Fallback: Use DuckDuckGo HTML scraping (simple alternative)
  // For production, you'd want a proper search API
  try {
    const response = await axios.get("https://html.duckduckgo.com/html/", {
      params: { q: query },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    // Simple extraction - in production, use a proper HTML parser
    const html = response.data;
    const results: string[] = [];

    // Extract basic information (this is a simplified version)
    // For a real implementation, you'd parse the HTML properly
    const titleMatches =
      html.match(/<a[^>]*class="result__a"[^>]*>([^<]+)<\/a>/g) || [];
    const snippetMatches =
      html.match(/<a[^>]*class="result__snippet"[^>]*>([^<]+)<\/a>/g) || [];

    for (let i = 0; i < Math.min(3, titleMatches.length); i++) {
      const title = titleMatches[i]?.replace(/<[^>]*>/g, "").trim() || "";
      const snippet = snippetMatches[i]?.replace(/<[^>]*>/g, "").trim() || "";
      if (title) {
        results.push(
          `[${i + 1}] ${title}\n${snippet || "No description available"}`
        );
      }
    }

    if (results.length > 0) {
      return {
        results: results.join("\n\n"),
        service: "DuckDuckGo",
      };
    }
  } catch (error) {
    console.error("DuckDuckGo fallback error:", error);
  }

  // Final fallback: return a message indicating search was attempted
  return {
    results: `Web search was performed for: "${query}". However, search results could not be retrieved. The response will be based on general knowledge.`,
    service: "None",
  };
}
