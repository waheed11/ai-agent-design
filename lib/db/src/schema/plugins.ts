import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pluginsTable = pgTable("plugins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  version: text("version").notNull().default("1.0.0"),
  installCommand: text("install_command").notNull().default(""),
  components: text("components").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPluginSchema = createInsertSchema(pluginsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlugin = z.infer<typeof insertPluginSchema>;
export type Plugin = typeof pluginsTable.$inferSelect;
