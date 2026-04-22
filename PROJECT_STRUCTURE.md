# Project Structure Guide

## Architecture Overview

This project uses a **feature-based modular architecture** to enable efficient AI-assisted development with context limits. The site is a car parts database that allows users to:

1. **Login via OAuth or email/password** - Powered by Supabase Auth
2. **Manage junkyards** - Users can add and track junkyards
3. **View scraped inventory** - Cars and parts from junkyards and eBay (future)
4. **Run operations with tokens** - Scraping and analysis cost tokens, viewing is free
5. **Receive analysis data** - Python service integration (future)

---

## Directory Structure

```
src/
├── app/                              # Next.js App Router
│   ├── (auth)/                      # Authentication pages
│   │   ├── login/                   # Login page
│   │   └── signup/                  # Signup page
│   ├── (dashboard)/                 # Protected dashboard pages
│   │   ├── junkyards/               # Junkyard management
│   │   │   ├── page.tsx            # List junkyards
│   │   │   └── [id]/               # Junkyard details
│   │   ├── vehicles/                # Vehicle inventory
│   │   ├── parts/                   # Parts inventory
│   │   ├── tokens/                  # Token balance & history
│   │   └── layout.tsx               # Dashboard layout
│   ├── (public)/                    # Public pages (no auth required)
│   │   ├── page.tsx                 # Landing page
│   │   └── search/                  # Public search
│   ├── api/                         # API routes
│   │   ├── auth/                    # OAuth callbacks
│   │   │   └── callback/
│   │   ├── junkyards/               # CRUD for junkyards
│   │   ├── vehicles/                # Vehicle operations
│   │   ├── parts/                   # Parts operations
│   │   ├── tokens/                  # Token operations
│   │   ├── scraping/                # Scraping triggers (future)
│   │   │   ├── junkyard/            # Scrape junkyard URL
│   │   │   └── ebay/                # Search eBay
│   │   └── analysis/                # Analysis requests (future)
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Home page
├── features/                        # Feature modules (self-contained)
│   ├── auth/                        # Authentication functionality
│   │   ├── components/              # Auth forms, providers
│   │   ├── hooks/                   # useAuth, useUser
│   │   └── utils/                   # Auth helpers
│   ├── junkyards/                   # Junkyard management
│   │   ├── components/              # JunkyardCard, JunkyardForm
│   │   ├── hooks/                   # useJunkyards
│   │   └── types.ts                 # Junkyard-specific types
│   ├── vehicles/                    # Vehicle inventory
│   │   ├── components/              # VehicleCard, VehicleList
│   │   └── hooks/                   # useVehicles
│   ├── parts/                       # Parts catalog & details
│   ├── tokens/                      # Token management
│   │   ├── components/              # TokenBalance, TokenHistory
│   │   └── hooks/                   # useTokens
│   ├── scraping/                    # Scraping functionality (future)
│   │   ├── services/                # Cheerio scrapers
│   │   │   ├── junkyardScraper.ts
│   │   │   └── ebayScraper.ts
│   │   └── hooks/                   # useScraping
│   └── analysis/                    # Analysis integration (future)
│       ├── services/                # Python API client
│       └── hooks/                   # useAnalysis
├── lib/                             # Shared libraries
│   ├── supabase/                    # Supabase client
│   │   ├── client.ts                # Browser client
│   │   ├── server.ts                # Server client
│   │   └── auth.ts                  # Auth helpers
│   └── utils/                       # Utility functions
├── components/                      # Shared UI components
│   ├── ui/                          # Reusable base components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── Modal.tsx
│   └── forms/                       # Form components
├── types/                           # TypeScript type definitions
│   └── index.ts                     # All exported types
├── config/                          # Configuration constants
│   └── tokens.ts                    # Token costs, limits
└── middleware.ts                    # Auth middleware
```

---

## Database Schema (Supabase)

