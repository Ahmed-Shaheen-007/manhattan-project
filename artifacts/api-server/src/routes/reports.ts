import { Router, type IRouter } from "express";
import { db, reportsTable, usersTable } from "@workspace/db";
import { eq, and, gte, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const VALID_REASONS = ["spam", "abuse", "inappropriate_content", "harassment", "misinformation", "other"] as const;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5;

router.post("/reports", requireAuth, async (req, res): Promise<void> => {
  const { type, targetId, reason, description } = req.body as {
    type?: string;
    targetId?: number;
    reason?: string;
    description?: string;
  };

  if (!type || !["user", "group", "message"].includes(type)) {
    res.status(400).json({ error: "Invalid report type" });
    return;
  }
  if (!targetId || typeof targetId !== "number") {
    res.status(400).json({ error: "targetId is required" });
    return;
  }
  if (!reason || !VALID_REASONS.includes(reason as any)) {
    res.status(400).json({ error: `Reason must be one of: ${VALID_REASONS.join(", ")}` });
    return;
  }

  const userId = req.user!.userId;

  // Duplicate check
  const [existing] = await db.select().from(reportsTable).where(
    and(
      eq(reportsTable.reporterId, userId),
      eq(reportsTable.type, type as "user" | "group" | "message"),
      eq(reportsTable.targetId, targetId),
    )
  );
  if (existing) {
    res.status(409).json({ error: "You have already reported this content" });
    return;
  }

  // Rate limit: max 5 reports per hour
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const [countRow] = await db.select({ count: count() }).from(reportsTable).where(
    and(
      eq(reportsTable.reporterId, userId),
      gte(reportsTable.createdAt, windowStart),
    )
  );
  if ((countRow?.count ?? 0) >= RATE_LIMIT_MAX) {
    res.status(429).json({ error: "Too many reports submitted. Please wait before submitting another report." });
    return;
  }

  const [report] = await db.insert(reportsTable).values({
    reporterId: userId,
    type: type as "user" | "group" | "message",
    targetId,
    reason,
    description: description?.trim() || null,
    status: "pending",
  }).returning();

  res.status(201).json(report);
});

export default router;
