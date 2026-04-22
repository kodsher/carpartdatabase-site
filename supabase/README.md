# Supabase Database Setup

## Migration Files

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Creates parts, users, and compatibility tables with indexes |
| `002_rls_policies.sql` | Sets up Row Level Security policies |
| `003_seed_data.sql` | Inserts sample data for testing |

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard
2. Select your project: `cuzgppxyjoseuvujlixv`
3. Go to **SQL Editor** (in the left sidebar)
4. Click **New Query**
5. For each migration file:
   - Open the file in this directory
   - Copy the SQL content
   - Paste into the SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)

**Run in order:**
1. `001_initial_schema.sql`
2. `002_rls_policies.sql`
3. `003_seed_data.sql`

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link your project
supabase link --project-ref cuzgppxyjoseuvujlixv

# Push migrations
supabase db push
```

## Verify Setup

After applying migrations, you can verify:

```sql
-- Check parts table
SELECT COUNT(*) FROM parts;

-- Check compatibility table
SELECT COUNT(*) FROM compatibility;

-- Test search function
SELECT * FROM search_parts('oil');
```

## What's Created

### Tables
- `users` - User accounts with roles (admin, user, guest)
- `parts` - Car parts catalog with categories, pricing, and stock
- `compatibility` - Vehicle compatibility information for parts

### Functions
- `search_parts()` - Search parts with filtering capabilities

### Indexes
- Optimized indexes for search and filtering

### Security
- Row Level Security (RLS) policies:
  - Public read access for parts and compatibility
  - Admin-only write access
