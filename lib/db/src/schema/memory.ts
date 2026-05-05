import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const memoryEntriesTable = pgTable("memory_entries", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  confidence: text("confidence").notNull().default("medium"),
  source: text("source").notNull(),
  isEditable: boolean("is_editable").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMemoryEntrySchema = createInsertSchema(memoryEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMemoryEntry = z.infer<typeof insertMemoryEntrySchema>;
export type MemoryEntry = typeof memoryEntriesTable.$inferSelect;
