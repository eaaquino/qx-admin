-- =====================================================
-- QX ADMIN SYSTEM - SEPARATE ADMIN ACCOUNTS
-- =====================================================
-- Execute this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. CREATE ADMINS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Auth (managed by Supabase Auth)
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Personal Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,

  -- Admin Permissions
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_admin_role CHECK (
    role IN ('super_admin', 'admin', 'viewer')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admins_auth_user_id ON admins(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);

COMMENT ON TABLE admins IS 'Admin users with access to the QX Admin Panel';
COMMENT ON COLUMN admins.role IS 'super_admin = full access, admin = manage data, viewer = read-only';

-- =====================================================
-- 2. CREATE FUNCTION TO CHECK IF USER IS ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins
    WHERE auth_user_id = auth.uid()
    AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_admin IS 'Check if the current authenticated user is an active admin';

-- =====================================================
-- 3. CREATE FUNCTION TO GET ADMIN ROLE
-- =====================================================
CREATE OR REPLACE FUNCTION get_admin_role()
RETURNS TEXT AS $$
DECLARE
  admin_role TEXT;
BEGIN
  SELECT role INTO admin_role
  FROM admins
  WHERE auth_user_id = auth.uid()
  AND is_active = TRUE;

  RETURN admin_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_admin_role IS 'Get the role of the current admin user';

-- =====================================================
-- 4. ROW LEVEL SECURITY POLICIES FOR ADMINS TABLE
-- =====================================================
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Admins can view all admin accounts
CREATE POLICY "Admins can view all admins"
  ON admins FOR SELECT
  TO authenticated
  USING (is_admin());

-- Super admins can insert new admins
CREATE POLICY "Super admins can create admins"
  ON admins FOR INSERT
  TO authenticated
  WITH CHECK (
    get_admin_role() = 'super_admin'
  );

-- Super admins can update admins
CREATE POLICY "Super admins can update admins"
  ON admins FOR UPDATE
  TO authenticated
  USING (get_admin_role() = 'super_admin')
  WITH CHECK (get_admin_role() = 'super_admin');

-- Super admins can delete admins (except themselves)
CREATE POLICY "Super admins can delete other admins"
  ON admins FOR DELETE
  TO authenticated
  USING (
    get_admin_role() = 'super_admin'
    AND auth_user_id != auth.uid()
  );

-- =====================================================
-- 5. RLS POLICIES FOR EXISTING TABLES (ADMIN ACCESS ONLY)
-- =====================================================

-- Queue Entries: Admin access only
DROP POLICY IF EXISTS "Admin only access" ON queue_entries;
CREATE POLICY "Admin access to queue_entries"
  ON queue_entries FOR ALL
  TO authenticated
  USING (is_admin());

-- Doctors: Admin access only
DROP POLICY IF EXISTS "Admin only access" ON doctors;
CREATE POLICY "Admin access to doctors"
  ON doctors FOR ALL
  TO authenticated
  USING (is_admin());

-- Patients: Admin access only
DROP POLICY IF EXISTS "Admin only access" ON patients;
CREATE POLICY "Admin access to patients"
  ON patients FOR ALL
  TO authenticated
  USING (is_admin());

-- Clinics: Admin access only
DROP POLICY IF EXISTS "Admin only access" ON clinics;
CREATE POLICY "Admin access to clinics"
  ON clinics FOR ALL
  TO authenticated
  USING (is_admin());

-- Doctor Schedules: Admin access only
DROP POLICY IF EXISTS "Admin only access" ON doctor_schedules;
CREATE POLICY "Admin access to doctor_schedules"
  ON doctor_schedules FOR ALL
  TO authenticated
  USING (is_admin());

-- Doctor Schedule Exceptions: Admin access only
DROP POLICY IF EXISTS "Admin only access" ON doctor_schedule_exceptions;
CREATE POLICY "Admin access to doctor_schedule_exceptions"
  ON doctor_schedule_exceptions FOR ALL
  TO authenticated
  USING (is_admin());

-- Intake Links: Admin access only
DROP POLICY IF EXISTS "Admin only access" ON intake_links;
CREATE POLICY "Admin access to intake_links"
  ON intake_links FOR ALL
  TO authenticated
  USING (is_admin());

-- =====================================================
-- 6. CREATE FIRST SUPER ADMIN (UPDATE EMAIL AFTER CREATION)
-- =====================================================
-- IMPORTANT: First, create a Supabase Auth user in the dashboard
-- Then run this query with the user's UUID and email:

-- Example (replace with actual values):
/*
INSERT INTO admins (auth_user_id, first_name, last_name, email, role)
VALUES (
  'YOUR-AUTH-USER-UUID-HERE',
  'Admin',
  'User',
  'admin@example.com',
  'super_admin'
);
*/

-- =====================================================
-- 7. TRIGGER TO UPDATE updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_admin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_updated_at();

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Next steps:
-- 1. Create a Supabase Auth user in the dashboard
-- 2. Insert that user into the admins table as super_admin
-- 3. Use that account to log into the admin panel
-- =====================================================
