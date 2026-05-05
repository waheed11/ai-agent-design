import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, chatSessionsTable, chatMessagesTable, systemInstructionsTable, plansTable, planMessagesTable } from "@workspace/db";
import {
  ListChatSessionsResponse,
  CreateChatSessionBody,
  GetChatSessionParams,
  GetChatSessionResponse,
  DeleteChatSessionParams,
  SendChatMessageParams,
  SendChatMessageBody,
  EndChatSessionParams,
  EndChatSessionResponse,
} from "@workspace/api-zod";
import { openai, AI_MODEL, sseHeaders, sendSSE, endSSE } from "../lib/ai-client";

import { webSearch, needsWebSearch, formatSearchResults } from "../lib/search";
import { buildMemoryContext, extractAndSaveMemories } from "../lib/memory-helper";
import { retrieveKBContext } from "../lib/kb-retrieval";
import { HONESTY_BLOCK } from "../lib/honesty-block";

const router: IRouter = Router();

router.get("/chat/sessions", async (_req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(chatSessionsTable)
    .orderBy(desc(chatSessionsTable.updatedAt));
  res.json(ListChatSessionsResponse.parse(sessions));
});

router.post("/chat/sessions", async (req, res): Promise<void> => {
  const body = CreateChatSessionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [session] = await db
    .insert(chatSessionsTable)
    .values({ title: body.data.title, language: body.data.language ?? "ar" })
    .returning();
  res.status(201).json(session);
});

router.get("/chat/sessions/:id", async (req, res): Promise<void> => {
  const params = GetChatSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [session] = await db
    .select()
    .from(chatSessionsTable)
    .where(eq(chatSessionsTable.id, params.data.id));
  if (!session) {
    res.status(404).json({ error: "Chat session not found" });
    return;
  }
  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.sessionId, params.data.id))
    .orderBy(chatMessagesTable.createdAt);
  res.json(GetChatSessionResponse.parse({ ...session, messages }));
});

router.delete("/chat/sessions/:id", async (req, res): Promise<void> => {
  const params = DeleteChatSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [session] = await db
    .delete(chatSessionsTable)
    .where(eq(chatSessionsTable.id, params.data.id))
    .returning();
  if (!session) {
    res.status(404).json({ error: "Chat session not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/chat/sessions/:id/messages", async (req, res): Promise<void> => {
  const params = SendChatMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = SendChatMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(chatSessionsTable)
    .where(eq(chatSessionsTable.id, params.data.id));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await db.insert(chatMessagesTable).values({
    sessionId: params.data.id,
    role: "user",
    content: body.data.content,
    searchUsed: false,
    sources: [],
  });

  const history = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.sessionId, params.data.id))
    .orderBy(chatMessagesTable.createdAt);

  const [sysInstRow] = await db
    .select()
    .from(systemInstructionsTable)
    .where(eq(systemInstructionsTable.mode, "chat"));

  const baseSysPrompt = sysInstRow?.content ?? "You are an expert AI agent development assistant.";

  // Decide whether to search: automatic heuristic OR explicit forceSearch from client
  const doSearch = (body.data.forceSearch === true) || needsWebSearch(body.data.content);

  // Run enrichments in parallel: memory context, KB retrieval, and optional web search
  const [memoryContext, kbContext, searchResults] = await Promise.all([
    buildMemoryContext(),
    retrieveKBContext(body.data.content, 3),
    doSearch ? webSearch(body.data.content, 5) : Promise.resolve([]),
  ]);

  const searchContext = formatSearchResults(searchResults);
  const sources = searchResults.map((r) => r.url);

  const fullSysPrompt = baseSysPrompt + HONESTY_BLOCK + memoryContext + kbContext + searchContext;

  sseHeaders(res);

  if (doSearch && searchResults.length > 0) {
    sendSSE(res, { type: "search", sources });
  }

  try {
    const stream = await openai.chat.completions.create({
      model: AI_MODEL,
      stream: true,
      messages: [
        { role: "system", content: fullSysPrompt },
        ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
    });

    let fullContent = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        fullContent += delta;
        sendSSE(res, { type: "delta", content: delta });
      }
    }

    const [saved] = await db
      .insert(chatMessagesTable)
      .values({
        sessionId: params.data.id,
        role: "assistant",
        content: fullContent,
        searchUsed: doSearch && searchResults.length > 0,
        sources,
      })
      .returning();

    await db
      .update(chatSessionsTable)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessionsTable.id, params.data.id));

    sendSSE(res, { type: "done", message: saved });
    endSSE(res);
  } catch (err) {
    sendSSE(res, { type: "error", error: String(err) });
    endSSE(res);
  }
});

router.post("/chat/sessions/:id/end", async (req, res): Promise<void> => {
  const params = EndChatSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.sessionId, params.data.id))
    .orderBy(chatMessagesTable.createdAt);

  if (messages.length < 2) {
    res.json(EndChatSessionResponse.parse({ memoriesExtracted: 0 }));
    return;
  }

  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const count = await extractAndSaveMemories(transcript, `chat:${params.data.id}`);
  res.json(EndChatSessionResponse.parse({ memoriesExtracted: count }));
});

/**
 * POST /api/chat/sessions/:id/create-plan
 * Creates a new project plan pre-loaded with this chat's messages.
 * The first user message becomes the plan's initialPrompt.
 */
router.post("/chat/sessions/:id/create-plan", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid session ID" }); return; }

  const [session] = await db
    .select()
    .from(chatSessionsTable)
    .where(eq(chatSessionsTable.id, id));
  if (!session) { res.status(404).json({ error: "Chat session not found" }); return; }

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.sessionId, id))
    .orderBy(chatMessagesTable.createdAt);

  const firstUserMsg = messages.find((m) => m.role === "user");
  const initialPrompt = firstUserMsg?.content ?? session.title;

  const [plan] = await db
    .insert(plansTable)
    .values({
      title: session.title,
      initialPrompt,
      language: session.language as "ar" | "en",
      status: "draft",
    })
    .returning();

  if (messages.length > 0) {
    await db.insert(planMessagesTable).values(
      messages.map((m) => ({
        planId: plan.id,
        role: m.role,
        content: m.content,
      }))
    );
  }

  res.status(201).json({ planId: plan.id, title: plan.title });
});

export default router;
