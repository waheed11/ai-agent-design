import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db, plansTable, planMessagesTable, systemInstructionsTable,
  agentArchitecturesTable, skillsTable, hooksTable, subagentsTable, pluginsTable, mcpServersTable,
  knowledgeBaseTable,
} from "@workspace/db";
import type { ArchitectureLayers } from "@workspace/db";
import {
  ListPlansResponse,
  CreatePlanBody,
  GetPlanParams,
  GetPlanResponse,
  UpdatePlanParams,
  UpdatePlanBody,
  UpdatePlanResponse,
  DeletePlanParams,
  SendPlanMessageParams,
  SendPlanMessageBody,
  GenerateProfessionalPromptParams,
  GenerateProfessionalPromptResponse,
} from "@workspace/api-zod";
import { openai, AI_MODEL, sseHeaders, sendSSE, endSSE } from "../lib/ai-client";
import { buildMemoryContext, extractAndSaveMemories } from "../lib/memory-helper";
import { webSearch, needsWebSearch, formatSearchResults } from "../lib/search";
import { HONESTY_BLOCK } from "../lib/honesty-block";
import { retrieveKBContext } from "../lib/kb-retrieval";
import multer from "multer";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/plans", async (_req, res): Promise<void> => {
  const plans = await db
    .select()
    .from(plansTable)
    .orderBy(desc(plansTable.updatedAt));
  res.json(ListPlansResponse.parse(plans));
});

router.post("/plans", async (req, res): Promise<void> => {
  const body = CreatePlanBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [plan] = await db
    .insert(plansTable)
    .values({
      title: body.data.title,
      initialPrompt: body.data.initialPrompt,
      language: body.data.language ?? "ar",
      status: "draft",
    })
    .returning();

  res.status(201).json(plan);
});

router.get("/plans/:id", async (req, res): Promise<void> => {
  const params = GetPlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [plan] = await db
    .select()
    .from(plansTable)
    .where(eq(plansTable.id, params.data.id));

  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  const messages = await db
    .select()
    .from(planMessagesTable)
    .where(eq(planMessagesTable.planId, params.data.id))
    .orderBy(planMessagesTable.createdAt);

  res.json({ ...GetPlanResponse.parse({ ...plan, messages }), professionalPrompt: plan.professionalPrompt, executionPlan: plan.executionPlan, architectureId: plan.architectureId });
});

router.patch("/plans/:id", async (req, res): Promise<void> => {
  const params = UpdatePlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdatePlanBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [plan] = await db
    .update(plansTable)
    .set(body.data)
    .where(eq(plansTable.id, params.data.id))
    .returning();

  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  res.json(UpdatePlanResponse.parse(plan));
});

router.delete("/plans/:id", async (req, res): Promise<void> => {
  const params = DeletePlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [plan] = await db
    .delete(plansTable)
    .where(eq(plansTable.id, params.data.id))
    .returning();

  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  res.sendStatus(204);
});

/**
 * Upload a document (PDF, DOCX, TXT) or plain text, parse it, and store as plan's documentContext.
 */
router.post("/plans/:planId/upload-document", upload.single("file"), async (req, res): Promise<void> => {
  const planId = parseInt(`${req.params.planId}`, 10);
  if (isNaN(planId)) {
    res.status(400).json({ error: "Invalid plan ID" });
    return;
  }

  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, planId));
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  let parsedText = "";
  let filename = "document";

  if (req.file) {
    filename = req.file.originalname;
    const mime = req.file.mimetype;
    const buf = req.file.buffer;

    if (mime === "application/pdf" || filename.endsWith(".pdf")) {
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const data = await pdfParse(buf);
        parsedText = data.text;
      } catch {
        parsedText = buf.toString("utf8").replace(/[^\x20-\x7E\u0600-\u06FF\n\t]/g, " ");
      }
    } else if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      filename.endsWith(".docx")
    ) {
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer: buf });
        parsedText = result.value;
      } catch {
        parsedText = buf.toString("utf8");
      }
    } else {
      parsedText = buf.toString("utf8");
    }
  } else if (req.body?.content) {
    filename = req.body.filename ?? "document.txt";
    parsedText = req.body.content;
  } else {
    res.status(400).json({ error: "No file or content provided" });
    return;
  }

  parsedText = parsedText.trim().slice(0, 50_000);

  await db
    .update(plansTable)
    .set({ documentContext: parsedText, updatedAt: new Date() })
    .where(eq(plansTable.id, planId));

  const preview = parsedText.slice(0, 300) + (parsedText.length > 300 ? "..." : "");

  res.json({ planId, filename, characterCount: parsedText.length, preview });
});

