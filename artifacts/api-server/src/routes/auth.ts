import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { LoginBody, LoginResponse, GetCurrentUserResponse, LogoutResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user) {
    res.status(401).json({ error: "メールアドレスまたはパスワードが正しくありません" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "メールアドレスまたはパスワードが正しくありません" });
    return;
  }

  (req.session as unknown as Record<string, unknown>)["userId"] = user.id;

  const userOut = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as "admin" | "user",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  res.json(LoginResponse.parse({ user: userOut, message: "ログインしました" }));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {
    res.json(LogoutResponse.parse({ message: "ログアウトしました" }));
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = (req.session as unknown as Record<string, unknown>)["userId"] as number | undefined;

  if (!userId) {
    res.status(401).json({ error: "認証が必要です" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "ユーザーが見つかりません" });
    return;
  }

  res.json(GetCurrentUserResponse.parse({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));
});

export default router;
