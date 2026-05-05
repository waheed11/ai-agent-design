import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Plus, Trash2, Pencil, ArrowRight, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Subagent {
  id: number;
  name: string;
  role: string;
  modelPreference: string;
  tools: string[];
  permissions: string;
  notes: string;
  createdAt: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (path: string) => `${BASE}${path}`;

export default function Subagents() {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAr = language === "ar";

  const { data: subagents, isLoading } = useQuery<Subagent[]>({
    queryKey: ["subagents"],
    queryFn: () => fetch(api("/api/subagents")).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (body: Partial<Subagent>) =>
      fetch(api("/api/subagents"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subagents"] }); closeDialog(); },
    onError: () => toast({ title: t("common.error_create"), variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Partial<Subagent> & { id: number }) =>
      fetch(api(`/api/subagents/${id}`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subagents"] }); closeDialog(); },
    onError: () => toast({ title: t("common.error_update"), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(api(`/api/subagents/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subagents"] }),
    onError: () => toast({ title: t("common.error_delete"), variant: "destructive" }),
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editSub, setEditSub] = useState<Subagent | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [modelPreference, setModelPreference] = useState("gpt-4o-mini");
  const [tools, setTools] = useState("");
  const [permissions, setPermissions] = useState("");
  const [notes, setNotes] = useState("");

  const openCreate = () => {
    setEditSub(null); setName(""); setRole(""); setModelPreference("gpt-4o-mini"); setTools(""); setPermissions(""); setNotes(""); setShowDialog(true);
  };
  const openEdit = (s: Subagent) => {
    setEditSub(s); setName(s.name); setRole(s.role); setModelPreference(s.modelPreference); setTools(s.tools.join(", ")); setPermissions(s.permissions); setNotes(s.notes); setShowDialog(true);
  };
  const closeDialog = () => { setShowDialog(false); setEditSub(null); };

  const handleSave = () => {
    const toolList = tools.split(",").map((t) => t.trim()).filter(Boolean);
    const body = { name, role, modelPreference, tools: toolList, permissions, notes };
    if (editSub) updateMutation.mutate({ id: editSub.id, ...body });
    else createMutation.mutate(body);
  };

  const DelegateArrow = isAr ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" /> {t("subagents.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subagents.description")}</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 me-2" /> {t("subagents.new")}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
        </div>
      ) : !subagents || subagents.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("subagents.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subagents.map((s) => (
            <Card key={s.id} className="hover:bg-muted/30 transition-colors">
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{s.name}</CardTitle>
                    <p className="text-xs text-muted-foreground truncate">{s.modelPreference}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-muted-foreground shrink-0 mt-0.5">{t("subagents.role")}:</span>
                  <span className="line-clamp-2">{s.role}</span>
                </div>
                {s.tools.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.tools.slice(0, 4).map((tool) => (
                      <Badge key={tool} variant="secondary" className="text-xs">{tool}</Badge>
                    ))}
                    {s.tools.length > 4 && <Badge variant="secondary" className="text-xs">+{s.tools.length - 4}</Badge>}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border">
                  <span className="text-primary font-medium">{isAr ? "التفويض فقط" : "delegate only"}</span>
                  <DelegateArrow className="h-3 w-3" />
                  <Bot className="h-3 w-3" />
                  <DelegateArrow className="h-3 w-3" />
                  <span className="text-primary font-medium">{isAr ? "النتائج فقط" : "results only"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editSub ? t("subagents.edit_title") : t("subagents.create_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("common.name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isAr ? "مثال: مراجع الكود" : "e.g. code-reviewer"} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("subagents.model")}</Label>
                <Input value={modelPreference} onChange={(e) => setModelPreference(e.target.value)} placeholder="gpt-4o-mini" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("subagents.role")}</Label>
              <Textarea value={role} onChange={(e) => setRole(e.target.value)} rows={3} placeholder={isAr ? "وصف دور هذا الوكيل الفرعي ومسؤولياته..." : "Describe this subagent's role and responsibilities..."} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("subagents.tools")}</Label>
              <Input value={tools} onChange={(e) => setTools(e.target.value)} placeholder={isAr ? "web_search, code_execution, file_read" : "web_search, code_execution, file_read"} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("subagents.permissions")}</Label>
              <Input value={permissions} onChange={(e) => setPermissions(e.target.value)} placeholder={isAr ? "قراءة فقط، لا نشر..." : "read-only, no deploy..."} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("subagents.notes")}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={isAr ? "ملاحظات إضافية..." : "Additional notes..."} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={!name.trim() || !role.trim()}>
              {editSub ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
