# Railway Deployment Guide

## Prerequisites
- Railway account (sign up at https://railway.app)
- GitHub repository with the `railway` branch

## Step 1: Create Railway Project
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `trmnl-catabus` repository
5. Select the `railway` branch

## Step 2: Add Redis Service
1. In your Railway project dashboard
2. Click "New Service"
3. Select "Redis" from the template
4. Railway will automatically provide the `REDIS_URL` environment variable to your web service

## Step 3: Configure Environment Variables
In your web service settings, add these environment variables:
- `CRON_SECRET`: Generate a random secret (e.g., `openssl rand -base64 32`)
- `NODE_ENV`: Set to `production`

## Step 4: Set Up Cron Job
Railway doesn't have built-in cron jobs, so you'll need to use an external service:

### Option A: GitHub Actions (Recommended)
Update `.github/workflows/fetch_bus.yml`:
```yaml
name: Fetch CATA departures

on:
  schedule:
    - cron: '*/5 * * * *'    # every 5 minutes
  workflow_dispatch:        # manual trigger

jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Railway cron
        run: |
          curl -X POST https://your-app.railway.app/api/cron \\
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \\
            -H "Content-Type: application/json"
```

### Option B: External Cron Service
Use a service like:
- Uptime Robot
- Cronitor
- EasyCron

Configure it to hit: `POST https://your-app.railway.app/api/cron`
With header: `Authorization: Bearer YOUR_CRON_SECRET`

## Step 5: Deploy
Railway will automatically build and deploy your app when you push to the `railway` branch.

## Step 6: Test Deployment
Test these endpoints:
- `https://your-app.railway.app/api/health` - Health check
- `https://your-app.railway.app/api/stops` - List all stops
- `https://your-app.railway.app/api/stop/54` - Get departures for stop 54

## Step 7: Monitor
- Check Railway logs for any errors
- Monitor the cron job execution
- Verify Redis is receiving data

## Troubleshooting
- If you get 401 errors on `/api/cron`, check your `CRON_SECRET`
- If Redis connection fails, verify the `REDIS_URL` environment variable
- Check Railway logs for detailed error messages
