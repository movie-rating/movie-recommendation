# ✅ Deployment Checklist

Use this checklist to ensure a smooth deployment process.

## Pre-Deployment Checks

- [ ] **Environment Variables Secured**
  - `.env.local` is in `.gitignore` ✅
  - Never commit API keys to GitHub
  
- [ ] **Code Ready**
  - All features working locally
  - No console errors in browser
  - Build succeeds: `cd movie-prototype && npm run build`

## GitHub Setup

- [ ] **Repository is Public**
  1. Go to: https://github.com/movie-rating/movie-recommendation/settings
  2. Scroll to "Danger Zone"
  3. Click "Change visibility" → "Make public"
  4. Confirm by typing repository name

- [ ] **Code Pushed to GitHub**
  ```bash
  cd /Users/user/movie-recommendation/movie-recommendation
  git add .
  git commit -m "Prepare for deployment"
  git push origin main
  ```

## Vercel Deployment

- [ ] **Create Vercel Account**
  - Go to: https://vercel.com/signup
  - Sign up with GitHub (recommended)

- [ ] **Import Project**
  1. Click "Add New..." → "Project"
  2. Select `movie-rating/movie-recommendation`
  3. **IMPORTANT:** Set Root Directory to `movie-prototype`
  4. Framework: Next.js (auto-detected)

- [ ] **Configure Environment Variables**
  
  Copy from your `.env.local` file and add these to Vercel:
  
  ```
  GEMINI_API_KEY=<your-value>
  TMDB_API_KEY=<your-value>
  NEXT_PUBLIC_SUPABASE_URL=<your-value>
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-value>
  ```

- [ ] **Deploy**
  - Click "Deploy"
  - Wait 2-3 minutes
  - Save your deployment URL

## Supabase Configuration

- [ ] **Update Supabase URLs**
  1. Go to Supabase Dashboard → Authentication → URL Configuration
  2. **Site URL:** `https://your-app.vercel.app`
  3. **Redirect URLs:** Add these:
     - `https://your-app.vercel.app/auth/confirm`
     - `https://your-app.vercel.app/auth/callback`
     - `https://your-app.vercel.app/*` (wildcard for all auth routes)

## Testing

- [ ] **Test Deployment**
  - Visit your Vercel URL
  - Sign up with a test account
  - Add some movies to watchlist
  - Generate recommendations
  - Try all main features

- [ ] **Share with Friends**
  - Send them your Vercel URL
  - They can create their own accounts
  - Each user has their own recommendations!

## Maintenance

- [ ] **Future Updates**
  - Make changes locally
  - Test locally: `npm run dev`
  - Commit and push to GitHub
  - Vercel auto-deploys in 1-2 minutes

## Quick Reference

**Your Repository:** https://github.com/movie-rating/movie-recommendation
**Vercel Dashboard:** https://vercel.com/dashboard
**Supabase Dashboard:** https://supabase.com/dashboard

## Common Issues

**Build Fails?**
- Check Vercel logs
- Ensure Root Directory = `movie-prototype`
- Verify all env vars are set

**Auth Not Working?**
- Check Supabase redirect URLs
- Ensure URLs match your Vercel domain exactly

**Features Broken?**
- Open browser console
- Check for API key errors
- Verify env vars in Vercel dashboard

