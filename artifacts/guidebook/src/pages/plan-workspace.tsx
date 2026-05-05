import { useState, useRef, useEffect } from "react";
import { useGetPlan, useGenerateProfessionalPrompt, getGetPlanQueryKey, getListPlansQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Send, Bot, User, Loader2, Sparkles, Upload,
  Copy, Check, FileText, CheckCircle2, Layers, ExternalLink,
  ChevronDown, ChevronUp, MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders markdown content with proper styling. Falls back gracefully for plain text. */
function MarkdownView({ content, className }: { content: string; className?: string }) {
  // If the content looks like raw JSON, try to extract readable text
  const display = content.trimStart().startsWith("{") || content.trimStart().startsWith("[")
    ? (() => {
        try {
          const obj = JSON.parse(content) as unknown;
          const extractText = (v: unknown, depth = 0): string => {
            if (typeof v === "string") return v;
            if (Array.isArray(v)) return v.map((x) => extractText(x, depth + 1)).join("\n\n");
            if (v && typeof v === "object") {
              return Object.entries(v as Record<string, unknown>)
                .map(([k, val]) => {
                  const valStr = extractText(val, depth + 1);
                  return depth === 0 ? `**${k}**\n${valStr}` : `- ${k}: ${valStr}`;
                })
                .join("\n\n");
            }
            return String(v ?? "");
          };
          return extractText(obj);
        } catch {
          return content;
        }
      })()
    : content;

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold mt-3 mb-1 text-primary">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-0.5">{children}</h3>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 ps-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 ps-2">{children}</ol>,
          li: ({ children }) => <li className="text-sm">{children}</li>,
          p: ({ children }) => <p className="mb-1">{children}</p>,
          code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
          hr: () => <hr className="my-2 border-border" />,
        }}
      >
        {display}
      </ReactMarkdown>
    </div>
  );
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Stepper ────────────────────────────────────────────────────────────────
function WorkflowStepper({ status, isAr }: { status: string; isAr: boolean }) {
  const steps = [
    { key: "draft",           label: isAr ? "المسودة"      : "Draft"        },
    { key: "prompt_generated",label: isAr ? "المراجعة"     : "Review"       },
    { key: "approved",        label: isAr ? "الاعتماد"     : "Approved"     },
    { key: "arch_generated",  label: isAr ? "المعمارية"    : "Architecture" },
  ];
  const order: Record<string, number> = {
    draft: 0, prompt_generated: 1, approved: 2, arch_generated: 3,
  };
  const current = order[status] ?? 0;

  return (
    <div className="flex items-start gap-0 mb-5 shrink-0">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center flex-1 min-w-0">
          <div className="flex flex-col items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all",
              i < current  ? "bg-primary border-primary text-primary-foreground" :
              i === current ? "border-primary text-primary bg-primary/10" :
                              "border-muted-foreground/30 text-muted-foreground/40",
            )}>
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn(
              "text-xs mt-1 whitespace-nowrap",
              i === current ? "text-primary font-medium" : "text-muted-foreground",
            )}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              "flex-1 h-px mx-2 mb-4 transition-all",
              i < current ? "bg-primary" : "bg-muted-foreground/20",
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── ChatPanel — defined OUTSIDE parent to prevent remount on every render ──
interface ChatPanelProps {
  messages: Array<{ role: "user" | "assistant"; content: string; streaming?: boolean }>;
  input: string;
  setInput: (v: string) => void;
  handleSend: () => void;
  isSending: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isAr: boolean;
  placeholder: string;
  className?: string;
}

