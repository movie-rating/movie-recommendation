# 🚀 Deployment Guide - Movie Recommendation App

This guide will help you deploy your movie recommendation app so your friends can access it online.

## Required Environment Variables

Your app needs these environment variables to function:
- `GEMINI_API_KEY` - Google Gemini API key for AI recommendations
- `TMDB_API_KEY` - The Movie Database API key for movie data
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Your Supabase publishable key

## Deployment Steps

### Step 1: Commit and Push Your Code to GitHub ✅

1. **Stage your changes:**
   ```bash
   cd /Users/user/movie-recommendation/movie-recommendation
   git add .
   git commit -m "Prepare for deployment"
   ```

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

3. **Make the repository public** (so Vercel can access it):
   - Go to: https://github.com/movie-rating/movie-recommendation
   - Click **Settings** (top right)
   - Scroll down to **Danger Zone**
   - Click **Change visibility** → **Make public**
   - Type the repository name to confirm

### Step 2: Deploy to Vercel (Free Hosting) 🌐

Vercel is the best platform for Next.js apps and offers free hosting.

1. **Create a Vercel account:**
   - Go to: https://vercel.com/signup
   - Sign up with GitHub (recommended)

2. **Import your project:**
   - Click **"Add New..."** → **"Project"**
   - Select **Import Git Repository**
   - Find and select `movie-rating/movie-recommendation`
   - Click **Import**

3. **Configure project settings:**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** Click **Edit** and set to `movie-prototype`
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)

4. **Add Environment Variables:**
   Click **"Environment Variables"** and add each one:
   
   | Name | Value | Notes |
   |------|-------|-------|
   | `GEMINI_API_KEY` | `your-gemini-key` | From Google AI Studio |
   | `TMDB_API_KEY` | `your-tmdb-key` | From TMDB.org |
   | `NEXT_PUBLIC_SUPABASE_URL` | `your-supabase-url` | From Supabase dashboard |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `your-supabase-key` | From Supabase dashboard |

   **Important:** Copy these from your `.env.local` file!

5. **Deploy:**
   - Click **Deploy**
   - Wait 2-3 minutes for the build to complete
   - You'll get a URL like: `https://your-app.vercel.app`

### Step 3: Configure Supabase for Production 🔧

Your Supabase project needs to allow your Vercel URL:

1. Go to your Supabase dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Add your Vercel URL to **Site URL**: `https://your-app.vercel.app`
4. Add to **Redirect URLs**:
   - `https://your-app.vercel.app/auth/confirm`
   - `https://your-app.vercel.app/auth/callback`

### Step 4: Test Your Deployment ✨

1. Visit your Vercel URL
2. Try signing up with a new account
3. Test the movie recommendations
4. Share the URL with your friends!

## Updating Your Deployment

Whenever you make changes:

```bash
git add .
git commit -m "Description of changes"
git push origin main
```

Vercel will automatically redeploy your app (usually takes 1-2 minutes).

## Custom Domain (Optional)

To use a custom domain like `movies.yourdomain.com`:

1. In Vercel, go to your project **Settings** → **Domains**
2. Add your custom domain
3. Update your DNS settings as instructed
4. Update Supabase URLs accordingly

## Troubleshooting

**Build fails?**
- Check build logs in Vercel dashboard
- Ensure all environment variables are set correctly

**Authentication not working?**
- Verify Supabase redirect URLs include your Vercel domain
- Check that environment variables are correctly set

**App loads but features broken?**
- Check browser console for errors
- Verify API keys are valid and not expired

## Security Notes ✅

- ✅ `.env.local` is in `.gitignore` - never committed to GitHub
- ✅ Environment variables are stored securely in Vercel
- ✅ API keys are never exposed to the client (except NEXT_PUBLIC_* vars)
- ✅ Supabase handles authentication securely

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify all environment variables are set correctly


