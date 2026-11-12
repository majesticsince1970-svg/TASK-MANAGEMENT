-- Seed Data for Majestic Ops
-- Run after migrations
-- Idempotent: uses ON CONFLICT DO NOTHING where possible

-- ═══════════════════════════════════════════════
-- APP SETTINGS
-- ═══════════════════════════════════════════════
INSERT INTO app_settings (shop_name, timezone, working_days, default_shift_start, default_shift_end, digest_time)
VALUES ('Majestic Jewellers', 'Asia/Kolkata', '{1,2,3,4,5,6}', '09:00', '21:00', '21:00')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- DEPARTMENTS
-- ═══════════════════════════════════════════════
INSERT INTO departments (id, name, name_ml, color, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'Management',              'മാനേജ്‌മെന്റ്',                  '#795548', 1),
  ('d0000001-0000-0000-0000-000000000002', 'Accounts',                'അക്കൗണ്ട്‌സ്',                    '#4CAF50', 2),
  ('d0000001-0000-0000-0000-000000000003', 'Social Media & Creative', 'സോഷ്യൽ മീഡിയ & ക്രിയേറ്റീവ്',    '#FF9800', 3),
  ('d0000001-0000-0000-0000-000000000004', 'HR & Administration',     'HR & അഡ്‌മിനിസ്‌ട്രേഷൻ',          '#9C27B0', 4),
  ('d0000001-0000-0000-0000-000000000005', 'Sales Floor',             'സെയിൽസ് ഫ്ലോർ',                  '#2196F3', 5),
  ('d0000001-0000-0000-0000-000000000006', 'Billing',                 'ബില്ലിംഗ്',                       '#00BCD4', 6),
  ('d0000001-0000-0000-0000-000000000007', 'Stock & Old Gold',        'സ്‌റ്റോക്ക് & പഴയ സ്വർണം',        '#F44336', 7),
  ('d0000001-0000-0000-0000-000000000008', 'Security & Maintenance',  'സെക്യൂരിറ്റി & മെയിന്റനൻസ്',     '#607D8B', 8)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════
-- HOLIDAYS (Kerala 2026-2027)
-- ═══════════════════════════════════════════════
INSERT INTO holidays (date, name) VALUES
  ('2026-11-01', 'Diwali'),
  ('2026-12-25', 'Christmas'),
  ('2027-01-01', 'New Year'),
  ('2027-01-26', 'Republic Day'),
  ('2027-03-14', 'Holi'),
  ('2027-04-14', 'Vishu'),
  ('2027-08-15', 'Independence Day'),
  ('2027-10-02', 'Gandhi Jayanti')
ON CONFLICT (date) DO NOTHING;

-- ═══════════════════════════════════════════════
-- DEMO PROFILES
-- UUIDs match auth.users created via Supabase Auth API
-- ═══════════════════════════════════════════════
-- NOTE: The corresponding auth.users rows MUST be created via
-- Supabase Auth signup/admin API before these inserts will succeed
-- (profiles.id references auth.users.id).
--
-- Demo credentials (for development):
--   owner@majestic.com   / password123 — Hadi Muhammad (Owner)
--   latif@majestic.com   / password123 — Abdul Latif (Director)
--   ahmed@majestic.com   / password123 — Ahmed (Director, senior_mode)
--   james@majestic.com   / password123 — James Sheary (Accounts Head)
--   jelisha@majestic.com / password123 — Jelisha (Creative Staff)
--   adil@majestic.com    / password123 — Adil (Creative Staff)
--   rashid@majestic.com  / password123 — Rashid (Sales Staff)
--   priya@majestic.com   / password123 — Priya (Security Staff)

