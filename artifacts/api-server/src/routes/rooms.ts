import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, roomsTable } from "@workspace/db";
import {
  ListRoomsResponse,
  CreateRoomBody,
  GetRoomParams,
  GetRoomResponse,
  UpdateRoomParams,
  UpdateRoomBody,
  UpdateRoomResponse,
  DeleteRoomParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/rooms", async (_req, res): Promise<void> => {
  const rooms = await db.select().from(roomsTable).orderBy(roomsTable.name);
  res.json(ListRoomsResponse.parse(rooms));
});

router.post("/rooms", async (req, res): Promise<void> => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [room] = await db.insert(roomsTable).values(parsed.data).returning();
  res.status(201).json(GetRoomResponse.parse(room));
});

router.get("/rooms/:id", async (req, res): Promise<void> => {
  const params = GetRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, params.data.id));
  if (!room) {
    res.status(404).json({ error: "会議室が見つかりません" });
    return;
  }

  res.json(GetRoomResponse.parse(room));
});

router.patch("/rooms/:id", async (req, res): Promise<void> => {
  const params = UpdateRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [room] = await db.update(roomsTable).set(parsed.data).where(eq(roomsTable.id, params.data.id)).returning();
  if (!room) {
    res.status(404).json({ error: "会議室が見つかりません" });
    return;
  }

  res.json(UpdateRoomResponse.parse(room));
});

router.delete("/rooms/:id", async (req, res): Promise<void> => {
  const params = DeleteRoomParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [room] = await db.delete(roomsTable).where(eq(roomsTable.id, params.data.id)).returning();
  if (!room) {
    res.status(404).json({ error: "会議室が見つかりません" });
    return;
  }

  res.sendStatus(204);
});

export default router;
