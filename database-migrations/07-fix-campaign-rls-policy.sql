-- =====================================================
-- FIX: AD CAMPAIGNS RLS POLICY FOR ADMINS
-- =====================================================
-- Issue: The "Public can view active campaigns" policy
-- was applying to admins, preventing them from seeing
-- disabled/inactive campaigns in the admin panel.
--
-- Solution: Update the policy to exclude admins, so
-- admins can see ALL campaigns via the admin policy.
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view active campaigns" ON ad_campaigns;
DROP POLICY IF EXISTS "Admins can manage campaigns" ON ad_campaigns;

-- Create separate explicit policies for admins and non-admins

-- Policy 1: Admins can see and manage ALL campaigns
CREATE POLICY "Admins can manage campaigns"
  ON ad_campaigns FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policy 2: Non-admins (public/anon) can only see active campaigns
CREATE POLICY "Public can view active campaigns"
  ON ad_campaigns FOR SELECT
  TO anon, authenticated
  USING (
    NOT is_admin()
    AND is_active = TRUE
    AND start_date <= NOW()
    AND (end_date IS NULL OR end_date >= NOW())
  );

COMMENT ON POLICY "Admins can manage campaigns" ON ad_campaigns IS
  'Admins have full access to all campaigns regardless of status';

COMMENT ON POLICY "Public can view active campaigns" ON ad_campaigns IS
  'Non-admin users can only view active campaigns within their date range';
