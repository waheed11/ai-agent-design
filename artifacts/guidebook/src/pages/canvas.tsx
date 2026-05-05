import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { MonitorPlay, Trash2, LayoutGrid, ArrowLeft } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const STORAGE_KEY = "canvas-arch-shapes";

function getShapes(): number[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as number[]) : [];
  } catch {
    return [];
  }
}

function saveShapes(shapes: number[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shapes));
}

export function addArchToCanvas(archId: number): void {
  const current = getShapes();
  if (!current.includes(archId)) {
    saveShapes([...current, archId]);
  }
}

export default function Canvas() {
  const { t } = useLanguage();
  const [shapes, setShapes] = useState<number[]>([]);

  useEffect(() => {
    setShapes(getShapes());

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setShapes(getShapes());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const removeShape = (id: number) => {
    const updated = shapes.filter((s) => s !== id);
    saveShapes(updated);
    setShapes(updated);
  };

  const clearAll = () => {
    saveShapes([]);
    setShapes([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MonitorPlay className="h-6 w-6 text-primary" />
            {t("canvas.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("canvas.description")}</p>
        </div>
        {shapes.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearAll}>
            <Trash2 className="h-4 w-4 me-2" />
            {t("canvas.clear_all")}
          </Button>
        )}
      </div>

      {shapes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <LayoutGrid className="h-14 w-14 text-muted-foreground/40" />
          <div>
            <p className="text-muted-foreground font-medium">{t("canvas.empty")}</p>
            <p className="text-sm text-muted-foreground/70 mt-1">{t("canvas.empty_hint")}</p>
          </div>
          <Link href="/architecture">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 me-2" />
              {t("canvas.go_to_arch")}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {shapes.map((archId) => (
            <div
              key={archId}
              className="relative rounded-xl border border-border bg-card shadow-sm overflow-hidden"
              style={{ height: 560 }}
            >
              <div className="absolute top-2 end-2 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 bg-background/80 hover:bg-background text-destructive hover:text-destructive backdrop-blur-sm"
                  onClick={() => removeShape(archId)}
                  title={t("canvas.remove_shape")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <iframe
                src={`${BASE}/architecture-diagram/${archId}`}
                title={`Architecture Diagram #${archId}`}
                className="w-full h-full border-0"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
