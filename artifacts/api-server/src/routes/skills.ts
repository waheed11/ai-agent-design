import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, skillsTable } from "@workspace/db";
import { openai, AI_MODEL, sseHeaders, sendSSE } from "../lib/ai-client";
import { buildMemoryContext } from "../lib/memory-helper";

const router: IRouter = Router();

router.get("/skills", async (_req, res): Promise<void> => {
  const rows = await db.select().from(skillsTable).orderBy(desc(skillsTable.updatedAt));
  res.json(rows);
});

router.post("/skills", async (req, res): Promise<void> => {
  const { name, description, category = "general", triggerKeywords = [], content = "" } = req.body ?? {};
  if (!name?.trim() || !description?.trim()) {
    res.status(400).json({ error: "name and description are required" });
    return;
  }
  const [row] = await db
    .insert(skillsTable)
    .values({ name: name.trim(), description: description.trim(), category, triggerKeywords, content })
    .returning();
  res.status(201).json(row);
});

router.get("/skills/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(skillsTable).where(eq(skillsTable.id, id));
  if (!row) { res.status(404).json({ error: "Skill not found" }); return; }
  res.json(row);
});

router.patch("/skills/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, description, category, triggerKeywords, content } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (category !== undefined) updates.category = category;
  if (triggerKeywords !== undefined) updates.triggerKeywords = triggerKeywords;
  if (content !== undefined) updates.content = content;
  const [row] = await db.update(skillsTable).set(updates).where(eq(skillsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Skill not found" }); return; }
  res.json(row);
});

router.delete("/skills/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.delete(skillsTable).where(eq(skillsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Skill not found" }); return; }
  res.sendStatus(204);
});

/**
 * POST /api/skills/generate-content
 * Streams AI-generated skill content (SKILL.md style) from name/description.
 */
router.post("/skills/generate-content", async (req, res): Promise<void> => {
  const { name = "", description = "", category = "general", triggerKeywords = [], language = "ar" } = req.body ?? {};
  if (!name.trim() || !description.trim()) {
    res.status(400).json({ error: "name and description are required" });
    return;
  }

  const memoryContext = await buildMemoryContext();
  const isAr = language === "ar";

  const systemPrompt = `You are an expert at writing AI agent skill documentation in SKILL.md format.
Generate comprehensive, production-ready skill content for an AI agent skill.
${memoryContext}
Output language: ${isAr ? "Arabic" : "English"}
Structure the output with clear Markdown sections:
## ${isAr ? "الوصف" : "Description"}
## ${isAr ? "متى تُستخدم" : "When to Use"}
## ${isAr ? "الاستخدام" : "Usage"}
## ${isAr ? "مرجع سريع" : "Quick Reference"}
## ${isAr ? "أمثلة" : "Examples"}`;

  const userMsg = `Generate skill content for:
Name: ${name}
Description: ${description}
Category: ${category}
Trigger Keywords: ${Array.isArray(triggerKeywords) ? triggerKeywords.join(", ") : triggerKeywords}`;

  sseHeaders(res);
  try {
    const stream = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMsg }],
      stream: true,
      temperature: 0.7,
      max_tokens: 1500,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) sendSSE(res, { type: "delta", content: delta });
    }
    sendSSE(res, { type: "done" });
    res.end();
  } catch (err) {
    sendSSE(res, { type: "error", error: String(err) });
    res.end();
  }
});

export default router;
