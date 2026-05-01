# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

New Chapter Real Estate CRM - a multi-tenant property lead management system for real estate wholesaling.

**Stack:** Next.js 16 (Turbopack), Prisma 5/MySQL, NextAuth v5 (JWT), TanStack React Query 5, Tailwind CSS v4, Zod v4

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check

# Database
npx prisma generate   # Regenerate Prisma client after schema changes
npx prisma db push    # Push schema to database (dev)
npx prisma migrate    # Apply migrations (production)
```

**Environment variables required:** `DATABASE_URL`, `AUTH_SECRET` (NextAuth)

## Architecture

### Route Groups
- `(auth)/` - Unauthenticated routes (login page at `/login`)
- `(dashboard)/` - Authenticated pages with sidebar layout
- `api/` - REST API endpoints

### Authentication
- NextAuth v5 with JWT strategy (credentials provider only)
- Middleware at `src/middleware.ts` protects all routes except `/login`, `/api/auth/*`
- Session: `{ id, email, name, role }` where role is `ADMIN | WRITER | READER`
- Only ADMIN can delete properties

### Data Model (Prisma/MySQL)
- **Property** - Core entity. Status: `NEW | CONTACTED | NEGOTIATING | CLOSED | DEAD`. Priority: `HIGH | MEDIUM | LOW`
- **Contact** - JSON-stored emails/phones per property
- **Note** - Text notes per property with author
- **Activity** - Audit log: `CREATED | UPDATED | STATUS_CHANGED | NOTE_ADDED | CONTACT_ADDED | PHOTO_ADDED`
- **User** - Admin/writer/reader roles
- **Session** - NextAuth session storage

### API Endpoints
| Endpoint | Methods | Notes |
|----------|---------|-------|
| `/api/properties` | GET, POST | Paginated list |
| `/api/properties/[id]` | GET, PATCH, DELETE | Single property |
| `/api/properties/batch` | POST | ADMIN only |
| `/api/properties/[id]/notes` | GET, POST | |
| `/api/properties/[id]/contacts` | GET, POST | |
| `/api/upload/csv` | POST | Redfin CSV import with duplicate detection |
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handlers |
| `/api/auth/register` | POST | |

### Frontend State
- React Query (`useQuery`, `useMutation`) for all server state
- Query key pattern: `["resources", { params }]`
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