# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

New Chapter Real Estate CRM - a multi-tenant property lead management system for real estate wholesaling. Built with Next.js 16, Prisma/MySQL, NextAuth v5, and React Query.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # ESLint check
npx prisma generate   # Regenerate Prisma client after schema changes
npx prisma db push    # Push schema to database
```

## Architecture

### Route Groups
- `(auth)` - Unauthenticated routes (login page)
- `(dashboard)` - Authenticated pages with sidebar layout
- `api/` - REST API endpoints

### Authentication
- NextAuth v5 with JWT strategy (NOT database sessions)
- Credentials provider only (email/password)
- Middleware at `src/middleware.ts` handles auth redirects
- Session contains: `id`, `email`, `name`, `role` (ADMIN | WRITER | READER)
- Role-based access: only ADMIN can delete properties

### Data Model
- **Property** - Core entity with address, status (NEW|CONTACTED|NEGOTIATING|CLOSED|DEAD), priority (HIGH|MEDIUM|LOW), Redfin fields (beds, baths, sqft, lotSize, yearBuilt, mlsNumber, price, etc.)
- **Contact** - JSON-stored emails/phones per property
- **Note** - Text notes per property with author
- **Activity** - Audit log (CREATED, UPDATED, STATUS_CHANGED, NOTE_ADDED, CONTACT_ADDED, PHOTO_ADDED)
- **User** - Admin/writer/reader roles
- **Session** - NextAuth session storage

### Key Patterns
- Address deduplication via `normalizeAddress()` in `src/lib/utils.ts` - converts abbreviations (St→Street)
- Redfin URL auto-generated from address: `generateRedfinUrl(address, city, state, zip)`
- Activity logging on create/update/status change
- `addressNormalized` field indexed for duplicate detection

### API Endpoints
- `GET/POST /api/properties` - List (paginated) and create
- `GET/PATCH/DELETE /api/properties/[id]` - Single property CRUD
- `POST /api/properties/batch` - Batch delete (ADMIN only)
- `POST /api/upload/csv` - Redfin CSV import with duplicate detection
- `GET/POST /api/properties/[id]/notes` - Property notes
- `GET/POST /api/properties/[id]/contacts` - Property contacts

### Frontend State
- React Query (`useQuery`, `useMutation`) for all data fetching
- TanStack Query key pattern: `["resources", { params }]`
- URL search params for filter/pagination state (useSearchParams in client components)

## Important Notes

- Next.js 16 uses Turbopack and has breaking changes from earlier versions. Read `node_modules/next/dist/docs/` for guidance.
- The "middleware" file convention is deprecated in Next.js 16 - use "proxy" instead (not yet implemented here).
- Zod v4 is used (not v3) - schema syntax differs.
- Prisma client must be regenerated (`npx prisma generate`) after schema changes.
- If encountering "Unknown argument" errors from Prisma, delete `node_modules/.prisma/client` and regenerate.
