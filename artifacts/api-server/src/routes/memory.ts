import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, memoryEntriesTable } from "@workspace/db";
import {
  ListMemoryEntriesResponse,
  UpdateMemoryEntryParams,
  UpdateMemoryEntryBody,
  UpdateMemoryEntryResponse,
  DeleteMemoryEntryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/memory", async (_req, res): Promise<void> => {
  const entries = await db
    .select()
    .from(memoryEntriesTable)
    .orderBy(memoryEntriesTable.createdAt);

  res.json(ListMemoryEntriesResponse.parse(entries));
});

router.patch("/memory/:id", async (req, res): Promise<void> => {
  const params = UpdateMemoryEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateMemoryEntryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [entry] = await db
    .update(memoryEntriesTable)
    .set(body.data)
    .where(eq(memoryEntriesTable.id, params.data.id))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Memory entry not found" });
    return;
  }

  res.json(UpdateMemoryEntryResponse.parse(entry));
});

router.delete("/memory/:id", async (req, res): Promise<void> => {
  const params = DeleteMemoryEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .delete(memoryEntriesTable)
    .where(eq(memoryEntriesTable.id, params.data.id))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Memory entry not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
