import { useState } from "react";
import {
  useGetKnowledgeBaseEntry,
  useUpdateKnowledgeBaseEntry,
  useDeleteKnowledgeBaseEntry,
  getGetKnowledgeBaseEntryQueryKey,
  getListKnowledgeBaseEntriesQueryKey,
  getListKnowledgeBaseCategoriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BookOpen, Calendar, ExternalLink, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUSES = ["active", "outdated", "deprecated"] as const;

export default function KnowledgeBaseEntry() {
  const [, params] = useRoute("/knowledge-base/:id");
  const id = parseInt(params?.id || "0");
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAr = language === "ar";

  const { data: entry, isLoading } = useGetKnowledgeBaseEntry(id, {
    query: { enabled: !!id, queryKey: getGetKnowledgeBaseEntryQueryKey(id) },
  });

  const updateEntry = useUpdateKnowledgeBaseEntry();
  const deleteEntry = useDeleteKnowledgeBaseEntry();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    category: "",
    subcategory: "",
    content: "",
    summary: "",
    tags: "",
    sourceUrl: "",
    status: "active" as (typeof STATUSES)[number],
  });

  const openEdit = () => {
    if (!entry) return;
    setEditForm({
      title: entry.title,
      category: entry.category,
      subcategory: entry.subcategory ?? "",
      content: entry.content,
      summary: entry.summary ?? "",
      tags: entry.tags.join(", "),
      sourceUrl: entry.sourceUrl ?? "",
      status: entry.status as (typeof STATUSES)[number],
    });
    setShowEdit(true);
  };

  const handleSave = () => {
    updateEntry.mutate(
      {
        id,
        data: {
          title: editForm.title.trim(),
          category: editForm.category.trim(),
          subcategory: editForm.subcategory.trim() || undefined,
          content: editForm.content.trim(),
          summary: editForm.summary.trim() || undefined,
          tags: editForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
          sourceUrl: editForm.sourceUrl.trim() || undefined,
          status: editForm.status,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetKnowledgeBaseEntryQueryKey(id) });
          qc.invalidateQueries({ queryKey: getListKnowledgeBaseEntriesQueryKey() });
          qc.invalidateQueries({ queryKey: getListKnowledgeBaseCategoriesQueryKey() });
          setShowEdit(false);
          toast({ title: isAr ? "تم الحفظ" : "Saved" });
        },
        onError: () => toast({ title: "Error saving", variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    deleteEntry.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListKnowledgeBaseEntriesQueryKey() });
          qc.invalidateQueries({ queryKey: getListKnowledgeBaseCategoriesQueryKey() });
          setLocation("/knowledge-base");
          toast({ title: isAr ? "تم الحذف" : "Deleted" });
        },
        onError: () => toast({ title: "Error deleting", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!entry) return <div className="text-center py-16 text-muted-foreground">{isAr ? "غير موجود" : "Not found"}</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/knowledge-base")} data-testid="button-back-kb">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={openEdit} data-testid="button-edit-entry">
          <Pencil className="w-4 h-4 me-2" />
          {isAr ? "تعديل" : "Edit"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setShowDelete(true)}
          data-testid="button-delete-entry"
        >
          <Trash2 className="w-4 h-4 me-2" />
          {isAr ? "حذف" : "Delete"}
        </Button>
      </div>

      <div className="space-y-4 border-b border-border pb-6">
        <div className="flex gap-2 flex-wrap">
          <Badge>{entry.category}</Badge>
          {entry.subcategory && <Badge variant="outline">{entry.subcategory}</Badge>}
          <Badge variant={entry.status === "active" ? "default" : "destructive"}>{entry.status}</Badge>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">{entry.title}</h1>

        {entry.summary && (
          <p className="text-muted-foreground">{entry.summary}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date(entry.updatedAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
          </span>
          {entry.sourceUrl && (
            <a
              href={entry.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              {isAr ? "المصدر" : "Source"}
            </a>
          )}
          {entry.version && (
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              v{entry.version}
            </span>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed" data-testid="entry-content">
            {entry.content}
          </pre>
        </CardContent>
      </Card>

      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
          {entry.tags.map((tag) => (
            <Badge key={tag} variant="secondary">#{tag}</Badge>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAr ? "تعديل المدخلة" : "Edit Entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>{isAr ? "العنوان" : "Title"}</Label>
                <Input
                  data-testid="input-edit-title"
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{isAr ? "التصنيف" : "Category"}</Label>
                <Input
                  value={editForm.category}
                  onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{isAr ? "التصنيف الفرعي" : "Subcategory"}</Label>
                <Input
                  value={editForm.subcategory}
                  onChange={(e) => setEditForm((p) => ({ ...p, subcategory: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>{isAr ? "الملخص" : "Summary"}</Label>
                <Input
                  value={editForm.summary}
                  onChange={(e) => setEditForm((p) => ({ ...p, summary: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>{isAr ? "المحتوى" : "Content"}</Label>
                <Textarea
                  data-testid="input-edit-content"
                  value={editForm.content}
                  onChange={(e) => setEditForm((p) => ({ ...p, content: e.target.value }))}
                  rows={10}
                  className="font-mono text-sm resize-none"
                />
              </div>
              <div className="space-y-1">
                <Label>{isAr ? "الوسوم" : "Tags"}</Label>
                <Input
                  value={editForm.tags}
                  onChange={(e) => setEditForm((p) => ({ ...p, tags: e.target.value }))}
                  placeholder={isAr ? "وسم1, وسم2" : "tag1, tag2"}
                />
              </div>
              <div className="space-y-1">
                <Label>{isAr ? "رابط المصدر" : "Source URL"}</Label>
                <Input
                  value={editForm.sourceUrl}
                  onChange={(e) => setEditForm((p) => ({ ...p, sourceUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{isAr ? "الحالة" : "Status"}</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editForm.status}
                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as typeof editForm.status }))}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button
              data-testid="button-save-entry"
              onClick={handleSave}
              disabled={updateEntry.isPending}
            >
              {isAr ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAr ? "هل أنت متأكد؟" : "Are you sure?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAr
                ? "سيتم حذف هذه المدخلة نهائياً ولا يمكن استعادتها."
                : "This entry will be permanently deleted and cannot be recovered."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isAr ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isAr ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
