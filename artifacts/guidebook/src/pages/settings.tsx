import { useState } from "react";
import { useListSystemInstructions, useUpdateSystemInstruction, useResetSystemInstruction, getListSystemInstructionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, RotateCcw, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const modeConfig: Record<string, { ar: string; en: string; desc: { ar: string; en: string } }> = {
  chat: {
    ar: "المحادثة",
    en: "Chat",
    desc: { ar: "تعليمات المساعد في وضع المحادثة", en: "Assistant instructions for chat mode" },
  },
  plan: {
    ar: "التخطيط",
    en: "Planning",
    desc: { ar: "تعليمات منشئ خطط المشاريع", en: "Instructions for the project plan generator" },
  },
  tool_evaluation: {
    ar: "تقييم الأدوات",
    en: "Tool Evaluation",
    desc: { ar: "تعليمات محلل تقييم الأدوات", en: "Instructions for the tool evaluation analyzer" },
  },
  prompt_generator: {
    ar: "توليد البروبت",
    en: "Prompt Generator",
    desc: { ar: "تعليمات منشئ البروبتات الاحترافية", en: "Instructions for the professional prompt generator" },
  },
};

export default function Settings() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAr = language === "ar";

  const { data: instructions, isLoading } = useListSystemInstructions();
  const updateInstruction = useUpdateSystemInstruction();
  const resetInstruction = useResetSystemInstruction();

  const [editedContent, setEditedContent] = useState<Record<string, string>>({});

  const getContent = (mode: string, originalContent: string) =>
    editedContent[mode] !== undefined ? editedContent[mode] : originalContent;

  const handleSave = (mode: string) => {
    const content = editedContent[mode];
    if (!content) return;
    updateInstruction.mutate(
      { mode, data: { content } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListSystemInstructionsQueryKey() });
          setEditedContent((p) => { const n = { ...p }; delete n[mode]; return n; });
          toast({ title: isAr ? "تم الحفظ" : "Saved" });
        },
        onError: () => toast({ title: "Error saving", variant: "destructive" }),
      }
    );
  };

  const handleReset = (mode: string) => {
    resetInstruction.mutate(
      { mode },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListSystemInstructionsQueryKey() });
          setEditedContent((p) => { const n = { ...p }; delete n[mode]; return n; });
          toast({ title: isAr ? "تمت إعادة الضبط" : "Reset to default" });
        },
        onError: () => toast({ title: "Error resetting", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const modes = instructions?.map((i) => i.mode) ?? Object.keys(modeConfig);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6" />
          {isAr ? "إعدادات النظام" : "System Settings"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAr ? "تخصيص تعليمات النظام لكل وضع من أوضاع الذكاء الاصطناعي" : "Customize system instructions for each AI mode"}
        </p>
      </div>

      <Tabs defaultValue={modes[0]}>
        <TabsList className="flex flex-wrap h-auto gap-1 w-fit">
          {modes.map((mode) => (
            <TabsTrigger key={mode} value={mode} data-testid={`tab-${mode}`}>
              {modeConfig[mode]?.[isAr ? "ar" : "en"] ?? mode}
            </TabsTrigger>
          ))}
        </TabsList>

        {modes.map((mode) => {
          const instruction = instructions?.find((i) => i.mode === mode);
          const currentContent = getContent(mode, instruction?.content ?? "");
          const isDirty = editedContent[mode] !== undefined;
          const config = modeConfig[mode];

          return (
            <TabsContent key={mode} value={mode} className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {config?.[isAr ? "ar" : "en"] ?? mode}
                      </CardTitle>
                      <CardDescription>{config?.desc?.[isAr ? "ar" : "en"]}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {instruction?.isDefault && (
                        <Badge variant="outline" className="text-xs">
                          {isAr ? "افتراضي" : "Default"}
                        </Badge>
                      )}
                      {isDirty && (
                        <Badge className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                          {isAr ? "تغييرات غير محفوظة" : "Unsaved changes"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    data-testid={`textarea-${mode}`}
                    value={currentContent}
                    onChange={(e) => setEditedContent((p) => ({ ...p, [mode]: e.target.value }))}
                    rows={18}
                    className="font-mono text-xs resize-none"
                    placeholder={isAr ? "تعليمات النظام..." : "System instructions..."}
                  />
                  <div className="flex items-center gap-3">
                    <Button
                      data-testid={`button-save-${mode}`}
                      onClick={() => handleSave(mode)}
                      disabled={!isDirty || updateInstruction.isPending}
                      size="sm"
                    >
                      <Save className="w-4 h-4 me-2" />
                      {isAr ? "حفظ" : "Save"}
                    </Button>
                    <Button
                      data-testid={`button-reset-${mode}`}
                      variant="outline"
                      onClick={() => handleReset(mode)}
                      disabled={instruction?.isDefault || resetInstruction.isPending}
                      size="sm"
                    >
                      <RotateCcw className="w-4 h-4 me-2" />
                      {isAr ? "إعادة الضبط" : "Reset to Default"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
