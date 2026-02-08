-- ============================================================================
-- Solaris Panama CRM - Demo Seed Data
-- ============================================================================

-- ============================================================================
-- Team Members (4)
-- ============================================================================
INSERT INTO team_members (id, email, full_name, role, phone, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'kaniel@solarispanama.com', 'Kaniel Tordjman', 'admin', '+507-6000-0001', true),
  ('a0000000-0000-0000-0000-000000000002', 'maria@solarispanama.com', 'Maria Gonzalez', 'sales', '+507-6000-0002', true),
  ('a0000000-0000-0000-0000-000000000003', 'carlos@solarispanama.com', 'Carlos Rivera', 'engineer', '+507-6000-0003', true),
  ('a0000000-0000-0000-0000-000000000004', 'lucia@solarispanama.com', 'Lucia Fernandez', 'sales', '+507-6000-0004', true);

-- ============================================================================
-- Clients (8)
-- ============================================================================
INSERT INTO clients (id, company_name, contact_name, email, phone, whatsapp, address, city, sector, monthly_bill, source, assigned_to, notes) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Grupo Motta S.A.', 'Ricardo Motta', 'ricardo@grupomotta.com', '+507-300-1000', '+507-6100-0001', 'Calle 50, Torre Global Bank Piso 20', 'Panama City', 'retail', 28500.00, 'referral', 'a0000000-0000-0000-0000-000000000001', 'Major retail group, 12 locations across Panama'),
  ('b0000000-0000-0000-0000-000000000002', 'Hospital Nacional S.A.', 'Dr. Elena Vasquez', 'evasquez@hospitalnacional.pa', '+507-207-8100', '+507-6100-0002', 'Ave. Cuba, Calle 38', 'Panama City', 'healthcare', 45000.00, 'cold_call', 'a0000000-0000-0000-0000-000000000002', 'Large hospital, 24/7 operation, high energy consumption'),
  ('b0000000-0000-0000-0000-000000000003', 'Cerveceria Nacional S.A.', 'Jorge Pineda', 'jpineda@cervnacional.com', '+507-266-5000', '+507-6100-0003', 'Via Ricardo J. Alfaro', 'Panama City', 'manufacturing', 62000.00, 'website', 'a0000000-0000-0000-0000-000000000001', 'Brewery, large flat roof, perfect for solar'),
  ('b0000000-0000-0000-0000-000000000004', 'Hotel Riu Plaza Panama', 'Andrea Castillo', 'acastillo@riu.com', '+507-378-9000', '+507-6100-0004', 'Calle 50 y Aquilino de la Guardia', 'Panama City', 'hospitality', 35000.00, 'referral', 'a0000000-0000-0000-0000-000000000004', 'International hotel chain, corporate sustainability mandate'),
  ('b0000000-0000-0000-0000-000000000005', 'Supermercados Rey S.A.', 'Manuel Herrera', 'mherrera@smrey.com', '+507-340-0100', '+507-6100-0005', 'Via Espana, El Cangrejo', 'Panama City', 'retail', 22000.00, 'cold_call', 'a0000000-0000-0000-0000-000000000002', 'Supermarket chain, 8 locations, interested in phased rollout'),
  ('b0000000-0000-0000-0000-000000000006', 'Universidad Tecnologica de Panama', 'Prof. Roberto Chen', 'rchen@utp.ac.pa', '+507-560-3000', '+507-6100-0006', 'Campus Metropolitano Victor Levi Sasso', 'Panama City', 'education', 18000.00, 'event', 'a0000000-0000-0000-0000-000000000004', 'University campus, multiple buildings, government funding possible'),
  ('b0000000-0000-0000-0000-000000000007', 'Zona Libre de Colon - Warehouse District', 'Ahmed Al-Rashid', 'alrashid@zonalibre.com', '+507-441-5000', '+507-6100-0007', 'Calle 13, Zona Libre de Colon', 'Colon', 'logistics', 55000.00, 'website', 'a0000000-0000-0000-0000-000000000001', 'Free trade zone warehouses, massive roof area'),
  ('b0000000-0000-0000-0000-000000000008', 'Aeropuerto Tocumen S.A.', 'Isabel Mendieta', 'imendieta@tocumen.aero', '+507-238-2700', '+507-6100-0008', 'Aeropuerto Internacional de Tocumen', 'Panama City', 'infrastructure', 120000.00, 'government', 'a0000000-0000-0000-0000-000000000001', 'International airport, flagship project opportunity');

