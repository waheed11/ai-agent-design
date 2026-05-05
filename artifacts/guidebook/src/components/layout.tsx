import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  FileText,
  Wrench,
  Brain,
  Settings,
  Languages,
  Wand2,
  Github,
  Layers,
  Puzzle,
  Zap,
  Bot,
  Package,
  Server,
  MonitorPlay,
} from "lucide-react";

const toolsNav = [
  { href: "/", label: "nav.dashboard", icon: LayoutDashboard },
  { href: "/knowledge-base", label: "nav.knowledge", icon: BookOpen },
  { href: "/chat", label: "nav.chat", icon: MessageSquare },
  { href: "/plans", label: "nav.plans", icon: FileText },
  { href: "/tool-evaluations", label: "nav.evaluations", icon: Wrench },
  { href: "/prompt-generator", label: "nav.prompt_generator", icon: Wand2 },
  { href: "/project-analysis", label: "nav.project_analysis", icon: Github },
  { href: "/memory", label: "nav.memory", icon: Brain },
  { href: "/settings", label: "nav.settings", icon: Settings },
] as const;

const layersNav = [
  { href: "/architecture", label: "nav.architecture", icon: Layers },
  { href: "/canvas", label: "nav.canvas", icon: MonitorPlay },
  { href: "/skills", label: "nav.skills", icon: Puzzle },
  { href: "/hooks", label: "nav.hooks", icon: Zap },
  { href: "/subagents", label: "nav.subagents", icon: Bot },
  { href: "/plugins", label: "nav.plugins", icon: Package },
  { href: "/mcp-servers", label: "nav.mcp_servers", icon: Server },
] as const;

type NavItem = (typeof toolsNav)[number] | (typeof layersNav)[number];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { language, setLanguage, t } = useLanguage();

  const isActive = (item: NavItem) =>
    location === item.href || (item.href !== "/" && location.startsWith(item.href));

  const navItem = (item: NavItem) => {
    const active = isActive(item);
    return (
      <Link key={item.href} href={item.href}>
        <div
          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium ${
            active
              ? "bg-primary text-primary-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          }`}
          data-testid={`nav-${item.href.replace(/\//g, "").replace(/-/g, "_") || "home"}`}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span>{t(item.label)}</span>
        </div>
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-e border-border bg-sidebar flex flex-col z-10 shrink-0">
        <div className="h-16 flex items-center px-4 border-b border-border shrink-0">
          <h1 className="font-mono text-sm font-bold text-primary truncate">
            {t("app.title")}
          </h1>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {/* Design Tools section */}
          <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {t("nav.section_tools")}
          </p>
          {toolsNav.map(navItem)}

          {/* Divider */}
          <div className="my-2 border-t border-border" />

          {/* Agent Layers section */}
          <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {t("nav.section_layers")}
          </p>
          {layersNav.map(navItem)}
        </nav>

        <div className="p-4 border-t border-border shrink-0">
          <Button
            variant="outline"
            className="w-full justify-center gap-2"
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            data-testid="button-toggle-language"
          >
            <Languages className="h-4 w-4" />
            {language === "ar" ? "English" : "العربية"}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-background">
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <div className="mx-auto max-w-6xl w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
