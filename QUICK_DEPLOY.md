# Quick Deployment Guide - 10 Minutes to Live

## What You Need to Do

### Step 1: Create Neon Database (2 minutes)
1. Go to https://neon.tech
2. Sign up with GitHub (fastest)
3. Click "Create Project" → Name it "italianenclaves"
4. **Copy the connection string** (looks like this):
   ```
   postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb
   ```
5. Save it somewhere - you'll paste it in next step

### Step 2: Import Database to Neon (2 minutes)
Run this command (replace with YOUR connection string from step 1):

```bash
node scripts/export-to-neon.mjs "postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb"
```

Wait for it to finish - you should see:
```
✅ Successfully inserted all 316 churches
🎉 Export to Neon completed successfully!
```

### Step 3: Deploy Backend (3 minutes)

1. Install Vercel CLI (if not installed):
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy backend:
   ```bash
   cd backend
   vercel --prod
   ```

4. When prompted:
   - Set up and deploy? **YES**
   - Which scope? Select your account
   - Link to existing project? **NO**
   - Project name? **italianenclaves-backend** (press Enter)
   - In which directory is your code? **./** (press Enter)
   - Override settings? **NO**

5. **IMPORTANT**: After deployment, you'll see a URL like:
   ```
   https://italianenclaves-backend.vercel.app
   ```
   **Copy this URL** - you need it for the frontend!

6. Set environment variables in Vercel:
   - Go to https://vercel.com/dashboard
   - Click on "italianenclaves-backend" project
   - Go to Settings → Environment Variables
   - Add these 3 variables:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | Your Neon connection string from Step 1 |
   | `GOOGLE_API_KEY` | `AIzaSyD1jTEVeWdnBr-uW_4aPYxDfpf8U8uuO4I` |
   | `NODE_ENV` | `production` |

7. Redeploy to apply environment variables:
   ```bash
   vercel --prod
   ```

### Step 4: Deploy Frontend (3 minutes)

1. Create frontend environment file:
   ```bash
   cd ../frontend
   ```

2. Create `.env.production` file with this content (replace with YOUR backend URL from Step 3):
   ```env
   VITE_API_URL=https://italianenclaves-backend.vercel.app
   VITE_GOOGLE_MAPS_API_KEY=AIzaSyD1jTEVeWdnBr-uW_4aPYxDfpf8U8uuO4I
   ```

3. Deploy frontend:
   ```bash
   vercel --prod
   ```

4. When prompted:
   - Set up and deploy? **YES**
   - Which scope? Select your account
   - Link to existing project? **NO**
   - Project name? **italianenclaves** (press Enter)
   - In which directory is your code? **./** (press Enter)
   - Override settings? **NO**

5. Also set environment variables in Vercel dashboard:
   - Go to https://vercel.com/dashboard
   - Click on "italianenclaves" project
   - Go to Settings → Environment Variables
   - Add these 2 variables:

   | Name | Value |
   |------|-------|
   | `VITE_API_URL` | Your backend URL from Step 3 (e.g., `https://italianenclaves-backend.vercel.app`) |
   | `VITE_GOOGLE_MAPS_API_KEY` | `AIzaSyD1jTEVeWdnBr-uW_4aPYxDfpf8U8uuO4I` |

6. Redeploy:
   ```bash
   vercel --prod
   ```

### Step 5: Get Your Live URL! 🎉

After frontend deployment completes, Vercel will show your live URL:
```
✅  Production: https://italianenclaves.vercel.app
```

**Share this URL with your client!**

## Quick Checklist

- [ ] Neon database created and connection string copied
- [ ] Database imported (316 churches)
- [ ] Backend deployed to Vercel
- [ ] Backend environment variables set (DATABASE_URL, GOOGLE_API_KEY, NODE_ENV)
- [ ] Frontend deployed to Vercel
- [ ] Frontend environment variables set (VITE_API_URL, VITE_GOOGLE_MAPS_API_KEY)
- [ ] Live URL shared with client

## Test Your Deployment

Visit your live URL and check:
- ✅ Map loads with church markers
- ✅ Click on a marker - church detail drawer opens
- ✅ Photos appear in church details
- ✅ Search works (try "Philadelphia" or "Holy Rosary")
- ✅ Mobile responsive (test on phone or resize browser)

## Troubleshooting

### "Cannot connect to database"
- Check if DATABASE_URL is set correctly in backend Vercel settings
- Verify Neon database is active (not paused)

### "No markers on map"
- Check browser console for errors
- Verify backend URL is correct in frontend environment variables
- Test backend directly: https://your-backend.vercel.app/api/churches

### "Photos not loading"
- Check GOOGLE_API_KEY is set in backend environment variables
- Verify API key in Google Cloud Console is still active

### "CORS errors"
- Backend already has CORS enabled
- Clear browser cache and try again

## Need Help?

If something goes wrong:
1. Check Vercel deployment logs: https://vercel.com/dashboard → click project → Deployments → click latest → View Function Logs
2. Check browser console for frontend errors (F12 → Console tab)
3. Test backend API directly in browser: `https://your-backend.vercel.app/api/churches`

## After Client Approval

Once client approves and provides their VPS:
1. Export from Neon: `pg_dump`
2. Import to VPS PostgreSQL
3. Deploy backend to VPS (using PM2 or Docker)
4. Update frontend VITE_API_URL to point to VPS
5. Redeploy frontend or use client's domain

This temporary deployment will remain free and active for testing!
