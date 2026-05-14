# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

New Chapter Real Estate CRM - a multi-tenant property lead management system for real estate wholesaling.

**Stack:** Next.js 16 (Turbopack), Prisma 5/MySQL, NextAuth v5 (JWT), TanStack React Query 5, Tailwind CSS v4, Zod v4

## Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check

# Database
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma db push   # Push schema to database (dev)
npx prisma migrate   # Apply migrations (production)
```

**Environment variables required:** `DATABASE_URL`, `AUTH_SECRET`

## Architecture

### Route Groups
- `(auth)/` - Unauthenticated routes (login page at `/login`)
- `(dashboard)/` - Authenticated pages with sidebar layout via `layout.tsx`
- `api/` - REST API endpoints

### Authentication
- NextAuth v5 with JWT strategy (credentials provider only)
- Middleware at `src/middleware.ts` protects all routes except `/login`, `/api/auth/*`
- Session: `{ id, email, name, role }` where role is `ADMIN | POWER_USER | VIEWER`
- Only ADMIN can delete properties and manage users — see `src/lib/permissions.ts` for role logic

### Data Model (Prisma/MySQL)
- **User** - Roles: `ADMIN | POWER_USER | VIEWER`
- **Property** - Core entity. Status: `NEW | CONTACTED | NEGOTIATING | CLOSED | DEAD`. Priority: `HIGH | MEDIUM | LOW`
- **Contact** - JSON-stored emails/phones per property
- **Note** - Text notes per property with author
- **Photo** - Property images ordered via `order` field, `isThumbnail` boolean marks the cover photo
- **Activity** - Audit log: `CREATED | UPDATED | STATUS_CHANGED | NOTE_ADDED | CONTACT_ADDED | PHOTO_ADDED | PHOTO_DELETED`
- **Session** - NextAuth session storage

### API Endpoints
| Endpoint | Methods | Notes |
|----------|---------|-------|
| `/api/properties` | GET, POST | Paginated list |
| `/api/properties/[id]` | GET, PATCH, DELETE | Single property |
| `/api/properties/batch` | POST | ADMIN only |
| `/api/properties/[id]/notes` | GET, POST | |
| `/api/properties/[id]/contacts` | GET, POST | |
| `/api/properties/[id]/photos` | GET, POST | |
| `/api/properties/[id]/photos/set-thumbnail` | POST | Set property thumbnail |
| `/api/upload/csv` | POST | Redfin CSV import with duplicate detection |
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handlers |
| `/api/auth/register` | POST | |

### Frontend State
- React Query (`useQuery`, `useMutation`) for all server state
- Query key pattern: `["resources", { params }]` — always use array format for caching
- URL search params for filter/pagination state

### Key Patterns
- `normalizeAddress()` in `src/lib/utils.ts` - converts abbreviations (St→Street) for duplicate detection via `addressNormalized` index
- `generateRedfinUrl(address, city, state, zip)` - auto-generates Redfin/Google Maps URLs
- Activity logging on all create/update/status-change operations

## Important Notes

### Next.js 16 Breaking Changes
- **This is NOT the Next.js you know** - APIs, conventions, and file structure differ from earlier versions
- Read `node_modules/next/dist/docs/` for guidance before writing code
- The "middleware" file convention is deprecated - use "proxy" instead (not yet implemented)
- Next.js 16 uses Turbopack

### Zod v4
- Uses `zod@4` (not v3) - schema syntax differs from earlier versions

### Prisma
- Prisma client must be regenerated (`npx prisma generate`) after schema changes
- If encountering "Unknown argument" errors, delete `node_modules/.prisma/client` and regenerate

---

# Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.