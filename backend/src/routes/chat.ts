import { Router, Request, Response } from "express";
import { agenticChat } from "../services/agenticChat";

export const chatRouter = Router();

chatRouter.post("/", async (req: Request, res: Response) => {
  const { query } = req.body;

  if (!query || typeof query !== "string") {
    return res
      .status(400)
      .json({ error: "Query is required and must be a string" });
  }

  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    await agenticChat(query, (chunk) => {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    });

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        content: "An error occurred processing your request",
      })}\n\n`
    );
    res.end();
  }
});
