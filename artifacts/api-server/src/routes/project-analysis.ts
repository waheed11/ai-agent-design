import { Router, type IRouter } from "express";
import { openai, AI_MODEL } from "../lib/ai-client";
import { buildMemoryContext } from "../lib/memory-helper";
import { logger } from "../lib/logger";

const router: IRouter = Router();

interface GitHubRepo {
  name: string;
  description: string | null;
  topics: string[];
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  size: number;
  created_at: string;
  updated_at: string;
  default_branch: string;
  license: { name: string } | null;
}

interface AnalysisResult {
  repoInfo: {
    name: string;
    description: string;
    language: string;
    stars: number;
    forks: number;
    topics: string[];
    license: string;
    lastUpdated: string;
  };
  summary: string;
  overallScore: number;
  categories: Array<{ name: string; score: number; description: string }>;
  strengths: Array<{ title: string; description: string }>;
  weaknesses: Array<{ title: string; description: string; severity: "low" | "medium" | "high" }>;
  recommendations: Array<{ title: string; description: string; priority: "low" | "medium" | "high"; effort: "low" | "medium" | "high" }>;
  bestPracticesAlignment: string;
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const clean = url.trim().replace(/\.git$/, "");
    const match = clean.match(/github\.com[/:]([^/]+)\/([^/]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}

async function fetchGitHub(path: string): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "AI-Agent-Guidebook/1.0",
    },
  });
}

/**
 * POST /api/project-analysis
 * Analyzes an existing GitHub AI agent project for strengths, weaknesses and improvement recommendations.
 * Body: { githubUrl: string, language: "ar" | "en" }
 */
router.post("/project-analysis", async (req, res): Promise<void> => {
  const { githubUrl, language = "ar" } = req.body ?? {};

  if (!githubUrl?.trim()) {
    res.status(400).json({ error: "githubUrl is required" });
    return;
  }

  const parsed = parseGitHubUrl(githubUrl);
  if (!parsed) {
    res.status(400).json({ error: "Invalid GitHub URL. Expected: https://github.com/owner/repo" });
    return;
  }

  const { owner, repo } = parsed;

  // Fetch repo metadata, README and languages in parallel
  const [repoRes, readmeRes, langsRes, contentsRes] = await Promise.allSettled([
    fetchGitHub(`/repos/${owner}/${repo}`),
    fetchGitHub(`/repos/${owner}/${repo}/readme`),
    fetchGitHub(`/repos/${owner}/${repo}/languages`),
    fetchGitHub(`/repos/${owner}/${repo}/contents`),
  ]);

  if (repoRes.status === "rejected" || !repoRes.value.ok) {
    const status = repoRes.status === "fulfilled" ? repoRes.value.status : 500;
    res.status(status === 404 ? 404 : 502).json({
      error: status === 404
        ? "Repository not found. Make sure it is public and the URL is correct."
        : "Failed to fetch repository from GitHub.",
    });
    return;
  }

  const repoData = (await repoRes.value.json()) as GitHubRepo;

  // Decode README
  let readmeText = "";
  if (readmeRes.status === "fulfilled" && readmeRes.value.ok) {
    try {
      const readmeJson = (await readmeRes.value.json()) as { content: string };
      readmeText = Buffer.from(readmeJson.content, "base64").toString("utf8").slice(0, 6000);
    } catch { /* ignore */ }
  }

  // Languages breakdown
  let languagesList = "";
  if (langsRes.status === "fulfilled" && langsRes.value.ok) {
    try {
      const langs = (await langsRes.value.json()) as Record<string, number>;
      const total = Object.values(langs).reduce((a, b) => a + b, 0);
      languagesList = Object.entries(langs)
        .map(([l, b]) => `${l} (${Math.round((b / total) * 100)}%)`)
        .join(", ");
    } catch { /* ignore */ }
  }

  // Root file listing (detect key files)
  let rootFiles: string[] = [];
  if (contentsRes.status === "fulfilled" && contentsRes.value.ok) {
    try {
      const contents = (await contentsRes.value.json()) as Array<{ name: string; type: string }>;
      rootFiles = contents.map((f) => f.name);
    } catch { /* ignore */ }
  }

  const memoryContext = await buildMemoryContext();
  const isAr = language === "ar";

  const analysisPrompt = `You are a senior AI systems architect specializing in evaluating AI agent projects.
Analyze the following GitHub repository and provide a comprehensive, actionable assessment.

${memoryContext}

## Evaluation Framework — AI Agent Best Practices:
1. **Architecture**: Single vs multi-agent, orchestration, modularity
2. **Memory & State**: Context management, persistence, retrieval
3. **Tool Use**: Function calling, tool integration, error handling
4. **Reliability**: Retry logic, fallbacks, observability, logging
5. **Testing & Evaluation**: Test coverage, evals, benchmarks
6. **Documentation**: README quality, inline docs, usage examples
7. **Security**: Secret handling, input validation, prompt injection defense
8. **Performance**: Latency optimization, streaming, caching

Output ONLY valid JSON matching this exact schema:
{
  "summary": "string (2-3 sentences overall impression)",
  "overallScore": number (0-100),
  "categories": [
    { "name": "string", "score": number (0-100), "description": "string (1 sentence)" }
  ],
  "strengths": [
    { "title": "string", "description": "string (2-3 sentences)" }
  ],
  "weaknesses": [
    { "title": "string", "description": "string (2-3 sentences)", "severity": "low|medium|high" }
  ],
  "recommendations": [
    { "title": "string", "description": "string (2-3 sentences with concrete steps)", "priority": "low|medium|high", "effort": "low|medium|high" }
  ],
  "bestPracticesAlignment": "string (paragraph summarizing alignment with AI agent best practices)"
}

Respond in ${isAr ? "Arabic" : "English"}. Be specific, technical, and actionable. Base analysis on actual code evidence from the README and file structure.`;

  const userMessage = `## Repository: ${repoData.name} (${owner}/${repo})
**Description:** ${repoData.description ?? "No description provided"}
**Primary Language:** ${repoData.language ?? "Unknown"}
**All Languages:** ${languagesList || "N/A"}
**Stars:** ${repoData.stargazers_count} | **Forks:** ${repoData.forks_count} | **Open Issues:** ${repoData.open_issues_count}
**Topics:** ${repoData.topics.join(", ") || "None"}
**License:** ${repoData.license?.name ?? "None"}
**Created:** ${new Date(repoData.created_at).toLocaleDateString()} | **Last Updated:** ${new Date(repoData.updated_at).toLocaleDateString()}
**Root Files:** ${rootFiles.slice(0, 30).join(", ")}

## README Content:
${readmeText || "No README found"}`;

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: analysisPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    const cleaned = raw.replace(/^```json?\n?/, "").replace(/```$/, "").trim();
    const analysis = JSON.parse(cleaned) as Omit<AnalysisResult, "repoInfo">;

    const result: AnalysisResult = {
      repoInfo: {
        name: repoData.name,
        description: repoData.description ?? "",
        language: repoData.language ?? "",
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        topics: repoData.topics,
        license: repoData.license?.name ?? "",
        lastUpdated: repoData.updated_at,
      },
      ...analysis,
    };

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Project analysis failed");
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

export default router;
