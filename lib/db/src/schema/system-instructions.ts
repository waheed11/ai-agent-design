import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const systemInstructionsTable = pgTable("system_instructions", {
  id: serial("id").primaryKey(),
  mode: text("mode").notNull().unique(),
  content: text("content").notNull(),
  defaultContent: text("default_content").notNull(),
  isDefault: boolean("is_default").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSystemInstructionSchema = createInsertSchema(systemInstructionsTable).omit({ id: true, updatedAt: true });
export type InsertSystemInstruction = z.infer<typeof insertSystemInstructionSchema>;
export type SystemInstruction = typeof systemInstructionsTable.$inferSelect;
