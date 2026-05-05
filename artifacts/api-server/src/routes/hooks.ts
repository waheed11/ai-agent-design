import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, hooksTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/hooks", async (_req, res): Promise<void> => {
  const rows = await db.select().from(hooksTable).orderBy(desc(hooksTable.updatedAt));
  res.json(rows);
});

router.post("/hooks", async (req, res): Promise<void> => {
  const { name, eventType, matcherPattern = "*", command, description = "", enabled = true } = req.body ?? {};
  if (!name?.trim() || !eventType?.trim() || !command?.trim()) {
    res.status(400).json({ error: "name, eventType, and command are required" });
    return;
  }
  const [row] = await db
    .insert(hooksTable)
    .values({ name: name.trim(), eventType, matcherPattern, command: command.trim(), description, enabled })
    .returning();
  res.status(201).json(row);
});

router.get("/hooks/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(hooksTable).where(eq(hooksTable.id, id));
  if (!row) { res.status(404).json({ error: "Hook not found" }); return; }
  res.json(row);
});

router.patch("/hooks/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, eventType, matcherPattern, command, description, enabled } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (eventType !== undefined) updates.eventType = eventType;
  if (matcherPattern !== undefined) updates.matcherPattern = matcherPattern;
  if (command !== undefined) updates.command = command;
  if (description !== undefined) updates.description = description;
  if (enabled !== undefined) updates.enabled = enabled;
  const [row] = await db.update(hooksTable).set(updates).where(eq(hooksTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Hook not found" }); return; }
  res.json(row);
});

router.delete("/hooks/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.delete(hooksTable).where(eq(hooksTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Hook not found" }); return; }
  res.sendStatus(204);
});

export default router;
