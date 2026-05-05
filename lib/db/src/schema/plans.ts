import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const plansTable = pgTable("plans", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  initialPrompt: text("initial_prompt").notNull(),
  documentContext: text("document_context"),
  professionalPrompt: text("professional_prompt"),
  executionPlan: text("execution_plan"),
  architectureId: integer("architecture_id"),
  status: text("status").notNull().default("draft"),
  language: text("language").notNull().default("ar"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const planMessagesTable = pgTable("plan_messages", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => plansTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlanSchema = createInsertSchema(plansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plansTable.$inferSelect;

export const insertPlanMessageSchema = createInsertSchema(planMessagesTable).omit({ id: true, createdAt: true });
export type InsertPlanMessage = z.infer<typeof insertPlanMessageSchema>;
export type PlanMessage = typeof planMessagesTable.$inferSelect;
