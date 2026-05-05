import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layers, Plus, Trash2, Download, Brain, Puzzle, Zap, Bot, Package, Server, FileText,
  ChevronRight, Info, MonitorPlay, Settings2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { addArchToCanvas } from "@/pages/canvas";

interface ArchLayers {
  systemInstructions: string;
  agentsContent: string;
  skillIds: number[];
  hookIds: number[];
  subagentIds: number[];
  pluginIds: number[];
  mcpServerIds: number[];
  memoryNotes?: string;
}

interface Arch {
  id: number;
  name: string;
  description: string;
  layers: ArchLayers;
  createdAt: string;
}

interface Skill { id: number; name: string; category: string; }
interface Hook { id: number; name: string; eventType: string; enabled: boolean; }
interface Subagent { id: number; name: string; role: string; }
interface Plugin { id: number; name: string; version: string; }
interface McpServer { id: number; name: string; serverType: string; status: string; }

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (path: string) => `${BASE}${path}`;

const LAYER_CONFIG = [
  { key: "skillIds", icon: Puzzle, labelKey: "arch.layer_skills", color: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800" },
  { key: "hookIds", icon: Zap, labelKey: "arch.layer_hooks", color: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800" },
  { key: "subagentIds", icon: Bot, labelKey: "arch.layer_subagents", color: "bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800" },
  { key: "pluginIds", icon: Package, labelKey: "arch.layer_plugins", color: "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" },
] as const;

export default function Architecture() {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const isAr = language === "ar";

  const { data: archs, isLoading } = useQuery<Arch[]>({
    queryKey: ["agent-architectures"],
    queryFn: () => fetch(api("/api/agent-architectures")).then((r) => r.json()),
  });

  const { data: skills = [] } = useQuery<Skill[]>({ queryKey: ["skills"], queryFn: () => fetch(api("/api/skills")).then((r) => r.json()) });
  const { data: hooks = [] } = useQuery<Hook[]>({ queryKey: ["hooks"], queryFn: () => fetch(api("/api/hooks")).then((r) => r.json()) });
  const { data: subagents = [] } = useQuery<Subagent[]>({ queryKey: ["subagents"], queryFn: () => fetch(api("/api/subagents")).then((r) => r.json()) });
  const { data: plugins = [] } = useQuery<Plugin[]>({ queryKey: ["plugins"], queryFn: () => fetch(api("/api/plugins")).then((r) => r.json()) });
  const { data: mcpServers = [] } = useQuery<McpServer[]>({ queryKey: ["mcp-servers"], queryFn: () => fetch(api("/api/mcp-servers")).then((r) => r.json()) });

  const createMutation = useMutation({
    mutationFn: (body: Partial<Arch>) =>
      fetch(api("/api/agent-architectures"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["agent-architectures"] }); closeDialog(); setWorkspaceId(data.id); },
    onError: () => toast({ title: t("common.error_create"), variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Partial<Arch> & { id: number }) =>
      fetch(api(`/api/agent-architectures/${id}`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-architectures"] }),
    onError: () => toast({ title: t("common.error_update"), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(api(`/api/agent-architectures/${id}`), { method: "DELETE" }),
    onSuccess: (_, id) => { qc.invalidateQueries({ queryKey: ["agent-architectures"] }); if (workspaceId === id) setWorkspaceId(null); },
  });

  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [exportMd, setExportMd] = useState<string | null>(null);

  const openCreate = () => { setName(""); setDescription(""); setShowDialog(true); };
  const closeDialog = () => setShowDialog(false);
  const handleCreate = () => {
    createMutation.mutate({
      name, description,
      layers: { systemInstructions: "", agentsContent: "", skillIds: [], hookIds: [], subagentIds: [], pluginIds: [], mcpServerIds: [] },
    });
  };

  const workspace = archs?.find((a) => a.id === workspaceId) ?? null;

  const toggleId = (field: keyof ArchLayers, id: number) => {
    if (!workspace) return;
    const current = workspace.layers[field] as number[];
    const updated = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    const newLayers = { ...workspace.layers, [field]: updated };
    updateMutation.mutate({ id: workspace.id, layers: newLayers });
    qc.setQueryData<Arch[]>(["agent-architectures"], (prev) =>
      prev?.map((a) => a.id === workspace.id ? { ...a, layers: newLayers } : a) ?? []
    );
  };

  const updateTextField = (field: "systemInstructions" | "agentsContent", value: string) => {
    if (!workspace) return;
    const newLayers = { ...workspace.layers, [field]: value };
    updateMutation.mutate({ id: workspace.id, layers: newLayers });
    qc.setQueryData<Arch[]>(["agent-architectures"], (prev) =>
      prev?.map((a) => a.id === workspace.id ? { ...a, layers: newLayers } : a) ?? []
    );
  };

  const handleExport = async (id: number) => {
    try {
      const res = await fetch(api(`/api/agent-architectures/${id}/export`), { method: "POST" });
      const data = await res.json();
      setExportMd(data.markdown);
    } catch {
      toast({ title: t("common.error_export"), variant: "destructive" });
    }
  };

  const componentLists = {
    skillIds: skills as { id: number; name: string }[],
    hookIds: hooks as { id: number; name: string }[],
    subagentIds: subagents as { id: number; name: string }[],
    pluginIds: plugins as { id: number; name: string }[],
  };

  const sysInstructions = workspace?.layers.systemInstructions ?? "";
  const agentsContent = workspace?.layers.agentsContent ?? (workspace?.layers.memoryNotes ?? "");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" /> {t("arch.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("arch.description")}</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 me-2" /> {t("arch.new")}
        </Button>
      </div>

      {/* ADK Reference Panel — 6 layers */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-primary">
            <Info className="h-4 w-4" /> {t("arch.adk_ref_title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
            {[
              { icon: Settings2, label: t("arch.layer_system_instructions"), color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950" },
              { icon: Brain, label: t("arch.layer_memory"), color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950" },
              { icon: Puzzle, label: t("arch.layer_skills"), color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
              { icon: Zap, label: t("arch.layer_hooks"), color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950" },
              { icon: Bot, label: t("arch.layer_subagents"), color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950" },
              { icon: Package, label: t("arch.layer_plugins"), color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
            ].map(({ icon: Icon, label, color, bg }, i) => (
              <div key={i} className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${bg}`}>
                <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                <span className="leading-tight font-medium">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{t("arch.adk_ref_hint")}</p>
        </CardContent>
      </Card>

      <div className={`flex gap-6 ${workspace ? "flex-row" : "flex-col"}`}>
        {/* Architecture list */}
        <div className={workspace ? "w-72 shrink-0 space-y-2" : "w-full"}>
          {isLoading ? (
            <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
          ) : !archs || archs.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t("arch.empty")}</p>
              </CardContent>
            </Card>
          ) : (
            archs.map((a) => {
              const active = workspaceId === a.id;
              const total = (a.layers.skillIds?.length ?? 0) + (a.layers.hookIds?.length ?? 0) + (a.layers.subagentIds?.length ?? 0) + (a.layers.pluginIds?.length ?? 0) + (a.layers.mcpServerIds?.length ?? 0);
              return (
                <Card
                  key={a.id}
                  className={`cursor-pointer transition-colors ${active ? "border-primary ring-1 ring-primary" : "hover:bg-muted/30"}`}
                  onClick={() => setWorkspaceId(active ? null : a.id)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{a.name}</p>
                        {a.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{total} {t("common.components")}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleExport(a.id); }}>
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(a.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${active ? "rotate-90" : ""}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Workspace */}
        {workspace && (
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg truncate">{workspace.name}</h2>
              <Badge variant="secondary">{t("common.workspace_badge")}</Badge>
            </div>

            {/* Layer 0 — System Instructions */}
            <Card className="border-rose-200 bg-rose-50 dark:bg-rose-950 dark:border-rose-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-rose-600" />
                  {t("arch.layer_system_instructions")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Textarea
                  value={sysInstructions}
                  onChange={(e) => updateTextField("systemInstructions", e.target.value)}
                  rows={4}
                  className="bg-white dark:bg-background text-sm resize-none"
                  placeholder={isAr
                    ? "تعليمات النظام الأساسية الموجَّهة للنموذج في كل طلب..."
                    : "Core system instructions sent to the model on every request..."}
                />
              </CardContent>
            </Card>

            {/* Layer 1 — AGENTS.md Memory */}
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-orange-600" /> {t("arch.layer_memory")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Textarea
                  value={agentsContent}
                  onChange={(e) => updateTextField("agentsContent", e.target.value)}
                  rows={4}
                  className="bg-white dark:bg-background text-sm resize-none"
                  placeholder={isAr ? "دستور الوكيل — القيم، القواعد، الهوية..." : "Agent constitution — values, rules, identity..."}
                />
              </CardContent>
            </Card>

            {/* ADK Layers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LAYER_CONFIG.map(({ key, icon: Icon, labelKey, color }) => {
                const items = componentLists[key] ?? [];
                const selected = (workspace.layers[key] as number[]) ?? [];
                return (
                  <Card key={key} className={`border ${color}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Icon className="h-4 w-4" /> {t(labelKey)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-1.5 max-h-48 overflow-y-auto">
                      {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">{t("common.no_items")}</p>
                      ) : (
                        items.map((item) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={selected.includes(item.id)}
                              onCheckedChange={() => toggleId(key as keyof ArchLayers, item.id)}
                              id={`${key}-${item.id}`}
                            />
                            <label htmlFor={`${key}-${item.id}`} className="text-sm cursor-pointer leading-none">
                              {item.name}
                            </label>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* MCP Servers */}
            <Card className="border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Server className="h-4 w-4" /> {t("arch.mcp_panel")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 flex flex-wrap gap-2">
                {mcpServers.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">{t("common.no_mcp_servers")}</p>
                ) : (
                  mcpServers.map((s) => {
                    const selected = (workspace.layers.mcpServerIds ?? []).includes(s.id);
                    return (
                      <Badge
                        key={s.id}
                        variant={selected ? "default" : "outline"}
                        className="cursor-pointer select-none"
                        onClick={() => toggleId("mcpServerIds", s.id)}
                      >
                        {s.name}
                      </Badge>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  addArchToCanvas(workspace.id);
                  navigate("/canvas");
                }}
              >
                <MonitorPlay className="h-4 w-4 me-2" /> {t("arch.show_on_canvas")}
              </Button>
              <Button variant="outline" onClick={() => handleExport(workspace.id)} size="sm">
                <Download className="h-4 w-4 me-2" /> {t("arch.export")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("arch.create_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("common.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isAr ? "مثال: وكيل تطوير البرمجيات" : "e.g. Software Development Agent"} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.description_optional")}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder={isAr ? "وصف موجز لهذا التصميم المعماري..." : "Brief description of this architecture design..."} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t("common.cancel")}</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createMutation.isPending}>
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export preview dialog */}
      <Dialog open={!!exportMd} onOpenChange={(o) => { if (!o) setExportMd(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> {t("arch.export")}
            </DialogTitle>
          </DialogHeader>
          <pre className="bg-muted rounded-lg p-4 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
            {exportMd}
          </pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              if (exportMd) {
                navigator.clipboard.writeText(exportMd);
                toast({ title: t("common.copied") });
              }
            }}>
              {t("common.copy")}
            </Button>
            <Button onClick={() => setExportMd(null)}>{t("common.cancel")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
