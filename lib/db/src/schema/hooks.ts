import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const hooksTable = pgTable("hooks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  eventType: text("event_type").notNull(),
  matcherPattern: text("matcher_pattern").notNull().default("*"),
  command: text("command").notNull(),
  description: text("description").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertHookSchema = createInsertSchema(hooksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHook = z.infer<typeof insertHookSchema>;
export type Hook = typeof hooksTable.$inferSelect;