-- ============================================================================
-- Buildings (10)
-- ============================================================================
INSERT INTO buildings (id, client_id, name, address, lat, lng, roof_area_m2, roof_type, roof_azimuth, roof_tilt, monthly_consumption_kwh, annual_consumption_kwh) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Multimax Store Albrook', 'Albrook Mall, Local 150', 8.9740, -79.5488, 2200, 'flat_concrete', 180, 5, 42000, 504000),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Multimax Store Via Espana', 'Via Espana y Calle 54', 8.9835, -79.5217, 1800, 'metal_sheet', 165, 8, 38000, 456000),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'Hospital Nacional Main Building', 'Ave. Cuba, Calle 38', 8.9650, -79.5390, 3500, 'flat_concrete', 180, 0, 95000, 1140000),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', 'Cerveceria Nacional Factory', 'Via Ricardo J. Alfaro Km 8', 9.0120, -79.5630, 8500, 'metal_sheet', 180, 10, 130000, 1560000),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000004', 'Riu Plaza Hotel Rooftop', 'Calle 50 y Aquilino', 8.9830, -79.5270, 1500, 'flat_concrete', 180, 0, 72000, 864000),
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000005', 'SuperRey El Cangrejo', 'Via Espana, El Cangrejo', 8.9850, -79.5260, 1200, 'metal_sheet', 175, 7, 35000, 420000),
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000005', 'SuperRey Costa del Este', 'Ave. Centenario, Costa del Este', 9.0050, -79.4870, 1400, 'metal_sheet', 180, 5, 40000, 480000),
  ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000006', 'UTP Campus Central', 'Campus Metropolitano', 9.0220, -79.5340, 4000, 'flat_concrete', 180, 0, 45000, 540000),
  ('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000007', 'Zona Libre Warehouse Complex A', 'Calle 13, Zona Libre', 9.3590, -79.9010, 12000, 'metal_sheet', 180, 12, 110000, 1320000),
  ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000008', 'Tocumen T2 Parking Structure', 'Terminal 2 Parking', 9.0710, -79.3830, 15000, 'flat_concrete', 180, 0, 250000, 3000000);

