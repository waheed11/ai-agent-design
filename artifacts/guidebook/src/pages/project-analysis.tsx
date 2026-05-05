import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Github, Loader2, Search, TrendingUp, TrendingDown,
  Lightbulb, Star, GitFork, Shield, CheckCircle2, AlertTriangle, AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AnalysisResult {
  repoInfo: {
    name: string;
    description: string;
    language: string;
    stars: number;
    forks: number;
    topics: string[];
    license: string;
    lastUpdated: string;
  };
  summary: string;
  overallScore: number;
  categories: Array<{ name: string; score: number; description: string }>;
  strengths: Array<{ title: string; description: string }>;
  weaknesses: Array<{ title: string; description: string; severity: "low" | "medium" | "high" }>;
  recommendations: Array<{ title: string; description: string; priority: "low" | "medium" | "high"; effort: "low" | "medium" | "high" }>;
  bestPracticesAlignment: string;
}

const severityConfig = {
  low: { color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: AlertCircle, label: { ar: "منخفض", en: "Low" } },
  medium: { color: "text-orange-600 bg-orange-50 border-orange-200", icon: AlertTriangle, label: { ar: "متوسط", en: "Medium" } },
  high: { color: "text-red-600 bg-red-50 border-red-200", icon: AlertTriangle, label: { ar: "عالٍ", en: "High" } },
};

const priorityConfig = {
  low: { color: "bg-slate-100 text-slate-700", label: { ar: "أولوية منخفضة", en: "Low priority" } },
  medium: { color: "bg-blue-100 text-blue-700", label: { ar: "أولوية متوسطة", en: "Medium priority" } },
  high: { color: "bg-red-100 text-red-700", label: { ar: "أولوية عالية", en: "High priority" } },
};

const effortConfig = {
  low: { label: { ar: "جهد بسيط", en: "Low effort" } },
  medium: { label: { ar: "جهد متوسط", en: "Medium effort" } },
  high: { label: { ar: "جهد كبير", en: "High effort" } },
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? "text-green-500" : score >= 50 ? "text-yellow-500" : "text-red-500";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn("text-5xl font-bold tabular-nums", color)}>{score}</div>
      <div className="text-xs text-muted-foreground">/100</div>
    </div>
  );
}

