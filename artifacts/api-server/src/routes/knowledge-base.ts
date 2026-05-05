import { Router, type IRouter } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, knowledgeBaseTable } from "@workspace/db";
import {
  ListKnowledgeBaseEntriesQueryParams,
  ListKnowledgeBaseEntriesResponse,
  ListKnowledgeBaseCategoriesResponse,
  GetKnowledgeBaseEntryParams,
  GetKnowledgeBaseEntryResponse,
  CreateKnowledgeBaseEntryBody,
  UpdateKnowledgeBaseEntryParams,
  UpdateKnowledgeBaseEntryBody,
  UpdateKnowledgeBaseEntryResponse,
  DeleteKnowledgeBaseEntryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/knowledge-base", async (req, res): Promise<void> => {
  const query = ListKnowledgeBaseEntriesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { category, status, search } = query.data;

  let dbQuery = db.select().from(knowledgeBaseTable).$dynamic();

  const conditions = [];
  if (category) conditions.push(eq(knowledgeBaseTable.category, category));
  if (status) conditions.push(eq(knowledgeBaseTable.status, status));
  if (search) {
    conditions.push(
      or(
        ilike(knowledgeBaseTable.title, `%${search}%`),
        ilike(knowledgeBaseTable.content, `%${search}%`),
        ilike(knowledgeBaseTable.summary, `%${search}%`)
      )!
    );
  }

  if (conditions.length > 0) {
    dbQuery = dbQuery.where(sql`${conditions.reduce((acc, c) => sql`${acc} AND ${c}`)}`);
  }

  const entries = await dbQuery.orderBy(knowledgeBaseTable.createdAt);
  res.json(ListKnowledgeBaseEntriesResponse.parse(entries));
});

router.get("/knowledge-base/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      category: knowledgeBaseTable.category,
      count: sql<number>`count(*)::int`,
    })
    .from(knowledgeBaseTable)
    .groupBy(knowledgeBaseTable.category)
    .orderBy(knowledgeBaseTable.category);

  res.json(ListKnowledgeBaseCategoriesResponse.parse(rows));
});

router.get("/knowledge-base/:id", async (req, res): Promise<void> => {
  const params = GetKnowledgeBaseEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .select()
    .from(knowledgeBaseTable)
    .where(eq(knowledgeBaseTable.id, params.data.id));

  if (!entry) {
    res.status(404).json({ error: "Knowledge base entry not found" });
    return;
  }

  res.json(GetKnowledgeBaseEntryResponse.parse(entry));
});

router.post("/knowledge-base", async (req, res): Promise<void> => {
  const body = CreateKnowledgeBaseEntryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [entry] = await db
    .insert(knowledgeBaseTable)
    .values({
      ...body.data,
      tags: body.data.tags ?? [],
      status: body.data.status ?? "active",
    })
    .returning();

  res.status(201).json(GetKnowledgeBaseEntryResponse.parse(entry));
});

router.patch("/knowledge-base/:id", async (req, res): Promise<void> => {
  const params = UpdateKnowledgeBaseEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateKnowledgeBaseEntryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [entry] = await db
    .update(knowledgeBaseTable)
    .set(body.data)
    .where(eq(knowledgeBaseTable.id, params.data.id))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Knowledge base entry not found" });
    return;
  }

  res.json(UpdateKnowledgeBaseEntryResponse.parse(entry));
});

router.delete("/knowledge-base/:id", async (req, res): Promise<void> => {
  const params = DeleteKnowledgeBaseEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .delete(knowledgeBaseTable)
    .where(eq(knowledgeBaseTable.id, params.data.id))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Knowledge base entry not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
