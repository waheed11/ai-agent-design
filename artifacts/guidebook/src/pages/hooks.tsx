import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Plus, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Hook {
  id: number;
  name: string;
  eventType: string;
  matcherPattern: string;
  command: string;
  description: string;
  enabled: boolean;
  createdAt: string;
}

const EVENT_TYPES = ["PreToolUse", "PostToolUse", "SessionStart", "Stop", "SubagentStop"];

const EVENT_COLORS: Record<string, string> = {
  PreToolUse: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  PostToolUse: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  SessionStart: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Stop: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  SubagentStop: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (path: string) => `${BASE}${path}`;

export default function Hooks() {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAr = language === "ar";

  const { data: hooks, isLoading } = useQuery<Hook[]>({
    queryKey: ["hooks"],
    queryFn: () => fetch(api("/api/hooks")).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (body: Partial<Hook>) =>
      fetch(api("/api/hooks"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hooks"] }); closeDialog(); },
    onError: () => toast({ title: t("common.error_create"), variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Partial<Hook> & { id: number }) =>
      fetch(api(`/api/hooks/${id}`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hooks"] }); closeDialog(); },
    onError: () => toast({ title: t("common.error_update"), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(api(`/api/hooks/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hooks"] }),
    onError: () => toast({ title: t("common.error_delete"), variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      fetch(api(`/api/hooks/${id}`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hooks"] }),
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editHook, setEditHook] = useState<Hook | null>(null);
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState("PreToolUse");
  const [matcherPattern, setMatcherPattern] = useState("*");
  const [command, setCommand] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(true);

  const openCreate = () => {
    setEditHook(null); setName(""); setEventType("PreToolUse"); setMatcherPattern("*"); setCommand(""); setDescription(""); setEnabled(true); setShowDialog(true);
  };
  const openEdit = (h: Hook) => {
    setEditHook(h); setName(h.name); setEventType(h.eventType); setMatcherPattern(h.matcherPattern); setCommand(h.command); setDescription(h.description); setEnabled(h.enabled); setShowDialog(true);
  };
  const closeDialog = () => { setShowDialog(false); setEditHook(null); };

  const handleSave = () => {
    const body = { name, eventType, matcherPattern, command, description, enabled };
    if (editHook) updateMutation.mutate({ id: editHook.id, ...body });
    else createMutation.mutate(body);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" /> {t("hooks.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("hooks.description")}</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 me-2" /> {t("hooks.new")}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      ) : !hooks || hooks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("hooks.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {hooks.map((h) => (
            <Card key={h.id} className={`transition-colors ${h.enabled ? "" : "opacity-60"}`}>
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <Switch
                  checked={h.enabled}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: h.id, enabled: checked })}
                  className="shrink-0"
                />
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${EVENT_COLORS[h.eventType] ?? "bg-muted text-muted-foreground"}`}>
                  {h.eventType}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{h.name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {h.matcherPattern} → {h.command}
                  </p>
                  {h.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{h.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(h)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(h.id)}>
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
            <DialogTitle>{editHook ? t("hooks.edit_title") : t("hooks.create_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("common.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isAr ? "مثال: منع الأوامر الخطرة" : "e.g. Block dangerous commands"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("hooks.event_type")}</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("hooks.matcher")}</Label>
                <Input value={matcherPattern} onChange={(e) => setMatcherPattern(e.target.value)} placeholder="*" className="font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("hooks.command")}</Label>
              <Textarea value={command} onChange={(e) => setCommand(e.target.value)} rows={3} className="font-mono text-sm" placeholder={isAr ? "الأمر أو الإجراء الذي سيتم تنفيذه..." : "The command or action to execute..."} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.description_optional")}</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isAr ? "وصف مختصر لهذا الخطاف..." : "Brief description of this hook..."} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={enabled} onCheckedChange={setEnabled} />
              <Label>{enabled ? t("hooks.enabled") : t("hooks.disabled")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={!name.trim() || !command.trim()}>
              {editHook ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
