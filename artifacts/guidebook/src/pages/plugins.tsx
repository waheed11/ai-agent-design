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
import { Package, Plus, Trash2, Pencil, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Plugin {
  id: number;
  name: string;
  description: string;
  version: string;
  installCommand: string;
  components: string[];
  createdAt: string;
}

const COMPONENT_OPTIONS = ["skills", "agents", "hooks", "commands"];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (path: string) => `${BASE}${path}`;

export default function Plugins() {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAr = language === "ar";

  const { data: plugins, isLoading } = useQuery<Plugin[]>({
    queryKey: ["plugins"],
    queryFn: () => fetch(api("/api/plugins")).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (body: Partial<Plugin>) =>
      fetch(api("/api/plugins"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plugins"] }); closeDialog(); },
    onError: () => toast({ title: t("common.error_create"), variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Partial<Plugin> & { id: number }) =>
      fetch(api(`/api/plugins/${id}`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plugins"] }); closeDialog(); },
    onError: () => toast({ title: t("common.error_update"), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(api(`/api/plugins/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plugins"] }),
    onError: () => toast({ title: t("common.error_delete"), variant: "destructive" }),
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editPlugin, setEditPlugin] = useState<Plugin | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [installCommand, setInstallCommand] = useState("");
  const [components, setComponents] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  const openCreate = () => {
    setEditPlugin(null); setName(""); setDescription(""); setVersion("1.0.0"); setInstallCommand(""); setComponents([]); setShowDialog(true);
  };
  const openEdit = (p: Plugin) => {
    setEditPlugin(p); setName(p.name); setDescription(p.description); setVersion(p.version); setInstallCommand(p.installCommand); setComponents(p.components); setShowDialog(true);
  };
  const closeDialog = () => { setShowDialog(false); setEditPlugin(null); };

  const handleSave = () => {
    const body = { name, description, version, installCommand, components };
    if (editPlugin) updateMutation.mutate({ id: editPlugin.id, ...body });
    else createMutation.mutate(body);
  };

  const toggleComponent = (c: string) =>
    setComponents((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const copyInstall = (p: Plugin) => {
    navigator.clipboard.writeText(p.installCommand);
    setCopied(p.id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" /> {t("plugins.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("plugins.description")}</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 me-2" /> {t("plugins.new")}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : !plugins || plugins.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("plugins.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plugins.map((p) => (
            <Card key={p.id} className="hover:bg-muted/30 transition-colors">
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base truncate">{p.name}</CardTitle>
                    <Badge variant="outline" className="text-xs shrink-0">v{p.version}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {p.components.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.components.map((c) => (
                      <Badge key={c} variant="secondary" className="text-xs">{c}/</Badge>
                    ))}
                  </div>
                )}
                {p.installCommand && (
                  <div className="flex items-center gap-2 bg-muted rounded px-2 py-1">
                    <code className="text-xs font-mono flex-1 truncate">{p.installCommand}</code>
                    <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => copyInstall(p)}>
                      {copied === p.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editPlugin ? t("plugins.edit_title") : t("plugins.create_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>{t("common.name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isAr ? "مثال: agent-core-pack" : "e.g. agent-core-pack"} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("plugins.version")}</Label>
                <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.description")}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder={isAr ? "وصف ما تتضمنه هذه الحزمة..." : "Describe what this package includes..."} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("plugins.install_command")}</Label>
              <Input value={installCommand} onChange={(e) => setInstallCommand(e.target.value)} className="font-mono text-sm" placeholder="npm install @org/plugin-name" />
            </div>
            <div className="space-y-2">
              <Label>{t("plugins.components")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {COMPONENT_OPTIONS.map((c) => (
                  <div key={c} className="flex items-center gap-2">
                    <Checkbox
                      id={`comp-${c}`}
                      checked={components.includes(c)}
                      onCheckedChange={() => toggleComponent(c)}
                    />
                    <label htmlFor={`comp-${c}`} className="text-sm cursor-pointer font-mono">{c}/</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={!name.trim() || !description.trim()}>
              {editPlugin ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