INSERT INTO profiles (id, full_name, full_name_ml, phone, role, department_id, job_title, points, availability, language, senior_mode) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Hadi Muhammad',  'ഹാദി മുഹമ്മദ്',    '+919876543210', 'owner',     'd0000001-0000-0000-0000-000000000001', 'Owner & Managing Director', 500,  'on_duty', 'en', false),
  ('a0000001-0000-0000-0000-000000000002', 'Abdul Latif',    'അബ്ദുൽ ലത്തീഫ്',    '+919876543211', 'director',  'd0000001-0000-0000-0000-000000000001', 'Director',                  320,  'on_duty', 'ml', false),
  ('a0000001-0000-0000-0000-000000000003', 'Ahmed',          'അഹ്‌മദ്',            '+919876543212', 'director',  'd0000001-0000-0000-0000-000000000001', 'Director',                  280,  'on_duty', 'ml', true),
  ('a0000001-0000-0000-0000-000000000004', 'James Sheary',   'ജെയിംസ് ഷിയറി',     '+919876543213', 'dept_head', 'd0000001-0000-0000-0000-000000000002', 'Accounts Head',             210,  'on_duty', 'en', false),
  ('a0000001-0000-0000-0000-000000000005', 'Jelisha',        'ജെലിഷ',              '+919876543214', 'staff',     'd0000001-0000-0000-0000-000000000003', 'Creative Designer',         145,  'on_duty', 'en', false),
  ('a0000001-0000-0000-0000-000000000006', 'Adil',           'ആദിൽ',               '+919876543215', 'staff',     'd0000001-0000-0000-0000-000000000003', 'Social Media Manager',      160,  'on_duty', 'en', false),
  ('a0000001-0000-0000-0000-000000000007', 'Rashid',         'റഷീദ്',              '+919876543216', 'staff',     'd0000001-0000-0000-0000-000000000005', 'Sales Executive',           95,   'on_duty', 'ml', false),
  ('a0000001-0000-0000-0000-000000000008', 'Priya',          'പ്രിയ',              '+919876543217', 'staff',     'd0000001-0000-0000-0000-000000000008', 'Security Supervisor',       70,   'on_duty', 'ml', false)
ON CONFLICT (id) DO NOTHING;

-- Set department heads
UPDATE departments SET head_id = 'a0000001-0000-0000-0000-000000000004' WHERE id = 'd0000001-0000-0000-0000-000000000002';
UPDATE departments SET head_id = 'a0000001-0000-0000-0000-000000000005' WHERE id = 'd0000001-0000-0000-0000-000000000003';

-- ═══════════════════════════════════════════════
-- SAMPLE TASKS (18 tasks across all types/statuses)
-- ═══════════════════════════════════════════════

INSERT INTO tasks (id, title, title_ml, description, department_id, created_by, owner_id, timing_type, importance, status, due_at, proof_type, requires_approval, approver_id, source, started_at, submitted_at, completed_at, review_on, is_draft) VALUES

-- URGENT tasks
('t0000001-0000-0000-0000-000000000001',
 'Verify gold rate with supplier — URGENT',
 'സപ്ലയറുമായി സ്വർണ വില പരിശോധിക്കുക — അടിയന്തരം',
 'Call Malabar Bullion and confirm today''s gold rate before 10 AM. Update the display board.',
 'd0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000007',
 'urgent', 'important', 'new',
 (now() - interval '2 hours')::timestamptz, 'number', true, 'a0000001-0000-0000-0000-000000000001', 'owner',
 NULL, NULL, NULL, NULL, false),

('t0000001-0000-0000-0000-000000000002',
 'Fix broken showcase light — Urgent',
 'പൊട്ടിയ ഷോകേസ് ലൈറ്റ് ശരിയാക്കുക — അടിയന്തരം',
 'Showcase #3 front LED strip not working. Call electrician if needed.',
 'd0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000008',
 'urgent', 'important', 'in_progress',
 (now() + interval '3 hours')::timestamptz, 'photo', true, 'a0000001-0000-0000-0000-000000000002', 'manager',
 (now() - interval '1 hour')::timestamptz, NULL, NULL, NULL, false),

-- DATED tasks
('t0000001-0000-0000-0000-000000000003',
 'Prepare monthly GST filing',
 'പ്രതിമാസ GST ഫയലിംഗ് തയ്യാറാക്കുക',
 'Compile all sales invoices and prepare GSTR-3B for November 2026.',
 'd0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000004',
 'dated', 'important', 'in_progress',
 '2026-11-20 18:00:00+05:30', 'file', true, 'a0000001-0000-0000-0000-000000000001', 'owner',
 '2026-11-10 10:00:00+05:30', NULL, NULL, NULL, false),

