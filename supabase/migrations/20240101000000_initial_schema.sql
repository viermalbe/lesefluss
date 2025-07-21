-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create custom types
create type subscription_status as enum ('active', 'paused', 'error');
create type entry_status as enum ('unread', 'read');

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  onboarding_complete_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Subscriptions table
create table public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  feed_url text not null,
  ktln_email text unique not null,
  status subscription_status default 'active' not null,
  last_sync_at timestamp with time zone,
  sync_error text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Entries table
create table public.entries (
  id uuid default uuid_generate_v4() primary key,
  subscription_id uuid references public.subscriptions(id) on delete cascade not null,
  guid_hash text not null,
  title text not null,
  content_html text not null,
  published_at timestamp with time zone not null,
  status entry_status default 'unread' not null,
  starred boolean default false not null,
  archived boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure unique entries per subscription
  unique(subscription_id, guid_hash)
);

-- Sync logs table for debugging and monitoring
create table public.sync_logs (
  id uuid default uuid_generate_v4() primary key,
  subscription_id uuid references public.subscriptions(id) on delete cascade not null,
  status text not null,
  message text,
  entries_added integer default 0,
  entries_updated integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for performance
create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_status on public.subscriptions(status);
create index idx_entries_subscription_id on public.entries(subscription_id);
create index idx_entries_status on public.entries(status);
create index idx_entries_starred on public.entries(starred);
create index idx_entries_archived on public.entries(archived);
create index idx_entries_published_at on public.entries(published_at desc);
create index idx_sync_logs_subscription_id on public.sync_logs(subscription_id);
create index idx_sync_logs_created_at on public.sync_logs(created_at desc);

-- Row Level Security (RLS) policies
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.entries enable row level security;
alter table public.sync_logs enable row level security;

-- Users policies
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

-- Subscriptions policies
create policy "Users can view own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "Users can create own subscriptions" on public.subscriptions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own subscriptions" on public.subscriptions
  for update using (auth.uid() = user_id);

create policy "Users can delete own subscriptions" on public.subscriptions
  for delete using (auth.uid() = user_id);

-- Entries policies
create policy "Users can view entries from own subscriptions" on public.entries
  for select using (
    exists (
      select 1 from public.subscriptions
      where subscriptions.id = entries.subscription_id
      and subscriptions.user_id = auth.uid()
    )
  );

create policy "Users can update entries from own subscriptions" on public.entries
  for update using (
    exists (
      select 1 from public.subscriptions
      where subscriptions.id = entries.subscription_id
      and subscriptions.user_id = auth.uid()
    )
  );

-- Sync logs policies
create policy "Users can view sync logs from own subscriptions" on public.sync_logs
  for select using (
    exists (
      select 1 from public.subscriptions
      where subscriptions.id = sync_logs.subscription_id
      and subscriptions.user_id = auth.uid()
    )
  );

-- Functions for automatic timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger handle_updated_at before update on public.users
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.subscriptions
  for each row execute procedure public.handle_updated_at();

-- Function to automatically create user profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
