import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, pluginsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/plugins", async (_req, res): Promise<void> => {
  const rows = await db.select().from(pluginsTable).orderBy(desc(pluginsTable.updatedAt));
  res.json(rows);
});

router.post("/plugins", async (req, res): Promise<void> => {
  const { name, description, version = "1.0.0", installCommand = "", components = [] } = req.body ?? {};
  if (!name?.trim() || !description?.trim()) {
    res.status(400).json({ error: "name and description are required" });
    return;
  }
  const [row] = await db
    .insert(pluginsTable)
    .values({ name: name.trim(), description: description.trim(), version, installCommand, components })
    .returning();
  res.status(201).json(row);
});

router.get("/plugins/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(pluginsTable).where(eq(pluginsTable.id, id));
  if (!row) { res.status(404).json({ error: "Plugin not found" }); return; }
  res.json(row);
});

router.patch("/plugins/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, description, version, installCommand, components } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (version !== undefined) updates.version = version;
  if (installCommand !== undefined) updates.installCommand = installCommand;
  if (components !== undefined) updates.components = components;
  const [row] = await db.update(pluginsTable).set(updates).where(eq(pluginsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Plugin not found" }); return; }
  res.json(row);
});

router.delete("/plugins/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.delete(pluginsTable).where(eq(pluginsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Plugin not found" }); return; }
  res.sendStatus(204);
});

export default router;