```sql
-- Users (managed by Supabase Auth)
-- Extension: profiles table for user data
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  role TEXT DEFAULT 'user',
  oauth_provider TEXT,
  oauth_provider_id TEXT,
  tokens INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Junkyards
CREATE TABLE junkyards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  lat DECIMAL,
  lng DECIMAL,
  scrap_url TEXT,
  ebay_search_query TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vehicles in junkyards
CREATE TABLE junkyard_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  junkyard_id UUID REFERENCES junkyards(id),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  vin TEXT,
  trim TEXT,
  engine TEXT,
  transmission TEXT,
  color TEXT,
  mileage INTEGER,
  notes TEXT,
  source_url TEXT,
  scraped_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Parts from vehicles/sources
CREATE TABLE vehicle_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  junkyard_vehicle_id UUID REFERENCES junkyard_vehicles(id),
  junkyard_id UUID REFERENCES junkyards(id),
  name TEXT NOT NULL,
  part_number TEXT,
  category TEXT,
  condition TEXT,
  price DECIMAL,
  available BOOLEAN DEFAULT true,
  notes TEXT,
  images TEXT[],
  source TEXT,
  source_url TEXT,
  scraped_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Token transactions
CREATE TABLE token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL, -- 'credit' or 'debit'
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  operation_type TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Scraping configs (for future)
CREATE TABLE scraping_configs (
  junkyard_id UUID REFERENCES junkyards(id) PRIMARY KEY,
  url TEXT NOT NULL,
  selector_rules JSONB,
  enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMP,
  next_run TIMESTAMP
);

-- Scraping jobs (for future)
CREATE TABLE scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  junkyard_id UUID REFERENCES junkyards(id),
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  vehicles_found INTEGER,
  parts_found INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analysis requests (for future Python integration)
CREATE TABLE analysis_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  part_id UUID REFERENCES vehicle_parts(id),
  vehicle_id UUID REFERENCES junkyard_vehicles(id),
  analysis_type TEXT NOT NULL,
  status TEXT NOT NULL,
  result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

---

## Development Phases

### Phase 1: Core Setup & Auth
- Database schema in Supabase
- Types in `src/types/index.ts`
- Supabase client setup
- OAuth + email/password auth
- Protected routes with middleware

### Phase 2: Token System
- Token balance tracking
- Token transaction history
- Token purchase flow (Stripe?)
- Operation cost validation

### Phase 3: Junkyard Management
- Add/Edit/Delete junkyards
- Junkyard list and detail views
- Junkyard search/filter

### Phase 4: Vehicle & Parts Display
- View vehicles from junkyards
- View parts from vehicles
- Search and filter (free operations)

### Phase 5: Scraping Integration (Future)
- Install cheerio
- Junkyard URL scraper
- eBay search scraper
- Scraping job queue
- Token deduction for scraping

### Phase 6: Python Analysis (Future)
- Python service setup (separate repo)
- Analysis request API
- Webhook for results
- Token deduction for analysis

---

## Token Costs

| Operation | Cost | Description |
|-----------|------|-------------|
| Add Junkyard | 2 | Add a new junkyard to your list |
| Scrape Junkyard | 10 | Fetch inventory from junkyard URL |
| Search eBay | 5 | Search eBay for parts |
| Run Analysis | 20 | Get market price/compatibility analysis |

*Viewing data is always free*

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 14/15 (App Router) |
| Auth | Supabase Auth (OAuth + Email) |
| Database | Supabase PostgreSQL |
| Styling | Tailwind CSS |
| Scraping | Cheerio (later) |
| Analysis | Python API (later) |
| Hosting | Vercel |
| Payments | Stripe (optional, for token purchases) |

---

## Dependencies to Add

```bash
# Already installed
npm install @supabase/supabase-js

# Add when needed
npm install cheerio              # For scraping (Phase 5)
npm install stripe              # For payments (optional)
npm install @stripe/stripe-js   # Stripe client (optional)
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OAuth Providers (configured in Supabase)
# Google, GitHub, Microsoft

# Python Analysis Service (future)
NEXT_PUBLIC_ANALYSIS_API_URL=your_python_api_url
ANYSIS_API_SECRET=your_secret

# Stripe (optional, for token purchases)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_key
STRIPE_SECRET_KEY=your_secret
```