-- ============================================================================
-- Projects (12)
-- ============================================================================
INSERT INTO projects (id, name, client_id, building_id, assigned_to, stage, system_size_kwp, estimated_cost, estimated_savings_annual, panel_count, inverter_type, priority, expected_close_date, actual_close_date, lost_reason, notes) VALUES
  -- Lead stage (2)
  ('d0000000-0000-0000-0000-000000000001', 'Tocumen Airport Solar Canopy', 'b0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'lead', 2500, 2200000, 487500, 4545, 'Huawei SUN2000-100KTL', 'high', '2026-09-30', NULL, NULL, 'Flagship project - solar canopy over parking structure'),
  ('d0000000-0000-0000-0000-000000000002', 'UTP Campus Solar', 'b0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000004', 'lead', 450, 380000, 87750, 818, 'SMA Sunny Tripower', 'medium', '2026-06-30', NULL, NULL, 'University interested in educational showcase'),

  -- Qualified stage (2)
  ('d0000000-0000-0000-0000-000000000003', 'Zona Libre Warehouse Solar', 'b0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'qualified', 1800, 1450000, 351000, 3273, 'Huawei SUN2000-100KTL', 'high', '2026-05-15', NULL, NULL, 'Massive warehouse roof, excellent solar potential'),
  ('d0000000-0000-0000-0000-000000000004', 'Riu Hotel Rooftop Solar', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 'qualified', 200, 175000, 42000, 364, 'Fronius Symo', 'medium', '2026-04-30', NULL, NULL, 'Hotel chain sustainability program'),

  -- Proposal stage (2)
  ('d0000000-0000-0000-0000-000000000005', 'Cerveceria Nacional Factory', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'proposal', 1200, 980000, 234000, 2182, 'Huawei SUN2000-100KTL', 'high', '2026-04-15', NULL, NULL, 'Factory roof ideal for large installation'),
  ('d0000000-0000-0000-0000-000000000006', 'Hospital Nacional Solar', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'proposal', 500, 425000, 97500, 909, 'SMA Sunny Tripower', 'high', '2026-03-31', NULL, NULL, 'Hospital needs reliable power, backup integration'),

  -- Negotiation stage (1)
  ('d0000000-0000-0000-0000-000000000007', 'Multimax Albrook Solar', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'negotiation', 300, 255000, 63000, 545, 'Fronius Symo', 'high', '2026-03-15', NULL, NULL, 'Price negotiation in progress, client wants financing options'),

  -- Permit stage (1)
  ('d0000000-0000-0000-0000-000000000008', 'SuperRey El Cangrejo Solar', 'b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'permit', 160, 138000, 33150, 291, 'Fronius Symo', 'medium', '2026-03-01', NULL, NULL, 'Permits submitted to ASEP, awaiting approval'),

  -- Installation stage (1)
  ('d0000000-0000-0000-0000-000000000009', 'SuperRey Costa del Este', 'b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 'installation', 180, 155000, 37800, 327, 'Fronius Symo', 'medium', '2026-02-01', NULL, NULL, 'Installation in progress, 60% complete'),

  -- Monitoring stage (1)
  ('d0000000-0000-0000-0000-000000000010', 'Multimax Via Espana Solar', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'monitoring', 250, 215000, 52500, 455, 'Huawei SUN2000-50KTL', 'low', '2025-11-01', '2025-12-15', NULL, 'System operational since Dec 2025, performing above expectations'),

  -- Lost (1)
  ('d0000000-0000-0000-0000-000000000011', 'Multimax Store David', 'b0000000-0000-0000-0000-000000000001', NULL, 'a0000000-0000-0000-0000-000000000004', 'lost', 180, 160000, 37800, 327, 'Fronius Symo', 'low', '2025-12-01', NULL, 'Chose competitor - lower price', 'Lost to local competitor offering 15% lower price'),

  -- Won (1)
  ('d0000000-0000-0000-0000-000000000012', 'Multimax Albrook Phase 1', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'won', 100, 88000, 21000, 182, 'Fronius Primo', 'low', '2025-10-01', '2025-10-20', NULL, 'Phase 1 completed, led to Phase 2 (project d...07)');

-- ============================================================================
-- Proposals (5)
-- ============================================================================
INSERT INTO proposals (id, project_id, version, system_size_kwp, panel_count, panel_model, inverter_model, total_cost, annual_savings, payback_years, irr, npv, co2_offset_tons, pdf_url, status, ai_generated, sent_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005', 1, 1000, 1818, 'Jinko Tiger Neo 550W', 'Huawei SUN2000-100KTL', 820000, 195000, 4.2, 22.5, 385000, 520, NULL, 'draft', true, NULL),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000005', 2, 1200, 2182, 'Jinko Tiger Neo 550W', 'Huawei SUN2000-100KTL', 980000, 234000, 4.2, 23.1, 468000, 624, NULL, 'sent', true, '2026-01-20 14:30:00-05'),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000006', 1, 500, 909, 'Canadian Solar HiKu6 550W', 'SMA Sunny Tripower 50', 425000, 97500, 4.4, 21.0, 182000, 260, NULL, 'sent', false, '2026-01-25 10:00:00-05'),
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000007', 1, 300, 545, 'LONGi Hi-MO 6 550W', 'Fronius Symo 20', 255000, 63000, 4.0, 24.0, 130000, 156, NULL, 'accepted', true, '2026-01-10 09:00:00-05'),
  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000008', 1, 160, 291, 'LONGi Hi-MO 6 550W', 'Fronius Symo 15', 138000, 33150, 4.2, 22.0, 62000, 83, NULL, 'accepted', false, '2025-12-15 11:00:00-05');

-- ============================================================================
-- Permits (3)
-- ============================================================================
INSERT INTO permits (id, project_id, permit_type, status, submitted_at, approved_at, reference_number, notes) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000008', 'ASEP Connection', 'approved', '2025-12-20 10:00:00-05', '2026-01-15 14:00:00-05', 'ASEP-2025-DG-04521', 'Distributed generation connection permit approved'),
  ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000008', 'Municipal Construction', 'pending', '2026-01-10 09:00:00-05', NULL, 'MUN-PC-2026-0087', 'Awaiting structural review from municipality'),
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000009', 'ASEP Connection', 'approved', '2025-10-05 10:00:00-05', '2025-11-01 16:00:00-05', 'ASEP-2025-DG-03890', 'Approved, net meter installed');

-- ============================================================================
-- Installations (2)
-- ============================================================================
INSERT INTO installations (id, project_id, scheduled_start, scheduled_end, actual_start, actual_end, status, crew_lead, notes) VALUES
  ('10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000009', '2026-01-15', '2026-02-15', '2026-01-18', NULL, 'in_progress', 'a0000000-0000-0000-0000-000000000003', 'Phase 1 panels mounted, electrical wiring 60% complete'),
  ('10000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000010', '2025-11-01', '2025-12-10', '2025-11-03', '2025-12-12', 'completed', 'a0000000-0000-0000-0000-000000000003', 'Installation completed, system commissioned Dec 15');

-- ============================================================================
-- Monitoring Sites (3)
-- ============================================================================
INSERT INTO monitoring_sites (id, project_id, platform, site_id, system_size_kwp, commissioned_at, last_sync, status) VALUES
  ('20000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000010', 'huawei_fusionsolar', 'NE=48953271', 250, '2025-12-15', '2026-02-08 06:00:00-05', 'active'),
  ('20000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000012', 'fronius_solarweb', 'SW-PAN-001', 100, '2025-10-25', '2026-02-08 05:45:00-05', 'active'),
  ('20000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000009', 'fronius_solarweb', 'SW-PAN-002', 180, NULL, NULL, 'pending');

-- ============================================================================
-- Activities (10)
-- ============================================================================
INSERT INTO activities (id, project_id, client_id, user_id, type, title, description, metadata, created_at) VALUES
  ('30000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'site_visit', 'Site survey at Cerveceria Nacional', 'Completed roof inspection with drone. 8,500 m2 usable area confirmed. Metal sheet roof in good condition.', '{"drone_photos": 45, "duration_hours": 3}', '2026-01-15 09:00:00-05'),
  ('30000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'proposal_sent', 'Proposal v2 sent to Jorge Pineda', 'Updated proposal with 1,200 kWp system. Includes financing options from Banco General.', '{"proposal_id": "e0000000-0000-0000-0000-000000000002"}', '2026-01-20 14:30:00-05'),
  ('30000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'meeting', 'Presentation to Hospital Board', 'Presented solar proposal to hospital board of directors. Strong interest from CFO due to rising energy costs.', '{"attendees": 8, "duration_minutes": 90}', '2026-01-25 10:00:00-05'),
  ('30000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'call', 'Negotiation call with Ricardo Motta', 'Discussed financing terms. Client wants 60-month PPA option. Agreed to present revised financial model.', '{"duration_minutes": 45}', '2026-02-01 11:00:00-05'),
  ('30000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'installation_update', 'Panel mounting 60% complete', 'Installed 196 of 327 panels. Weather delay of 2 days due to rain. On track for Feb 15 completion.', '{"panels_installed": 196, "panels_total": 327}', '2026-02-03 16:00:00-05'),
  ('30000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'email', 'Sent technical specs to Ahmed Al-Rashid', 'Sent detailed technical specifications for 1,800 kWp system on warehouse complex. Includes structural analysis.', NULL, '2026-02-04 09:30:00-05'),
  ('30000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'meeting', 'Initial meeting with Tocumen Airport', 'Met with airport management. Interested in 2.5 MW solar canopy over T2 parking. Government green mandate driving project.', '{"attendees": 5, "duration_minutes": 120}', '2026-02-05 14:00:00-05'),
  ('30000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'monitoring_alert', 'Production above forecast', 'Multimax Via Espana system producing 12% above forecast for January. Peak day: 1,180 kWh on Jan 18.', '{"monthly_kwh": 32500, "forecast_kwh": 29000}', '2026-02-06 08:00:00-05'),
  ('30000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'call', 'Follow-up with Riu Hotel', 'Andrea confirmed budget approval for Q2. Need to schedule site survey and finalize system design.', '{"duration_minutes": 20}', '2026-02-07 10:00:00-05'),
  ('30000000-0000-0000-0000-000000000010', 'd0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'permit_update', 'Municipal permit under review', 'Called municipality - structural review in progress. Expected approval within 2 weeks.', NULL, '2026-02-07 15:00:00-05');

-- ============================================================================
-- Notifications (seed some for team members)
-- ============================================================================
INSERT INTO notifications (user_id, type, title, body, link, read, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'deal_update', 'Multimax Albrook moved to Negotiation', 'Project moved from Proposal to Negotiation stage', '/projects/d0000000-0000-0000-0000-000000000007', false, '2026-02-01 11:30:00-05'),
  ('a0000000-0000-0000-0000-000000000001', 'monitoring', 'Multimax Via Espana - Above Forecast', 'System producing 12% above January forecast', '/monitoring/20000000-0000-0000-0000-000000000001', false, '2026-02-06 08:00:00-05'),
  ('a0000000-0000-0000-0000-000000000001', 'new_lead', 'New lead: Tocumen Airport', 'Isabel Mendieta from Aeropuerto Tocumen S.A. expressed interest', '/projects/d0000000-0000-0000-0000-000000000001', true, '2026-02-05 15:00:00-05'),
  ('a0000000-0000-0000-0000-000000000002', 'permit_update', 'SuperRey El Cangrejo - ASEP Approved', 'ASEP connection permit approved for SuperRey El Cangrejo', '/projects/d0000000-0000-0000-0000-000000000008', true, '2026-01-15 14:00:00-05'),
  ('a0000000-0000-0000-0000-000000000002', 'task_due', 'Follow up: Hospital Nacional proposal', 'Proposal was sent 14 days ago - time to follow up', '/projects/d0000000-0000-0000-0000-000000000006', false, '2026-02-08 08:00:00-05'),
  ('a0000000-0000-0000-0000-000000000003', 'installation', 'SuperRey Costa del Este - 60% Complete', 'Panel mounting milestone reached: 196/327 panels installed', '/projects/d0000000-0000-0000-0000-000000000009', false, '2026-02-03 16:00:00-05'),
  ('a0000000-0000-0000-0000-000000000004', 'deal_update', 'Riu Hotel budget approved', 'Andrea Castillo confirmed Q2 budget approval for solar project', '/projects/d0000000-0000-0000-0000-000000000004', false, '2026-02-07 10:30:00-05');
