import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mcpServersTable = pgTable("mcp_servers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  serverType: text("server_type").notNull().default("stdio"),
  endpoint: text("endpoint").notNull().default(""),
  capabilities: text("capabilities").notNull().default(""),
  status: text("status").notNull().default("configured"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMcpServerSchema = createInsertSchema(mcpServersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMcpServer = z.infer<typeof insertMcpServerSchema>;
export type McpServer = typeof mcpServersTable.$inferSelect;
