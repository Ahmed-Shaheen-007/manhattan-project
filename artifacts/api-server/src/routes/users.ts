import { Router, type IRouter } from "express";
import { db, usersTable, rolesTable, groupsTable, groupMembersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { UpdateProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/users/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const { password: _pw, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

router.patch("/users/:id/profile", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  if (req.user!.userId !== id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.faculty != null) updateData.faculty = parsed.data.faculty;
  if (parsed.data.academicYear != null) updateData.academicYear = parsed.data.academicYear;
  if (parsed.data.subjectsOfInterest != null) updateData.subjectsOfInterest = parsed.data.subjectsOfInterest;

  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const { password: _pw, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

router.get("/users/:id/groups", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const memberships = await db.select({ groupId: groupMembersTable.groupId })
    .from(groupMembersTable)
    .where(eq(groupMembersTable.userId, id));

  if (memberships.length === 0) {
    res.json([]);
    return;
  }

  const groupIds = memberships.map(m => m.groupId);
  const groups = await db.select().from(groupsTable).where(inArray(groupsTable.id, groupIds));

  // Get member counts and creator info
  const allMembers = await db.select().from(groupMembersTable).where(inArray(groupMembersTable.groupId, groupIds));
  const memberCountMap = new Map<number, number>();
  for (const m of allMembers) {
    memberCountMap.set(m.groupId, (memberCountMap.get(m.groupId) ?? 0) + 1);
  }

  const creatorIds = [...new Set(groups.map(g => g.createdBy))];
  const creators = creatorIds.length > 0 ? await db.select().from(usersTable).where(inArray(usersTable.id, creatorIds)) : [];
  const creatorMap = new Map(creators.map(c => [c.id, c]));

  const result = groups.map(g => {
    const creator = creatorMap.get(g.createdBy);
    const { password: _pw, ...creatorWithoutPassword } = creator ?? { id: 0, name: "", email: "", password: "", faculty: "", academicYear: 0, subjectsOfInterest: [], createdAt: new Date() };
    return {
      ...g,
      memberCount: memberCountMap.get(g.id) ?? 0,
      creator: creatorWithoutPassword,
      isMember: true,
    };
  });

  res.json(result);
});

export default router;
