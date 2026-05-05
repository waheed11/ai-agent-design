import { Router, type IRouter } from "express";
import { openai, AI_MODEL, sseHeaders, sendSSE } from "../lib/ai-client";
import { buildMemoryContext } from "../lib/memory-helper";

const router: IRouter = Router();

/**
 * POST /api/prompt-generator
 * Streams a professional AI agent system prompt + implementation plan.
 * Body: { role, goal, context, constraints, outputFormat, chainOfThought, examples, tone, language }
 */
router.post("/prompt-generator", async (req, res): Promise<void> => {
  const {
    role = "",
    goal = "",
    context: ctx = "",
    constraints = "",
    outputFormat = "",
    chainOfThought = false,
    examples = "",
    tone = "professional",
    language = "ar",
  } = req.body ?? {};

  if (!role.trim() || !goal.trim()) {
    res.status(400).json({ error: "role and goal are required" });
    return;
  }

  const memoryContext = await buildMemoryContext();
  const isAr = language === "ar";

  const systemPrompt = `You are an expert AI prompt engineer specializing in building production-grade AI agents.
Your task is to generate a professional, structured system prompt for an AI agent, followed by a practical implementation plan.

${memoryContext}

Output language: ${isAr ? "Arabic (use RTL-friendly formatting)" : "English"}

Structure your output EXACTLY as follows:
---
## ${isAr ? "المطالبة الاحترافية" : "Professional System Prompt"}
[Complete, ready-to-use system prompt. Use Markdown headers for sections. Make it detailed and production-ready.]

---
## ${isAr ? "خطة التنفيذ" : "Implementation Plan"}
[Step-by-step guide covering: 1) Setup, 2) Configuration, 3) Testing, 4) Deployment, 5) Monitoring]

---
## ${isAr ? "نصائح التحسين" : "Optimization Tips"}
[3-5 specific tips for improving this prompt over time based on best practices]
`;

  const userMessage = `Build a professional system prompt and implementation plan for an AI agent with these specifications:

**Role / الدور:** ${role}
**Goal / الهدف:** ${goal}
${ctx ? `**Context / السياق:** ${ctx}` : ""}
${constraints ? `**Constraints / القيود:** ${constraints}` : ""}
${outputFormat ? `**Output Format / صيغة الإخراج:** ${outputFormat}` : ""}
${chainOfThought ? `**Chain of Thought:** Enable step-by-step reasoning in the prompt` : ""}
${examples ? `**Examples / أمثلة:** ${examples}` : ""}
**Tone / النبرة:** ${tone}`;

  sseHeaders(res);

  try {
    const stream = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        sendSSE(res, { type: "delta", content: delta });
      }
    }

    sendSSE(res, { type: "done" });
    res.end();
  } catch (err) {
    sendSSE(res, { type: "error", error: "Generation failed" });
    res.end();
  }
});

export default router;
