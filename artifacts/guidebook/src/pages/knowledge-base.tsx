import { useState } from "react";
import {
  useListKnowledgeBaseEntries,
  useListKnowledgeBaseCategories,
  useCreateKnowledgeBaseEntry,
  getListKnowledgeBaseEntriesQueryKey,
  getListKnowledgeBaseCategoriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Tag, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUSES = ["active", "outdated", "deprecated"] as const;

export default function KnowledgeBase() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAr = language === "ar";

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: "",
    subcategory: "",
    content: "",
    summary: "",
    tags: "",
    sourceUrl: "",
    status: "active" as (typeof STATUSES)[number],
  });

  const { data: entries, isLoading } = useListKnowledgeBaseEntries();
  const { data: categories } = useListKnowledgeBaseCategories();
  const createEntry = useCreateKnowledgeBaseEntry();

  const filteredEntries = entries?.filter((e) => {
    const matchesSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.summary ?? "").toLowerCase().includes(search.toLowerCase()) ||
      e.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const resetForm = () =>
    setForm({ title: "", category: "", subcategory: "", content: "", summary: "", tags: "", sourceUrl: "", status: "active" });

  const handleCreate = () => {
    if (!form.title.trim() || !form.category.trim() || !form.content.trim()) return;
    createEntry.mutate(
      {
        data: {
          title: form.title.trim(),
          category: form.category.trim(),
          subcategory: form.subcategory.trim() || undefined,
          content: form.content.trim(),
          summary: form.summary.trim() || undefined,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          sourceUrl: form.sourceUrl.trim() || undefined,
          status: form.status,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListKnowledgeBaseEntriesQueryKey() });
          qc.invalidateQueries({ queryKey: getListKnowledgeBaseCategoriesQueryKey() });
          setShowCreate(false);
          resetForm();
          toast({ title: isAr ? "تم إضافة المدخلة" : "Entry added" });
        },
        onError: () => toast({ title: "Error creating entry", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {isAr ? "قاعدة المعرفة" : "Knowledge Base"}
        </h1>
        <Button data-testid="button-add-entry" onClick={() => setShowCreate(true)} size="sm">
          <Plus className="w-4 h-4 me-2" />
          {isAr ? "إضافة مدخلة" : "Add Entry"}
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            data-testid="input-search"
            placeholder={isAr ? "ابحث في قاعدة المعرفة..." : "Search knowledge base..."}
            className="ps-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
          <h2 className="font-semibold text-sm">{isAr ? "التصنيفات" : "Categories"}</h2>
          <div className="space-y-2">
            <div
              className={`flex items-center justify-between text-sm p-2 rounded cursor-pointer transition-colors ${
                !selectedCategory ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
              onClick={() => setSelectedCategory(null)}
            >
              <span>{isAr ? "الكل" : "All"}</span>
              <Badge variant="secondary">{entries?.length ?? 0}</Badge>
            </div>
            {categories?.map((cat) => (
              <div
                key={cat.category}
                className={`flex items-center justify-between text-sm p-2 rounded cursor-pointer transition-colors ${
                  selectedCategory === cat.category
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setSelectedCategory(cat.category)}
                data-testid={`category-filter-${cat.category}`}
              >
                <span className="truncate">{cat.category}</span>
                <Badge variant="secondary">{cat.count}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-3 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : filteredEntries?.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {isAr ? "لا توجد نتائج" : "No results found"}
            </div>
          ) : (
            filteredEntries?.map((entry) => (
              <Link key={entry.id} href={`/knowledge-base/${entry.id}`}>
                <Card className="hover:bg-muted/50 cursor-pointer transition-colors" data-testid={`card-kb-${entry.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{entry.title}</CardTitle>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Badge variant="outline">{entry.category}</Badge>
                          {entry.subcategory && <Badge variant="secondary">{entry.subcategory}</Badge>}
                        </div>
                      </div>
                      <Badge variant={entry.status === "active" ? "default" : "destructive"}>
                        {entry.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {entry.summary || entry.content}
                    </p>
                    {entry.tags.length > 0 && (
                      <div className="flex gap-2 mt-4 items-center text-xs text-muted-foreground flex-wrap">
                        <Tag className="w-3 h-3 shrink-0" />
                        {entry.tags.join(", ")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Create Entry Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAr ? "إضافة مدخلة جديدة" : "Add New Knowledge Base Entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>{isAr ? "العنوان *" : "Title *"}</Label>
                <Input
                  data-testid="input-kb-title"
                  placeholder={isAr ? "عنوان المدخلة..." : "Entry title..."}
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{isAr ? "التصنيف *" : "Category *"}</Label>
                <Input
                  data-testid="input-kb-category"
                  placeholder={isAr ? "مثال: أطر عمل الوكلاء" : "e.g. Agent Frameworks"}
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{isAr ? "التصنيف الفرعي" : "Subcategory"}</Label>
                <Input
                  data-testid="input-kb-subcategory"
                  placeholder={isAr ? "مثال: Python" : "e.g. Python"}
                  value={form.subcategory}
                  onChange={(e) => setForm((p) => ({ ...p, subcategory: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>{isAr ? "الملخص" : "Summary"}</Label>
                <Input
                  data-testid="input-kb-summary"
                  placeholder={isAr ? "ملخص قصير..." : "Short summary..."}
                  value={form.summary}
                  onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>{isAr ? "المحتوى * (Markdown مدعوم)" : "Content * (Markdown supported)"}</Label>
                <Textarea
                  data-testid="input-kb-content"
                  placeholder={isAr ? "المحتوى التفصيلي..." : "Detailed content..."}
                  value={form.content}
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                  rows={8}
                  className="font-mono text-sm resize-none"
                />
              </div>
              <div className="space-y-1">
                <Label>{isAr ? "الوسوم (مفصولة بفاصلة)" : "Tags (comma-separated)"}</Label>
                <Input
                  data-testid="input-kb-tags"
                  placeholder={isAr ? "وسم1, وسم2, ..." : "tag1, tag2, ..."}
                  value={form.tags}
                  onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{isAr ? "رابط المصدر" : "Source URL"}</Label>
                <Input
                  data-testid="input-kb-source"
                  placeholder="https://..."
                  value={form.sourceUrl}
                  onChange={(e) => setForm((p) => ({ ...p, sourceUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{isAr ? "الحالة" : "Status"}</Label>
                <select
                  data-testid="select-kb-status"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as typeof form.status }))}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              data-testid="button-create-entry"
              onClick={handleCreate}
              disabled={!form.title.trim() || !form.category.trim() || !form.content.trim() || createEntry.isPending}
            >
              {isAr ? "إضافة" : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
