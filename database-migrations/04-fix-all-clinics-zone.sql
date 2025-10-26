-- =====================================================
-- FIX: Make "All Clinics" zone work as expected
-- =====================================================
-- This updates the campaign fetching logic so that:
-- 1. Campaigns tagged to "All Clinics" zone are shown to ALL doctors
-- 2. Other zones require explicit assignment
-- =====================================================

-- Option 1: Update the function to treat "All Clinics" as a catch-all
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
      -- OR show if campaign targets "All Clinics" zone (universal)
      LOWER(cz.name) = 'all clinics'
    )
  ORDER BY ac.priority DESC, ac.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Option 2: Update function for clinics too
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
      -- OR show if campaign targets "All Clinics" zone (universal)
      LOWER(cz.name) = 'all clinics'
    )
  ORDER BY ac.priority DESC, ac.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update the description to make it clear
UPDATE campaign_zones
SET description = 'Universal zone - campaigns tagged here are shown to ALL doctors/clinics automatically (no assignment needed)'
WHERE LOWER(name) = 'all clinics';

-- =====================================================
-- DONE!
-- =====================================================
-- Now "All Clinics" zone works as expected:
-- - Tag a campaign to "All Clinics" = shows to everyone
-- - Tag a campaign to "Pediatrics" = only shows to doctors assigned to that zone
-- =====================================================
