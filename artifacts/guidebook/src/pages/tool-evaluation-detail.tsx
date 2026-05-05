import { useGetToolEvaluation, getGetToolEvaluationQueryKey } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, AlertTriangle, XCircle, ExternalLink } from "lucide-react";

export default function ToolEvaluationDetail() {
  const { id } = useParams<{ id: string }>();
  const evalId = parseInt(id, 10);
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const isAr = language === "ar";

  const { data: evaluation, isLoading } = useGetToolEvaluation(evalId, {
    query: { enabled: !!evalId, queryKey: getGetToolEvaluationQueryKey(evalId) },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!evaluation) {
    return <div className="text-center py-16 text-muted-foreground">{isAr ? "التقييم غير موجود" : "Evaluation not found"}</div>;
  }

  const recConfig = {
    USE: {
      icon: <CheckCircle className="w-5 h-5" />,
      color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100",
      label: isAr ? "استخدم" : "USE",
    },
    USE_WITH_CAVEATS: {
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100",
      label: isAr ? "استخدم مع تحفظات" : "USE WITH CAVEATS",
    },
    AVOID: {
      icon: <XCircle className="w-5 h-5" />,
      color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100",
      label: isAr ? "تجنب" : "AVOID",
    },
  };

  const rec = evaluation.recommendation as keyof typeof recConfig | null;
  const recInfo = rec ? recConfig[rec] : null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/tool-evaluations")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{evaluation.toolName}</h1>
          {evaluation.toolUrl && (
            <a href={evaluation.toolUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1 mt-1 hover:underline">
              <ExternalLink className="w-3 h-3" />
              {evaluation.toolUrl}
            </a>
          )}
        </div>
      </div>

      {recInfo && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${recInfo.color}`} data-testid="recommendation-badge">
          {recInfo.icon}
          <div>
            <p className="font-bold text-lg">{recInfo.label}</p>
            {evaluation.fitScore != null && (
              <div className="flex items-center gap-3 mt-1">
                <div className="w-48 h-2 rounded-full bg-black/10 overflow-hidden">
                  <div className="h-full rounded-full bg-current opacity-60" style={{ width: `${evaluation.fitScore}%` }} />
                </div>
                <span className="text-sm font-mono font-bold">{evaluation.fitScore}/100</span>
              </div>
            )}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {isAr ? "متطلبات المشروع" : "Project Requirements"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{evaluation.projectRequirements}</p>
        </CardContent>
      </Card>

      {evaluation.report && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isAr ? "تقرير التقييم التفصيلي" : "Detailed Evaluation Report"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none" data-testid="evaluation-report">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{evaluation.report}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Badge variant="outline">{evaluation.status}</Badge>
        <span className="text-xs text-muted-foreground">
          {new Date(evaluation.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
        </span>
      </div>
    </div>
  );
}
