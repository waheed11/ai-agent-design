import { useState } from "react";
import { useListToolEvaluations, useCreateToolEvaluation, useDeleteToolEvaluation, getListToolEvaluationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Wrench, Plus, Trash2, CheckCircle, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const recIcons = {
  USE: <CheckCircle className="w-4 h-4 text-green-600" />,
  USE_WITH_CAVEATS: <AlertTriangle className="w-4 h-4 text-yellow-600" />,
  AVOID: <XCircle className="w-4 h-4 text-red-600" />,
};

const recColors = {
  USE: "text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-100",
  USE_WITH_CAVEATS: "text-yellow-700 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-100",
  AVOID: "text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-100",
};

export default function ToolEvaluationsList() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAr = language === "ar";

  const { data: evaluations, isLoading } = useListToolEvaluations();
  const deleteEvaluation = useDeleteToolEvaluation();

  const [showCreate, setShowCreate] = useState(false);
  const [toolName, setToolName] = useState("");
  const [toolUrl, setToolUrl] = useState("");
  const [requirements, setRequirements] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [streamContent, setStreamContent] = useState("");

  const handleCreate = async () => {
    if (!toolName.trim() || !requirements.trim()) return;
    setIsEvaluating(true);
    setStreamContent("");

    try {
      const response = await fetch("/api/tool-evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolName: toolName.trim(), toolUrl: toolUrl.trim() || null, projectRequirements: requirements.trim(), language }),
      });

      if (!response.ok) throw new Error("Failed");

      const reader = response.body?.getReader();
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
            if (parsed.type === "delta") setStreamContent((p) => p + parsed.content);
            else if (parsed.type === "done") {
              qc.invalidateQueries({ queryKey: getListToolEvaluationsQueryKey() });
              setShowCreate(false);
              setToolName("");
              setToolUrl("");
              setRequirements("");
              setStreamContent("");
              setIsEvaluating(false);
              if (parsed.evaluation?.id) setLocation(`/tool-evaluations/${parsed.evaluation.id}`);
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      toast({ title: isAr ? "خطأ في التقييم" : "Evaluation error", variant: "destructive" });
      setIsEvaluating(false);
    }
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteEvaluation.mutate(
      { id },
      {
        onSuccess: () => qc.invalidateQueries({ queryKey: getListToolEvaluationsQueryKey() }),
        onError: () => toast({ title: "Error deleting", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isAr ? "تقييمات الأدوات" : "Tool Evaluations"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? "قيِّم أي أداة أو إطار عمل لمعرفة مدى ملاءمتها لمشروعك" : "Evaluate any tool or framework for your project"}
          </p>
        </div>
        <Button data-testid="button-new-evaluation" onClick={() => setShowCreate(true)} size="sm">
          <Plus className="w-4 h-4 me-2" />
          {isAr ? "تقييم جديد" : "New Evaluation"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
      ) : !evaluations || evaluations.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Wrench className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {isAr ? "لا توجد تقييمات بعد. ابدأ بتقييم أداة!" : "No evaluations yet. Start evaluating a tool!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {evaluations.map((ev) => (
            <Link key={ev.id} href={`/tool-evaluations/${ev.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer" data-testid={`card-evaluation-${ev.id}`}>
                <CardContent className="py-4 px-5 flex items-center gap-4">
                  <Wrench className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{ev.toolName}</p>
                      {ev.recommendation && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${recColors[ev.recommendation as keyof typeof recColors] ?? ""}`}>
                          {recIcons[ev.recommendation as keyof typeof recIcons]}
                          {ev.recommendation.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ev.projectRequirements}</p>
                    {ev.fitScore != null && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-24 h-1.5 rounded-full bg-border overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${ev.fitScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">{ev.fitScore}/100</span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    data-testid={`button-delete-evaluation-${ev.id}`}
                    onClick={(e) => handleDelete(ev.id, e)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={(open) => { if (!isEvaluating) setShowCreate(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isAr ? "تقييم أداة جديدة" : "New Tool Evaluation"}</DialogTitle>
          </DialogHeader>
          {isEvaluating ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAr ? `جاري تقييم ${toolName}...` : `Evaluating ${toolName}...`}</span>
              </div>
              <div className="bg-muted rounded-lg p-3 text-xs font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                {streamContent || "..."}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                data-testid="input-tool-name"
                placeholder={isAr ? "اسم الأداة (مثال: Neo4j, LangChain)..." : "Tool name (e.g. Neo4j, LangChain)..."}
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                autoFocus
              />
              <Input
                data-testid="input-tool-url"
                placeholder={isAr ? "رابط الأداة (اختياري)..." : "Tool URL (optional)..."}
                value={toolUrl}
                onChange={(e) => setToolUrl(e.target.value)}
              />
              <Textarea
                data-testid="input-requirements"
                placeholder={isAr ? "متطلبات مشروعك التي يجب أن تلبيها الأداة..." : "Your project requirements that the tool must meet..."}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>
          )}
          {!isEvaluating && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                data-testid="button-start-evaluation"
                onClick={handleCreate}
                disabled={!toolName.trim() || !requirements.trim() || isEvaluating}
              >
                {isAr ? "بدء التقييم" : "Start Evaluation"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
