import { Router, type IRouter } from "express";
import { db, reportsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/reports", requireAuth, async (req, res): Promise<void> => {
  const { type, targetId, reason } = req.body as { type?: string; targetId?: number; reason?: string };

  if (!type || !["user", "group", "message"].includes(type)) {
    res.status(400).json({ error: "Invalid report type" });
    return;
  }
  if (!targetId || typeof targetId !== "number") {
    res.status(400).json({ error: "targetId is required" });
    return;
  }
  if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
    res.status(400).json({ error: "Reason must be at least 5 characters" });
    return;
  }

  const [report] = await db.insert(reportsTable).values({
    reporterId: req.user!.userId,
    type: type as "user" | "group" | "message",
    targetId,
    reason: reason.trim(),
    status: "pending",
  }).returning();

  res.status(201).json(report);
});

export default router;
