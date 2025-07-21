# Database Migration Instructions

## Adding Source Image Support

To enable the source image upload feature, you need to run the following migration:

### Step 1: Apply the Migration

Run the migration file to add the `image_url` column to the subscriptions table:

```sql
-- File: supabase/migrations/20240103000000_add_subscription_image.sql
alter table public.subscriptions 
add column image_url text;

comment on column public.subscriptions.image_url is 'Optional custom image URL for the subscription/source';
```

### Step 2: Update Supabase (if using hosted)

If you're using Supabase hosted service:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the migration SQL above
4. Or use the Supabase CLI: `supabase db push`

### Step 3: Update Local Development

If running locally:

```bash
supabase migration up
# or
supabase db reset
```

### Step 4: Verify the Feature

After the migration:

1. Go to Sources page
2. Click "Edit" next to "Source Image" in any source card
3. Add an image URL (e.g., `https://via.placeholder.com/150`)
4. Save and check the Issues page - the image should appear as fallback in newsletter previews

### Feature Benefits

- **Newsletter Preview Enhancement**: When newsletters don't contain images, the source image is used as fallback
- **Visual Source Identification**: Each source can have a custom image for better visual recognition
- **Improved UX**: More visually appealing newsletter cards in the Issues list

### Fallback Behavior

1. **First Priority**: Custom source image (if set) - avoids tracking pixels
2. **Second Priority**: Meaningful image extracted from newsletter HTML content
3. **Third Priority**: Text preview of newsletter content

### Smart Image Filtering

The system automatically filters out:
- Tracking pixels (contains 'track', 'pixel', 'beacon', 'analytics')
- 1x1 transparent images
- WIRED-specific tracking patterns
- Images smaller than 50x50 pixels
- Common tracking GIF patterns
