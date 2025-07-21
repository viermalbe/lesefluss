-- Fix missing INSERT policy for entries table
-- This allows users to insert entries for their own subscriptions

create policy "Users can insert entries for own subscriptions" on public.entries
  for insert with check (
    exists (
      select 1 from public.subscriptions
      where subscriptions.id = entries.subscription_id
      and subscriptions.user_id = auth.uid()
    )
  );

-- Also add INSERT policy for sync_logs if needed
create policy "Users can insert sync logs for own subscriptions" on public.sync_logs
  for insert with check (
    exists (
      select 1 from public.subscriptions
      where subscriptions.id = sync_logs.subscription_id
      and subscriptions.user_id = auth.uid()
    )
  );
