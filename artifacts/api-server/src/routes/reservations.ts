import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db, reservationsTable, roomsTable, usersTable } from "@workspace/db";
import {
  ListReservationsQueryParams,
  ListReservationsResponse,
  CreateReservationBody,
  GetReservationParams,
  GetReservationResponse,
  UpdateReservationParams,
  UpdateReservationBody,
  UpdateReservationResponse,
  DeleteReservationParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toReservationWithDetails(r: typeof reservationsTable.$inferSelect, room: typeof roomsTable.$inferSelect, user: typeof usersTable.$inferSelect) {
  return {
    id: r.id,
    roomId: r.roomId,
    userId: r.userId,
    title: r.title,
    description: r.description,
    startTime: r.startTime,
    endTime: r.endTime,
    attendees: r.attendees,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    room: {
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      location: room.location,
      description: room.description,
      amenities: room.amenities,
      isActive: room.isActive,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    },
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
}

router.get("/reservations", async (req, res): Promise<void> => {
  const parsed = ListReservationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { roomId, userId, date, startDate, endDate } = parsed.data;

  const conditions = [];
  if (roomId != null) conditions.push(eq(reservationsTable.roomId, roomId));
  if (userId != null) conditions.push(eq(reservationsTable.userId, userId));
  if (date != null) {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    conditions.push(gte(reservationsTable.startTime, d));
    conditions.push(lte(reservationsTable.startTime, next));
  } else {
    if (startDate != null) conditions.push(gte(reservationsTable.startTime, new Date(startDate)));
    if (endDate != null) conditions.push(lte(reservationsTable.endTime, new Date(endDate)));
  }

  const rows = await db
    .select()
    .from(reservationsTable)
    .leftJoin(roomsTable, eq(reservationsTable.roomId, roomsTable.id))
    .leftJoin(usersTable, eq(reservationsTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(reservationsTable.startTime);

  const result = rows
    .filter((r) => r.rooms && r.users)
    .map((r) => toReservationWithDetails(r.reservations, r.rooms!, r.users!));

  res.json(ListReservationsResponse.parse(result));
});

router.post("/reservations", async (req, res): Promise<void> => {
  const userId = (req.session as unknown as Record<string, unknown>)["userId"] as number | undefined;
  if (!userId) {
    res.status(401).json({ error: "認証が必要です" });
    return;
  }

  const parsed = CreateReservationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { roomId, title, description, startTime, endTime, attendees } = parsed.data;

  const conflictCheck = await db
    .select()
    .from(reservationsTable)
    .where(
      and(
        eq(reservationsTable.roomId, roomId),
        eq(reservationsTable.status, "confirmed"),
        sql`${reservationsTable.startTime} < ${endTime} AND ${reservationsTable.endTime} > ${startTime}`
      )
    );

  if (conflictCheck.length > 0) {
    res.status(409).json({ error: "指定した時間帯はすでに予約されています" });
    return;
  }

  const [reservation] = await db
    .insert(reservationsTable)
    .values({ roomId, userId, title, description, startTime, endTime, attendees, status: "confirmed" })
    .returning();

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, reservation.roomId));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, reservation.userId));

  res.status(201).json(GetReservationResponse.parse(toReservationWithDetails(reservation, room, user)));
});

router.get("/reservations/:id", async (req, res): Promise<void> => {
  const params = GetReservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(reservationsTable)
    .leftJoin(roomsTable, eq(reservationsTable.roomId, roomsTable.id))
    .leftJoin(usersTable, eq(reservationsTable.userId, usersTable.id))
    .where(eq(reservationsTable.id, params.data.id));

  if (!row || !row.rooms || !row.users) {
    res.status(404).json({ error: "予約が見つかりません" });
    return;
  }

  res.json(GetReservationResponse.parse(toReservationWithDetails(row.reservations, row.rooms, row.users)));
});

router.patch("/reservations/:id", async (req, res): Promise<void> => {
  const params = UpdateReservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateReservationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "予約が見つかりません" });
    return;
  }

  const newStart = parsed.data.startTime ?? existing.startTime;
  const newEnd = parsed.data.endTime ?? existing.endTime;

  if (parsed.data.startTime || parsed.data.endTime) {
    const conflictCheck = await db
      .select()
      .from(reservationsTable)
      .where(
        and(
          eq(reservationsTable.roomId, existing.roomId),
          eq(reservationsTable.status, "confirmed"),
          sql`${reservationsTable.id} != ${params.data.id}`,
          sql`${reservationsTable.startTime} < ${newEnd} AND ${reservationsTable.endTime} > ${newStart}`
        )
      );

    if (conflictCheck.length > 0) {
      res.status(409).json({ error: "指定した時間帯はすでに予約されています" });
      return;
    }
  }

  const [updated] = await db
    .update(reservationsTable)
    .set(parsed.data)
    .where(eq(reservationsTable.id, params.data.id))
    .returning();

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, updated.roomId));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId));

  res.json(UpdateReservationResponse.parse(toReservationWithDetails(updated, room, user)));
});

router.delete("/reservations/:id", async (req, res): Promise<void> => {
  const params = DeleteReservationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(reservationsTable).where(eq(reservationsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "予約が見つかりません" });
    return;
  }

  res.sendStatus(204);
});

export default router;
