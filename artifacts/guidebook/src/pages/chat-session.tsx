import { useState, useEffect, useRef } from "react";
import { useGetChatSession, useEndChatSession, getGetChatSessionQueryKey, getListChatSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Bot, User, Loader2, BrainCircuit, Globe, Search, FileText, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface StreamMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  searchUsed?: boolean;
  sources?: string[];
}

export default function ChatSession() {
  const { id } = useParams<{ id: string }>();
  const sessionId = parseInt(id, 10);
  const { language, t } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: session, isLoading } = useGetChatSession(sessionId, {
    query: { enabled: !!sessionId, queryKey: getGetChatSessionQueryKey(sessionId) },
  });

  const endSession = useEndChatSession();

  const [streamMessages, setStreamMessages] = useState<StreamMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamMessages, session?.messages]);

  const allMessages: StreamMessage[] = [
    ...(session?.messages ?? []).map((m): StreamMessage => ({
      role: m.role as "user" | "assistant",
      content: m.content,
      searchUsed: m.searchUsed ?? false,
      sources: (m.sources as string[] | null) ?? [],
    })),
    ...streamMessages,
  ];

  const handleSend = async (forceSearch = false) => {
    if (!input.trim() || isSending) return;
    const content = input.trim();
    setInput("");
    setIsSending(true);
    setIsSearching(false);

    setStreamMessages((prev) => [
      ...prev,
      { role: "user", content },
      { role: "assistant", content: "", streaming: true },
    ]);

    let pendingSources: string[] = [];

    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, language, forceSearch }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

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
            if (parsed.type === "search") {
              setIsSearching(true);
              pendingSources = parsed.sources ?? [];
              setStreamMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = { ...last, searchUsed: true, sources: pendingSources };
                }
                return updated;
              });
            } else if (parsed.type === "delta") {
              setIsSearching(false);
              setStreamMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + parsed.content,
                    sources: pendingSources,
                  };
                }
                return updated;
              });
            } else if (parsed.type === "done") {
              setStreamMessages([]);
              setIsSearching(false);
              qc.invalidateQueries({ queryKey: getGetChatSessionQueryKey(sessionId) });
              qc.invalidateQueries({ queryKey: getListChatSessionsQueryKey() });
            } else if (parsed.type === "error") {
              throw new Error(parsed.error);
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch {
      toast({ title: t("chat.send_error"), variant: "destructive" });
      setStreamMessages((prev) => prev.slice(0, -2));
    } finally {
      setIsSending(false);
      setIsSearching(false);
    }
  };

  const isAr = language === "ar";

  const handleCreatePlan = async () => {
    setIsCreatingPlan(true);
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/create-plan`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast({ title: isAr ? "تم إنشاء الخطة! جارٍ الانتقال..." : "Plan created! Redirecting..." });
      setTimeout(() => setLocation(`/plans/${data.planId}`), 800);
    } catch {
      toast({ title: isAr ? "فشل إنشاء الخطة" : "Failed to create plan", variant: "destructive" });
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const handleEndSession = () => {
    endSession.mutate(
      { id: sessionId },
      {
        onSuccess: (data) => {
          toast({ title: t("chat.memories_extracted", { count: data.memoriesExtracted }) });
          qc.invalidateQueries({ queryKey: getGetChatSessionQueryKey(sessionId) });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        {t("chat.session_not_found")}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/chat")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-semibold">{session.title}</h1>
            <Badge variant="outline" className="text-xs mt-1">
              {session.language === "ar" ? t("chat.language_arabic") : t("chat.language_english")}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleCreatePlan}
            disabled={isCreatingPlan}
            data-testid="button-create-plan-from-chat"
            className="gap-2"
          >
            {isCreatingPlan
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <FileText className="w-4 h-4" />}
            {isAr ? "تحويل إلى خطة" : "Convert to Plan"}
            {!isCreatingPlan && <ArrowRight className={`w-3.5 h-3.5 ${isAr ? "rotate-180" : ""}`} />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEndSession}
            disabled={endSession.isPending}
            data-testid="button-end-session"
          >
            <BrainCircuit className="w-4 h-4 me-2" />
            {t("chat.extract_memory")}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 py-4">
        <div className="space-y-4 pe-4">
          {allMessages.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {t("chat.start_conversation")}
            </div>
          ) : (
            allMessages.map((msg, i) => (
              <div key={i} className="space-y-1">
                <div
                  className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
                  data-testid={`message-${msg.role}-${i}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1 max-w-[75%]">
                    {msg.role === "assistant" && msg.streaming && isSearching && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-1">
                        <Globe className="w-3 h-3 animate-pulse text-blue-500" />
                        <span>{t("chat.searching_web")}</span>
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm"
                      )}
                    >
                      {msg.content || (msg.streaming && !isSearching && <Loader2 className="w-4 h-4 animate-spin" />)}
                      {msg.streaming && isSearching && !msg.content && (
                        <span className="text-muted-foreground italic text-xs">
                          {t("chat.waiting_results")}
                        </span>
                      )}
                    </div>
                    {msg.role === "assistant" && msg.searchUsed && msg.sources && msg.sources.length > 0 && !msg.streaming && (
                      <div className="flex flex-wrap gap-1 px-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Globe className="w-3 h-3 text-blue-500" />
                          {t("common.sources")}
                        </span>
                        {msg.sources.slice(0, 3).map((src, si) => {
                          let hostname = src;
                          try { hostname = new URL(src).hostname.replace(/^www\./, ""); } catch { /* keep raw */ }
                          return (
                            <a
                              key={si}
                              href={src}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline truncate max-w-[160px]"
                            >
                              {hostname}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="pt-4 border-t space-y-2">
        <div className="flex gap-3">
          <Textarea
            data-testid="input-message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t("chat.input_placeholder")}
            rows={3}
            className="resize-none"
            disabled={isSending}
          />
          <div className="flex flex-col gap-2">
            <Button
              data-testid="button-send"
              onClick={() => handleSend()}
              disabled={!input.trim() || isSending}
              size="icon"
              className="h-auto py-3 px-4 shrink-0 flex-1"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
            <Button
              data-testid="button-search-send"
              variant="outline"
              size="icon"
              title={t("chat.search_button_title")}
              onClick={() => handleSend(true)}
              disabled={!input.trim() || isSending}
              className="h-auto py-2 px-4 shrink-0"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">{t("chat.keyboard_hint")}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Globe className="w-3 h-3" />
            <span>{t("chat.auto_search_hint")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
