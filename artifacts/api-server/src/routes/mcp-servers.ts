import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, mcpServersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/mcp-servers", async (_req, res): Promise<void> => {
  const rows = await db.select().from(mcpServersTable).orderBy(desc(mcpServersTable.updatedAt));
  res.json(rows);
});

router.post("/mcp-servers", async (req, res): Promise<void> => {
  const { name, serverType = "stdio", endpoint = "", capabilities = "", status = "configured", notes = "" } = req.body ?? {};
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [row] = await db
    .insert(mcpServersTable)
    .values({ name: name.trim(), serverType, endpoint, capabilities, status, notes })
    .returning();
  res.status(201).json(row);
});

router.get("/mcp-servers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.select().from(mcpServersTable).where(eq(mcpServersTable.id, id));
  if (!row) { res.status(404).json({ error: "MCP Server not found" }); return; }
  res.json(row);
});

router.patch("/mcp-servers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, serverType, endpoint, capabilities, status, notes } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (serverType !== undefined) updates.serverType = serverType;
  if (endpoint !== undefined) updates.endpoint = endpoint;
  if (capabilities !== undefined) updates.capabilities = capabilities;
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  const [row] = await db.update(mcpServersTable).set(updates).where(eq(mcpServersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "MCP Server not found" }); return; }
  res.json(row);
});

router.delete("/mcp-servers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.delete(mcpServersTable).where(eq(mcpServersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "MCP Server not found" }); return; }
  res.sendStatus(204);
});

export default router;