router.post("/plans/:id/messages", async (req, res): Promise<void> => {
  const params = SendPlanMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SendPlanMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [plan] = await db
    .select()
    .from(plansTable)
    .where(eq(plansTable.id, params.data.id));

  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  await db.insert(planMessagesTable).values({
    planId: params.data.id,
    role: "user",
    content: body.data.content,
  });

  const history = await db
    .select()
    .from(planMessagesTable)
    .where(eq(planMessagesTable.planId, params.data.id))
    .orderBy(planMessagesTable.createdAt);

  const [sysInstRow] = await db
    .select()
    .from(systemInstructionsTable)
    .where(eq(systemInstructionsTable.mode, "plan"));

  const baseSysPrompt = sysInstRow?.content ?? "You are an expert AI project planner.";

  const shouldSearch = needsWebSearch(body.data.content);
  const [
    memoryContext,
    kbContext,
    searchResults,
    allSkills,
    allHooks,
    allSubagents,
    allPlugins,
    allMcpServers,
    allKbEntries,
  ] = await Promise.all([
    buildMemoryContext(),
    retrieveKBContext(body.data.content, 3),
    shouldSearch ? webSearch(body.data.content, 3) : Promise.resolve([]),
    db.select({ id: skillsTable.id, name: skillsTable.name, category: skillsTable.category }).from(skillsTable),
    db.select({ id: hooksTable.id, name: hooksTable.name, eventType: hooksTable.eventType }).from(hooksTable),
    db.select({ id: subagentsTable.id, name: subagentsTable.name, role: subagentsTable.role }).from(subagentsTable),
    db.select({ id: pluginsTable.id, name: pluginsTable.name }).from(pluginsTable),
    db.select({ id: mcpServersTable.id, name: mcpServersTable.name, serverType: mcpServersTable.serverType }).from(mcpServersTable),
    db.select({ title: knowledgeBaseTable.title, category: knowledgeBaseTable.category })
      .from(knowledgeBaseTable).where(eq(knowledgeBaseTable.status, "active")),
  ]);

  // ── Server-side registry check — runs BEFORE the AI call ──────────────────
  // Extract component names mentioned in the user's message using keyword patterns.
  // We check them against the live DB registry and inject results as hard facts
  // directly into the user message — the model cannot ignore content in the message itself.

  const allRegisteredNames = new Set([
    ...allSkills.map((s) => s.name.toLowerCase()),
    ...allHooks.map((h) => h.name.toLowerCase()),
    ...allSubagents.map((s) => s.name.toLowerCase()),
    ...allPlugins.map((p) => p.name.toLowerCase()),
    ...allMcpServers.map((m) => m.name.toLowerCase()),
  ]);

  // Match: "مهارة X" / "skill X" / "أداة X" / "hook X" / "plugin X" / "subagent X"
  // IMPORTANT: require the keyword to be preceded by a space/punctuation/start so
  // "المهارة" (with ال prefix) is NOT matched — only standalone "مهارة".
  const componentMentionRe =
    /(?:^|[\s،,؟?!.؛\n])(مهارة|أداة|إضافة|ملحق|هوك|وكيل فرعي|skill|hook|plugin|subagent)\s+([^\s،,؟?!.،؛\n]{2,}(?:\s+[^\s،,؟?!.،؛\n]{2,})?)/gi;

  // Common Arabic functional/descriptive words that are NEVER skill names
  const arabicFunctionWords = new Set([
    "موجودة", "موجود", "مفيدة", "مفيد", "مسجّلة", "مسجلة", "مسجّل", "مسجل",
    "معرفة", "معروفة", "معروف", "جيدة", "جيد", "مهمة", "مهم", "كبيرة", "كبير",
    "صغيرة", "صغير", "جديدة", "جديد", "قوية", "قوي", "متاحة", "متاح",
    "محددة", "محدد", "خاصة", "خاص", "عامة", "عام", "أساسية", "أساسي",
  ]);

  const mentionedNames: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = componentMentionRe.exec(body.data.content)) !== null) {
    const name = m[2].trim();
    // Skip common Arabic words that are clearly not skill names
    if (!arabicFunctionWords.has(name.toLowerCase())) {
      mentionedNames.push(name);
    }
  }

  // Deduplicate and check which are unregistered
  const unregistered = [...new Set(mentionedNames)].filter(
    (name) => !allRegisteredNames.has(name.toLowerCase()),
  );

  // Build a factual grounding prefix — injected at the top of the user's message
  // so it appears AS PART of the question the model must answer
  let groundingPrefix = "";
  if (unregistered.length > 0) {
    const registeredSkillNames = allSkills.map((s) => s.name).join(" · ") || "لا يوجد";
    const lines = unregistered.map(
      (name) => `❌ "${name}" — غير موجود في سجل النظام (Not in system registry)`,
    );
    groundingPrefix =
      `[نتيجة فحص قاعدة بيانات النظام — Database Registry Check Result]\n` +
      lines.join("\n") + "\n" +
      `المهارات المسجّلة فعلاً (Registered skills): ${registeredSkillNames}\n` +
      `[يجب أن تبدأ إجابتك بالإشارة إلى هذه النتيجة قبل أي شيء آخر]\n\n`;
  }

  const searchContext = formatSearchResults(searchResults);
  const documentSection = plan.documentContext
    ? `\n\n## وثيقة المشروع (Attached Document Context)\n${plan.documentContext.slice(0, 8000)}\n`
    : "";

  // When plan is in review phase, inject the generated professional prompt for discussion
  const reviewContext = plan.status === "prompt_generated" && plan.professionalPrompt
    ? `\n\n## المطالبة الاحترافية المولَّدة (Generated Professional Prompt — under review)\n${plan.professionalPrompt}\n\n## خطة التنفيذ (Execution Plan)\n${plan.executionPlan ?? ""}\n\nThe user is reviewing the above professional prompt and execution plan. Help them understand, refine, or validate it. Answer their questions and suggest improvements when requested.`
    : "";

  const fullSysPrompt =
    baseSysPrompt +
    HONESTY_BLOCK +
    memoryContext +
    kbContext +
    documentSection +
    searchContext +
    reviewContext +
    `\n\n## البروبت الأولي للمشروع (Initial Project Prompt)\n${plan.initialPrompt}`;

  sseHeaders(res);

  if (shouldSearch && searchResults.length > 0) {
    sendSSE(res, { type: "search", sources: searchResults.map((r) => r.url) });
  }

  try {
    const stream = await openai.chat.completions.create({
      model: AI_MODEL,
      stream: true,
      messages: [
        { role: "system", content: fullSysPrompt },
        ...history.slice(0, -1).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: groundingPrefix + body.data.content },
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
      .insert(planMessagesTable)
      .values({ planId: params.data.id, role: "assistant", content: fullContent })
      .returning();

    await db
      .update(plansTable)
      .set({ updatedAt: new Date() })
      .where(eq(plansTable.id, params.data.id));

    sendSSE(res, { type: "done", message: saved });
    endSSE(res);

    const allMessages = [...history, { role: "assistant", content: fullContent }];
    if (allMessages.length >= 4) {
      const transcript = allMessages
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n");
      extractAndSaveMemories(transcript, `plan:${params.data.id}`).catch(() => {});
    }
  } catch (err) {
    sendSSE(res, { type: "error", error: String(err) });
    endSSE(res);
  }
});

