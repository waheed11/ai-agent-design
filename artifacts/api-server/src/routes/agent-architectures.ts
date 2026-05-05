import { Router, type IRouter } from "express";
import { eq, desc, inArray } from "drizzle-orm";
import { db, agentArchitecturesTable, skillsTable, hooksTable, subagentsTable, pluginsTable, mcpServersTable } from "@workspace/db";
import type { ArchitectureLayers, Skill, Hook, Subagent, Plugin, McpServer } from "@workspace/db";

const router: IRouter = Router();

/** Normalise legacy rows that still use memoryNotes instead of agentsContent */
function normaliseLayers(raw: unknown): ArchitectureLayers {
  const l = (raw ?? {}) as Record<string, unknown>;
  return {
    systemInstructions: (l.systemInstructions as string) ?? "",
    agentsContent: (l.agentsContent as string) ?? (l.memoryNotes as string) ?? "",
    skillIds: (l.skillIds as number[]) ?? [],
    hookIds: (l.hookIds as number[]) ?? [],
    subagentIds: (l.subagentIds as number[]) ?? [],
    pluginIds: (l.pluginIds as number[]) ?? [],
    mcpServerIds: (l.mcpServerIds as number[]) ?? [],
  };
}

router.get("/agent-architectures", async (_req, res): Promise<void> => {
  const rows = await db.select().from(agentArchitecturesTable).orderBy(desc(agentArchitecturesTable.updatedAt));
  res.json(rows.map((r) => ({ ...r, layers: normaliseLayers(r.layers) })));
});

router.post("/agent-architectures", async (req, res): Promise<void> => {
  const { name, description = "", layers, planId } = req.body ?? {};
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const defaultLayers: ArchitectureLayers = {
    systemInstructions: "", agentsContent: "", skillIds: [], hookIds: [], subagentIds: [], pluginIds: [], mcpServerIds: [],
  };
  const [row] = await db
    .insert(agentArchitecturesTable)
    .values({ name: name.trim(), description, planId: planId ? String(planId) : null, layers: layers ?? defaultLayers })
    .returning();
  res.status(201).json({ ...row, layers: normaliseLayers(row.layers) });
});

router.get("/agent-architectures/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [arch] = await db.select().from(agentArchitecturesTable).where(eq(agentArchitecturesTable.id, id));
  if (!arch) { res.status(404).json({ error: "Architecture not found" }); return; }

  const layers = normaliseLayers(arch.layers);

  const [skills, hooks, subagents, plugins, mcpServers] = await Promise.all([
    layers.skillIds.length ? db.select().from(skillsTable).where(inArray(skillsTable.id, layers.skillIds)) : Promise.resolve([] as Skill[]),
    layers.hookIds.length ? db.select().from(hooksTable).where(inArray(hooksTable.id, layers.hookIds)) : Promise.resolve([] as Hook[]),
    layers.subagentIds.length ? db.select().from(subagentsTable).where(inArray(subagentsTable.id, layers.subagentIds)) : Promise.resolve([] as Subagent[]),
    layers.pluginIds.length ? db.select().from(pluginsTable).where(inArray(pluginsTable.id, layers.pluginIds)) : Promise.resolve([] as Plugin[]),
    layers.mcpServerIds.length ? db.select().from(mcpServersTable).where(inArray(mcpServersTable.id, layers.mcpServerIds)) : Promise.resolve([] as McpServer[]),
  ]);

  res.json({
    ...arch,
    layers,
    resolvedSkills: skills,
    resolvedHooks: hooks,
    resolvedSubagents: subagents,
    resolvedPlugins: plugins,
    resolvedMcpServers: mcpServers,
  });
});

router.patch("/agent-architectures/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, description, layers } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (layers !== undefined) updates.layers = layers;
  const [row] = await db.update(agentArchitecturesTable).set(updates).where(eq(agentArchitecturesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Architecture not found" }); return; }
  res.json({ ...row, layers: normaliseLayers(row.layers) });
});

router.delete("/agent-architectures/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.delete(agentArchitecturesTable).where(eq(agentArchitecturesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Architecture not found" }); return; }
  res.sendStatus(204);
});

/**
 * POST /api/agent-architectures/:id/export
 * Returns a Markdown document (AGENTS.md format) summarising the architecture.
 */
router.post("/agent-architectures/:id/export", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [arch] = await db.select().from(agentArchitecturesTable).where(eq(agentArchitecturesTable.id, id));
  if (!arch) { res.status(404).json({ error: "Architecture not found" }); return; }

  const layers = normaliseLayers(arch.layers);

  const [skills, hooks, subagents, plugins, mcpServers] = await Promise.all([
    layers.skillIds.length ? db.select().from(skillsTable).where(inArray(skillsTable.id, layers.skillIds)) : Promise.resolve([] as Skill[]),
    layers.hookIds.length ? db.select().from(hooksTable).where(inArray(hooksTable.id, layers.hookIds)) : Promise.resolve([] as Hook[]),
    layers.subagentIds.length ? db.select().from(subagentsTable).where(inArray(subagentsTable.id, layers.subagentIds)) : Promise.resolve([] as Subagent[]),
    layers.pluginIds.length ? db.select().from(pluginsTable).where(inArray(pluginsTable.id, layers.pluginIds)) : Promise.resolve([] as Plugin[]),
    layers.mcpServerIds.length ? db.select().from(mcpServersTable).where(inArray(mcpServersTable.id, layers.mcpServerIds)) : Promise.resolve([] as McpServer[]),
  ]);

  const list = (arr: { name: string }[]) =>
    arr.length ? arr.map((x) => `- ${x.name}`).join("\n") : "- (none)";

  const md = `# ${arch.name}

${arch.description || ""}

---

## System Instructions

${layers.systemInstructions || "(no system instructions)"}

---

## AGENTS.md — Agent Constitution

${layers.agentsContent || "(no agent constitution defined)"}

---

## Layer 1 — Knowledge (Skills)

${list(skills)}

## Layer 2 — Guardrails (Hooks)

${list(hooks)}

## Layer 3 — Delegation (Subagents)

${list(subagents)}

## Layer 4 — Distribution (Plugins)

${list(plugins)}

---

## MCP Servers (External Integrations)

${list(mcpServers)}

---
*Exported from AI Agent Design — ${new Date().toLocaleDateString()}*
`;

  res.json({ markdown: md, name: arch.name });
});

export default router;
