# 会議室予約システム

## Overview

A Japanese corporate meeting room reservation system built as a full-stack web application.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24 (frontend tooling only)
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + wouter (routing) + TanStack Query
- **API framework**: Spring Boot 3.2.0 (Java 19 / GraalVM 22.3.1)
- **Database**: PostgreSQL + Spring Data JPA (Hibernate 6)
- **Auth**: Session-based (HttpSession + BCryptPasswordEncoder from spring-security-crypto)
- **Build (Java)**: Maven 3.8.6 with spring-boot-maven-plugin

## Features

- Login / Logout with session authentication
- Dashboard with today's reservations, utilization stats, upcoming bookings summary
- Meeting room list and details with availability calendar
- Reservation creation, editing, and cancellation
- Conflict detection when booking rooms
- User management (admin role)
- Room management (admin role)

## Artifacts

- `artifacts/meeting-room/` — React + Vite frontend, runs at `/`
- `artifacts/api-server/` — Spring Boot REST API, runs at `/api` (context path `/api`)

## Java Project Structure (`artifacts/api-server/`)

```
src/main/java/com/meeting/
  MeetingRoomApplication.java        — @SpringBootApplication entry point
  config/
    DataSourceConfig.java            — Parses DATABASE_URL → JDBC + HikariCP
    WebConfig.java                   — CORS configuration
  entity/
    AppUser.java                     — users table
    Room.java                        — rooms table
    Reservation.java                 — reservations table
  repository/
    UserRepository.java
    RoomRepository.java
    ReservationRepository.java       — JPQL conflict queries
  dto/                               — Request/response DTOs (no password leaks)
  controller/
    HealthController.java            — GET /healthz
    AuthController.java              — POST /auth/login, /auth/logout, GET /auth/me
    RoomController.java              — CRUD /rooms
    ReservationController.java       — CRUD /reservations + conflict check
    UserController.java              — CRUD /users
    DashboardController.java         — /dashboard/summary, /today, /room-utilization
  service/
    SeedService.java                 — ApplicationRunner: seeds initial data once
src/main/resources/
  application.properties             — server.port=${PORT:8080}, context-path=/api, JPA config
```

## Database Tables

- `users` — User accounts with role (admin/user) and BCrypt hashed passwords
- `rooms` — Meeting rooms with capacity, location, amenities, is_active flag
- `reservations` — Bookings with start/end time, status (confirmed/cancelled)

## Test Credentials

After first boot, seed data is inserted automatically (skipped if data exists):
- Admin: `admin@example.com` / `password123`
- User: `tanaka@example.com` / `password123`
- User: `suzuki@example.com` / `password123`

## Key Commands

- `cd artifacts/api-server && mvn compile` — compile Java sources
- `cd artifacts/api-server && mvn spring-boot:run` — run Spring Boot locally
- `cd artifacts/api-server && mvn package -DskipTests` — build fat JAR
- `pnpm --filter @workspace/meeting-room run dev` — run frontend locally

## Workflow Commands

- API Server: `mvn -f /home/runner/workspace/artifacts/api-server/pom.xml spring-boot:run`
- Frontend: `pnpm --filter @workspace/meeting-room run dev`

## Important Notes

- Spring Boot `SecurityAutoConfiguration` is excluded (no Spring Security auth).
- `spring-security-crypto` is included only for `BCryptPasswordEncoder`.
- `DataSourceConfig` parses `DATABASE_URL` (postgresql://user:pass@host:port/db) to JDBC format.
- Session: `HttpSession` with attribute `"userId"` (Integer). Cookie is httpOnly + sameSite=lax.
- Jackson serializes `OffsetDateTime` as ISO-8601 strings (configured in application.properties).
- Entity `AppUser` is used instead of `User` to avoid Spring Security name conflicts.
