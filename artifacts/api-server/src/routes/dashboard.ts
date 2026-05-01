import { Router, type IRouter } from "express";
import { db, groupsTable, groupMembersTable, usersTable } from "@workspace/db";
import { eq, gte, inArray, sql, count } from "drizzle-orm";
import { optionalAuth, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", optionalAuth, async (req, res): Promise<void> => {
  const now = new Date();

  const [totalGroupsRow] = await db.select({ count: count() }).from(groupsTable);
  const [totalMembersRow] = await db.select({ count: count() }).from(groupMembersTable);

  const onlineGroups = await db.select().from(groupsTable).where(eq(groupsTable.type, "online"));
  const offlineGroups = await db.select().from(groupsTable).where(eq(groupsTable.type, "offline"));

  const upcomingGroups = await db.select().from(groupsTable).where(gte(groupsTable.dateTime, now));

  let myGroupsCount = 0;
  if (req.user) {
    const myMemberships = await db.select().from(groupMembersTable).where(eq(groupMembersTable.userId, req.user.userId));
    myGroupsCount = myMemberships.length;
  }

  // Subject breakdown
  const allGroups = await db.select({ subject: groupsTable.subject }).from(groupsTable);
  const subjectMap = new Map<string, number>();
  for (const g of allGroups) {
    subjectMap.set(g.subject, (subjectMap.get(g.subject) ?? 0) + 1);
  }
  const subjectBreakdown = Array.from(subjectMap.entries())
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  res.json({
    totalGroups: totalGroupsRow?.count ?? 0,
    totalMembers: totalMembersRow?.count ?? 0,
    onlineGroups: onlineGroups.length,
    offlineGroups: offlineGroups.length,
    myGroupsCount,
    upcomingCount: upcomingGroups.length,
    subjectBreakdown,
  });
});

router.get("/dashboard/upcoming", requireAuth, async (req, res): Promise<void> => {
  const now = new Date();

  const memberships = await db.select().from(groupMembersTable).where(eq(groupMembersTable.userId, req.user!.userId));
  if (memberships.length === 0) {
    res.json([]);
    return;
  }

  const groupIds = memberships.map(m => m.groupId);
  const groups = await db.select().from(groupsTable)
    .where(inArray(groupsTable.id, groupIds));

  const upcomingGroups = groups.filter(g => g.dateTime >= now)
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())
    .slice(0, 10);

  if (upcomingGroups.length === 0) {
    res.json([]);
    return;
  }

  const allMembers = await db.select().from(groupMembersTable)
    .where(inArray(groupMembersTable.groupId, upcomingGroups.map(g => g.id)));
  const memberCountMap = new Map<number, number>();
  for (const m of allMembers) {
    memberCountMap.set(m.groupId, (memberCountMap.get(m.groupId) ?? 0) + 1);
  }

  const creatorIds = [...new Set(upcomingGroups.map(g => g.createdBy))];
  const creators = creatorIds.length > 0 ? await db.select().from(usersTable).where(inArray(usersTable.id, creatorIds)) : [];
  const creatorMap = new Map(creators.map(c => [c.id, c]));

  const result = upcomingGroups.map(g => {
    const creator = creatorMap.get(g.createdBy);
    const { password: _pw, ...creatorSafe } = creator ?? { id: 0, name: "", email: "", password: "", faculty: "", academicYear: 0, subjectsOfInterest: [], createdAt: new Date() };
    return { ...g, memberCount: memberCountMap.get(g.id) ?? 0, creator: creatorSafe, isMember: true };
  });

  res.json(result);
});

router.get("/dashboard/popular", optionalAuth, async (req, res): Promise<void> => {
  const allMembers = await db.select().from(groupMembersTable);
  const memberCountMap = new Map<number, number>();
  for (const m of allMembers) {
    memberCountMap.set(m.groupId, (memberCountMap.get(m.groupId) ?? 0) + 1);
  }

  const groups = await db.select().from(groupsTable);
  const sorted = groups.sort((a, b) => (memberCountMap.get(b.id) ?? 0) - (memberCountMap.get(a.id) ?? 0)).slice(0, 10);

  if (sorted.length === 0) {
    res.json([]);
    return;
  }

  const creatorIds = [...new Set(sorted.map(g => g.createdBy))];
  const creators = creatorIds.length > 0 ? await db.select().from(usersTable).where(inArray(usersTable.id, creatorIds)) : [];
  const creatorMap = new Map(creators.map(c => [c.id, c]));

  const currentUserId = req.user?.userId;

  const result = sorted.map(g => {
    const creator = creatorMap.get(g.createdBy);
    const { password: _pw, ...creatorSafe } = creator ?? { id: 0, name: "", email: "", password: "", faculty: "", academicYear: 0, subjectsOfInterest: [], createdAt: new Date() };
    const isMember = currentUserId ? allMembers.some(m => m.groupId === g.id && m.userId === currentUserId) : false;
    return { ...g, memberCount: memberCountMap.get(g.id) ?? 0, creator: creatorSafe, isMember };
  });

  res.json(result);
});

export default router;
