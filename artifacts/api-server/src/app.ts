import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { seedSystemInstructions, seedKnowledgeBase, seedMemory, seedSkills, seedHooks, seedSubagents, seedPlugins, seedMcpServers, seedAgentArchitectures } from "./lib/seed";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Seed on startup — idempotent (each seed checks count > 0 before inserting).
// Run sequentially so system instructions are always available before KB/memory.
async function runSeed(): Promise<void> {
  try {
    await seedSystemInstructions();
    logger.info("Seed: system instructions OK");
  } catch (err) {
    logger.error({ err }, "Seed: system instructions failed");
  }
  try {
    await seedKnowledgeBase();
    logger.info("Seed: knowledge base OK");
  } catch (err) {
    logger.error({ err }, "Seed: knowledge base failed");
  }
  try {
    await seedMemory();
    logger.info("Seed: memory OK");
  } catch (err) {
    logger.error({ err }, "Seed: memory failed");
  }
  try {
    await seedSkills();
    logger.info("Seed: skills OK");
  } catch (err) {
    logger.error({ err }, "Seed: skills failed");
  }
  try {
    await seedHooks();
    logger.info("Seed: hooks OK");
  } catch (err) {
    logger.error({ err }, "Seed: hooks failed");
  }
  try {
    await seedSubagents();
    logger.info("Seed: subagents OK");
  } catch (err) {
    logger.error({ err }, "Seed: subagents failed");
  }
  try {
    await seedPlugins();
    logger.info("Seed: plugins OK");
  } catch (err) {
    logger.error({ err }, "Seed: plugins failed");
  }
  try {
    await seedMcpServers();
    logger.info("Seed: mcp-servers OK");
  } catch (err) {
    logger.error({ err }, "Seed: mcp-servers failed");
  }
  try {
    await seedAgentArchitectures();
    logger.info("Seed: agent-architectures OK");
  } catch (err) {
    logger.error({ err }, "Seed: agent-architectures failed");
  }
}

// Non-blocking startup seed — server is ready to handle requests immediately
runSeed().catch((err) => logger.error({ err }, "Seed: unexpected error"));

export default app;
