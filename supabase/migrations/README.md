# Database Migrations

This directory contains SQL migration files for the Supabase database.

## How to Apply Migrations

### Option 1: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the SQL from the migration file
4. Execute the SQL

### Option 2: Supabase CLI
```bash
# Apply all pending migrations
supabase db push

# Or apply a specific migration
supabase db execute --file supabase/migrations/20241222_add_match_confidence.sql
```

## Current Migrations

- `20241222_add_match_confidence.sql` - Adds match_confidence column to recommendations table for AI confidence scores



