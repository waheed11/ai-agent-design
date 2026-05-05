import { useState } from "react";
import { useListPlans, useCreatePlan, useDeletePlan, getListPlansQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Plus, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PlansList() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAr = language === "ar";

  const { data: plans, isLoading } = useListPlans();
  const createPlan = useCreatePlan();
  const deletePlan = useDeletePlan();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [initialPrompt, setInitialPrompt] = useState("");

  const handleCreate = () => {
    if (!title.trim() || !initialPrompt.trim()) return;
    createPlan.mutate(
      { data: { title: title.trim(), initialPrompt: initialPrompt.trim(), language } },
      {
        onSuccess: (plan) => {
          qc.invalidateQueries({ queryKey: getListPlansQueryKey() });
          setShowCreate(false);
          setTitle("");
          setInitialPrompt("");
          setLocation(`/plans/${plan.id}`);
        },
        onError: () => toast({ title: "Error creating plan", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deletePlan.mutate(
      { id },
      {
        onSuccess: () => qc.invalidateQueries({ queryKey: getListPlansQueryKey() }),
        onError: () => toast({ title: "Error deleting plan", variant: "destructive" }),
      }
    );
  };

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    prompt_generated: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100",
    approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    exported: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    arch_generated: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  };

  const statusLabels: Record<string, { ar: string; en: string }> = {
    draft: { ar: "مسودة", en: "Draft" },
    prompt_generated: { ar: "قيد المراجعة", en: "Under Review" },
    approved: { ar: "معتمد", en: "Approved" },
    exported: { ar: "مُصدَّر", en: "Exported" },
    arch_generated: { ar: "تم توليد المعمارية", en: "Architecture Generated" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isAr ? "خطط المشاريع" : "Project Plans"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? "خطط مشاريع الذكاء الاصطناعي وأنظمة الوكلاء" : "AI project and agent system plans"}
          </p>
        </div>
        <Button data-testid="button-new-plan" onClick={() => setShowCreate(true)} size="sm">
          <Plus className="w-4 h-4 me-2" />
          {isAr ? "خطة جديدة" : "New Plan"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : !plans || plans.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {isAr ? "لا توجد خطط بعد. أنشئ خطة مشروع جديدة!" : "No plans yet. Create a new project plan!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => (
            <Link key={plan.id} href={`/plans/${plan.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer" data-testid={`card-plan-${plan.id}`}>
                <CardContent className="py-4 px-5 flex items-start gap-4">
                  <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{plan.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{plan.initialPrompt}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(plan.updatedAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[plan.status] ?? ""}`}>
                        {statusLabels[plan.status]?.[isAr ? "ar" : "en"] ?? plan.status}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    data-testid={`button-delete-plan-${plan.id}`}
                    onClick={(e) => handleDelete(plan.id, e)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isAr ? "خطة مشروع جديدة" : "New Project Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              data-testid="input-plan-title"
              placeholder={isAr ? "عنوان المشروع..." : "Project title..."}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              data-testid="input-plan-prompt"
              placeholder={isAr ? "البروبت الأولي - صف مشروعك بالتفصيل..." : "Initial prompt - describe your project in detail..."}
              value={initialPrompt}
              onChange={(e) => setInitialPrompt(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              data-testid="button-create-plan"
              onClick={handleCreate}
              disabled={!title.trim() || !initialPrompt.trim() || createPlan.isPending}
            >
              {isAr ? "إنشاء" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
