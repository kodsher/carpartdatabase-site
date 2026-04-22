# Car Part Database

A Next.js application for finding car parts, deployed on Vercel with Supabase as the database.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Create a `.env.local` file in the root directory:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_DOMAIN=carpartdatabase.com
```

## Deployment

This project is configured for deployment on Vercel at `carpartdatabase.com`.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **Hosting**: Vercel
- **Domain**: carpartdatabase.com (hosted on Cloudflare)
