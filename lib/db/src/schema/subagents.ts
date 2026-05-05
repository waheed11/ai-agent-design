import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subagentsTable = pgTable("subagents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  modelPreference: text("model_preference").notNull().default("gpt-4o-mini"),
  tools: text("tools").array().notNull().default([]),
  permissions: text("permissions").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubagentSchema = createInsertSchema(subagentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubagent = z.infer<typeof insertSubagentSchema>;
export type Subagent = typeof subagentsTable.$inferSelect;
