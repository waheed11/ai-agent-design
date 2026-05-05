import { Router, type IRouter } from "express";
import healthRouter from "./health";
import knowledgeBaseRouter from "./knowledge-base";
import chatRouter from "./chat";
import plansRouter from "./plans";
import toolEvaluationsRouter from "./tool-evaluations";
import memoryRouter from "./memory";
import systemInstructionsRouter from "./system-instructions";
import searchRouter from "./search";
import promptGeneratorRouter from "./prompt-generator";
import projectAnalysisRouter from "./project-analysis";
import skillsRouter from "./skills";
import hooksRouter from "./hooks";
import subagentsRouter from "./subagents";
import pluginsRouter from "./plugins";
import mcpServersRouter from "./mcp-servers";
import agentArchitecturesRouter from "./agent-architectures";

const router: IRouter = Router();

router.use(healthRouter);
router.use(knowledgeBaseRouter);
router.use(chatRouter);
router.use(plansRouter);
router.use(toolEvaluationsRouter);
router.use(memoryRouter);
router.use(systemInstructionsRouter);
router.use(searchRouter);
router.use(promptGeneratorRouter);
router.use(projectAnalysisRouter);
router.use(skillsRouter);
router.use(hooksRouter);
router.use(subagentsRouter);
router.use(pluginsRouter);
router.use(mcpServersRouter);
router.use(agentArchitecturesRouter);

export default router;