/**
 * POST /api/plans/:id/generate-prompt
 * Intelligence-aware prompt generation:
 *  1. Queries KB, Memory, Skills, Hooks, Subagents, Plugins, MCP Servers
 *  2. If relevant KB entries are sparse → web search + save results to KB
 *  3. Generates a professional prompt + execution plan that map directly
 *     to the 6-layer ADK architecture (skills, hooks, subagents, plugins,
 *     MCP servers, system instructions / AGENTS.md)
 */
router.post("/plans/:id/generate-prompt", async (req, res): Promise<void> => {
  const params = GenerateProfessionalPromptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, params.data.id));
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

  // ── 1. Load all platform knowledge in parallel ─────────────────────────────
  const [
    messages,
    allKbEntries,
    allSkills,
    allHooks,
    allSubagents,
    allPlugins,
    allMcpServers,
    memoryContext,
    sysInstRows,
  ] = await Promise.all([
    db.select().from(planMessagesTable)
      .where(eq(planMessagesTable.planId, params.data.id))
      .orderBy(planMessagesTable.createdAt),
    db.select().from(knowledgeBaseTable).where(eq(knowledgeBaseTable.status, "active")),
    db.select().from(skillsTable),
    db.select().from(hooksTable),
    db.select().from(subagentsTable),
    db.select().from(pluginsTable),
    db.select().from(mcpServersTable),
    buildMemoryContext(),
    db.select().from(systemInstructionsTable)
      .where(eq(systemInstructionsTable.mode, "prompt_generator")),
  ]);

  // ── 2. Score KB entries for relevance to this specific agent ───────────────
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const agentDescription = `${plan.initialPrompt} ${messages.map((m) => m.content).join(" ")}`;
  const queryWords = agentDescription
    .toLowerCase()
    .split(/[\s,،.؟?!،؛:«»"'()\[\]{}<>\/\\|@#$%^&*+=~`]/g)
    .filter((w) => w.length > 2 && /\p{L}/u.test(w));

  const scoredKb = allKbEntries
    .map((entry) => {
      const haystack = [entry.title, entry.summary ?? "", entry.content.slice(0, 600), entry.tags.join(" "), entry.category].join(" ").toLowerCase();
      let score = 0;
      for (const word of queryWords) {
        try { score += (haystack.match(new RegExp(escapeRe(word), "g")) ?? []).length; } catch { /* skip bad word */ }
      }
      return { entry, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => s.entry);

  // ── 3. Score existing components for relevance ─────────────────────────────
  const scoreComponents = <T extends { name: string }>(items: T[]): T[] =>
    items
      .map((item) => {
        const h = item.name.toLowerCase();
        const s = queryWords.reduce((acc, w) => acc + (h.includes(w) ? 1 : 0), 0);
        return { item, s };
      })
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5)
      .map((x) => x.item);

  const relevantSkills    = scoreComponents(allSkills);
  const relevantHooks     = scoreComponents(allHooks);
  const relevantSubagents = scoreComponents(allSubagents);
  const relevantPlugins   = scoreComponents(allPlugins);
  const relevantMcp       = scoreComponents(allMcpServers);

  // ── 4. If KB is sparse, search web + save results ─────────────────────────
  let webSection = "";
  if (scoredKb.length < 3) {
    const searchQuery = `${plan.initialPrompt.slice(0, 120)} AI agent framework tools best practices`;
    const webResults = await webSearch(searchQuery, 5);

    if (webResults.length > 0) {
      webSection = formatSearchResults(webResults);

      // Save new findings to KB (fire-and-forget — don't block the response)
      Promise.allSettled(
        webResults.map((r) =>
          db.insert(knowledgeBaseTable).values({
            title: r.title.slice(0, 200),
            category: "frameworks",
            subcategory: "web-search",
            content: `${r.snippet}\n\nSource: ${r.url}`,
            summary: r.snippet.slice(0, 300),
            tags: queryWords.slice(0, 6),
            status: "active",
            sourceUrl: r.url,
          })
        )
      ).catch(() => {});
    }
  }

  // ── 5. Build KB context section ────────────────────────────────────────────
  let kbSection = "";
  if (scoredKb.length > 0) {
    kbSection = `\n\n## المعرفة ذات الصلة من قاعدة المعرفة\n` +
      scoredKb.map((e) => `### ${e.title} (${e.category})\n${e.summary ?? e.content.slice(0, 500)}`).join("\n\n") + "\n";
  }

  // ── 6. Build existing-components catalog ───────────────────────────────────
  const componentsCatalog = `
## المكونات الموجودة في المنصة (Existing Platform Components)
Skills (${allSkills.length} total, ${relevantSkills.length} relevant): ${JSON.stringify(relevantSkills.map((s) => ({ id: s.id, name: s.name, category: s.category })))}
Hooks (${allHooks.length} total, ${relevantHooks.length} relevant): ${JSON.stringify(relevantHooks.map((h) => ({ id: h.id, name: h.name, eventType: h.eventType })))}
Subagents (${allSubagents.length} total, ${relevantSubagents.length} relevant): ${JSON.stringify(relevantSubagents.map((s) => ({ id: s.id, name: s.name, role: s.role })))}
Plugins (${allPlugins.length} total, ${relevantPlugins.length} relevant): ${JSON.stringify(relevantPlugins.map((p) => ({ id: p.id, name: p.name })))}
MCP Servers (${allMcpServers.length} total, ${relevantMcp.length} relevant): ${JSON.stringify(relevantMcp.map((m) => ({ id: m.id, name: m.name, serverType: m.serverType })))}
`;

  // ── 7. Compose system prompt ───────────────────────────────────────────────
  const baseSysPrompt = sysInstRows[0]?.content ??
    "You are an expert AI agent architect specializing in the ADK (Agent Development Kit) framework.";

  const sysPrompt = baseSysPrompt + memoryContext + kbSection + webSection;

  const planSummary = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  const docContext = plan.documentContext
    ? `\n\nDocument attached to the plan:\n${plan.documentContext.slice(0, 3000)}`
    : "";

  // ── 8. Generate architecture-aware prompt + execution plan ─────────────────
  const completion = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: "system", content: sysPrompt },
      {
        role: "user",
        content: `Based on the planning conversation and all platform knowledge below, generate TWO outputs:

## Initial Agent Prompt
${plan.initialPrompt}${docContext}

## Planning Conversation
${planSummary}

${componentsCatalog}

---

Generate the following in a single JSON object with EXACTLY these two string fields:

### 1. "professionalPrompt"
A complete, professional prompt ready for Cursor / Windsurf / Replit Agent.
It MUST include ALL of the following sections (use markdown headers inside the string):
- **Agent Identity & Role**: what this agent does, its name, and core purpose
- **ADK Layer 1 — System Instructions**: runtime behaviour, tone, constraints
- **ADK Layer 2 — AGENTS.md / Constitution**: agent values, rules, identity
- **ADK Layer 3 — Skills**: list each skill needed with its trigger keywords
- **ADK Layer 4 — Hooks**: event-driven automations (pre/post response, tool call, etc.)
- **ADK Layer 5 — Subagents**: specialized workers with their roles and model preferences
- **ADK Layer 6 — MCP Servers (Model Context Protocol)**: MCP is NOT a hosting server — it is a standardized connectivity protocol that lets the AI agent call external tools and access data sources (filesystems, databases, GitHub, web search, APIs) through a uniform interface. Each MCP server is a lightweight process (stdio/SSE/HTTP) that exposes a set of callable tools to the agent. List each MCP server needed, its transport type (stdio/sse/http), the command/endpoint to launch it, and the tools it provides.
- **Tech Stack**: languages, frameworks, databases, APIs
- **Reuse from Platform**: reference any existing component IDs from the catalog above

### 2. "executionPlan"
A phased execution plan that maps 1-to-1 with ADK layers.
Use this EXACT phase structure (markdown inside the string):
**Phase 1 — Agent Foundation**: core setup, model choice, system instructions, AGENTS.md
**Phase 2 — Knowledge & Skills**: define and implement each skill with trigger keywords
**Phase 3 — Event Hooks**: pre/post response automations, guardrails, logging hooks
**Phase 4 — Subagents**: spawn and configure each specialized subagent
**Phase 5 — Plugins & Integrations**: code-execution plugins, API wrappers
**Phase 6 — MCP Tool Connectors**: configure each MCP server (Model Context Protocol) as a tool-connectivity bridge — not a hosting server. Each MCP server runs as a local/remote process (stdio command or SSE endpoint) and exposes callable tools to the agent (e.g. GitHub MCP exposes read_file, list_issues; Filesystem MCP exposes read_file, write_file; Brave Search MCP exposes web_search). List the launch command, required env vars, and tools each MCP server provides.
**Phase 7 — Testing & Deployment**: unit tests per layer, integration tests, deployment

Respond ONLY with valid JSON. Both values MUST be plain strings (not nested objects):
{
  "professionalPrompt": "## Agent Identity...\\n...",
  "executionPlan": "**Phase 1...**\\n..."
}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(raw); } catch { parsed = { professionalPrompt: raw, executionPlan: "" }; }

  // Normalize: AI sometimes returns nested objects instead of plain strings
  const toStr = (v: unknown, fallback = ""): string => {
    if (typeof v === "string") return v;
    if (v == null) return fallback;
    if (typeof v === "object") {
      // Try to extract a string value from common wrapper shapes
      const obj = v as Record<string, unknown>;
      const inner = obj.content ?? obj.text ?? obj.value ?? obj.result;
      if (typeof inner === "string") return inner;
      return JSON.stringify(v, null, 2);
    }
    return String(v);
  };

  const professionalPrompt = toStr(parsed.professionalPrompt, raw);
  const executionPlan = toStr(parsed.executionPlan, "");

  await db
    .update(plansTable)
    .set({ status: "prompt_generated", professionalPrompt, executionPlan, updatedAt: new Date() })
    .where(eq(plansTable.id, params.data.id));

  res.json(GenerateProfessionalPromptResponse.parse({ prompt: professionalPrompt, planId: params.data.id, executionPlan }));
});

/**
 * POST /api/plans/:id/approve
 * Explicitly approves the plan after user reviews the professional prompt.
 */
router.post("/plans/:id/approve", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid plan ID" }); return; }

  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, id));
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  if (plan.status !== "prompt_generated") {
    res.status(400).json({ error: "Plan must be in prompt_generated status to approve." });
    return;
  }

  const [updated] = await db
    .update(plansTable)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(plansTable.id, id))
    .returning();

  res.json({ success: true, planId: id, status: updated.status });
});

/**
 * POST /api/plans/:id/generate-architecture
 * Auto-generates the full 6-layer architecture from the approved plan.
 * Creates the architecture record and links it to the plan.
 */
router.post("/plans/:id/generate-architecture", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid plan ID" }); return; }

  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, id));
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  if (!plan.professionalPrompt) {
    res.status(400).json({ error: "Plan must have a professional prompt before generating architecture. Run generate-prompt first." });
    return;
  }

  // Load existing components to potentially reuse
  const [allSkills, allHooks, allSubagents, allPlugins, allMcpServers] = await Promise.all([
    db.select().from(skillsTable),
    db.select().from(hooksTable),
    db.select().from(subagentsTable),
    db.select().from(pluginsTable),
    db.select().from(mcpServersTable),
  ]);

  const existingCatalog = {
    skills: allSkills.map((s) => ({ id: s.id, name: s.name, category: s.category })),
    hooks: allHooks.map((h) => ({ id: h.id, name: h.name, eventType: h.eventType })),
    subagents: allSubagents.map((s) => ({ id: s.id, name: s.name, role: s.role })),
    plugins: allPlugins.map((p) => ({ id: p.id, name: p.name })),
    mcpServers: allMcpServers.map((m) => ({ id: m.id, name: m.name, serverType: m.serverType })),
  };

  const aiPrompt = `You are an AI agent architecture designer. Based on the following approved project plan, generate a complete 6-layer ADK agent architecture.

## CRITICAL: Understand MCP (Model Context Protocol) correctly
MCP servers are NOT hosting servers. They are lightweight tool-connectivity processes that expose callable tools to the AI agent via a standardized protocol (stdio/SSE/HTTP).
- "serverType": "stdio" means the agent launches the MCP server as a child process via a shell command (e.g. "npx @modelcontextprotocol/server-github")
- "serverType": "sse" means the agent connects to a running HTTP+SSE endpoint
- "endpoint" is the launch command (for stdio) or the URL (for sse/http)
- "capabilities" lists the tools this MCP server exposes to the agent (e.g. "read_file, write_file, list_directory")
Each MCP server gives the agent a set of tools — like GitHub MCP gives git/PR/issue tools, Filesystem MCP gives file read/write tools, Brave Search MCP gives web search tools.

## Professional Prompt
${plan.professionalPrompt}

## Execution Plan
${plan.executionPlan ?? "(not provided)"}

## Existing Components in the System
Use these IDs where relevant, or propose new ones if needed.

Skills: ${JSON.stringify(existingCatalog.skills)}
Hooks: ${JSON.stringify(existingCatalog.hooks)}
Subagents: ${JSON.stringify(existingCatalog.subagents)}
Plugins: ${JSON.stringify(existingCatalog.plugins)}
MCP Tool Connectors: ${JSON.stringify(existingCatalog.mcpServers)}

Respond ONLY with valid JSON matching this exact structure:
{
  "architectureName": "string",
  "architectureDescription": "string",
  "systemInstructions": "string (runtime instructions for the AI model on every request)",
  "agentsContent": "string (AGENTS.md content — agent constitution, values, rules, identity)",
  "existingSkillIds": [numbers],
  "existingHookIds": [numbers],
  "existingSubagentIds": [numbers],
  "existingPluginIds": [numbers],
  "existingMcpServerIds": [numbers],
  "newSkills": [{"name":"","category":"","triggerKeywords":"","content":""}],
  "newHooks": [{"name":"","eventType":"","matcherPattern":"","command":"","enabled":true}],
  "newSubagents": [{"name":"","role":"","modelPreference":"","tools":"","permissions":"","notes":""}],
  "newPlugins": [{"name":"","description":"","version":"1.0.0","installCommand":"","components":""}],
  "newMcpServers": [{"name":"","description":"","serverType":"stdio","endpoint":"npx @modelcontextprotocol/server-name","capabilities":"tool1, tool2, tool3","status":"configured"}]
}`;

  const completion = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [{ role: "user", content: aiPrompt }],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let arch: Record<string, unknown>;
  try { arch = JSON.parse(raw); } catch { res.status(500).json({ error: "AI returned invalid JSON" }); return; }

  // Create new components
  const newSkills = (arch.newSkills as { name: string; category: string; triggerKeywords: string; content: string }[]) ?? [];
  const newHooks = (arch.newHooks as { name: string; eventType: string; matcherPattern: string; command: string; enabled: boolean }[]) ?? [];
  const newSubagents = (arch.newSubagents as { name: string; role: string; modelPreference: string; tools: string; permissions: string; notes: string }[]) ?? [];
  const newPlugins = (arch.newPlugins as { name: string; description: string; version: string; installCommand: string; components: string }[]) ?? [];
  const newMcpServers = (arch.newMcpServers as { name: string; description: string; serverType: string; endpoint: string; capabilities: string; status: string }[]) ?? [];

  const [createdSkills, createdHooks, createdSubagents, createdPlugins, createdMcpServers] = await Promise.all([
    newSkills.length
      ? db.insert(skillsTable).values(newSkills.map((s) => ({ name: s.name, description: "", category: s.category ?? "general", triggerKeywords: s.triggerKeywords ? s.triggerKeywords.split(",").map((k) => k.trim()).filter(Boolean) : [], content: s.content ?? "" }))).returning()
      : Promise.resolve([]),
    newHooks.length
      ? db.insert(hooksTable).values(newHooks.map((h) => ({ name: h.name, eventType: h.eventType ?? "pre_response", matcherPattern: h.matcherPattern ?? ".*", command: h.command ?? "", enabled: h.enabled !== false }))).returning()
      : Promise.resolve([]),
    newSubagents.length
      ? db.insert(subagentsTable).values(newSubagents.map((s) => ({ name: s.name, role: s.role ?? "", modelPreference: s.modelPreference ?? "gpt-4o", tools: s.tools ? s.tools.split(",").map((t) => t.trim()).filter(Boolean) : [], permissions: s.permissions ?? "", notes: s.notes ?? "" }))).returning()
      : Promise.resolve([]),
    newPlugins.length
      ? db.insert(pluginsTable).values(newPlugins.map((p) => ({ name: p.name, description: p.description ?? "", version: p.version ?? "1.0.0", installCommand: p.installCommand ?? "", components: p.components ? p.components.split(",").map((c) => c.trim()).filter(Boolean) : [] }))).returning()
      : Promise.resolve([]),
    newMcpServers.length
      ? db.insert(mcpServersTable).values(newMcpServers.map((m) => ({ name: m.name, description: m.description ?? "", serverType: m.serverType ?? "stdio", endpoint: m.endpoint ?? "", capabilities: m.capabilities ?? "", status: m.status ?? "active" }))).returning()
      : Promise.resolve([]),
  ]);

  const layers: ArchitectureLayers = {
    systemInstructions: (arch.systemInstructions as string) ?? "",
    agentsContent: (arch.agentsContent as string) ?? "",
    skillIds: [...((arch.existingSkillIds as number[]) ?? []), ...createdSkills.map((s) => s.id)],
    hookIds: [...((arch.existingHookIds as number[]) ?? []), ...createdHooks.map((h) => h.id)],
    subagentIds: [...((arch.existingSubagentIds as number[]) ?? []), ...createdSubagents.map((s) => s.id)],
    pluginIds: [...((arch.existingPluginIds as number[]) ?? []), ...createdPlugins.map((p) => p.id)],
    mcpServerIds: [...((arch.existingMcpServerIds as number[]) ?? []), ...createdMcpServers.map((m) => m.id)],
  };

  const [architecture] = await db
    .insert(agentArchitecturesTable)
    .values({
      name: (arch.architectureName as string) ?? plan.title,
      description: (arch.architectureDescription as string) ?? "",
      planId: String(id),
      layers,
    })
    .returning();

  await db
    .update(plansTable)
    .set({ architectureId: architecture.id, status: "arch_generated", updatedAt: new Date() })
    .where(eq(plansTable.id, id));

  res.json({ architectureId: architecture.id, planId: id, architecture });
});

// Legacy JSON endpoint for backward compatibility
router.post("/plans/upload-document", async (req, res): Promise<void> => {
  const { filename = "document.txt", content = "", language = "ar" } = req.body ?? {};
  const preview = content.slice(0, 200) + (content.length > 200 ? "..." : "");
  res.json({
    sessionId: Math.random().toString(36).slice(2),
    filename,
    characterCount: content.length,
    preview,
    language,
  });
});

export default router;
