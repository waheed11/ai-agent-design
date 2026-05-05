import { useListChatSessions, useListPlans, useListKnowledgeBaseEntries } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MessageSquare, FileText, BookOpen, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { t, language } = useLanguage();
  const { data: chats, isLoading: loadingChats } = useListChatSessions();
  const { data: plans, isLoading: loadingPlans } = useListPlans();
  const { data: kbEntries, isLoading: loadingKb } = useListKnowledgeBaseEntries();

  const isAr = language === "ar";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("nav.dashboard")}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent Chats */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              {t("dashboard.recent_chats")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {loadingChats ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : chats && chats.length > 0 ? (
              <div className="divide-y divide-border">
                {chats.slice(0, 5).map((chat) => (
                  <Link key={chat.id} href={`/chat/${chat.id}`}>
                    <div className="p-4 hover:bg-muted/50 cursor-pointer transition-colors flex items-start gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{chat.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(chat.updatedAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No recent chats found.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saved Plans */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              {t("dashboard.saved_plans")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {loadingPlans ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : plans && plans.length > 0 ? (
              <div className="divide-y divide-border">
                {plans.slice(0, 5).map((plan) => (
                  <Link key={plan.id} href={`/plans/${plan.id}`}>
                    <div className="p-4 hover:bg-muted/50 cursor-pointer transition-colors flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{plan.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(plan.updatedAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {plan.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No saved plans found.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Knowledge Highlights */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              {t("dashboard.knowledge_highlights")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {loadingKb ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : kbEntries && kbEntries.length > 0 ? (
              <div className="divide-y divide-border">
                {kbEntries.slice(0, 5).map((entry) => (
                  <Link key={entry.id} href={`/knowledge-base/${entry.id}`}>
                    <div className="p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                      <p className="text-sm font-medium truncate">{entry.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {entry.category}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No knowledge base entries found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
