import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const knowledgeBaseTable = pgTable("knowledge_base", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  content: text("content").notNull(),
  summary: text("summary"),
  tags: text("tags").array().notNull().default([]),
  status: text("status").notNull().default("active"),
  version: text("version"),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBaseTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
export type KnowledgeBase = typeof knowledgeBaseTable.$inferSelect;
