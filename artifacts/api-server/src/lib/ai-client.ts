import { openai } from "@workspace/integrations-openai-ai-server";

export { openai };
export const AI_MODEL = "gpt-4o-mini";

export function sseHeaders(res: import("express").Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();
}

export function sendSSE(res: import("express").Response, data: unknown): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function endSSE(res: import("express").Response): void {
  res.write("data: [DONE]\n\n");
  res.end();
}