('t0000001-0000-0000-0000-000000000004',
 'Design Diwali campaign social posts',
 'ദീപാവലി ക്യാമ്പെയ്ൻ സോഷ്യൽ പോസ്റ്റുകൾ ഡിസൈൻ ചെയ്യുക',
 'Create 5 Instagram posts + 3 stories for Diwali sale. Use brand colors.',
 'd0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000005',
 'dated', 'important', 'submitted',
 '2026-11-14 18:00:00+05:30', 'file', true, 'a0000001-0000-0000-0000-000000000001', 'owner',
 '2026-11-08 09:00:00+05:30', '2026-11-11 16:00:00+05:30', NULL, NULL, false),

('t0000001-0000-0000-0000-000000000005',
 'Update employee attendance sheet',
 'ജീവനക്കാരുടെ ഹാജർ ഷീറ്റ് അപ്‌ഡേറ്റ് ചെയ്യുക',
 'Reconcile biometric data with manual register for October.',
 'd0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000004',
 'dated', 'normal', 'done',
 '2026-11-05 18:00:00+05:30', 'file', true, 'a0000001-0000-0000-0000-000000000002', 'manager',
 '2026-11-02 09:00:00+05:30', '2026-11-04 17:00:00+05:30', '2026-11-05 10:00:00+05:30', NULL, false),

('t0000001-0000-0000-0000-000000000006',
 'Order Diwali gift boxes',
 'ദീപാവലി സമ്മാന ബോക്സുകൾ ഓർഡർ ചെയ്യുക',
 'Order 500 premium gift boxes from Vijay Packaging. Confirm delivery by Oct 28.',
 'd0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000007',
 'dated', 'important', 'done',
 '2026-10-28 18:00:00+05:30', 'photo', true, 'a0000001-0000-0000-0000-000000000001', 'owner',
 '2026-10-22 09:00:00+05:30', '2026-10-27 15:00:00+05:30', '2026-10-28 11:00:00+05:30', NULL, false),

('t0000001-0000-0000-0000-000000000007',
 'Submit vendor payment list — November',
 'വെണ്ടർ പേയ്‌മെന്റ് ലിസ്റ്റ് സമർപ്പിക്കുക — നവംബർ',
 'Compile list of pending vendor payments for director approval.',
 'd0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000004',
 'dated', 'important', 'seen',
 '2026-11-15 18:00:00+05:30', 'payment_list', true, 'a0000001-0000-0000-0000-000000000001', 'owner',
 NULL, NULL, NULL, NULL, false),

('t0000001-0000-0000-0000-000000000008',
 'Clean & polish all display showcases',
 'എല്ലാ ഡിസ്‌പ്ലേ ഷോകേസുകളും വൃത്തിയാക്കുക',
 'Deep clean all 12 showcases before Diwali sale starts.',
 'd0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000008',
 'dated', 'normal', 'sent_back',
 '2026-11-13 18:00:00+05:30', 'photo', true, 'a0000001-0000-0000-0000-000000000002', 'manager',
 '2026-11-10 09:00:00+05:30', '2026-11-11 17:00:00+05:30', NULL, NULL, false),

-- LONG tasks (with milestones inserted separately below)
('t0000001-0000-0000-0000-000000000009',
 'Website redesign for Majestic Jewellers',
 'മജസ്റ്റിക് ജ്വല്ലേഴ്സിന്റെ വെബ്‌സൈറ്റ് പുനഃരൂപകൽപ്പന',
 'Complete redesign of majesticjewellers.com including product catalog, booking, and gold rate display.',
 'd0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000006',
 'long', 'important', 'in_progress',
 '2027-01-15 18:00:00+05:30', 'link', true, 'a0000001-0000-0000-0000-000000000001', 'owner',
 '2026-10-15 09:00:00+05:30', NULL, NULL, NULL, false),

('t0000001-0000-0000-0000-000000000010',
 'Staff training program — Q4 2026',
 'സ്റ്റാഫ് ട്രെയിനിംഗ് പ്രോഗ്രാം — Q4 2026',
 'Organize customer service and product knowledge training for all sales floor staff.',
 'd0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000004',
 'long', 'normal', 'in_progress',
 '2026-12-31 18:00:00+05:30', 'file', true, 'a0000001-0000-0000-0000-000000000002', 'manager',
 '2026-10-01 09:00:00+05:30', NULL, NULL, NULL, false),

