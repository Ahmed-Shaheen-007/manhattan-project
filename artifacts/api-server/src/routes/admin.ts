import { Router, type IRouter } from "express";
import { db, usersTable, rolesTable, groupsTable, groupMembersTable, messagesTable } from "@workspace/db";
import { eq, gte, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import type { Request, Response, NextFunction } from "express";

const router: IRouter = Router();

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const [roleRow] = await db.select().from(rolesTable).where(eq(rolesTable.userId, req.user!.userId));
  if (roleRow?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

router.get("/admin/users", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  const roles = await db.select().from(rolesTable);
  const roleMap = new Map(roles.map(r => [r.userId, r.role]));

  const result = users.map(({ password: _pw, ...u }) => ({
    ...u,
    role: roleMap.get(u.id) ?? "student",
  }));

  res.json(result);
});

router.delete("/admin/users/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ success: true, message: "User deleted" });
});

router.get("/admin/groups", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const groups = await db.select().from(groupsTable);
  const allMembers = await db.select().from(groupMembersTable);
  const memberCountMap = new Map<number, number>();
  for (const m of allMembers) {
    memberCountMap.set(m.groupId, (memberCountMap.get(m.groupId) ?? 0) + 1);
  }

  const result = groups.map(g => ({
    ...g,
    memberCount: memberCountMap.get(g.id) ?? 0,
    creator: undefined,
    isMember: false,
  }));

  res.json(result);
});

router.delete("/admin/messages/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(messagesTable).where(eq(messagesTable.id, id));
  res.json({ success: true, message: "Message deleted" });
});

router.get("/admin/stats", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsersRow] = await db.select({ count: count() }).from(usersTable);
  const [totalGroupsRow] = await db.select({ count: count() }).from(groupsTable);
  const [totalMessagesRow] = await db.select({ count: count() }).from(messagesTable);

  const activeGroupsToday = await db.select().from(messagesTable).where(gte(messagesTable.createdAt, todayStart));
  const activeGroupIds = new Set(activeGroupsToday.map(m => m.groupId));

  const newUsersThisWeek = await db.select().from(usersTable).where(gte(usersTable.createdAt, weekStart));
  const newGroupsThisWeek = await db.select().from(groupsTable).where(gte(groupsTable.createdAt, weekStart));

  res.json({
    totalUsers: totalUsersRow?.count ?? 0,
    totalGroups: totalGroupsRow?.count ?? 0,
    totalMessages: totalMessagesRow?.count ?? 0,
    activeGroupsToday: activeGroupIds.size,
    newUsersThisWeek: newUsersThisWeek.length,
    newGroupsThisWeek: newGroupsThisWeek.length,
  });
});

export default router;
