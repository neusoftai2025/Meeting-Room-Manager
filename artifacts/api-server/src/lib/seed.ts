import { db, usersTable, roomsTable, reservationsTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { logger } from "./logger";

export async function seedIfEmpty() {
  const existingUsers = await db.select().from(usersTable);
  if (existingUsers.length > 0) return;

  logger.info("Seeding initial data...");

  const passwordHash = await bcrypt.hash("password123", 10);

  const [admin] = await db.insert(usersTable).values({
    name: "管理者",
    email: "admin@example.com",
    passwordHash,
    role: "admin",
  }).returning();

  const [user1] = await db.insert(usersTable).values({
    name: "田中 太郎",
    email: "tanaka@example.com",
    passwordHash,
    role: "user",
  }).returning();

  const [user2] = await db.insert(usersTable).values({
    name: "鈴木 花子",
    email: "suzuki@example.com",
    passwordHash,
    role: "user",
  }).returning();

  const [room1] = await db.insert(roomsTable).values({
    name: "会議室A",
    capacity: 10,
    location: "3F 東館",
    description: "プロジェクター完備の大会議室です",
    amenities: "プロジェクター, ホワイトボード, テレビ会議システム",
    isActive: true,
  }).returning();

  const [room2] = await db.insert(roomsTable).values({
    name: "会議室B",
    capacity: 6,
    location: "3F 西館",
    description: "少人数ミーティング向けの中会議室です",
    amenities: "ホワイトボード, モニター",
    isActive: true,
  }).returning();

  const [room3] = await db.insert(roomsTable).values({
    name: "役員会議室",
    capacity: 20,
    location: "5F 役員フロア",
    description: "重要会議・役員会議用の大型会議室です",
    amenities: "プロジェクター, ホワイトボード, テレビ会議システム, 大型モニター, 音響設備",
    isActive: true,
  }).returning();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  await db.insert(reservationsTable).values([
    {
      roomId: room1.id,
      userId: user1.id,
      title: "週次チームミーティング",
      description: "週次の定例チームミーティングです",
      startTime: new Date(today.getTime() + 9 * 3600000),
      endTime: new Date(today.getTime() + 10 * 3600000),
      attendees: 8,
      status: "confirmed",
    },
    {
      roomId: room2.id,
      userId: user2.id,
      title: "プロジェクトレビュー",
      description: "Q1プロジェクトのレビュー",
      startTime: new Date(today.getTime() + 13 * 3600000),
      endTime: new Date(today.getTime() + 14.5 * 3600000),
      attendees: 5,
      status: "confirmed",
    },
    {
      roomId: room3.id,
      userId: admin.id,
      title: "月次経営会議",
      description: "月次の経営陣によるビジネスレビュー",
      startTime: new Date(today.getTime() + 15 * 3600000),
      endTime: new Date(today.getTime() + 17 * 3600000),
      attendees: 15,
      status: "confirmed",
    },
    {
      roomId: room1.id,
      userId: user1.id,
      title: "新人研修",
      startTime: new Date(today.getTime() + 24 * 3600000 + 10 * 3600000),
      endTime: new Date(today.getTime() + 24 * 3600000 + 12 * 3600000),
      attendees: 10,
      status: "confirmed",
    },
  ]);

  logger.info("Seed data inserted successfully");
}
