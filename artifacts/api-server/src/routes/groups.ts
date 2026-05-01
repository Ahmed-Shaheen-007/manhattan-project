import { Router, type IRouter } from "express";
import { db, groupsTable, groupMembersTable, usersTable, rolesTable } from "@workspace/db";
import { eq, and, gte, lte, ilike, inArray, count } from "drizzle-orm";
import { CreateGroupBody } from "@workspace/api-zod";
import { requireAuth, optionalAuth } from "../middlewares/auth";

const router: IRouter = Router();

const DAILY_GROUP_LIMIT = 3;

router.get("/groups", optionalAuth, async (req, res): Promise<void> => {
  const { subject, type, date, search } = req.query as Record<string, string | undefined>;

  let query = db.select().from(groupsTable).$dynamic();

  const conditions = [];
  if (subject) conditions.push(ilike(groupsTable.subject, `%${subject}%`));
  if (type === "online" || type === "offline") conditions.push(eq(groupsTable.type, type));
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    conditions.push(gte(groupsTable.dateTime, start));
    conditions.push(lte(groupsTable.dateTime, end));
  }
  if (search) {
    conditions.push(ilike(groupsTable.title, `%${search}%`));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const groups = await query;

  if (groups.length === 0) {
    res.json([]);
    return;
  }

  const groupIds = groups.map(g => g.id);
  const allMembers = await db.select().from(groupMembersTable).where(inArray(groupMembersTable.groupId, groupIds));
  const memberCountMap = new Map<number, number>();
  const memberUserIds = new Set<number>();
  for (const m of allMembers) {
    memberCountMap.set(m.groupId, (memberCountMap.get(m.groupId) ?? 0) + 1);
    memberUserIds.add(m.userId);
  }

  const creatorIds = [...new Set(groups.map(g => g.createdBy))];
  const creators = creatorIds.length > 0 ? await db.select().from(usersTable).where(inArray(usersTable.id, creatorIds)) : [];
  const creatorMap = new Map(creators.map(c => [c.id, c]));

  const currentUserId = req.user?.userId;

  const result = groups.map(g => {
    const creator = creatorMap.get(g.createdBy);
    const { password: _pw, ...creatorSafe } = creator ?? { id: 0, name: "", email: "", password: "", faculty: "", academicYear: 0, subjectsOfInterest: [], isBanned: false, createdAt: new Date() };
    const isMember = currentUserId ? allMembers.some(m => m.groupId === g.id && m.userId === currentUserId) : false;
    return { ...g, memberCount: memberCountMap.get(g.id) ?? 0, creator: creatorSafe, isMember };
  });

  res.json(result);
});

router.post("/groups", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.user!.userId;

  // Daily creation limit
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayGroups = await db.select().from(groupsTable)
    .where(and(eq(groupsTable.createdBy, userId), gte(groupsTable.createdAt, todayStart)));
  if (todayGroups.length >= DAILY_GROUP_LIMIT) {
    res.status(429).json({ error: `You can only create ${DAILY_GROUP_LIMIT} groups per day` });
    return;
  }

  // Duplicate detection: same subject + within 1 hour of given dateTime
  const requestedTime = new Date(parsed.data.dateTime);
  const windowStart = new Date(requestedTime.getTime() - 60 * 60 * 1000);
  const windowEnd = new Date(requestedTime.getTime() + 60 * 60 * 1000);
  const duplicates = await db.select().from(groupsTable).where(
    and(
      ilike(groupsTable.subject, parsed.data.subject),
      gte(groupsTable.dateTime, windowStart),
      lte(groupsTable.dateTime, windowEnd),
    )
  );
  if (duplicates.length > 0) {
    res.status(400).json({ error: "A group with the same subject already exists around that time" });
    return;
  }

  const [group] = await db.insert(groupsTable).values({
    ...parsed.data,
    dateTime: requestedTime,
    location: parsed.data.location ?? null,
    createdBy: userId,
  }).returning();

  // Auto-join creator
  await db.insert(groupMembersTable).values({ userId, groupId: group.id });

  res.status(201).json(group);
});

router.get("/groups/:id", optionalAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, id));
  if (!group) { res.status(404).json({ error: "Group not found" }); return; }

  const members = await db.select().from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, id));

  const memberIds = members.map(m => m.userId);
  const memberUsers = memberIds.length > 0 ? await db.select().from(usersTable).where(inArray(usersTable.id, memberIds)) : [];
  const memberUsersSafe = memberUsers.map(({ password: _pw, ...u }) => u);

  const [creator] = await db.select().from(usersTable).where(eq(usersTable.id, group.createdBy));
  const { password: _pw, ...creatorSafe } = creator ?? { id: 0, name: "", email: "", password: "", faculty: "", academicYear: 0, subjectsOfInterest: [], isBanned: false, createdAt: new Date() };

  const currentUserId = req.user?.userId;
  const isMember = currentUserId ? members.some(m => m.userId === currentUserId) : false;

  res.json({ ...group, memberCount: members.length, creator: creatorSafe, isMember, members: memberUsersSafe });
});

router.delete("/groups/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, id));
  if (!group) { res.status(404).json({ error: "Group not found" }); return; }

  const [roleRow] = await db.select().from(rolesTable).where(eq(rolesTable.userId, req.user!.userId));
  const isAdmin = roleRow?.role === "admin";

  if (group.createdBy !== req.user!.userId && !isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(groupsTable).where(eq(groupsTable.id, id));
  res.json({ success: true, message: "Group deleted" });
});

router.post("/groups/:id/join", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, id));
  if (!group) { res.status(404).json({ error: "Group not found" }); return; }

  const currentMembers = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, id));
  if (currentMembers.some(m => m.userId === req.user!.userId)) {
    res.status(400).json({ error: "Already a member" });
    return;
  }

  if (currentMembers.length >= group.maxMembers) {
    res.status(400).json({ error: "Group is full" });
    return;
  }

  await db.insert(groupMembersTable).values({ userId: req.user!.userId, groupId: id });
  res.json({ success: true, message: "Joined group" });
});

router.post("/groups/:id/leave", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(groupMembersTable).where(
    and(eq(groupMembersTable.groupId, id), eq(groupMembersTable.userId, req.user!.userId))
  );
  res.json({ success: true, message: "Left group" });
});

router.get("/groups/:id/members", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const members = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, id));
  const memberIds = members.map(m => m.userId);
  const users = memberIds.length > 0 ? await db.select().from(usersTable).where(inArray(usersTable.id, memberIds)) : [];
  res.json(users.map(({ password: _pw, ...u }) => u));
});

export default router;
