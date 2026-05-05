import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const toolEvaluationsTable = pgTable("tool_evaluations", {
  id: serial("id").primaryKey(),
  toolName: text("tool_name").notNull(),
  toolUrl: text("tool_url"),
  projectRequirements: text("project_requirements").notNull(),
  report: text("report"),
  fitScore: integer("fit_score"),
  recommendation: text("recommendation"),
  status: text("status").notNull().default("pending"),
  language: text("language").notNull().default("ar"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertToolEvaluationSchema = createInsertSchema(toolEvaluationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertToolEvaluation = z.infer<typeof insertToolEvaluationSchema>;
export type ToolEvaluation = typeof toolEvaluationsTable.$inferSelect;
