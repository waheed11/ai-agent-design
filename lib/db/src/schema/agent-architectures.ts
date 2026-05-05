import { pgTable, text, serial, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface ArchitectureLayers {
  systemInstructions: string;
  agentsContent: string;
  skillIds: number[];
  hookIds: number[];
  subagentIds: number[];
  pluginIds: number[];
  mcpServerIds: number[];
  /** @deprecated use agentsContent — kept for backward compat with existing JSON rows */
  memoryNotes?: string;
}

export const agentArchitecturesTable = pgTable("agent_architectures", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  planId: text("plan_id"),
  layers: json("layers").$type<ArchitectureLayers>().notNull().default({
    systemInstructions: "",
    agentsContent: "",
    skillIds: [],
    hookIds: [],
    subagentIds: [],
    pluginIds: [],
    mcpServerIds: [],
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAgentArchitectureSchema = createInsertSchema(agentArchitecturesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAgentArchitecture = z.infer<typeof insertAgentArchitectureSchema>;
export type AgentArchitecture = typeof agentArchitecturesTable.$inferSelect;