-- FLEXIBLE tasks
('t0000001-0000-0000-0000-000000000011',
 'Research competitors'' Instagram strategies',
 'മത്സരാർഥികളുടെ ഇൻസ്റ്റാഗ്രാം തന്ത്രങ്ങൾ ഗവേഷണം ചെയ്യുക',
 'Analyze top 5 jewelry brands on Instagram. Report engagement rates and content types.',
 'd0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000006',
 'flexible', 'normal', 'new',
 NULL, 'text_note', true, 'a0000001-0000-0000-0000-000000000001', 'owner',
 NULL, NULL, NULL, '2026-11-30', false),

('t0000001-0000-0000-0000-000000000012',
 'Organize old gold documentation',
 'പഴയ സ്വർണ ഡോക്യുമെന്റേഷൻ ക്രമീകരിക്കുക',
 'Sort and file all old gold purchase receipts for the year. Update tracking spreadsheet.',
 'd0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000007',
 'flexible', 'normal', 'in_progress',
 NULL, 'file', false, NULL, 'manager',
 '2026-11-05 09:00:00+05:30', NULL, NULL, '2026-12-15', false),

-- REPEATING tasks (generated by routines, linked below)
('t0000001-0000-0000-0000-000000000013',
 'Daily cash count — end of day',
 'ദൈനംദിന ക്യാഷ് കൗണ്ട് — ദിവസാവസാനം',
 'Count all cash in billing counters and safe. Record in ledger.',
 'd0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000004',
 'repeating', 'important', 'new',
 (now() + interval '6 hours')::timestamptz, 'number', true, 'a0000001-0000-0000-0000-000000000001', 'routine',
 NULL, NULL, NULL, NULL, false),

('t0000001-0000-0000-0000-000000000014',
 'Enter vendor invoices in Tally',
 'ടാലിയിൽ വെണ്ടർ ഇൻവോയ്‌സുകൾ എന്റർ ചെയ്യുക',
 'Enter all received vendor invoices into Tally. Match with PO numbers.',
 'd0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000004',
 'repeating', 'normal', 'done',
 '2026-11-11 18:00:00+05:30', 'checklist', true, 'a0000001-0000-0000-0000-000000000001', 'routine',
 '2026-11-11 09:30:00+05:30', '2026-11-11 16:00:00+05:30', '2026-11-11 17:00:00+05:30', NULL, false),

-- BLOCKED task
('t0000001-0000-0000-0000-000000000015',
 'Print new price tags for Diamond collection',
 'ഡയമണ്ട് കളക്ഷന് പുതിയ വില ടാഗ് അച്ചടിക്കുക',
 'Update and print price tags for all diamond items after rate revision.',
 'd0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000007',
 'dated', 'important', 'blocked',
 '2026-11-18 18:00:00+05:30', 'photo', true, 'a0000001-0000-0000-0000-000000000001', 'owner',
 '2026-11-10 09:00:00+05:30', NULL, NULL, NULL, false),

-- CANCELLED task
('t0000001-0000-0000-0000-000000000016',
 'Setup outdoor banner for Navratri',
 'നവരാത്രിക്ക് ഔട്ട്ഡോർ ബാനർ സെറ്റ് ചെയ്യുക',
 'Install large outdoor banner at main entrance for Navratri promotion.',
 'd0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000008',
 'dated', 'normal', 'cancelled',
 '2026-10-12 18:00:00+05:30', 'photo', false, NULL, 'manager',
 NULL, NULL, NULL, NULL, false),

-- DRAFT task
('t0000001-0000-0000-0000-000000000017',
 'Plan Christmas promotion strategy',
 'ക്രിസ്മസ് പ്രൊമോഷൻ തന്ത്രം ആസൂത്രണം ചെയ്യുക',
 'Draft plan for Christmas/New Year sale including discounts, ads, and events.',
 'd0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', NULL,
 'dated', 'important', 'draft',
 '2026-12-15 18:00:00+05:30', 'none', true, NULL, 'owner',
 NULL, NULL, NULL, NULL, true),

