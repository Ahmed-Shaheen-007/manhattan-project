import { Router, type IRouter } from "express";
import { db, usersTable, rolesTable, groupsTable, groupMembersTable, messagesTable, reportsTable, logsTable } from "@workspace/db";
import { eq, gte, count, desc, and, inArray } from "drizzle-orm";
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

async function createLog(adminId: number, action: string, targetType: string, targetId: number): Promise<void> {
  await db.insert(logsTable).values({ adminId, action, targetType, targetId });
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
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(usersTable).where(eq(usersTable.id, id));
  await createLog(req.user!.userId, "DELETE_USER", "user", id);
  res.json({ success: true, message: "User deleted" });
});

router.patch("/admin/users/:id/ban", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { banned } = req.body as { banned: boolean };
  if (typeof banned !== "boolean") { res.status(400).json({ error: "banned must be a boolean" }); return; }

  await db.update(usersTable).set({ isBanned: banned }).where(eq(usersTable.id, id));
  await createLog(req.user!.userId, banned ? "BAN_USER" : "UNBAN_USER", "user", id);
  res.json({ success: true, message: banned ? "User banned" : "User unbanned" });
});

router.patch("/admin/users/:id/role", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { role } = req.body as { role: "student" | "admin" };
  if (role !== "student" && role !== "admin") { res.status(400).json({ error: "Invalid role" }); return; }

  const [existing] = await db.select().from(rolesTable).where(eq(rolesTable.userId, id));
  if (existing) {
    await db.update(rolesTable).set({ role }).where(eq(rolesTable.userId, id));
  } else {
    await db.insert(rolesTable).values({ userId: id, role });
  }
  await createLog(req.user!.userId, `CHANGE_ROLE_TO_${role.toUpperCase()}`, "user", id);
  res.json({ success: true, message: `Role changed to ${role}` });
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

router.delete("/admin/groups/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(groupsTable).where(eq(groupsTable.id, id));
  await createLog(req.user!.userId, "DELETE_GROUP", "group", id);
  res.json({ success: true, message: "Group deleted" });
});

router.get("/admin/messages", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 200);
  const offsetVal = parseInt(String(req.query.offset ?? "0"), 10) || 0;
  const groupId = req.query.groupId ? parseInt(String(req.query.groupId), 10) : undefined;
  const flagged = req.query.flagged === "true";

  let query = db.select().from(messagesTable).$dynamic();
  const conditions = [];
  if (groupId && !isNaN(groupId)) conditions.push(eq(messagesTable.groupId, groupId));
  if (flagged) conditions.push(eq(messagesTable.isFlagged, true));
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const msgs = await query.orderBy(desc(messagesTable.createdAt)).limit(limit).offset(offsetVal);

  if (msgs.length === 0) { res.json([]); return; }

  const userIds = [...new Set(msgs.map(m => m.userId))];
  const groupIds = [...new Set(msgs.map(m => m.groupId))];
  const users = await db.select().from(usersTable).where(inArray(usersTable.id, userIds));
  const groups = await db.select().from(groupsTable).where(inArray(groupsTable.id, groupIds));
  const userMap = new Map(users.map(u => [u.id, u]));
  const groupMap = new Map(groups.map(g => [g.id, g]));

  const result = msgs.map(m => {
    const user = userMap.get(m.userId);
    const { password: _pw, ...userSafe } = user ?? { id: 0, name: "", email: "", password: "", faculty: "", academicYear: 0, subjectsOfInterest: [], isBanned: false, createdAt: new Date() };
    return { ...m, user: userSafe, groupTitle: groupMap.get(m.groupId)?.title ?? "" };
  });

  res.json(result);
});

router.delete("/admin/messages/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(messagesTable).where(eq(messagesTable.id, id));
  await createLog(req.user!.userId, "DELETE_MESSAGE", "message", id);
  res.json({ success: true, message: "Message deleted" });
});

router.get("/admin/reports", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const status = req.query.status as "pending" | "resolved" | undefined;

  let query = db.select().from(reportsTable).$dynamic();
  if (status === "pending" || status === "resolved") {
    query = query.where(eq(reportsTable.status, status));
  }

  const reports = await query.orderBy(desc(reportsTable.createdAt));

  if (reports.length === 0) { res.json([]); return; }

  const reporterIds = [...new Set(reports.map(r => r.reporterId))];
  const reporters = await db.select().from(usersTable).where(inArray(usersTable.id, reporterIds));
  const reporterMap = new Map(reporters.map(u => [u.id, u]));

  const result = reports.map(r => {
    const reporter = reporterMap.get(r.reporterId);
    const { password: _pw, ...reporterSafe } = reporter ?? { id: 0, name: "", email: "", password: "", faculty: "", academicYear: 0, subjectsOfInterest: [], isBanned: false, createdAt: new Date() };
    return { ...r, reporter: reporterSafe };
  });

  res.json(result);
});

router.patch("/admin/reports/:id/resolve", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.update(reportsTable).set({ status: "resolved" }).where(eq(reportsTable.id, id));
  await createLog(req.user!.userId, "RESOLVE_REPORT", "report", id);
  res.json({ success: true, message: "Report resolved" });
});

router.get("/admin/logs", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "100"), 10) || 100, 500);
  const offsetVal = parseInt(String(req.query.offset ?? "0"), 10) || 0;

  const logs = await db.select().from(logsTable)
    .orderBy(desc(logsTable.createdAt))
    .limit(limit)
    .offset(offsetVal);

  if (logs.length === 0) { res.json([]); return; }

  const adminIds = [...new Set(logs.map(l => l.adminId))];
  const admins = await db.select().from(usersTable).where(inArray(usersTable.id, adminIds));
  const adminMap = new Map(admins.map(u => [u.id, u]));

  const result = logs.map(l => {
    const admin = adminMap.get(l.adminId);
    const { password: _pw, ...adminSafe } = admin ?? { id: 0, name: "", email: "", password: "", faculty: "", academicYear: 0, subjectsOfInterest: [], isBanned: false, createdAt: new Date() };
    return { ...l, admin: adminSafe };
  });

  res.json(result);
});

router.get("/admin/stats", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsersRow] = await db.select({ count: count() }).from(usersTable);
  const [totalGroupsRow] = await db.select({ count: count() }).from(groupsTable);
  const [totalMessagesRow] = await db.select({ count: count() }).from(messagesTable);
  const [totalReportsRow] = await db.select({ count: count() }).from(reportsTable);
  const [pendingReportsRow] = await db.select({ count: count() }).from(reportsTable).where(eq(reportsTable.status, "pending"));
  const [bannedUsersRow] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.isBanned, true));

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
    totalReports: totalReportsRow?.count ?? 0,
    pendingReports: pendingReportsRow?.count ?? 0,
    bannedUsers: bannedUsersRow?.count ?? 0,
  });
});

export default router;
