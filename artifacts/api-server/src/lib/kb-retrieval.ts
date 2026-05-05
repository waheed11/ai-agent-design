import { db, knowledgeBaseTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Retrieve the most relevant knowledge base entries for a given query.
 * Uses keyword matching on title, content, tags, and summary.
 */
export async function retrieveKBContext(query: string, maxEntries = 3): Promise<string> {
  try {
    const allEntries = await db
      .select()
      .from(knowledgeBaseTable)
      .where(eq(knowledgeBaseTable.status, "active"));

    if (!allEntries.length) return "";

    const queryLower = query.toLowerCase();
    const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const queryWords = queryLower
      .split(/[\s,،.؟?!؛:«»"'()\[\]{}<>\/\\|@#$%^&*+=~`]/g)
      .filter((w) => w.length > 2 && /\p{L}/u.test(w));

    // Score each entry by keyword overlap
    const scored = allEntries.map((entry) => {
      const haystack = [
        entry.title,
        entry.summary ?? "",
        entry.content.slice(0, 500),
        entry.tags.join(" "),
        entry.category,
        entry.subcategory ?? "",
      ]
        .join(" ")
        .toLowerCase();

      let score = 0;
      for (const word of queryWords) {
        try {
          const occurrences = (haystack.match(new RegExp(escapeRe(word), "g")) ?? []).length;
          score += occurrences;
        } catch { /* skip malformed word */ }
      }
      return { entry, score };
    });

    const topEntries = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxEntries)
      .map((s) => s.entry);

    if (!topEntries.length) return "";

    const formatted = topEntries
      .map(
        (e) =>
          `### ${e.title} (${e.category})\n${e.summary ?? e.content.slice(0, 400)}`
      )
      .join("\n\n");

    return `\n\n## المعرفة ذات الصلة من قاعدة المعرفة (Relevant Knowledge Base Entries)\n${formatted}\n`;
  } catch {
    return "";
  }
}
