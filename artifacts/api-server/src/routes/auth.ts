import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, usersTable, rolesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { requireAuth, signToken } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password, faculty, academicYear, subjectsOfInterest } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    name,
    email,
    password: hashedPassword,
    faculty,
    academicYear,
    subjectsOfInterest: subjectsOfInterest ?? [],
  }).returning();

  await db.insert(rolesTable).values({ userId: user.id, role: "student" });

  const token = signToken({ userId: user.id, email: user.email });
  const { password: _pw, ...userWithoutPassword } = user;

  res.status(201).json({ user: userWithoutPassword, token });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  const { password: _pw, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword, token });
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const [roleRow] = await db.select().from(rolesTable).where(eq(rolesTable.userId, user.id));
  const { password: _pw, ...userWithoutPassword } = user;
  res.json({ ...userWithoutPassword, role: roleRow?.role ?? "student" });
});

export default router;
