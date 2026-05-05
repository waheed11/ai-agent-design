import { useState } from "react";
import { useListMemoryEntries, useUpdateMemoryEntry, useDeleteMemoryEntry, getListMemoryEntriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Brain, Pencil, Trash2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const confidenceColors: Record<string, string> = {
  high: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

const confidenceLabels: Record<string, { ar: string; en: string }> = {
  high: { ar: "عالية", en: "High" },
  medium: { ar: "متوسطة", en: "Medium" },
  low: { ar: "منخفضة", en: "Low" },
};

export default function Memory() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAr = language === "ar";

  const { data: entries, isLoading } = useListMemoryEntries();
  const updateEntry = useUpdateMemoryEntry();
  const deleteEntry = useDeleteMemoryEntry();

  const [editId, setEditId] = useState<number | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editValue, setEditValue] = useState("");

  const openEdit = (entry: { id: number; key: string; value: string }) => {
    setEditId(entry.id);
    setEditKey(entry.key);
    setEditValue(entry.value);
  };

  const handleSave = () => {
    if (!editId) return;
    updateEntry.mutate(
      { id: editId, data: { key: editKey.trim(), value: editValue.trim() } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListMemoryEntriesQueryKey() });
          setEditId(null);
          toast({ title: isAr ? "تم الحفظ" : "Saved" });
        },
        onError: () => toast({ title: "Error saving", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteEntry.mutate(
      { id },
      {
        onSuccess: () => qc.invalidateQueries({ queryKey: getListMemoryEntriesQueryKey() }),
        onError: () => toast({ title: "Error deleting", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isAr ? "الذاكرة والتعلم" : "Memory & Learning"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAr
            ? "معلومات وتفضيلات تم استخراجها تلقائياً من محادثاتك"
            : "Information and preferences automatically extracted from your conversations"}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : !entries || entries.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {isAr ? "لا توجد ذاكرة بعد. ابدأ محادثة وانهِها لاستخراج الذكريات!" : "No memories yet. Start a chat and end it to extract memories!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => (
            <Card key={entry.id} data-testid={`memory-card-${entry.id}`}>
              <CardContent className="py-4 px-5 flex items-start gap-4">
                <Brain className="w-4 h-4 text-primary shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{entry.key}</p>
                    <Badge className={`text-xs ${confidenceColors[entry.confidence] ?? ""}`}>
                      {confidenceLabels[entry.confidence]?.[isAr ? "ar" : "en"] ?? entry.confidence}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{entry.value}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{isAr ? "المصدر:" : "Source:"} {entry.source}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {entry.isEditable ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-muted-foreground hover:text-primary"
                        data-testid={`button-edit-memory-${entry.id}`}
                        onClick={() => openEdit(entry)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-muted-foreground hover:text-destructive"
                        data-testid={`button-delete-memory-${entry.id}`}
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editId !== null} onOpenChange={(open) => { if (!open) setEditId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAr ? "تعديل الذاكرة" : "Edit Memory"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              data-testid="input-memory-key"
              placeholder={isAr ? "المفتاح..." : "Key..."}
              value={editKey}
              onChange={(e) => setEditKey(e.target.value)}
            />
            <Input
              data-testid="input-memory-value"
              placeholder={isAr ? "القيمة..." : "Value..."}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button data-testid="button-save-memory" onClick={handleSave} disabled={updateEntry.isPending}>{isAr ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
