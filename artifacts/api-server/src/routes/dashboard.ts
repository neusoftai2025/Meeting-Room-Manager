import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, reservationsTable, roomsTable, usersTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetTodayReservationsResponse,
  GetRoomUtilizationResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [roomCount] = await db.select({ count: sql<number>`count(*)::int` }).from(roomsTable).where(eq(roomsTable.isActive, true));
  const [reservationCount] = await db.select({ count: sql<number>`count(*)::int` }).from(reservationsTable);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const [todayCount] = await db.select({ count: sql<number>`count(*)::int` }).from(reservationsTable)
    .where(sql`${reservationsTable.startTime} >= ${todayStart} AND ${reservationsTable.startTime} < ${todayEnd} AND ${reservationsTable.status} = 'confirmed'`);

  const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);

  const [upcomingCount] = await db.select({ count: sql<number>`count(*)::int` }).from(reservationsTable)
    .where(sql`${reservationsTable.startTime} >= ${now} AND ${reservationsTable.status} = 'confirmed'`);

  res.json(GetDashboardSummaryResponse.parse({
    totalRooms: roomCount?.count ?? 0,
    totalReservations: reservationCount?.count ?? 0,
    todayReservations: todayCount?.count ?? 0,
    activeUsers: userCount?.count ?? 0,
    upcomingReservations: upcomingCount?.count ?? 0,
  }));
});

router.get("/dashboard/today", async (_req, res): Promise<void> => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const rows = await db
    .select()
    .from(reservationsTable)
    .leftJoin(roomsTable, eq(reservationsTable.roomId, roomsTable.id))
    .leftJoin(usersTable, eq(reservationsTable.userId, usersTable.id))
    .where(sql`${reservationsTable.startTime} >= ${todayStart} AND ${reservationsTable.startTime} < ${todayEnd} AND ${reservationsTable.status} = 'confirmed'`)
    .orderBy(reservationsTable.startTime);

  const result = rows
    .filter((r) => r.rooms && r.users)
    .map((r) => ({
      id: r.reservations.id,
      roomId: r.reservations.roomId,
      userId: r.reservations.userId,
      title: r.reservations.title,
      description: r.reservations.description,
      startTime: r.reservations.startTime,
      endTime: r.reservations.endTime,
      attendees: r.reservations.attendees,
      status: r.reservations.status,
      createdAt: r.reservations.createdAt,
      updatedAt: r.reservations.updatedAt,
      room: r.rooms!,
      user: r.users!,
    }));

  res.json(GetTodayReservationsResponse.parse(result));
});

router.get("/dashboard/room-utilization", async (_req, res): Promise<void> => {
  const rooms = await db.select().from(roomsTable).where(eq(roomsTable.isActive, true));

  const results = await Promise.all(
    rooms.map(async (room) => {
      const reservations = await db
        .select()
        .from(reservationsTable)
        .where(sql`${reservationsTable.roomId} = ${room.id} AND ${reservationsTable.status} = 'confirmed'`);

      const totalHours = reservations.reduce((acc, r) => {
        const diff = (r.endTime.getTime() - r.startTime.getTime()) / (1000 * 60 * 60);
        return acc + diff;
      }, 0);

      return {
        roomId: room.id,
        roomName: room.name,
        reservationCount: reservations.length,
        totalHours: Math.round(totalHours * 10) / 10,
      };
    })
  );

  res.json(GetRoomUtilizationResponse.parse(results));
});

export default router;
