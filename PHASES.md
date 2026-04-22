# Development Phases for AI-Assisted Workflow

## Phase 1: Foundation (Current)
**Context: Minimal**
- [x] Project structure setup
- [x] TypeScript types defined
- [x] Supabase client configured
- [x] Utility functions created

## Phase 2: Database Setup
**Files to work with:**
- Create Supabase tables: `parts`, `users`, `compatibility`
- Set up Row Level Security (RLS) policies
- Create seed data for testing

**Tell Claude:**
> "Set up Supabase database schema for parts catalog"

## Phase 3: Public Search
**Files to work with:**
- `src/features/search/` - Search functionality
- `src/components/ui/` - Search input component
- `src/app/(public)/search/page.tsx` - Search results page

**Tell Claude:**
> "Build the search feature in src/features/search/"

## Phase 4: Parts Catalog
**Files to work with:**
- `src/features/parts/` - Parts display
- `src/app/(public)/parts/[id]/page.tsx` - Part detail page

**Tell Claude:**
> "Build the parts catalog feature in src/features/parts/"

## Phase 5: Authentication
**Files to work with:**
- `src/lib/auth/` - Auth utilities
- `src/app/(auth)/login/page.tsx` - Login page
- `src/app/(auth)/signup/page.tsx` - Signup page

**Tell Claude:**
> "Build authentication in src/app/(auth)/"

## Phase 6: User Dashboard
**Files to work with:**
- `src/features/user/` - User profile
- `src/app/(dashboard)/` - Dashboard pages

**Tell Claude:**
> "Build user dashboard in src/app/(dashboard)/"

## Phase 7: Compatibility Checker
**Files to work with:**
- `src/features/compatibility/` - Compatibility logic
- `src/components/ui/` - Vehicle selector

**Tell Claude:**
> "Build compatibility checker in src/features/compatibility/"

## Quick Reference for Claude

When starting a new phase, reference:
- **Types:** `src/types/index.ts` (all shared types)
- **Supabase:** `src/lib/supabase/client.ts` (database client)
- **Utils:** `src/lib/utils/index.ts` (helper functions)
- **Structure:** `PROJECT_STRUCTURE.md` (file locations)

## Tips for Efficient AI Sessions

1. **Be specific about the directory** - "Work on src/features/search/"
2. **Reference existing types** - "Use the Part type from src/types/"
3. **Limit scope** - One feature per session
4. **Use imports** - Reference shared components and utils
5. **Check the docs** - Refer to PROJECT_STRUCTURE.md for file locations
