# 🎬 Movie Recommendation App

An AI-powered movie recommendation application that learns your preferences and suggests personalized movies.

## ✨ Features

- **Smart Recommendations** - Uses Google Gemini AI to understand your movie preferences
- **User Authentication** - Secure sign-up and login with Supabase
- **Movie Database** - Powered by The Movie Database (TMDB) API
- **Personalized Experience** - Track watched movies and get tailored suggestions
- **Modern UI** - Beautiful, responsive design with Tailwind CSS and shadcn/ui

## 🚀 Quick Start

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Authentication:** Supabase Auth
- **Database:** Supabase (PostgreSQL)
- **AI:** Google Gemini API
- **Movie Data:** TMDB API
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui

## 📦 Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/movie-rating/movie-recommendation.git
   cd movie-recommendation/movie-prototype
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   
   Create `movie-prototype/.env.local` with:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   TMDB_API_KEY=your_tmdb_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🌐 Deployment

This app is designed to be deployed on Vercel (free tier available). See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions.

## 📝 License

This project is for personal use.