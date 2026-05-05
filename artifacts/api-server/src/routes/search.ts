import { Router, type IRouter } from "express";
import { webSearch } from "../lib/search";

const router: IRouter = Router();

/**
 * GET /api/search?q=query
 * Proxied web search via DuckDuckGo Instant Answers (no API key needed).
 */
router.get("/search", async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    res.status(400).json({ error: "Missing query parameter `q`" });
    return;
  }

  const results = await webSearch(q, 6);
  res.json({ query: q, results, total: results.length });
});

export default router;
