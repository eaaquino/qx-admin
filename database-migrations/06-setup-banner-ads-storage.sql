-- =====================================================
-- SETUP SUPABASE STORAGE FOR CAMPAIGN BANNERS
-- =====================================================
-- This creates a storage bucket for campaign banner images
-- with proper access policies
-- =====================================================

-- Create storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banner-ads',
  'banner-ads',
  TRUE, -- Public bucket so images can be displayed
  5242880, -- 5MB max file size
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Allow admins to upload banner images
CREATE POLICY "Admins can upload banner images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'banner-ads'
  AND is_admin()
);

-- Allow admins to update banner images
CREATE POLICY "Admins can update banner images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'banner-ads' AND is_admin())
WITH CHECK (bucket_id = 'banner-ads' AND is_admin());

-- Allow admins to delete banner images
CREATE POLICY "Admins can delete banner images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'banner-ads' AND is_admin());

-- Allow public read access to banner images (for qx-client)
CREATE POLICY "Public can view banner images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'banner-ads');

-- =====================================================
-- DONE!
-- =====================================================
-- Bucket: banner-ads
-- Location: https://[project-ref].supabase.co/storage/v1/object/public/banner-ads/[filename]
--
-- Admins can:
-- - Upload images (max 5MB, jpg/png/webp/gif only)
-- - Update/delete their uploads
--
-- Public can:
-- - View images (for queue displays)
-- =====================================================
