import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, toolEvaluationsTable, systemInstructionsTable } from "@workspace/db";
import {
  ListToolEvaluationsResponse,
  CreateToolEvaluationBody,
  GetToolEvaluationParams,
  GetToolEvaluationResponse,
  DeleteToolEvaluationParams,
} from "@workspace/api-zod";
import { openai, AI_MODEL, sseHeaders, sendSSE, endSSE } from "../lib/ai-client";
import { buildMemoryContext, extractAndSaveMemories } from "../lib/memory-helper";
import { webSearch, formatSearchResults } from "../lib/search";

const router: IRouter = Router();

router.get("/tool-evaluations", async (_req, res): Promise<void> => {
  const evaluations = await db
    .select()
    .from(toolEvaluationsTable)
    .orderBy(desc(toolEvaluationsTable.createdAt));
  res.json(ListToolEvaluationsResponse.parse(evaluations));
});

router.post("/tool-evaluations", async (req, res): Promise<void> => {
  const body = CreateToolEvaluationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [evaluation] = await db
    .insert(toolEvaluationsTable)
    .values({
      toolName: body.data.toolName,
      toolUrl: body.data.toolUrl ?? null,
      projectRequirements: body.data.projectRequirements,
      language: body.data.language ?? "ar",
      status: "pending",
    })
    .returning();

  const [sysInstRow] = await db
    .select()
    .from(systemInstructionsTable)
    .where(eq(systemInstructionsTable.mode, "tool_evaluation"));

  const baseSysPrompt = sysInstRow?.content ?? "You are an expert AI tool evaluator.";

  // Run memory + web search for the tool in parallel
  const [memoryContext, searchResults] = await Promise.all([
    buildMemoryContext(),
    webSearch(`${body.data.toolName} AI tool capabilities features 2025`, 3),
  ]);
  const searchContext = formatSearchResults(searchResults);
  const sysPrompt = baseSysPrompt + memoryContext + searchContext;

  sseHeaders(res);
  sendSSE(res, { type: "status", message: `Evaluating ${body.data.toolName}...` });

  try {
    const stream = await openai.chat.completions.create({
      model: AI_MODEL,
      stream: true,
      messages: [
        { role: "system", content: sysPrompt },
        {
          role: "user",
          content: `Evaluate "${body.data.toolName}"${body.data.toolUrl ? ` (${body.data.toolUrl})` : ""} for the following project requirements:

${body.data.projectRequirements}

Provide a comprehensive evaluation report following the framework in your instructions. At the END of your report, on a new line, output EXACTLY this JSON (no other text on that line):
EVALUATION_RESULT:{"fitScore":NUMBER,"recommendation":"USE"|"USE_WITH_CAVEATS"|"AVOID"}`,
        },
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

    let fitScore: number | null = null;
    let recommendation: string | null = null;

    const VALID_RECOMMENDATIONS = ["USE", "USE_WITH_CAVEATS", "AVOID"] as const;

    const resultMatch = fullContent.match(/EVALUATION_RESULT:(\{[^}]+\})/);
    if (resultMatch) {
      try {
        const parsed = JSON.parse(resultMatch[1]);
        const rawScore = Number(parsed.fitScore);
        fitScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, rawScore)) : null;
        const rawRec = String(parsed.recommendation ?? "").trim().toUpperCase().replace(/\s+/g, "_");
        recommendation = (VALID_RECOMMENDATIONS as readonly string[]).includes(rawRec) ? rawRec : null;
        fullContent = fullContent.replace(/EVALUATION_RESULT:\{[^}]+\}/, "").trim();
      } catch {
        // ignore parse error
      }
    }

    const [updated] = await db
      .update(toolEvaluationsTable)
      .set({
        report: fullContent,
        fitScore,
        recommendation,
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(toolEvaluationsTable.id, evaluation.id))
      .returning();

    sendSSE(res, { type: "done", evaluation: updated });
    endSSE(res);

    // Background: extract user preference memories from this evaluation exchange
    const evalTranscript = `User: Evaluate ${body.data.toolName} for: ${body.data.projectRequirements}\nAssistant: ${fullContent}`;
    extractAndSaveMemories(evalTranscript, `tool_eval:${evaluation.id}`).catch(() => {});
  } catch (err) {
    await db
      .update(toolEvaluationsTable)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(toolEvaluationsTable.id, evaluation.id));

    sendSSE(res, { type: "error", error: String(err) });
    endSSE(res);
  }
});

router.get("/tool-evaluations/:id", async (req, res): Promise<void> => {
  const params = GetToolEvaluationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [evaluation] = await db
    .select()
    .from(toolEvaluationsTable)
    .where(eq(toolEvaluationsTable.id, params.data.id));

  if (!evaluation) {
    res.status(404).json({ error: "Tool evaluation not found" });
    return;
  }

  res.json(GetToolEvaluationResponse.parse(evaluation));
});

router.delete("/tool-evaluations/:id", async (req, res): Promise<void> => {
  const params = DeleteToolEvaluationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [evaluation] = await db
    .delete(toolEvaluationsTable)
    .where(eq(toolEvaluationsTable.id, params.data.id))
    .returning();

  if (!evaluation) {
    res.status(404).json({ error: "Tool evaluation not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
