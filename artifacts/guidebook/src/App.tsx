import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import KnowledgeBase from "@/pages/knowledge-base";
import KnowledgeBaseEntry from "@/pages/knowledge-base-entry";
import ChatList from "@/pages/chat";
import ChatSession from "@/pages/chat-session";
import PlansList from "@/pages/plans";
import PlanWorkspace from "@/pages/plan-workspace";
import ToolEvaluationsList from "@/pages/tool-evaluations";
import ToolEvaluationDetail from "@/pages/tool-evaluation-detail";
import Memory from "@/pages/memory";
import Settings from "@/pages/settings";
import PromptGenerator from "@/pages/prompt-generator";
import ProjectAnalysis from "@/pages/project-analysis";
import Skills from "@/pages/skills";
import Hooks from "@/pages/hooks";
import Subagents from "@/pages/subagents";
import Plugins from "@/pages/plugins";
import McpServers from "@/pages/mcp-servers";
import Architecture from "@/pages/architecture";
import ArchitectureDiagram from "@/pages/architecture-diagram";
import Canvas from "@/pages/canvas";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/architecture-diagram/:id" component={ArchitectureDiagram} />
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/knowledge-base" component={KnowledgeBase} />
            <Route path="/knowledge-base/:id" component={KnowledgeBaseEntry} />
            <Route path="/chat" component={ChatList} />
            <Route path="/chat/:id" component={ChatSession} />
            <Route path="/plans" component={PlansList} />
            <Route path="/plans/:id" component={PlanWorkspace} />
            <Route path="/tool-evaluations" component={ToolEvaluationsList} />
            <Route path="/tool-evaluations/:id" component={ToolEvaluationDetail} />
            <Route path="/memory" component={Memory} />
            <Route path="/settings" component={Settings} />
            <Route path="/prompt-generator" component={PromptGenerator} />
            <Route path="/project-analysis" component={ProjectAnalysis} />
            <Route path="/skills" component={Skills} />
            <Route path="/hooks" component={Hooks} />
            <Route path="/subagents" component={Subagents} />
            <Route path="/plugins" component={Plugins} />
            <Route path="/mcp-servers" component={McpServers} />
            <Route path="/architecture" component={Architecture} />
            <Route path="/canvas" component={Canvas} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
