import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, systemInstructionsTable } from "@workspace/db";
import {
  ListSystemInstructionsResponse,
  GetSystemInstructionParams,
  GetSystemInstructionResponse,
  UpdateSystemInstructionParams,
  UpdateSystemInstructionBody,
  UpdateSystemInstructionResponse,
  ResetSystemInstructionParams,
  ResetSystemInstructionResponse,
} from "@workspace/api-zod";
import { seedSystemInstructions } from "../lib/seed";

const router: IRouter = Router();

router.get("/system-instructions", async (_req, res): Promise<void> => {
  await seedSystemInstructions();
  const instructions = await db.select().from(systemInstructionsTable).orderBy(systemInstructionsTable.mode);
  res.json(ListSystemInstructionsResponse.parse(instructions));
});

router.get("/system-instructions/:mode", async (req, res): Promise<void> => {
  const params = GetSystemInstructionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await seedSystemInstructions();
  const [instruction] = await db
    .select()
    .from(systemInstructionsTable)
    .where(eq(systemInstructionsTable.mode, params.data.mode));

  if (!instruction) {
    res.status(404).json({ error: "System instruction not found" });
    return;
  }

  res.json(GetSystemInstructionResponse.parse(instruction));
});

router.patch("/system-instructions/:mode", async (req, res): Promise<void> => {
  const params = UpdateSystemInstructionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateSystemInstructionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [instruction] = await db
    .update(systemInstructionsTable)
    .set({ content: body.data.content, isDefault: false, updatedAt: new Date() })
    .where(eq(systemInstructionsTable.mode, params.data.mode))
    .returning();

  if (!instruction) {
    res.status(404).json({ error: "System instruction not found" });
    return;
  }

  res.json(UpdateSystemInstructionResponse.parse(instruction));
});

router.post("/system-instructions/:mode/reset", async (req, res): Promise<void> => {
  const params = ResetSystemInstructionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [current] = await db
    .select()
    .from(systemInstructionsTable)
    .where(eq(systemInstructionsTable.mode, params.data.mode));

  if (!current) {
    res.status(404).json({ error: "System instruction not found" });
    return;
  }

  const [instruction] = await db
    .update(systemInstructionsTable)
    .set({ content: current.defaultContent, isDefault: true, updatedAt: new Date() })
    .where(eq(systemInstructionsTable.mode, params.data.mode))
    .returning();

  res.json(ResetSystemInstructionResponse.parse(instruction));
});

export default router;
