import { useState } from "react";
import { useListChatSessions, useCreateChatSession, useDeleteChatSession, getListChatSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, Plus, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ChatList() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAr = language === "ar";

  const { data: sessions, isLoading } = useListChatSessions();
  const createSession = useCreateChatSession();
  const deleteSession = useDeleteChatSession();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");

  const handleCreate = () => {
    if (!title.trim()) return;
    createSession.mutate(
      { data: { title: title.trim(), language } },
      {
        onSuccess: (session) => {
          qc.invalidateQueries({ queryKey: getListChatSessionsQueryKey() });
          setShowCreate(false);
          setTitle("");
          setLocation(`/chat/${session.id}`);
        },
        onError: () => toast({ title: "Error creating session", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteSession.mutate(
      { id },
      {
        onSuccess: () => qc.invalidateQueries({ queryKey: getListChatSessionsQueryKey() }),
        onError: () => toast({ title: "Error deleting session", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isAr ? "محادثات الذكاء الاصطناعي" : "AI Chat Sessions"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? "تحدث مع المساعد الذكي حول تطوير الوكلاء" : "Chat with the AI assistant about agent development"}
          </p>
        </div>
        <Button data-testid="button-new-chat" onClick={() => setShowCreate(true)} size="sm">
          <Plus className="w-4 h-4 me-2" />
          {isAr ? "محادثة جديدة" : "New Chat"}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {isAr ? "لا توجد محادثات بعد. ابدأ محادثة جديدة!" : "No sessions yet. Start a new chat!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <Link key={session.id} href={`/chat/${session.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer" data-testid={`card-chat-${session.id}`}>
                <CardContent className="py-4 px-5 flex items-center gap-4">
                  <MessageSquare className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{session.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(session.updatedAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {session.language === "ar" ? "عربي" : "English"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    data-testid={`button-delete-chat-${session.id}`}
                    onClick={(e) => handleDelete(session.id, e)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAr ? "محادثة جديدة" : "New Chat Session"}</DialogTitle>
          </DialogHeader>
          <Input
            data-testid="input-chat-title"
            placeholder={isAr ? "عنوان المحادثة..." : "Session title..."}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button data-testid="button-create-chat" onClick={handleCreate} disabled={!title.trim() || createSession.isPending}>
              {isAr ? "إنشاء" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
