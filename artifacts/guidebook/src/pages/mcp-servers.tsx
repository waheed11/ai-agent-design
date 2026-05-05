import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Server, Plus, Trash2, Pencil, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface McpServer {
  id: number;
  name: string;
  serverType: string;
  endpoint: string;
  capabilities: string;
  status: string;
  notes: string;
  createdAt: string;
}

const SERVER_TYPES = ["stdio", "sse", "http"];
const STATUS_OPTIONS = ["configured", "unconfigured", "testing"];

const STATUS_COLORS: Record<string, string> = {
  configured: "text-green-600",
  unconfigured: "text-yellow-600",
  testing: "text-blue-600",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (path: string) => `${BASE}${path}`;

export default function McpServers() {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAr = language === "ar";

  const { data: servers, isLoading } = useQuery<McpServer[]>({
    queryKey: ["mcp-servers"],
    queryFn: () => fetch(api("/api/mcp-servers")).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (body: Partial<McpServer>) =>
      fetch(api("/api/mcp-servers"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mcp-servers"] }); closeDialog(); },
    onError: () => toast({ title: t("common.error_create"), variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Partial<McpServer> & { id: number }) =>
      fetch(api(`/api/mcp-servers/${id}`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mcp-servers"] }); closeDialog(); },
    onError: () => toast({ title: t("common.error_update"), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(api(`/api/mcp-servers/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mcp-servers"] }),
    onError: () => toast({ title: t("common.error_delete"), variant: "destructive" }),
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editServer, setEditServer] = useState<McpServer | null>(null);
  const [name, setName] = useState("");
  const [serverType, setServerType] = useState("stdio");
  const [endpoint, setEndpoint] = useState("");
  const [capabilities, setCapabilities] = useState("");
  const [status, setStatus] = useState("configured");
  const [notes, setNotes] = useState("");

  const openCreate = () => {
    setEditServer(null); setName(""); setServerType("stdio"); setEndpoint(""); setCapabilities(""); setStatus("configured"); setNotes(""); setShowDialog(true);
  };
  const openEdit = (s: McpServer) => {
    setEditServer(s); setName(s.name); setServerType(s.serverType); setEndpoint(s.endpoint); setCapabilities(s.capabilities); setStatus(s.status); setNotes(s.notes); setShowDialog(true);
  };
  const closeDialog = () => { setShowDialog(false); setEditServer(null); };

  const handleSave = () => {
    const body = { name, serverType, endpoint, capabilities, status, notes };
    if (editServer) updateMutation.mutate({ id: editServer.id, ...body });
    else createMutation.mutate(body);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Server className="h-6 w-6 text-primary" /> {t("mcp.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("mcp.description")}</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 me-2" /> {t("mcp.new")}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      ) : !servers || servers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("mcp.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {servers.map((s) => (
            <Card key={s.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <Circle className={`h-3 w-3 shrink-0 fill-current ${STATUS_COLORS[s.status] ?? "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{s.name}</p>
                    <Badge variant="outline" className="text-xs shrink-0">{s.serverType}</Badge>
                  </div>
                  {s.endpoint && (
                    <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{s.endpoint}</p>
                  )}
                  {s.capabilities && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{s.capabilities}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editServer ? t("mcp.edit_title") : t("mcp.create_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("common.name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isAr ? "مثال: GitHub MCP" : "e.g. GitHub MCP"} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("mcp.server_type")}</Label>
                <Select value={serverType} onValueChange={setServerType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("mcp.endpoint")}</Label>
              <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} className="font-mono text-sm" placeholder={serverType === "stdio" ? "npx @org/mcp-server" : "https://mcp.example.com/sse"} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("mcp.capabilities")}</Label>
              <Textarea value={capabilities} onChange={(e) => setCapabilities(e.target.value)} rows={2} placeholder={isAr ? "ما هي القدرات والأدوات التي يوفرها هذا الخادم؟" : "What capabilities and tools does this server provide?"} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("mcp.status")}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("mcp.notes")}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={isAr ? "ملاحظات إضافية عن التهيئة أو الاستخدام..." : "Additional configuration or usage notes..."} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {editServer ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
