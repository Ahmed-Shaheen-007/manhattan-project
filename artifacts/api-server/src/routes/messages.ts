import { Router, type IRouter } from "express";
import { db, messagesTable, usersTable, groupMembersTable } from "@workspace/db";
import { eq, lt, desc, inArray } from "drizzle-orm";
import { SendMessageBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const BANNED_KEYWORDS = [
  "spam", "scam", "viagra", "casino", "lottery", "free money",
  "click here", "buy now", "make money fast", "get rich",
];

function containsBannedKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_KEYWORDS.some(kw => lower.includes(kw));
}

router.get("/groups/:id/messages", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 100);
  const before = req.query.before ? parseInt(String(req.query.before), 10) : undefined;

  let query = db.select().from(messagesTable)
    .where(eq(messagesTable.groupId, id))
    .$dynamic();

  if (before && !isNaN(before)) {
    query = query.where(lt(messagesTable.id, before));
  }

  const msgs = await query.orderBy(desc(messagesTable.createdAt)).limit(limit);
  const ordered = msgs.reverse();

  const userIds = [...new Set(ordered.map(m => m.userId))];
  const users = userIds.length > 0 ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds)) : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  const result = ordered.map(m => {
    const user = userMap.get(m.userId);
    const { password: _pw, ...userSafe } = user ?? { id: 0, name: "", email: "", password: "", faculty: "", academicYear: 0, subjectsOfInterest: [], isBanned: false, createdAt: new Date() };
    return { ...m, user: userSafe };
  });

  res.json(result);
});

router.post("/groups/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const isMember = await db.select().from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, id))
    .then(rows => rows.some(r => r.userId === req.user!.userId));

  if (!isMember) {
    res.status(403).json({ error: "Must be a group member to send messages" });
    return;
  }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const flagged = containsBannedKeyword(parsed.data.content);

  const [message] = await db.insert(messagesTable).values({
    groupId: id,
    userId: req.user!.userId,
    content: parsed.data.content,
    isFlagged: flagged,
  }).returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  const { password: _pw, ...userSafe } = user ?? { id: 0, name: "", email: "", password: "", faculty: "", academicYear: 0, subjectsOfInterest: [], isBanned: false, createdAt: new Date() };

  res.status(201).json({ ...message, user: userSafe });
});

export default router;
