-- Add image_url column to subscriptions table
alter table public.subscriptions 
add column image_url text;

-- Add comment for documentation
comment on column public.subscriptions.image_url is 'Optional custom image URL for the subscription/source';