-- Gold rate social media post (repeating)
('t0000001-0000-0000-0000-000000000018',
 'Post today''s gold rate on social media',
 'ഇന്നത്തെ സ്വർണ വില സോഷ്യൽ മീഡിയയിൽ പോസ്റ്റ് ചെയ്യുക',
 'Create and post gold rate graphic for Instagram, Facebook, and WhatsApp status.',
 'd0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000006',
 'repeating', 'normal', 'in_progress',
 (now() + interval '4 hours')::timestamptz, 'link', true, 'a0000001-0000-0000-0000-000000000001', 'routine',
 (now() - interval '1 hour')::timestamptz, NULL, NULL, NULL, false)

ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════
-- MILESTONES (for long tasks)
-- ═══════════════════════════════════════════════
INSERT INTO milestones (id, task_id, title, due_at, owner_id, done, done_at, position) VALUES
  -- Website redesign milestones
  ('m0000001-0000-0000-0000-000000000001', 't0000001-0000-0000-0000-000000000009', 'Wireframes & mockups',        '2026-11-01 18:00:00+05:30', 'a0000001-0000-0000-0000-000000000006', true,  '2026-10-30 17:00:00+05:30', 0),
  ('m0000001-0000-0000-0000-000000000002', 't0000001-0000-0000-0000-000000000009', 'Homepage & catalog pages',    '2026-11-30 18:00:00+05:30', 'a0000001-0000-0000-0000-000000000006', false, NULL, 1),
  ('m0000001-0000-0000-0000-000000000003', 't0000001-0000-0000-0000-000000000009', 'Booking & gold rate widget',  '2026-12-20 18:00:00+05:30', 'a0000001-0000-0000-0000-000000000006', false, NULL, 2),
  ('m0000001-0000-0000-0000-000000000004', 't0000001-0000-0000-0000-000000000009', 'Testing & launch',            '2027-01-15 18:00:00+05:30', 'a0000001-0000-0000-0000-000000000006', false, NULL, 3),
  -- Staff training milestones
  ('m0000001-0000-0000-0000-000000000005', 't0000001-0000-0000-0000-000000000010', 'Module 1: Product Knowledge', '2026-10-31 18:00:00+05:30', 'a0000001-0000-0000-0000-000000000004', true,  '2026-10-30 17:00:00+05:30', 0),
  ('m0000001-0000-0000-0000-000000000006', 't0000001-0000-0000-0000-000000000010', 'Module 2: Customer Service',  '2026-11-30 18:00:00+05:30', 'a0000001-0000-0000-0000-000000000004', false, NULL, 1),
  ('m0000001-0000-0000-0000-000000000007', 't0000001-0000-0000-0000-000000000010', 'Module 3: Upselling',         '2026-12-31 18:00:00+05:30', 'a0000001-0000-0000-0000-000000000004', false, NULL, 2)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════
-- TASK EVENTS (sample history)
-- ═══════════════════════════════════════════════
INSERT INTO task_events (id, task_id, actor_id, type, from_status, to_status, note, at) VALUES
  ('e0000001-0000-0000-0000-000000000001', 't0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000008', 'started', 'seen', 'in_progress', 'On it, checking the LED strip', now() - interval '1 hour'),
  ('e0000001-0000-0000-0000-000000000002', 't0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000005', 'submitted', 'in_progress', 'submitted', 'All 5 posts + 3 stories ready in Canva', '2026-11-11 16:00:00+05:30'),
  ('e0000001-0000-0000-0000-000000000003', 't0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000002', 'approved', 'submitted', 'done', 'Looks good', '2026-11-05 10:00:00+05:30'),
  ('e0000001-0000-0000-0000-000000000004', 't0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000002', 'rejected', 'submitted', 'sent_back', 'Showcase #7 and #9 still have smudges. Please redo.', '2026-11-12 09:00:00+05:30'),
  ('e0000001-0000-0000-0000-000000000005', 't0000001-0000-0000-0000-000000000015', 'a0000001-0000-0000-0000-000000000007', 'blocked', 'in_progress', 'blocked', 'Waiting for new diamond rate list from head office', '2026-11-11 14:00:00+05:30')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════