export default function ProjectAnalysis() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === "ar";

  const [githubUrl, setGithubUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!githubUrl.trim()) return;
    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/project-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl: githubUrl.trim(), language }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        toast({ title: err.error ?? (isAr ? "فشل التحليل" : "Analysis failed"), variant: "destructive" });
        return;
      }

      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch {
      toast({ title: isAr ? "خطأ في الاتصال" : "Connection error", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Github className="w-6 h-6" />
          {isAr ? "تحليل وتطوير مشروع وكيل ذكاء اصطناعي" : "AI Agent Project Analyzer"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isAr
            ? "أدخل رابط مشروع GitHub وسيُحلَّل لك نقاط القوة والضعف مع توصيات تطوير مبنية على أفضل ممارسات بناء وكلاء الذكاء الاصطناعي"
            : "Enter a GitHub repository URL to get a comprehensive analysis of strengths, weaknesses, and improvement recommendations based on AI agent best practices"}
        </p>
      </div>

      {/* URL Input */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Github className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-testid="input-github-url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                placeholder="https://github.com/owner/repo"
                className="ps-9 font-mono text-sm"
                dir="ltr"
              />
            </div>
            <Button
              data-testid="button-analyze"
              onClick={handleAnalyze}
              disabled={!githubUrl.trim() || isLoading}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 me-2 animate-spin" />{isAr ? "جاري التحليل..." : "Analyzing..."}</>
              ) : (
                <><Search className="w-4 h-4 me-2" />{isAr ? "تحليل المشروع" : "Analyze Project"}</>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {isAr
              ? "يدعم المستودعات العامة فقط • مثال: https://github.com/langchain-ai/langchain"
              : "Public repositories only • e.g., https://github.com/langchain-ai/langchain"}
          </p>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <div className="text-center space-y-1">
              <p className="font-medium">{isAr ? "جاري تحليل المشروع..." : "Analyzing project..."}</p>
              <p className="text-sm">{isAr ? "يتم جلب بيانات المستودع وتحليلها بالذكاء الاصطناعي" : "Fetching repository data and running AI analysis"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !isLoading && (
        <div className="space-y-5">
          {/* Repo Info Bar */}
          <Card className="bg-muted/40">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-start gap-4 justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-lg" dir="ltr">{result.repoInfo.name}</h2>
                    {result.repoInfo.language && (
                      <Badge variant="outline">{result.repoInfo.language}</Badge>
                    )}
                    {result.repoInfo.topics.slice(0, 4).map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                  {result.repoInfo.description && (
                    <p className="text-sm text-muted-foreground mt-1">{result.repoInfo.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0" dir="ltr">
                  <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />{result.repoInfo.stars.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" />{result.repoInfo.forks.toLocaleString()}</span>
                  {result.repoInfo.license && (
                    <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" />{result.repoInfo.license}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Score + Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1 flex items-center justify-center py-6">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {isAr ? "النتيجة الإجمالية" : "Overall Score"}
                </p>
                <ScoreRing score={result.overallScore} />
                <p className="text-xs text-muted-foreground">
                  {result.overallScore >= 75
                    ? (isAr ? "ممتاز" : "Excellent")
                    : result.overallScore >= 50
                    ? (isAr ? "جيد" : "Good")
                    : (isAr ? "يحتاج تحسين" : "Needs Improvement")}
                </p>
              </div>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{isAr ? "الملخص" : "Summary"}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{result.summary}</p>
                <Separator className="my-3" />
                <p className="text-sm text-muted-foreground leading-relaxed">{result.bestPracticesAlignment}</p>
              </CardContent>
            </Card>
          </div>

          {/* Category Scores */}
          {result.categories && result.categories.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{isAr ? "التقييم التفصيلي" : "Category Scores"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.categories.map((cat, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{cat.name}</span>
                      <span className={cn(
                        "font-bold tabular-nums",
                        cat.score >= 75 ? "text-green-600" : cat.score >= 50 ? "text-yellow-600" : "text-red-600"
                      )}>{cat.score}%</span>
                    </div>
                    <Progress value={cat.score} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <Card className="border-green-200 dark:border-green-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                  <TrendingUp className="w-4 h-4" />
                  {isAr ? "نقاط القوة" : "Strengths"}
                  <Badge variant="outline" className="ms-auto text-xs border-green-300 text-green-700">{result.strengths.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.strengths.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Weaknesses */}
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
                  <TrendingDown className="w-4 h-4" />
                  {isAr ? "نقاط الضعف" : "Weaknesses"}
                  <Badge variant="outline" className="ms-auto text-xs border-red-300 text-red-700">{result.weaknesses.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.weaknesses.map((w, i) => {
                  const cfg = severityConfig[w.severity] ?? severityConfig.medium;
                  const SevIcon = cfg.icon;
                  return (
                    <div key={i} className="flex gap-2">
                      <SevIcon className={cn("w-4 h-4 mt-0.5 shrink-0", w.severity === "high" ? "text-red-500" : w.severity === "medium" ? "text-orange-500" : "text-yellow-500")} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{w.title}</p>
                          <span className={cn("text-xs px-1.5 py-0.5 rounded border font-medium", cfg.color)}>
                            {cfg.label[isAr ? "ar" : "en"]}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{w.description}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                {isAr ? "توصيات التطوير والتحسين" : "Development Recommendations"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.recommendations
                .sort((a, b) => {
                  const ord = { high: 0, medium: 1, low: 2 };
                  return (ord[a.priority] ?? 1) - (ord[b.priority] ?? 1);
                })
                .map((rec, i) => {
                  const priCfg = priorityConfig[rec.priority] ?? priorityConfig.medium;
                  const effCfg = effortConfig[rec.effort] ?? effortConfig.medium;
                  return (
                    <div key={i} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{rec.title}</p>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priCfg.color)}>
                            {priCfg.label[isAr ? "ar" : "en"]}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {effCfg.label[isAr ? "ar" : "en"]}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
