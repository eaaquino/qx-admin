-- =====================================================
-- AD CAMPAIGNS SYSTEM FOR QUEUE STATUS DISPLAYS
-- =====================================================
-- This creates a flexible ad targeting system where:
-- 1. Admins create Campaign Zones (e.g., "Pediatrics", "Cardiology", "All Clinics")
-- 2. Campaign Zones are assigned to doctors/clinics
-- 3. Ad Campaigns are tagged to Campaign Zones
-- 4. Queue displays show ads based on the doctor's assigned zones
-- =====================================================

-- =====================================================
-- 1. CAMPAIGN ZONES (Targeting Groups)
-- =====================================================
CREATE TABLE IF NOT EXISTS campaign_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_zones_active ON campaign_zones(is_active);

COMMENT ON TABLE campaign_zones IS 'Targeting zones for ad campaigns (e.g., Pediatrics, Downtown Clinics, All)';

-- Insert default zones with clear descriptions
INSERT INTO campaign_zones (name, description, is_active) VALUES
  ('All Clinics', 'Universal zone - campaigns show to ALL doctors automatically (no assignment needed)', TRUE),
  ('Pediatrics', 'Target pediatric doctors (requires assignment)', TRUE),
  ('Cardiology', 'Target cardiology specialists (requires assignment)', TRUE),
  ('Dermatology', 'Target dermatology specialists (requires assignment)', TRUE),
  ('General Practice', 'Target general practice doctors (requires assignment)', TRUE)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. CAMPAIGN ZONE ASSIGNMENTS (Doctors/Clinics → Zones)
-- =====================================================
CREATE TABLE IF NOT EXISTS campaign_zone_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID REFERENCES campaign_zones(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Either doctor_id OR clinic_id must be set, not both
  CONSTRAINT check_assignment_target CHECK (
    (doctor_id IS NOT NULL AND clinic_id IS NULL) OR
    (doctor_id IS NULL AND clinic_id IS NOT NULL)
  ),

  -- Prevent duplicate assignments
  UNIQUE(zone_id, doctor_id),
  UNIQUE(zone_id, clinic_id)
);

CREATE INDEX IF NOT EXISTS idx_zone_assignments_zone ON campaign_zone_assignments(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_assignments_doctor ON campaign_zone_assignments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_zone_assignments_clinic ON campaign_zone_assignments(clinic_id);

COMMENT ON TABLE campaign_zone_assignments IS 'Assigns campaign zones to specific doctors or clinics';

-- =====================================================
-- 3. AD CAMPAIGNS
-- =====================================================
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Campaign Info
  title TEXT NOT NULL,
  description TEXT,

  -- Media
  image_url TEXT,
  link_url TEXT,

  -- Scheduling
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Display Settings
  display_duration_seconds INTEGER DEFAULT 5,
  priority INTEGER DEFAULT 0, -- Higher priority shown first

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES admins(id),

  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date > start_date),
  CONSTRAINT valid_display_duration CHECK (display_duration_seconds >= 3 AND display_duration_seconds <= 60)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_active ON ad_campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON ad_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_priority ON ad_campaigns(priority DESC);

COMMENT ON TABLE ad_campaigns IS 'Ad campaigns shown on queue status displays';

-- =====================================================
-- 4. CAMPAIGN ZONE TAGS (Campaigns → Zones)
-- =====================================================
CREATE TABLE IF NOT EXISTS campaign_zone_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE CASCADE NOT NULL,
  zone_id UUID REFERENCES campaign_zones(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(campaign_id, zone_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_zone_tags_campaign ON campaign_zone_tags(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_zone_tags_zone ON campaign_zone_tags(zone_id);

COMMENT ON TABLE campaign_zone_tags IS 'Links ad campaigns to campaign zones for targeting';

-- =====================================================
-- 5. FUNCTION: Get Active Campaigns for a Doctor
-- =====================================================
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
      -- OR show if campaign targets "All Clinics" zone (universal catch-all)
      LOWER(cz.name) = 'all clinics'
    )
  ORDER BY ac.priority DESC, ac.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_active_campaigns_for_doctor IS 'Get all active ad campaigns for a specific doctor based on their assigned zones';

-- =====================================================
-- 6. FUNCTION: Get Active Campaigns for a Clinic
-- =====================================================
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
      -- OR show if campaign targets "All Clinics" zone (universal catch-all)
      LOWER(cz.name) = 'all clinics'
    )
  ORDER BY ac.priority DESC, ac.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_active_campaigns_for_clinic IS 'Get all active ad campaigns for a specific clinic based on its assigned zones';

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================
ALTER TABLE campaign_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_zone_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_zone_tags ENABLE ROW LEVEL SECURITY;

-- Admins can manage everything
CREATE POLICY "Admins can manage campaign zones"
  ON campaign_zones FOR ALL TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can manage zone assignments"
  ON campaign_zone_assignments FOR ALL TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can manage campaigns"
  ON ad_campaigns FOR ALL TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can manage campaign tags"
  ON campaign_zone_tags FOR ALL TO authenticated
  USING (is_admin());

-- Public can view active campaigns (for qx-client)
CREATE POLICY "Public can view active campaigns"
  ON ad_campaigns FOR SELECT TO anon, authenticated
  USING (is_active = TRUE AND start_date <= NOW() AND (end_date IS NULL OR end_date >= NOW()));

CREATE POLICY "Public can view campaign zones"
  ON campaign_zones FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);

CREATE POLICY "Public can view zone assignments"
  ON campaign_zone_assignments FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY "Public can view campaign tags"
  ON campaign_zone_tags FOR SELECT TO anon, authenticated
  USING (TRUE);

-- =====================================================
-- 8. UPDATE TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_campaign_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaign_zones_updated_at
  BEFORE UPDATE ON campaign_zones
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_zones_updated_at();

CREATE TRIGGER trigger_update_campaigns_updated_at
  BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_zones_updated_at();

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Next steps in qx-admin:
-- 1. Create Campaign Zones CRUD
-- 2. Create Ad Campaigns CRUD (with zone tagging)
-- 3. Add zone assignment UI to Doctor/Clinic edit pages
--
-- Next steps in qx-client:
-- 1. Update QueueStatus.jsx to fetch campaigns via get_active_campaigns_for_doctor()
-- 2. Display campaigns in carousel/banner
-- =====================================================
