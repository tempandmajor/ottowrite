# Storage Migration Application Guide

**Migration**: `20251017000009_character_images_storage.sql`
**Status**: ⚠️ **MANUAL APPLICATION REQUIRED**
**Priority**: HIGH - Image upload feature will not work until applied

---

## Why Manual Application is Required

The Supabase MCP and CLI tools encountered authentication issues:
- **MCP**: `Your account does not have the necessary privileges to access this endpoint`
- **CLI**: `password authentication failed for user "postgres"`

Therefore, this migration must be applied manually via the Supabase Dashboard.

---

## Application Steps

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/cggppzxzvbpbplsxynlv
   - Log in to your Supabase account

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy Migration SQL**
   - Open: `supabase/migrations/20251017000009_character_images_storage.sql`
   - Copy entire contents (see below)

4. **Execute Migration**
   - Paste SQL into query editor
   - Click "Run" or press Cmd/Ctrl+Enter
   - Verify success message appears

5. **Verify Bucket Creation**
   - Click "Storage" in left sidebar
   - Verify "character-images" bucket exists
   - Bucket should be marked as "Public"

---

### Option 2: CLI (If Password Fixed)

If you fix the database password authentication issue:

```bash
cd /Users/emmanuelakangbou/ottowrite
supabase db push
```

This will automatically apply all pending migrations.

---

## Migration SQL

```sql
-- Character image storage setup
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'character-images') THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('character-images', 'character-images', true);
    END IF;
END $$;

-- Allow authenticated users to read character images
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read character images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'character-images' AND auth.role() = 'authenticated');

-- Allow users to upload their character images
CREATE POLICY IF NOT EXISTS "Allow users to upload their character images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'character-images'
        AND auth.role() = 'authenticated'
        AND split_part(name, '/', 1) = auth.uid()::text
    );

-- Allow users to update their character images
CREATE POLICY IF NOT EXISTS "Allow users to update their character images"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'character-images'
        AND auth.role() = 'authenticated'
        AND split_part(name, '/', 1) = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'character-images'
        AND auth.role() = 'authenticated'
        AND split_part(name, '/', 1) = auth.uid()::text
    );

-- Allow users to delete their character images
CREATE POLICY IF NOT EXISTS "Allow users to delete their character images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'character-images'
        AND auth.role() = 'authenticated'
        AND split_part(name, '/', 1) = auth.uid()::text
    );
```

---

## Verification Steps

After applying the migration, verify it worked correctly:

### 1. Check Bucket Exists
```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'character-images';
```

**Expected Result**:
| id | name | public |
|----|------|--------|
| character-images | character-images | true |

### 2. Check Policies Exist
```sql
SELECT policyname
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%character images%';
```

**Expected Result**: 4 policies listed
- Allow authenticated users to read character images
- Allow users to upload their character images
- Allow users to update their character images
- Allow users to delete their character images

### 3. Test Upload (UI)
1. Navigate to a character editor page
2. Click "Upload Image" button
3. Select an image file (JPEG, PNG, WebP, or GIF)
4. Verify image appears in preview
5. Check Supabase Storage to confirm file exists

---

## Troubleshooting

### Migration Fails with "bucket already exists"
This is safe to ignore. The migration uses `IF NOT EXISTS` checks.

### Policies Already Exist Error
This is safe to ignore. The migration uses `IF NOT EXISTS` for policies.

### Upload Still Fails After Migration
1. Verify user is authenticated
2. Check browser console for error messages
3. Verify Storage bucket is public
4. Check file size (<5MB) and type (JPEG/PNG/WebP/GIF)
5. Inspect Network tab for 403/404 errors

### Cannot Access Dashboard
- Verify you're logged into the correct Supabase account
- Project ID: `cggppzxzvbpbplsxynlv`
- Organization: Should match your Supabase organization

---

## Impact of Not Applying Migration

**WITHOUT Migration**:
- ❌ Character image upload will fail with "bucket not found" error
- ❌ ImageUpload component will show error state
- ❌ Existing character images (if any) will not load
- ✅ All other character features work normally

**WITH Migration**:
- ✅ Character image upload works
- ✅ Image preview and delete work
- ✅ User-scoped security enforced
- ✅ All Week 2 features fully operational

---

## Post-Application

After successfully applying the migration:
1. Update `PHASE_2_WEEK_2_COMPLETION.md` to mark migration as ✅ Applied
2. Test image upload in production
3. Mark Week 2 as 100% complete
4. Proceed to Week 3 features

---

## Questions?

If you encounter issues:
1. Check Supabase Dashboard logs (Logs → Postgres Logs)
2. Verify project ID matches: `cggppzxzvbpbplsxynlv`
3. Ensure you have admin access to the Supabase project
4. Review RLS policies in Table Editor → storage.objects
