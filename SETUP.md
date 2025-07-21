# Lesefluss Setup Guide

## 1. Supabase Setup

### Option A: Cloud Supabase (Recommended for Development)

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note down your project URL and anon key

2. **Environment Variables**
   - Copy `env.example` to `.env.local`
   - Fill in your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Database Setup**
   - Run the migration in Supabase SQL Editor:
   ```bash
   # Copy content from supabase/migrations/20240101000000_initial_schema.sql
   # Paste and run in Supabase SQL Editor
   ```

### Option B: Local Supabase (Advanced)

1. **Install Docker Desktop**
   - Download from [docker.com](https://www.docker.com/products/docker-desktop/)
   - Install and start Docker

2. **Start Local Supabase**
   ```bash
   npx supabase start
   ```

3. **Environment Variables**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## 2. Development Server

```bash
npm run dev
```

## 3. Database Schema

The database includes:
- **users**: User profiles (extends Supabase auth)
- **subscriptions**: Newsletter subscriptions with KTLN integration
- **entries**: Feed entries from newsletters
- **sync_logs**: Sync monitoring and debugging

## 4. Features Implemented

- ✅ TypeScript + Next.js 15 + App Router
- ✅ TailwindCSS + shadcn/ui components
- ✅ tRPC for type-safe API
- ✅ Supabase for authentication and database
- ✅ Theme provider (light/dark mode)
- ✅ Responsive layout with navigation

## 5. Next Steps

After Supabase setup:
1. Test authentication flow
2. Implement KTLN integration
3. Build subscription management
4. Create feed reader interface

## 6. Troubleshooting

### Docker Issues
- Ensure Docker Desktop is running
- Check Docker installation: `docker --version`

### Environment Variables
- Ensure `.env.local` exists and has correct values
- Restart dev server after changing env vars

### Database Issues
- Check Supabase dashboard for errors
- Verify RLS policies are correctly set up
