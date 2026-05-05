import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Puzzle, Plus, Trash2, Pencil, Wand2, Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Skill {
  id: number;
  name: string;
  description: string;
  category: string;
  triggerKeywords: string[];
  content: string;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = ["general", "coding", "research", "analysis", "writing", "planning", "security", "testing"];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (path: string) => `${BASE}${path}`;

export default function Skills() {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAr = language === "ar";

  const { data: skills, isLoading } = useQuery<Skill[]>({
    queryKey: ["skills"],
    queryFn: () => fetch(api("/api/skills")).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (body: Partial<Skill>) =>
      fetch(api("/api/skills"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["skills"] }); closeDialog(); },
    onError: () => toast({ title: t("common.error_create"), variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Partial<Skill> & { id: number }) =>
      fetch(api(`/api/skills/${id}`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["skills"] }); closeDialog(); },
    onError: () => toast({ title: t("common.error_update"), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(api(`/api/skills/${id}`), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
    onError: () => toast({ title: t("common.error_delete"), variant: "destructive" }),
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editSkill, setEditSkill] = useState<Skill | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [keywords, setKeywords] = useState("");
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLTextAreaElement>(null);

  const openCreate = () => {
    setEditSkill(null); setName(""); setDescription(""); setCategory("general"); setKeywords(""); setContent(""); setShowDialog(true);
  };
  const openEdit = (s: Skill) => {
    setEditSkill(s); setName(s.name); setDescription(s.description); setCategory(s.category); setKeywords(s.triggerKeywords.join(", ")); setContent(s.content); setShowDialog(true);
  };
  const closeDialog = () => { setShowDialog(false); setEditSkill(null); setIsGenerating(false); };

  const handleSave = () => {
    const kws = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    if (editSkill) {
      updateMutation.mutate({ id: editSkill.id, name, description, category, triggerKeywords: kws, content });
    } else {
      createMutation.mutate({ name, description, category, triggerKeywords: kws, content });
    }
  };

  const handleGenerate = async () => {
    if (!name.trim() || !description.trim()) {
      toast({ title: t("common.error_required"), variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setContent("");
    try {
      const res = await fetch(api("/api/skills/generate-content"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, category, triggerKeywords: keywords.split(",").map((k) => k.trim()).filter(Boolean), language }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "delta") setContent((p) => p + parsed.content);
          } catch { /* ignore */ }
        }
      }
    } catch {
      toast({ title: t("common.error_generate"), variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyContent = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (content && outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [content]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Puzzle className="h-6 w-6 text-primary" /> {t("skills.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("skills.description")}</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 me-2" /> {t("skills.new")}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
        </div>
      ) : !skills || skills.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Puzzle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("skills.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skills.map((s) => (
            <Card key={s.id} className="hover:bg-muted/30 transition-colors">
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{s.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
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
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge variant="secondary" className="text-xs">{s.category}</Badge>
                  {s.triggerKeywords.slice(0, 3).map((kw) => (
                    <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                  ))}
                  {s.triggerKeywords.length > 3 && (
                    <Badge variant="outline" className="text-xs">+{s.triggerKeywords.length - 3}</Badge>
                  )}
                </div>
                {s.content && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2 font-mono">{s.content.slice(0, 120)}…</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(o) => { if (!isGenerating) setShowDialog(o); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editSkill ? t("skills.edit_title") : t("skills.create_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("skills.name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isAr ? "مثال: مساعد الكود" : "e.g. Code Assistant"} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("skills.category")}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.description")}</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isAr ? "وصف مختصر لهذه المهارة..." : "Brief description of this skill..."} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("skills.trigger_keywords")}</Label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder={isAr ? "كود, برمجة, تطوير" : "code, programming, development"} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>{t("skills.content")}</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating || !name.trim() || !description.trim()}>
                    {isGenerating ? <Loader2 className="w-3.5 h-3.5 me-1 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 me-1" />}
                    {isGenerating ? t("skills.generating") : t("skills.generate")}
                  </Button>
                  {content && (
                    <Button variant="outline" size="sm" onClick={copyContent}>
                      {copied ? <Check className="w-3.5 h-3.5 me-1" /> : <Copy className="w-3.5 h-3.5 me-1" />}
                      {copied ? t("common.copied") : t("common.copy")}
                    </Button>
                  )}
                </div>
              </div>
              <Textarea
                ref={outputRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="resize-none font-mono text-sm"
                placeholder={isAr ? "محتوى المهارة بصيغة Markdown..." : "Skill content in Markdown format..."}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={!name.trim() || !description.trim() || createMutation.isPending || updateMutation.isPending}>
              {editSkill ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
