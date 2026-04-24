# Production Deployment Guide

## Overview

The site uses a job queue system where:
1. The frontend (carpartdatabase.com) creates jobs in the Supabase `jobs` table
2. A worker process picks up jobs and executes the command
3. The command runs the eBay scraper (ebay-scraper-csv.js)

## Production Setup

### 1. Deploy the Scraper Script

The puppeteer scraper needs to be deployed to your worker server (Hetzner).

```bash
# Copy the scraper to the production server
scp /Users/admin/Desktop/puppeteer/ebay-scraper-csv.js root@178.156.215.195:/root/scraper/

# Also copy dependencies
scp /Users/admin/Desktop/puppeteer/package.json root@178.156.215.195:/root/scraper/
```

On the production server:
```bash
ssh root@178.156.215.195
cd /root/scraper
npm install
```

### 2. Set Environment Variables in Vercel

Add the following environment variable in your Vercel project settings:

```
NEXT_PUBLIC_SCRAPER_PATH=/root/scraper/ebay-scraper-csv.js
```

### 3. Update the Worker

The worker (supabase-worker) needs to be running on the production server with:
- Access to the Supabase database
- Ability to execute the scraper command

### 4. Deploy the Frontend

```bash
cd /Users/admin/carpartdatabase-site
git add .
git commit -m "Add configurable scraper path for production"
git push
```

The site will automatically deploy to Vercel.

## Alternative: Using Hetzner API

If you already have a Hetzner Playwright API running, you could modify the system to use that instead of the local worker.

## Testing Production

1. Deploy the changes to Vercel
2. Access https://carpartdatabase.com
3. Try searching for a car part
4. Check the worker logs to verify jobs are being processed

## Troubleshooting

- **Job not executing**: Check if the worker is running and connected to Supabase
- **Command not found**: Verify the `NEXT_PUBLIC_SCRAPER_PATH` is correct in Vercel
- **Permission denied**: Ensure the worker has execute permissions on the scraper file
