import { useEffect, useState } from "react";
import { Brain, Puzzle, Zap, Bot, Package, Server } from "lucide-react";

interface Arch {
  id: number;
  name: string;
  description: string;
  layers: {
    skillIds: number[];
    hookIds: number[];
    subagentIds: number[];
    pluginIds: number[];
    mcpServerIds: number[];
    memoryNotes: string;
  };
}

interface Named { id: number; name: string; }

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (path: string) => `${BASE}${path}`;

const LAYERS = [
  {
    key: "memory" as const,
    icon: Brain,
    label: "Memory Layer — CLAUDE.md",
    color: "#ea580c",
    bg: "#fff7ed",
    border: "#fed7aa",
  },
  {
    key: "skillIds" as const,
    icon: Puzzle,
    label: "Knowledge Layer — Skills",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
  },
  {
    key: "hookIds" as const,
    icon: Zap,
    label: "Guardrail Layer — Hooks",
    color: "#ca8a04",
    bg: "#fefce8",
    border: "#fde68a",
  },
  {
    key: "subagentIds" as const,
    icon: Bot,
    label: "Delegation Layer — Subagents",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
  },
  {
    key: "pluginIds" as const,
    icon: Package,
    label: "Distribution Layer — Plugins",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
  {
    key: "mcpServerIds" as const,
    icon: Server,
    label: "MCP Servers",
    color: "#475569",
    bg: "#f8fafc",
    border: "#e2e8f0",
  },
];

function getIdFromPath(): string | null {
  const base = BASE || "";
  const { pathname } = window.location;
  const local = base && pathname.startsWith(base)
    ? pathname.slice(base.length) || "/"
    : pathname;
  const match = local.match(/^\/architecture-diagram\/(\d+)$/);
  return match ? match[1] : null;
}

export default function ArchitectureDiagram() {
  const id = getIdFromPath();

  const [arch, setArch] = useState<Arch | null>(null);
  const [skills, setSkills] = useState<Named[]>([]);
  const [hooks, setHooks] = useState<Named[]>([]);
  const [subagents, setSubagents] = useState<Named[]>([]);
  const [plugins, setPlugins] = useState<Named[]>([]);
  const [mcpServers, setMcpServers] = useState<Named[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setError("No architecture ID in URL."); return; }
    const fetchJson = async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
      return res.json();
    };
    Promise.all([
      fetchJson(api(`/api/agent-architectures/${id}`)),
      fetchJson(api("/api/skills")),
      fetchJson(api("/api/hooks")),
      fetchJson(api("/api/subagents")),
      fetchJson(api("/api/plugins")),
      fetchJson(api("/api/mcp-servers")),
    ])
      .then(([archData, skillsData, hooksData, subagentsData, pluginsData, mcpData]) => {
        setArch(archData);
        setSkills(skillsData);
        setHooks(hooksData);
        setSubagents(subagentsData);
        setPlugins(pluginsData);
        setMcpServers(mcpData);
      })
      .catch(() => setError("Failed to load architecture data."));
  }, [id]);

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui", color: "#ef4444" }}>
        {error}
      </div>
    );
  }

  if (!arch) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui", color: "#94a3b8" }}>
        Loading…
      </div>
    );
  }

  const nameMap: Record<string, Named[]> = {
    skillIds: skills,
    hookIds: hooks,
    subagentIds: subagents,
    pluginIds: plugins,
    mcpServerIds: mcpServers,
  };

  const getNames = (key: string): string[] => {
    const ids = arch.layers[key as keyof typeof arch.layers] as number[] | undefined;
    if (!ids || !Array.isArray(ids)) return [];
    const list = nameMap[key] ?? [];
    return ids.map((id) => list.find((n) => n.id === id)?.name ?? `#${id}`);
  };

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: "#0f172a" }}>
            {arch.name}
          </h1>
          {arch.description && (
            <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{arch.description}</p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {LAYERS.map(({ key, icon: Icon, label, color, bg, border }) => {
            const names = key === "memory"
              ? (arch.layers.memoryNotes ? [arch.layers.memoryNotes.slice(0, 80) + (arch.layers.memoryNotes.length > 80 ? "…" : "")] : [])
              : getNames(key);

            return (
              <div
                key={key}
                style={{
                  backgroundColor: bg,
                  border: `1.5px solid ${border}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: names.length ? 8 : 0 }}>
                  <span style={{ color, display: "flex", alignItems: "center" }}>
                    <Icon size={15} />
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color, letterSpacing: "0.01em" }}>
                    {label}
                  </span>
                </div>
                {names.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {names.map((name, i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-block",
                          backgroundColor: "rgba(255,255,255,0.75)",
                          border: `1px solid ${border}`,
                          borderRadius: 5,
                          padding: "2px 8px",
                          fontSize: 11,
                          color: "#334155",
                          fontWeight: 500,
                        }}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, fontStyle: "italic" }}>
                    None assigned
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: "center", fontSize: 10, color: "#cbd5e1", marginTop: 18, marginBottom: 0 }}>
          AI Agent Guidebook — Architecture Diagram
        </p>
      </div>
    </div>
  );
}
