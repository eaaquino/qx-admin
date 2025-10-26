-- =====================================================
-- ADD UNIVERSAL ZONE FLAG (Better than hardcoded name)
-- =====================================================
-- This makes the system more robust:
-- 1. Add `is_universal` flag instead of checking zone name
-- 2. Prevent deletion of universal zones
-- 3. Allow admins to create multiple universal zones if needed
-- =====================================================

-- Add is_universal column to campaign_zones
ALTER TABLE campaign_zones
ADD COLUMN IF NOT EXISTS is_universal BOOLEAN DEFAULT FALSE;

-- Mark "All Clinics" as universal
UPDATE campaign_zones
SET is_universal = TRUE
WHERE LOWER(name) = 'all clinics';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_campaign_zones_universal ON campaign_zones(is_universal) WHERE is_universal = TRUE;

-- Update function to check is_universal flag instead of name
CREATE OR REPLACE FUNCTION get_active_campaigns_for_doctor(p_doctor_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  display_duration_seconds INTEGER,
  priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    ac.id,
    ac.title,
    ac.description,
    ac.image_url,
    ac.link_url,
    ac.display_duration_seconds,
    ac.priority
  FROM ad_campaigns ac
  INNER JOIN campaign_zone_tags czt ON czt.campaign_id = ac.id
  INNER JOIN campaign_zones cz ON cz.id = czt.zone_id
  WHERE ac.is_active = TRUE
    AND ac.start_date <= NOW()
    AND (ac.end_date IS NULL OR ac.end_date >= NOW())
    AND (
      -- Show if doctor is explicitly assigned to this zone
      EXISTS (
        SELECT 1 FROM campaign_zone_assignments cza
        WHERE cza.zone_id = czt.zone_id
        AND cza.doctor_id = p_doctor_id
      )
      OR
      -- OR show if campaign targets a universal zone
      cz.is_universal = TRUE
    )
  ORDER BY ac.priority DESC, ac.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update function for clinics too
CREATE OR REPLACE FUNCTION get_active_campaigns_for_clinic(p_clinic_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  display_duration_seconds INTEGER,
  priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    ac.id,
    ac.title,
    ac.description,
    ac.image_url,
    ac.link_url,
    ac.display_duration_seconds,
    ac.priority
  FROM ad_campaigns ac
  INNER JOIN campaign_zone_tags czt ON czt.campaign_id = ac.id
  INNER JOIN campaign_zones cz ON cz.id = czt.zone_id
  WHERE ac.is_active = TRUE
    AND ac.start_date <= NOW()
    AND (ac.end_date IS NULL OR ac.end_date >= NOW())
    AND (
      -- Show if clinic is explicitly assigned to this zone
      EXISTS (
        SELECT 1 FROM campaign_zone_assignments cza
        WHERE cza.zone_id = czt.zone_id
        AND cza.clinic_id = p_clinic_id
      )
      OR
      -- OR show if campaign targets a universal zone
      cz.is_universal = TRUE
    )
  ORDER BY ac.priority DESC, ac.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Prevent deletion of universal zones
CREATE OR REPLACE FUNCTION prevent_universal_zone_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_universal = TRUE THEN
    RAISE EXCEPTION 'Cannot delete universal zones. Set is_active = FALSE instead.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_universal_zone_deletion ON campaign_zones;
CREATE TRIGGER trigger_prevent_universal_zone_deletion
  BEFORE DELETE ON campaign_zones
  FOR EACH ROW
  EXECUTE FUNCTION prevent_universal_zone_deletion();

COMMENT ON COLUMN campaign_zones.is_universal IS 'Universal zones show campaigns to ALL doctors/clinics (no assignment needed). Cannot be deleted, only deactivated.';

-- =====================================================
-- DONE!
-- =====================================================
-- Benefits:
-- 1. "All Clinics" can be renamed without breaking functionality
-- 2. Cannot accidentally delete universal zones
-- 3. Can create multiple universal zones if needed
-- 4. More explicit than checking zone name
-- =====================================================