-- TEMPLATES
-- ═══════════════════════════════════════════════
INSERT INTO task_templates (id, title, title_ml, description, department_id, timing_type, proof_type, importance, requires_approval, checklist_items, created_by, is_global) VALUES
  ('tp000001-0000-0000-0000-000000000001',
   'Daily Cash Count',
   'ദൈനംദിന ക്യാഷ് കൗണ്ട്',
   'End-of-day cash counting for all billing counters and safe.',
   'd0000001-0000-0000-0000-000000000006',
   'repeating', 'number', 'important', true,
   '[{"text": "Count Counter 1", "requires_photo": false}, {"text": "Count Counter 2", "requires_photo": false}, {"text": "Count Safe", "requires_photo": false}, {"text": "Reconcile with POS total", "requires_photo": false}]',
   'a0000001-0000-0000-0000-000000000001', true),

  ('tp000001-0000-0000-0000-000000000002',
   'Social Media Post — Gold Rate',
   'സോഷ്യൽ മീഡിയ പോസ്റ്റ് — സ്വർണ വില',
   'Daily gold rate graphic for Instagram, Facebook, and WhatsApp.',
   'd0000001-0000-0000-0000-000000000003',
   'repeating', 'link', 'normal', true,
   '[{"text": "Get today''s rate from supplier", "requires_photo": false}, {"text": "Create graphic in Canva", "requires_photo": false}, {"text": "Post on Instagram", "requires_photo": false}, {"text": "Post on Facebook", "requires_photo": false}, {"text": "Share on WhatsApp Status", "requires_photo": false}]',
   'a0000001-0000-0000-0000-000000000001', true)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════
