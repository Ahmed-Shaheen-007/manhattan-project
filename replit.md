# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: JWT (jsonwebtoken + bcrypt)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Application: Study Group Finder

A full-stack university web app for creating and joining study groups.

### Features
- **Authentication**: JWT-based register/login with bcrypt password hashing
- **Study Groups**: Create, browse, filter (subject, type, date), join/leave
- **Group Chat**: Near real-time polling chat (3s interval) per group
- **Dashboard**: Stats summary, upcoming sessions, popular groups
- **User Profiles**: View and edit profile, see group memberships
- **Admin Panel**: User/group management, platform stats (admin role required)

### Test Accounts (all passwords: `$2b$10$rQQJ6...` hashed value — use register to create new ones)
- `admin@university.edu` — Admin user (full admin panel access)
- `alice@university.edu` — CS Year 2 student
- `bob@university.edu` — Math Year 3 student
- `diana@university.edu` — Physics Year 1 student

### Database Schema
- `users` — Student accounts (name, email, password, faculty, academic_year)
- `roles` — Role assignments (student/admin per user)
- `groups` — Study groups (title, subject, type online/offline, date_time, max_members)
- `group_members` — Many-to-many user↔group memberships
- `messages` — Group chat messages

### API Structure
All routes under `/api` prefix:
- Auth: `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`
- Users: `/users/:id`, `/users/:id/profile`, `/users/:id/groups`
- Groups: `/groups`, `/groups/:id`, `/groups/:id/join`, `/groups/:id/leave`, `/groups/:id/members`
- Messages: `/groups/:id/messages`
- Dashboard: `/dashboard/summary`, `/dashboard/upcoming`, `/dashboard/popular`
- Admin: `/admin/users`, `/admin/groups`, `/admin/messages/:id`, `/admin/stats`
