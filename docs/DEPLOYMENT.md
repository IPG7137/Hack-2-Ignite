# 🚀 CivicResolve — Deployment Guide

> Step-by-step instructions for deploying the CivicResolve Web Command Center and building the Flutter Mobile Application.

---

## 1. Prerequisites

- **Node.js**: v18.x or v20.x
- **Flutter SDK**: v3.19+ (with Android toolchain)
- **Supabase Account**: A provisioned PostgreSQL project with Auth & Storage enabled
- **Vercel CLI / Account**: For web hosting (or any static SPA host)

---

## 2. Environment Configuration

Copy the example environment template in the project root:

```bash
cp .env.example .env
```

Ensure the following variables are configured (values are illustrative):

```env
# Root / Web Application
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GEMINI_API_KEY=AIzaSy...

# Mobile Application (apps/mobile/.env)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> [!CAUTION]
> **Never commit `.env` or expose the Supabase `service_role` secret key to client-side bundles or mobile APKs.**

---

## 3. Database & Supabase Setup

1. **Run Migrations**: Execute the SQL migrations located in `supabase/migrations/` in sequential order within your Supabase SQL Editor.
2. **Enable Row Level Security (RLS)**: Ensure RLS is active on all public schema tables (`complaints`, `profiles`, `user_roles`).
3. **Storage Buckets**: Create a public or authenticated storage bucket named `complaints` for resolution evidence and citizen upload attachments.

---

## 4. Deploy Web Command Center (Vercel)

### Option A: Via Vercel Git Integration (Recommended)
1. Push your repository to GitHub / GitLab.
2. Import the project into Vercel.
3. Configure the build settings:
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GEMINI_API_KEY`).
5. Deploy.

### Option B: Local Production Build
```bash
cd apps/web
npm install
npm run build
# The dist/ folder is ready to serve on any static host or CDN
```

The repository includes `apps/web/vercel.json` with SPA rewrite rules to ensure client-side routing functions seamlessly:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 5. Build Flutter Mobile App (APK)

```bash
cd apps/mobile

# 1. Fetch dependencies
flutter pub get

# 2. Run unit & widget test suite
flutter test

# 3. Build standalone Release APK
flutter build apk --release
```

The compiled release artifact will be located at:
```
apps/mobile/build/app/outputs/flutter-apk/app-release.apk
```

> [!TIP]
> The release APK connects directly to your cloud Supabase instance, allowing Field Officers and Citizens to operate autonomously from anywhere with mobile data.

---

## 6. Running Local Development

To run both services simultaneously during development:

```bash
# Terminal 1: Web Command Center
cd apps/web
npm run dev
# Accessible at http://localhost:5173

# Terminal 2: Flutter App
cd apps/mobile
flutter run
```

---

*← Back to [README](../README.md)*
