# 会議室予約システム

## Overview

A Japanese corporate meeting room reservation system built as a full-stack web application.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + wouter (routing) + TanStack Query
- **API framework**: Express 5 (Node.js)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- **Auth**: Session-based (express-session + bcryptjs)
- **Build**: esbuild (CJS bundle for backend)

## Features

- Login / Logout with session authentication
- Dashboard with today's reservations, utilization stats, upcoming bookings summary
- Meeting room list and details with availability calendar
- Reservation creation, editing, and cancellation
- Conflict detection when booking rooms
- User management (admin role)

## Artifacts

- `artifacts/meeting-room/` — React + Vite frontend, runs at `/`
- `artifacts/api-server/` — Express REST API, runs at `/api`

## Database Tables

- `users` — User accounts with role (admin/user) and bcryptjs hashed passwords
- `rooms` — Meeting rooms with capacity, location, amenities
- `reservations` — Bookings with start/end time, status (confirmed/cancelled)

## Test Credentials

After first boot, seed data is inserted:
- Admin: `admin@example.com` / `password123`
- User: `tanaka@example.com` / `password123`
- User: `suzuki@example.com` / `password123`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
