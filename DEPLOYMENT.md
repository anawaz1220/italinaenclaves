# Deployment Guide - Vercel + Neon

## Overview
This guide covers deploying the Italian Enclaves Map Application to:
- **Frontend**: Vercel
- **Backend**: Vercel Serverless Functions
- **Database**: Neon PostgreSQL

## Prerequisites
- Neon account (https://neon.tech)
- Vercel account (https://vercel.com)
- Vercel CLI installed: `npm install -g vercel`

## Step 1: Set Up Neon Database

### 1.1 Create Neon Project
1. Go to https://neon.tech and sign up/login
2. Click "Create Project"
3. Name: `italianenclaves`
4. Region: Choose closest to your users (e.g., US East)
5. Click "Create Project"

### 1.2 Get Connection String
1. In your Neon dashboard, go to "Connection Details"
2. Copy the connection string (looks like):
   ```
   postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb
   ```
3. Save this - you'll need it for environment variables

### 1.3 Import Database

#### Option A: Using pg_dump/pg_restore
```bash
# Export from local database
pg_dump -U postgres -d italianenclaves -F c -f italianenclaves.dump

# Restore to Neon (replace with your connection string)
pg_restore -d "postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb" -c italianenclaves.dump
```

#### Option B: Using SQL file
```bash
# Export from local database
pg_dump -U postgres -d italianenclaves -f italianenclaves.sql

# Import to Neon
psql "postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb" -f italianenclaves.sql
```

#### Option C: Using Node.js script (from data-backup)
```bash
# Use the backup script to create SQL
node scripts/backup-db.mjs

# Then import the SQL file to Neon
psql "YOUR_NEON_CONNECTION_STRING" -f data-backup/churches_backup_2026-02-10.sql
```

## Step 2: Deploy Backend to Vercel

### 2.1 Configure Environment Variables
Create `backend/.env` file:
```env
DATABASE_URL=your_neon_connection_string_here
GOOGLE_API_KEY=AIzaSyD1jTEVeWdnBr-uW_4aPYxDfpf8U8uuO4I
NODE_ENV=production
```

### 2.2 Build Backend
```bash
cd backend
npm install
npm run build
```

### 2.3 Deploy to Vercel
```bash
# Login to Vercel (first time only)
vercel login

# Deploy backend
cd backend
vercel --prod

# When prompted:
# - Link to existing project? No
# - Project name: italianenclaves-backend
# - Directory: ./
# - Override settings? No
```

### 2.4 Set Environment Variables in Vercel
After deployment, set environment variables in Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - `DATABASE_URL`: Your Neon connection string
   - `GOOGLE_API_KEY`: AIzaSyD1jTEVeWdnBr-uW_4aPYxDfpf8U8uuO4I
   - `NODE_ENV`: production

Then redeploy:
```bash
vercel --prod
```

### 2.5 Note Backend URL
After deployment, Vercel will show your backend URL:
```
https://italianenclaves-backend.vercel.app
```
Save this URL for frontend configuration.

## Step 3: Deploy Frontend to Vercel

### 3.1 Update API Endpoint
Edit `frontend/src/services/api.ts`:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-backend-url.vercel.app/api';
```

### 3.2 Configure Environment Variables
Create `frontend/.env.production`:
```env
VITE_API_URL=https://italianenclaves-backend.vercel.app/api
VITE_GOOGLE_MAPS_API_KEY=AIzaSyD1jTEVeWdnBr-uW_4aPYxDfpf8U8uuO4I
```

### 3.3 Build Frontend
```bash
cd frontend
npm install
npm run build
```

### 3.4 Deploy to Vercel
```bash
cd frontend
vercel --prod

# When prompted:
# - Link to existing project? No
# - Project name: italianenclaves
# - Directory: ./
# - Override settings? No
```

### 3.5 Set Environment Variables in Vercel
1. Go to frontend project settings in Vercel
2. Add environment variables:
   - `VITE_API_URL`: https://your-backend-url.vercel.app/api
   - `VITE_GOOGLE_MAPS_API_KEY`: AIzaSyD1jTEVeWdnBr-uW_4aPYxDfpf8U8uuO4I

Then redeploy:
```bash
vercel --prod
```

## Step 4: Test Deployment

Your app should now be live at:
```
https://italianenclaves.vercel.app
```

Test the following:
- ✅ Map loads with church markers
- ✅ Search functionality works
- ✅ Click on markers to see church details
- ✅ Photos load properly
- ✅ Mobile responsive design

## Troubleshooting

### Database Connection Issues
- Ensure Neon connection string is correct
- Check if Neon instance is active (not paused)
- Verify PostGIS extension is enabled in Neon

### CORS Errors
- Backend already has CORS enabled in `src/index.ts`
- If issues persist, update CORS configuration to allow your frontend URL

### Environment Variables Not Loading
- Redeploy after setting environment variables
- Check variable names match exactly (case-sensitive)
- Use Vercel dashboard to verify variables are set

### Photos Not Loading
- Verify Google API key is set correctly
- Check browser console for API errors
- Ensure photo proxy endpoint is working: `/api/churches/:id/photo/:photoRef`

## Cost Estimation

All services are on free tiers:
- **Neon**: Free tier includes 0.5 GB storage, 3 GB data transfer
- **Vercel**: Free tier includes unlimited deployments, 100 GB bandwidth
- **Google Maps API**: $200 free credit per month

For this demo app with ~300 churches, free tiers are more than sufficient.

## Custom Domain (Optional)

To add a custom domain:
1. Go to Vercel project settings
2. Navigate to "Domains"
3. Add your domain
4. Update DNS records as instructed

## Monitoring

- **Vercel Analytics**: View in Vercel dashboard
- **Neon Metrics**: View in Neon dashboard
- **Google API Usage**: Check in Google Cloud Console

## Rollback

If you need to rollback a deployment:
```bash
vercel rollback
```

## Future Migration

When client provides their VPS:
1. Export database from Neon: `pg_dump`
2. Import to VPS PostgreSQL
3. Deploy backend using PM2 or Docker
4. Update frontend environment variables
5. Point domain to new server