function ChatPanel({ messages, input, setInput, handleSend, isSending, messagesEndRef, isAr, placeholder, className }: ChatPanelProps) {
  return (
    <div className={cn("flex flex-col min-h-0", className)}>
      <ScrollArea className="flex-1 pe-2 min-h-0">
        <div className="space-y-3 pb-2">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {isAr ? "ابدأ المحادثة..." : "Start the conversation..."}
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
                data-testid={`plan-message-${i}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm",
                )}>
                  {msg.content || (msg.streaming && <Loader2 className="w-3.5 h-3.5 animate-spin" />)}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="pt-2 border-t shrink-0">
        <div className="flex gap-2">
          <Textarea
            data-testid="input-plan-message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={placeholder}
            rows={2}
            className="resize-none text-sm"
            disabled={isSending}
          />
          <Button
            data-testid="button-send-plan"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            size="icon"
            className="h-auto py-2 px-3 shrink-0"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────
interface ExtendedPlan {
  id: number;
  title: string;
  initialPrompt: string;
  documentContext?: string | null;
  professionalPrompt?: string | null;
  executionPlan?: string | null;
  architectureId?: number | null;
  status: string;
  language: string;
  messages: Array<{ id: number; planId: number; role: string; content: string; createdAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

type ChatMsg = { role: "user" | "assistant"; content: string; streaming?: boolean };

// ── Main Component ─────────────────────────────────────────────────────────
export default function PlanWorkspace() {
  const { id } = useParams<{ id: string }>();
  const planId = parseInt(id, 10);
  const { language, t } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAr = language === "ar";
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: rawPlan, isLoading } = useGetPlan(planId, {
    query: { enabled: !!planId, queryKey: getGetPlanQueryKey(planId) },
  });
  const plan = rawPlan as ExtendedPlan | undefined;
  const generatePrompt = useGenerateProfessionalPrompt();

  const [streamMessages, setStreamMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isGeneratingArch, setIsGeneratingArch] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; chars: number } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showDoc, setShowDoc] = useState(false);
  const [showPreChat, setShowPreChat] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamMessages, plan?.messages]);

  // Merge DB messages + live stream
  const allMessages: ChatMsg[] = [
    ...(plan?.messages ?? []).map((m): ChatMsg => ({ role: m.role as "user" | "assistant", content: m.content })),
    ...streamMessages,
  ];

  // ── Chat send ────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const content = input.trim();
    setInput("");
    setIsSending(true);
    setStreamMessages((prev) => [
      ...prev,
      { role: "user", content },
      { role: "assistant", content: "", streaming: true },
    ]);
    try {
      const response = await fetch(`${BASE}/api/plans/${planId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, language }),
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
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "delta") {
              setStreamMessages((prev) => {
                const last = prev[prev.length - 1];
                if (!last || last.role !== "assistant") return prev;
                return [...prev.slice(0, -1), { ...last, content: last.content + event.content }];
              });
            } else if (event.type === "done") {
              setStreamMessages((prev) => {
                const last = prev[prev.length - 1];
                if (!last || last.role !== "assistant") return prev;
                return [...prev.slice(0, -1), { ...last, streaming: false }];
              });
              qc.invalidateQueries({ queryKey: getGetPlanQueryKey(planId) });
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch {
      toast({ title: t("chat.send_error"), variant: "destructive" });
      setStreamMessages((prev) => prev.filter((m) => !m.streaming));
    } finally {
      setIsSending(false);
    }
  };

  // ── Generate professional prompt ─────────────────────────────────────────
  const handleGeneratePrompt = () => {
    generatePrompt.mutate(
      { id: planId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetPlanQueryKey(planId) });
          qc.invalidateQueries({ queryKey: getListPlansQueryKey() });
          setStreamMessages([]);
          toast({ title: isAr ? "تم توليد البروبت الاحترافي وخطة التنفيذ!" : "Professional prompt & execution plan generated!" });
        },
        onError: () => toast({ title: t("common.error_generate"), variant: "destructive" }),
      }
    );
  };

  // ── Approve plan ─────────────────────────────────────────────────────────
  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const res = await fetch(`${BASE}/api/plans/${planId}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      qc.invalidateQueries({ queryKey: getGetPlanQueryKey(planId) });
      qc.invalidateQueries({ queryKey: getListPlansQueryKey() });
      toast({ title: isAr ? "تم اعتماد الخطة ✓" : "Plan approved ✓" });
    } catch {
      toast({ title: isAr ? "فشل الاعتماد" : "Approval failed", variant: "destructive" });
    } finally {
      setIsApproving(false);
    }
  };

  // ── Generate architecture ─────────────────────────────────────────────────
  const handleGenerateArchitecture = async () => {
    setIsGeneratingArch(true);
    try {
      const res = await fetch(`${BASE}/api/plans/${planId}/generate-architecture`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      qc.invalidateQueries({ queryKey: getGetPlanQueryKey(planId) });
      qc.invalidateQueries({ queryKey: getListPlansQueryKey() });
      toast({ title: isAr ? "تم توليد المعمارية بنجاح!" : "Architecture generated!" });
      if (data.architectureId) setTimeout(() => setLocation("/architecture"), 1500);
    } catch {
      toast({ title: t("common.error_generate"), variant: "destructive" });
    } finally {
      setIsGeneratingArch(false);
    }
  };

  // ── File upload ──────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${BASE}/api/plans/${planId}/upload-document`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setUploadedFile({ name: file.name, chars: data.characterCount });
      qc.invalidateQueries({ queryKey: getGetPlanQueryKey(planId) });
      toast({ title: isAr ? `تم رفع الملف (${data.characterCount.toLocaleString()} حرف)` : `Uploaded (${data.characterCount.toLocaleString()} chars)` });
    } catch {
      toast({ title: isAr ? "فشل رفع الملف" : "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Loading / not found ──────────────────────────────────────────────────
  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
  if (!plan) return (
    <p className="text-muted-foreground">{isAr ? "الخطة غير موجودة" : "Plan not found"}</p>
  );

  const phase = plan.status;

  const statusColors: Record<string, string> = {
    draft:            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    prompt_generated: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100",
    approved:         "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    arch_generated:   "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  };
  const statusLabels: Record<string, { ar: string; en: string }> = {
    draft:            { ar: "مسودة",              en: "Draft"                   },
    prompt_generated: { ar: "قيد المراجعة",       en: "Under Review"            },
    approved:         { ar: "معتمد",              en: "Approved"                },
    arch_generated:   { ar: "تم توليد المعمارية", en: "Architecture Generated"  },
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-0">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 pb-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/plans")} className="shrink-0">
            <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
          </Button>
          <div className="min-w-0">
            <h1 className="font-bold text-lg truncate">{plan.title}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[phase] ?? ""}`}>
              {statusLabels[phase]?.[isAr ? "ar" : "en"] ?? phase}
            </span>
          </div>
        </div>

        {/* Context action buttons */}
        <div className="shrink-0 flex gap-2">
          {phase === "prompt_generated" && (
            <Button
              data-testid="button-approve-plan"
              onClick={handleApprove}
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              {isApproving
                ? <Loader2 className="w-4 h-4 me-2 animate-spin" />
                : <CheckCircle2 className="w-4 h-4 me-2" />}
              {isApproving
                ? (isAr ? "جارٍ الاعتماد..." : "Approving...")
                : (isAr ? "اعتماد الخطة ✓" : "Approve Plan ✓")}
            </Button>
          )}
          {phase === "approved" && (
            <Button
              data-testid="button-generate-architecture"
              onClick={handleGenerateArchitecture}
              disabled={isGeneratingArch}
              size="sm"
            >
              {isGeneratingArch
                ? <Loader2 className="w-4 h-4 me-2 animate-spin" />
                : <Layers className="w-4 h-4 me-2" />}
              {isGeneratingArch ? t("plan.generating_arch") : t("plan.generate_arch_btn")}
            </Button>
          )}
          {plan.architectureId && (
            <Button variant="outline" size="sm" onClick={() => setLocation("/architecture")}>
              <ExternalLink className="w-4 h-4 me-2" />
              {t("plan.view_architecture")}
            </Button>
          )}
        </div>
      </div>

      {/* ── Stepper ────────────────────────────────────────────────────── */}
      <WorkflowStepper status={phase} isAr={isAr} />

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* PHASE 1 — DRAFT                                                 */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {phase === "draft" && (
        <div className="flex-1 overflow-auto space-y-4 pb-4">

          {/* Initial prompt */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {isAr ? "المطالبة المبدئية" : "Initial Prompt"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{plan.initialPrompt}</p>
            </CardContent>
          </Card>

          {/* Document attachment (collapsible) */}
          <Card>
            <button className="w-full text-start" onClick={() => setShowDoc(!showDoc)}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    {isAr ? "إرفاق وثيقة (اختياري)" : "Attach Document (optional)"}
                    {(plan.documentContext || uploadedFile) && (
                      <Badge variant="secondary" className="text-xs">{isAr ? "مرفوع ✓" : "Uploaded ✓"}</Badge>
                    )}
                  </span>
                  {showDoc ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </CardTitle>
              </CardHeader>
            </button>
            {showDoc && (
              <CardContent className="pt-0 space-y-3">
                {(plan.documentContext || uploadedFile) && (
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>{uploadedFile?.name ?? (isAr ? "وثيقة مرفقة" : "Document attached")}</span>
                    {uploadedFile && <span className="text-xs opacity-70">{uploadedFile.chars.toLocaleString()} {isAr ? "حرف" : "chars"}</span>}
                  </div>
                )}
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="drop-zone"
                >
                  {isUploading
                    ? <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground mb-2" />
                    : <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />}
                  <p className="text-sm">{isUploading ? t("plan.uploading") : t("plan.drop_file")}</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT — {isAr ? "حد أقصى 10MB" : "max 10MB"}</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md"
                  className="hidden"
                  data-testid="input-file-upload"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </CardContent>
            )}
          </Card>

          {/* Generate button — no pre-chat required */}
          <div className="flex flex-col items-center gap-3 py-4 border rounded-xl bg-muted/30">
            <Sparkles className="w-8 h-8 text-primary/60" />
            <p className="text-sm font-medium">
              {isAr ? "جاهز لتوليد البروبت الاحترافي؟" : "Ready to generate the professional prompt?"}
            </p>
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              {isAr
                ? "سيحوّل الذكاء الاصطناعي مطالبتك إلى بروبت احترافي + خطة تنفيذ مفصّلة يمكنك مراجعتها واعتمادها"
                : "AI will transform your prompt into a professional prompt + detailed execution plan for you to review and approve"}
            </p>
            <Button
              data-testid="button-generate-prompt"
              onClick={handleGeneratePrompt}
              disabled={generatePrompt.isPending}
              size="lg"
              className="gap-2 px-8"
            >
              {generatePrompt.isPending
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <Sparkles className="w-5 h-5" />}
              {generatePrompt.isPending ? t("plan.generating") : t("plan.generate_prompt_btn")}
            </Button>
          </div>

          {/* Optional pre-generation chat */}
          <div>
            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
              onClick={() => setShowPreChat(!showPreChat)}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {isAr ? "نقاش مبدئي مع الذكاء الاصطناعي (اختياري)" : "Optional pre-generation discussion with AI"}
              {showPreChat ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showPreChat && (
              <div className="border rounded-xl p-3 h-72">
                <ChatPanel
                  messages={allMessages}
                  input={input}
                  setInput={setInput}
                  handleSend={handleSend}
                  isSending={isSending}
                  messagesEndRef={messagesEndRef}
                  isAr={isAr}
                  placeholder={isAr
                    ? "اطرح سؤالاً لتوضيح المشروع قبل التوليد..."
                    : "Ask a clarifying question before generating..."}
                  className="h-full"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* PHASE 2 — UNDER REVIEW (discuss before approving)              */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {phase === "prompt_generated" && (
        <div className="flex-1 overflow-hidden min-h-0">
          {/* Hint banner */}
          <div className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 rounded-lg px-3 py-2 mb-3 shrink-0">
            <Sparkles className="w-4 h-4 shrink-0" />
            {isAr
              ? "راجع البروبت الاحترافي وخطة التنفيذ. يمكنك مناقشتهما مع الذكاء الاصطناعي قبل الاعتماد."
              : "Review the professional prompt and execution plan. Discuss with AI before approving."}
          </div>

          <div className="grid grid-cols-[55%_45%] gap-4 h-[calc(100%-3rem)]">
            {/* Left — generated content */}
            <ScrollArea className="h-full pe-2">
              <div className="space-y-4 pb-4">

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        {t("plan.professional_prompt_title")}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(plan.professionalPrompt ?? "", "prompt")}
                        data-testid="button-copy-prompt"
                      >
                        {copied === "prompt" ? <Check className="w-3.5 h-3.5 me-1" /> : <Copy className="w-3.5 h-3.5 me-1" />}
                        {copied === "prompt" ? t("common.copied") : t("common.copy")}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="bg-muted p-3 rounded-lg overflow-auto max-h-72"
                      data-testid="generated-prompt"
                    >
                      <MarkdownView content={plan.professionalPrompt ?? ""} />
                    </div>
                  </CardContent>
                </Card>

                {plan.executionPlan && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          {t("plan.execution_plan_title")}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(plan.executionPlan ?? "", "execplan")}
                        >
                          {copied === "execplan" ? <Check className="w-3.5 h-3.5 me-1" /> : <Copy className="w-3.5 h-3.5 me-1" />}
                          {copied === "execplan" ? t("common.copied") : t("common.copy")}
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="bg-muted p-3 rounded-lg overflow-auto max-h-72"
                        data-testid="execution-plan"
                      >
                        <MarkdownView content={plan.executionPlan} />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>

            {/* Right — discussion chat */}
            <div className="flex flex-col h-full min-h-0 border-s ps-4">
              <div className="flex items-center gap-2 mb-3 shrink-0">
                <MessageSquare className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">
                  {isAr ? "نقاش مع الذكاء الاصطناعي" : "Discuss with AI"}
                </p>
                <span className="text-xs text-muted-foreground">
                  {isAr ? "(المحادثات محفوظة)" : "(conversations saved)"}
                </span>
              </div>
              <ChatPanel
                messages={allMessages}
                input={input}
                setInput={setInput}
                handleSend={handleSend}
                isSending={isSending}
                messagesEndRef={messagesEndRef}
                isAr={isAr}
                placeholder={isAr
                  ? "ناقش البروبت أو اسأل عن خطة التنفيذ..."
                  : "Discuss the prompt or ask about the execution plan..."}
                className="flex-1 min-h-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* PHASE 3 — APPROVED                                              */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {phase === "approved" && (
        <div className="flex-1 overflow-auto space-y-4 pb-4">

          <div className="flex flex-col items-center gap-3 py-5 text-center border rounded-xl bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
            <p className="font-bold text-green-700 dark:text-green-300 text-base">
              {isAr ? "تمت الموافقة على الخطة ✓" : "Plan Approved ✓"}
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              {isAr
                ? "الخطوة التالية: توليد المعمارية الكاملة (طبقات ADK الست + AGENTS.md)"
                : "Next step: Generate the full architecture (6 ADK layers + AGENTS.md)"}
            </p>
            <Button
              data-testid="button-generate-architecture"
              onClick={handleGenerateArchitecture}
              disabled={isGeneratingArch}
              size="lg"
              className="gap-2 px-8"
            >
              {isGeneratingArch
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <Layers className="w-5 h-5" />}
              {isGeneratingArch ? t("plan.generating_arch") : t("plan.generate_arch_btn")}
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {t("plan.professional_prompt_title")}
                </span>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(plan.professionalPrompt ?? "", "prompt-ap")}>
                  {copied === "prompt-ap" ? <Check className="w-3.5 h-3.5 me-1" /> : <Copy className="w-3.5 h-3.5 me-1" />}
                  {copied === "prompt-ap" ? t("common.copied") : t("common.copy")}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-3 rounded-lg max-h-52 overflow-auto">
                <MarkdownView content={plan.professionalPrompt ?? ""} />
              </div>
            </CardContent>
          </Card>

          {plan.executionPlan && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  {t("plan.execution_plan_title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-3 rounded-lg max-h-52 overflow-auto">
                  <MarkdownView content={plan.executionPlan} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* PHASE 4 — ARCHITECTURE GENERATED                               */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {phase === "arch_generated" && (
        <div className="flex-1 overflow-auto space-y-4 pb-4">

          <div className="flex flex-col items-center gap-3 py-6 text-center border rounded-xl bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
            <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <Layers className="w-7 h-7 text-purple-600" />
            </div>
            <p className="font-bold text-purple-700 dark:text-purple-300 text-lg">
              {isAr ? "اكتمل سير العمل!" : "Workflow Complete!"}
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              {isAr
                ? "تم توليد المعمارية الكاملة مع جميع طبقات ADK الست وملف AGENTS.md"
                : "Full architecture generated with all 6 ADK layers and AGENTS.md file"}
            </p>
            <Button onClick={() => setLocation("/architecture")}>
              <ExternalLink className="w-4 h-4 me-2" />
              {t("plan.view_architecture")}
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {t("plan.professional_prompt_title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-3 rounded-lg max-h-36 overflow-auto">
                {plan.professionalPrompt}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
