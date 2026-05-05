import { db, memoryEntriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { openai, AI_MODEL } from "./ai-client";
import { logger } from "./logger";

/**
 * Fetch all memory entries from DB and format them as a system prompt section.
 * These are prepended to every AI call so the assistant knows the user's preferences.
 */
export async function buildMemoryContext(): Promise<string> {
  try {
    const entries = await db.select().from(memoryEntriesTable);
    if (!entries.length) return "";

    const lines = entries
      .filter((e) => e.confidence !== "low")
      .map((e) => `- **${e.key}**: ${e.value} (confidence: ${e.confidence})`)
      .join("\n");

    if (!lines) return "";

    return `\n\n## ذاكرة المستخدم (User Memory & Preferences)\n${lines}\n\nاستخدم هذه المعلومات لتخصيص إجاباتك وفق تفضيلات وخلفية المستخدم.\n`;
  } catch {
    return "";
  }
}

/**
 * Check whether memories have already been extracted for a given source key.
 * Provides idempotency so duplicate extractions are skipped on retry.
 */
async function memoriesAlreadyExtracted(source: string): Promise<boolean> {
  try {
    const existing = await db
      .select()
      .from(memoryEntriesTable)
      .where(eq(memoryEntriesTable.source, source));
    return existing.length > 0;
  } catch {
    return false;
  }
}

/**
 * Run a single extraction attempt — call OpenAI and persist insights to DB.
 * Returns the number of memories saved, or throws on failure.
 */
async function runExtraction(
  transcript: string,
  source: string
): Promise<number> {
  const completion = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: "system",
        content: `Extract 1-5 key insights or preferences the user revealed during this conversation.
Return a JSON array of objects with shape: { key: string, value: string, confidence: "low"|"medium"|"high" }
Only extract genuinely useful, non-obvious facts about the user's preferences, technical choices, or expertise.
Do NOT extract factual questions — only user preferences or decisions.
Return ONLY the JSON array, no other text.`,
      },
      { role: "user", content: transcript },
    ],
  });

  const rawJson = completion.choices[0]?.message?.content?.trim() ?? "[]";
  const cleaned = rawJson.replace(/^```json?\n?/, "").replace(/```$/, "").trim();
  const insights: Array<{ key: string; value: string; confidence: string }> = JSON.parse(cleaned);

  let saved = 0;
  for (const insight of insights) {
    if (insight.key && insight.value) {
      await db.insert(memoryEntriesTable).values({
        key: insight.key,
        value: insight.value,
        confidence: (insight.confidence as "low" | "medium" | "high") ?? "medium",
        source,
        isEditable: true,
      });
      saved++;
    }
  }
  return saved;
}

const RETRY_DELAYS_MS = [0, 2000, 5000] as const; // 3 attempts: immediate, 2s, 5s

/**
 * Extract and persist memory insights from a conversation transcript.
 *
 * Resilience model:
 * - Idempotent: skips extraction if memories for this `source` already exist.
 * - Retries up to 3 times with exponential-ish back-off on transient failures.
 * - Designed to be called fire-and-forget (`.catch(() => {})`) from request handlers.
 */
export async function extractAndSaveMemories(
  transcript: string,
  source: string
): Promise<number> {
  if (transcript.length < 100) return 0;

  // Idempotency: skip if we already extracted for this exact source
  if (await memoriesAlreadyExtracted(source)) {
    logger.debug({ source }, "Memory extraction skipped — already extracted");
    return 0;
  }

  let lastError: unknown;
  for (const delay of RETRY_DELAYS_MS) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    try {
      const saved = await runExtraction(transcript, source);
      logger.debug({ source, saved }, "Memory extraction succeeded");
      return saved;
    } catch (err) {
      lastError = err;
      logger.warn({ source, err }, "Memory extraction attempt failed, will retry");
    }
  }

  logger.error({ source, err: lastError }, "Memory extraction failed after all retries");
  return 0;
}
