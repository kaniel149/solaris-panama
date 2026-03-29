-- ============================================
-- Seed team members for Solaris Panama CRM
-- Run AFTER creating users in Supabase Auth dashboard
-- ============================================

-- Insert team members (will reference auth.users after manual user creation)
-- Kaniel: k@kanielt.com (admin)
-- Omri: solarisenergy.pan@gmail.com (admin)

INSERT INTO team_members (name, email, role, phone, is_active)
VALUES
  ('Kaniel Tordjman', 'k@kanielt.com', 'admin', '+972502213948', true),
  ('Omri', 'solarisenergy.pan@gmail.com', 'admin', '+50765831822', true)
ON CONFLICT (email) DO NOTHING;
