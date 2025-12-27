# 🚀 Quick Deployment Steps

Your code is ready to deploy! Follow these steps:

## ✅ Step 1: Make Repository Public

**Right now, do this:**

1. Open: https://github.com/movie-rating/movie-recommendation/settings
2. Scroll down to **"Danger Zone"** (bottom of page)
3. Click **"Change visibility"**
4. Select **"Make public"**
5. Type `movie-rating/movie-recommendation` to confirm
6. Click **"I understand, change repository visibility"**

## ✅ Step 2: Deploy to Vercel

**Create account and import:**

1. Go to: https://vercel.com/signup
2. Click **"Continue with GitHub"**
3. After signing in, click **"Add New..."** → **"Project"**
4. Find and select **"movie-rating/movie-recommendation"**
5. Click **"Import"**

**Configure the project:**

6. **Root Directory:** Click **"Edit"** → Type `movie-prototype` → Click **"Continue"**
7. Framework Preset: Should auto-detect as **"Next.js"** ✅
8. Build Command: `npm run build` (leave as default) ✅
9. Output Directory: `.next` (leave as default) ✅

**Add environment variables:**

10. Click **"Environment Variables"** section
11. Add these 4 variables (copy from your `.env.local` file):

| Variable Name | Where to find it |
|--------------|------------------|
| `GEMINI_API_KEY` | Your `.env.local` file |
| `TMDB_API_KEY` | Your `.env.local` file |
| `NEXT_PUBLIC_SUPABASE_URL` | Your `.env.local` file |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your `.env.local` file |

**Deploy:**

12. Click **"Deploy"** button
13. Wait 2-3 minutes for build to complete
14. You'll get a URL like: `https://movie-recommendation-xxx.vercel.app`
15. **Copy this URL!** You'll need it for the next step.

## ✅ Step 3: Configure Supabase

**Update authentication URLs:**

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **URL Configuration** (in sidebar)
4. Update these fields:

   **Site URL:**
   ```
   https://your-vercel-url.vercel.app
   ```

   **Redirect URLs** (click "Add URL" for each):
   ```
   https://your-vercel-url.vercel.app/auth/confirm
   https://your-vercel-url.vercel.app/auth/callback
   https://your-vercel-url.vercel.app/*
   ```

5. Click **"Save"**

## ✅ Step 4: Test Your Site

1. Visit your Vercel URL
2. Click **"Sign Up"**
3. Create a test account
4. Add some movies you've watched
5. Generate recommendations
6. If everything works → **Share with friends!** 🎉

## 🎯 What Your Friends Need to Do

Just send them your Vercel URL! They can:
1. Create their own account
2. Add their watched movies
3. Get personalized recommendations
4. Each user has completely separate data

## 🔧 Making Updates Later

When you want to make changes:

```bash
# Make your changes in the code
# Test locally
cd /Users/user/movie-recommendation/movie-recommendation/movie-prototype
npm run dev

# When ready, commit and push
cd ..
git add .
git commit -m "Description of your changes"
git push origin main

# Vercel automatically redeploys (takes 1-2 minutes)
```

## 📞 Need Help?

**Build failing?**
- Check Vercel deployment logs
- Ensure Root Directory = `movie-prototype`

**Can't sign in?**
- Check Supabase redirect URLs
- Must include your Vercel domain

**Features not working?**
- Check browser console (F12)
- Verify all 4 env vars are set in Vercel

## 🎊 You're Done!

Your app is now live on the internet! Share the URL with your friends and enjoy personalized movie recommendations together.

**Your Links:**
- GitHub: https://github.com/movie-rating/movie-recommendation
- Vercel: https://vercel.com/dashboard
- Supabase: https://supabase.com/dashboard


