import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, subagentsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/subagents", async (_req, res): Promise<void> => {
  const rows = await db.select().from(subagentsTable).orderBy(desc(subagentsTable.updatedAt));
  res.json(rows);
});

router.post("/subagents", async (req, res): Promise<void> => {
  const { name, role, modelPreference = "gpt-4o-mini", tools = [], permissions = "", notes = "" } = req.body ?? {};
  if (!name?.trim() || !role?.trim()) {
    res.status(400).json({ error: "name and role are required" });
    return;
  }
  const [row] = await db
    .insert(subagentsTable)
    .values({ name: name.trim(), role: role.trim(), modelPreference, tools, permissions, notes })
    .returning();
  res.status(201).json(row);
});

router.get("/subagents/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(subagentsTable).where(eq(subagentsTable.id, id));
  if (!row) { res.status(404).json({ error: "Subagent not found" }); return; }
  res.json(row);
});

router.patch("/subagents/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, role, modelPreference, tools, permissions, notes } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (role !== undefined) updates.role = role;
  if (modelPreference !== undefined) updates.modelPreference = modelPreference;
  if (tools !== undefined) updates.tools = tools;
  if (permissions !== undefined) updates.permissions = permissions;
  if (notes !== undefined) updates.notes = notes;
  const [row] = await db.update(subagentsTable).set(updates).where(eq(subagentsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Subagent not found" }); return; }
  res.json(row);
});

router.delete("/subagents/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.delete(subagentsTable).where(eq(subagentsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Subagent not found" }); return; }
  res.sendStatus(204);
});

export default router;