-- ROUTINES
-- ═══════════════════════════════════════════════
INSERT INTO routines (id, title, title_ml, description, template_id, department_id, assignee_id, assignee_rule, timing_type, proof_type, importance, schedule_cron, schedule_description, due_offset_hours, skip_holidays, is_active, created_by) VALUES
  ('r0000001-0000-0000-0000-000000000001',
   'Daily Cash Count',
   'ദൈനംദിന ക്യാഷ് കൗണ്ട്',
   'End-of-day cash counting procedure. Must be done before shop closes.',
   'tp000001-0000-0000-0000-000000000001',
   'd0000001-0000-0000-0000-000000000006',
   'a0000001-0000-0000-0000-000000000004',
   'fixed', 'repeating', 'number', 'important',
   '0 20 * * 1-6', 'Every working day at 8 PM', 1, true, true,
   'a0000001-0000-0000-0000-000000000001'),

  ('r0000001-0000-0000-0000-000000000002',
   'Vendor Invoice Entry',
   'വെണ്ടർ ഇൻവോയ്‌സ് എൻട്രി',
   'Enter all received vendor invoices into Tally. Match with PO numbers.',
   NULL,
   'd0000001-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000004',
   'fixed', 'repeating', 'checklist', 'normal',
   '0 9 * * 1-6', 'Every working day at 9 AM', 8, true, true,
   'a0000001-0000-0000-0000-000000000001'),

  ('r0000001-0000-0000-0000-000000000003',
   'Gold Rate Social Media Post',
   'സ്വർണ വില സോഷ്യൽ മീഡിയ പോസ്റ്റ്',
   'Post today''s gold rate graphic on Instagram, Facebook, and WhatsApp.',
   'tp000001-0000-0000-0000-000000000002',
   'd0000001-0000-0000-0000-000000000003',
   'a0000001-0000-0000-0000-000000000006',
   'fixed', 'repeating', 'link', 'normal',
   '0 10 * * 1-6', 'Every working day at 10 AM', 4, true, true,
   'a0000001-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════
-- CHAIN (Reel pipeline: Shoot → Edit → Caption → Post)
-- ═══════════════════════════════════════════════
INSERT INTO chains (id, title, title_ml, description, steps, created_by) VALUES
  ('c0000001-0000-0000-0000-000000000001',
   'Instagram Reel Pipeline',
   'ഇൻസ്റ്റാഗ്രാം റീൽ പൈപ്പ്‌ലൈൻ',
   'Full pipeline for creating and publishing an Instagram Reel: Shoot → Edit → Caption → Post.',
   '[
     {"title": "Shoot reel footage", "assignee_id": "a0000001-0000-0000-0000-000000000005", "department_id": "d0000001-0000-0000-0000-000000000003", "timing_type": "dated", "proof_type": "video", "importance": "normal"},
     {"title": "Edit reel video", "assignee_id": "a0000001-0000-0000-0000-000000000005", "department_id": "d0000001-0000-0000-0000-000000000003", "timing_type": "dated", "proof_type": "file", "importance": "normal"},
     {"title": "Write caption & hashtags", "assignee_id": "a0000001-0000-0000-0000-000000000006", "department_id": "d0000001-0000-0000-0000-000000000003", "timing_type": "dated", "proof_type": "text_note", "importance": "normal"},
     {"title": "Post reel to Instagram", "assignee_id": "a0000001-0000-0000-0000-000000000006", "department_id": "d0000001-0000-0000-0000-000000000003", "timing_type": "urgent", "proof_type": "link", "importance": "normal"}
   ]',
   'a0000001-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════
-- AI ALERTS (sample)
-- ═══════════════════════════════════════════════
INSERT INTO ai_alerts (id, level, title, explanation, evidence, suggested_action, suggested_assignee_id, department_id, status, source, rule_key, dedupe_key) VALUES
  ('al000001-0000-0000-0000-000000000001',
   'critical',
   'Urgent task overdue: Verify gold rate with supplier',
   'Task "Verify gold rate with supplier" was due 2 hours ago and is still in "new" status. No one has started it.',
   '{"task_id": "t0000001-0000-0000-0000-000000000001", "due_at": "2 hours ago", "current_status": "new"}',
   'Immediately contact Rashid or reassign to someone available',
   'a0000001-0000-0000-0000-000000000007',
   'd0000001-0000-0000-0000-000000000007',
   'open', 'rule', 'overdue_urgent',
   'overdue_urgent_t0000001-0000-0000-0000-000000000001'),

  ('al000001-0000-0000-0000-000000000002',
   'important',
   'Submitted task awaiting review: Diwali campaign posts',
   'Jelisha submitted "Design Diwali campaign social posts" yesterday but it has not been reviewed.',
   '{"task_id": "t0000001-0000-0000-0000-000000000004", "submitted_at": "2026-11-11T16:00:00+05:30"}',
   'Review and approve/reject the submitted designs',
   'a0000001-0000-0000-0000-000000000001',
   'd0000001-0000-0000-0000-000000000003',
   'open', 'rule', 'submitted_no_review',
   'submitted_no_review_t0000001-0000-0000-0000-000000000004'),

  ('al000001-0000-0000-0000-000000000003',
   'insight',
   'Rashid has high workload with active tasks',
   'Rashid currently has 5 active tasks across departments. Consider redistributing some work.',
   '{"user_id": "a0000001-0000-0000-0000-000000000007", "active_task_count": 5}',
   'Review Rashid''s task list and reassign lower-priority items if possible',
   'a0000001-0000-0000-0000-000000000001',
   'd0000001-0000-0000-0000-000000000005',
   'open', 'ai', NULL,
   'workload_a0000001-0000-0000-0000-000000000007')
ON CONFLICT (dedupe_key) DO NOTHING;

-- ═══════════════════════════════════════════════
-- ANNOUNCEMENT
-- ═══════════════════════════════════════════════
INSERT INTO announcements (id, title, body, body_ml, audience, requires_ack, created_by) VALUES
  ('an000001-0000-0000-0000-000000000001',
   'Diwali Sale — Extended Working Hours',
   'Dear team, from Nov 10 to Nov 15 the shop will operate with extended hours: 9 AM to 10:30 PM. All staff must be available during their assigned extended shifts. Overtime will be compensated as per policy. Thank you for your cooperation!',
   'പ്രിയ ടീം, നവംബർ 10 മുതൽ 15 വരെ കട വിപുലീകരിച്ച സമയത്ത് പ്രവർത്തിക്കും: രാവിലെ 9 മുതൽ രാത്രി 10:30 വരെ. എല്ലാ സ്റ്റാഫും അവരുടെ നിയുക്ത വിപുലീകരിച്ച ഷിഫ്റ്റുകളിൽ ലഭ്യമായിരിക്കണം. ഓവർടൈം നയപ്രകാരം നൽകും. നന്ദി!',
   '{"type": "all"}',
   true,
   'a0000001-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;
