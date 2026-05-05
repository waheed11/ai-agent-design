export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

// ─── Wikipedia API search (free, no key, highly reliable for technical queries) ─
async function wikiSearch(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1&srlimit=${maxResults}&srprop=snippet|titlesnippet`;
    const res = await fetch(url, {
      headers: { "User-Agent": "AI-Agent-Guidebook/1.0 (educational project)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json() as {
      query?: { search?: Array<{ title: string; snippet: string; pageid: number }> };
    };
    return (data.query?.search ?? []).map((s) => ({
      title: s.title,
      snippet: stripHtml(s.snippet),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title.replace(/ /g, "_"))}`,
    }));
  } catch {
    return [];
  }
}

// ─── DuckDuckGo HTML scraping (real web results, no key required) ──────────────
async function duckduckgoHtmlSearch(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AI-Agent-Guidebook/1.0)",
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html",
      },
      body: `q=${encodeURIComponent(query)}&b=&kl=`,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const html = await res.text();
    const results: SearchResult[] = [];

    // Parse anchor tags for result URLs and titles
    const anchorRe =
      /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="\/\/duckduckgo\.com\/l\/\?uddg=([^"&]+)"[^>]*>([\s\S]*?)<\/a>/g;
    const snippetRe =
      /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

    const anchors: Array<{ url: string; title: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = anchorRe.exec(html)) !== null) {
      const rawUrl = decodeURIComponent(m[1]);
      const title = stripHtml(m[2]).trim();
      if (rawUrl && title) anchors.push({ url: rawUrl, title });
    }

    const snippets: string[] = [];
    let s: RegExpExecArray | null;
    while ((s = snippetRe.exec(html)) !== null) {
      snippets.push(stripHtml(s[1]).trim());
    }

    for (let i = 0; i < Math.min(anchors.length, maxResults); i++) {
      results.push({
        title: anchors[i].title,
        snippet: snippets[i] ?? anchors[i].title,
        url: anchors[i].url,
      });
    }

    return results;
  } catch {
    return [];
  }
}

// ─── DuckDuckGo Instant Answers (fallback, structured data) ───────────────────
async function duckduckgoInstantSearch(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "AI-Agent-Guidebook/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json() as {
      AbstractText?: string;
      AbstractURL?: string;
      AbstractSource?: string;
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string; Topics?: Array<{ Text?: string; FirstURL?: string }> }>;
      Results?: Array<{ Text?: string; FirstURL?: string }>;
    };

    const results: SearchResult[] = [];
    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.AbstractSource ?? query,
        snippet: data.AbstractText,
        url: data.AbstractURL,
      });
    }
    for (const topic of [...(data.RelatedTopics ?? []), ...(data.Results ?? [])]) {
      if (results.length >= 3) break;
      if (topic.Text && topic.FirstURL) {
        results.push({ title: topic.FirstURL, snippet: topic.Text, url: topic.FirstURL });
      }
    }
    return results;
  } catch {
    return [];
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deduplicateByUrl(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

/**
 * Multi-strategy web search:
 * 1. DuckDuckGo HTML (real search results, no key required)
 * 2. Wikipedia API (free, reliable factual source for tech/tool queries)
 * 3. DuckDuckGo Instant Answers (structured fallback)
 *
 * Runs strategies in parallel and merges unique results by URL.
 */
export async function webSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  const [duckHtml, wiki, duckInstant] = await Promise.allSettled([
    duckduckgoHtmlSearch(query, maxResults),
    wikiSearch(query, 2),
    duckduckgoInstantSearch(query),
  ]);

  const combined: SearchResult[] = [
    ...(duckHtml.status === "fulfilled" ? duckHtml.value : []),
    ...(wiki.status === "fulfilled" ? wiki.value : []),
    ...(duckInstant.status === "fulfilled" ? duckInstant.value : []),
  ];

  return deduplicateByUrl(combined).slice(0, maxResults);
}

/**
 * Decide whether a query needs web search.
 * Covers: time-sensitive, version, pricing, benchmark, install, AND
 * queries about specific named tools/libraries/skills that may be unknown.
 */
export function needsWebSearch(query: string): boolean {
  const indicators = [
    // Time-sensitive / version
    /\b(latest|current|recent|new|2024|2025|2026|today|now|update|updates)\b/i,
    /\b(أحدث|حالي|جديد|الآن|اليوم|تحديث)\b/,
    /\b(release|changelog|announced|launched|released)\b/i,
    /\bversio?n\s*\d/i,
    // Pricing
    /\b(price|pricing|cost|free|paid|subscription|plan)\b/i,
    /\b(سعر|تسعير|مجاني|مدفوع)\b/,
    // Benchmarks & comparisons
    /\b(benchmark|performance|comparison|vs\.?\s|versus|compare)\b/i,
    /\b(مقارنة|أداء|أفضل)\b/,
    // Install / getting started
    /\b(how to install|install guide|getting started|tutorial|quickstart)\b/i,
    // "What is X" / "does X exist" — unknown tool/library/concept queries (ASCII)
    /\b(what is|what's|whats|explain|define|tell me about|what about)\b/i,
    /\b(does .+ exist|is .+ real|is .+ a (tool|library|framework|skill|plugin))\b/i,
    // Arabic: no \b — JS word-boundary breaks on Unicode
    /(ما هو|ما هي|ما هذا|اشرح|وضّح|عرّف|هل يوجد|هل توجد|هل هناك|ماذا عن|وماذا عن|ما عن)/,
    /(هل .{1,30}موجود|هل .{1,30}حقيقي)/,
    // Arabic context words followed by a specific name / identifier
    /(حول|بخصوص|باستخدام|استخدام|تكامل مع|مهارة|أداة|إضافة|ملحق|هوك|بلغين|plugin|skill|hook)\s+\S{3,}/i,
    // English: "using / about / regarding" + any name
    /\b(about|regarding|using|use of|integrate|integration with)\s+\S{3,}\b/i,
    // Hyphenated technical names anywhere (e.g. check-facts, fact-checker, neo4j-driver)
    /\b[a-z]{2,}-[a-z]{2,}(-[a-z]{2,})?\b/,
  ];
  return indicators.some((re) => re.test(query));
}

export function formatSearchResults(results: SearchResult[]): string {
  if (!results.length) return "";
  const formatted = results
    .map((r, i) => `[${i + 1}] **${r.title}**\n${r.snippet.slice(0, 400)}\nSource: ${r.url}`)
    .join("\n\n");
  return `\n\n## نتائج البحث على الويب (Web Search Results)\n${formatted}\n`;
}
