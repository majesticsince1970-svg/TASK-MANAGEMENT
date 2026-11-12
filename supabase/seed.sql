-- Seed Data for Majestic Ops
-- Run after migrations

-- App Settings (single row)
INSERT INTO app_settings (shop_name, timezone, working_days, default_shift_start, default_shift_end, digest_time) 
VALUES ('Majestic Jewellers', 'Asia/Kolkata', '{1,2,3,4,5,6}', '09:00', '21:00', '21:00');

-- Departments
INSERT INTO departments (name, name_ml, color, sort_order) VALUES
  ('Management', 'മാനേജ്‌മെന്റ്', '#795548', 1),
  ('Accounts', 'അക്കൗണ്ട്‌സ്', '#4CAF50', 2),
  ('Social Media & Creative', 'സോഷ്യൽ മീഡിയ & ക്രിയേറ്റീവ്', '#FF9800', 3),
  ('HR & Administration', 'HR & അഡ്‌മിനിസ്‌ട്രേഷൻ', '#9C27B0', 4),
  ('Sales Floor', 'സെയിൽസ് ഫ്ലോർ', '#2196F3', 5),
  ('Billing', 'ബില്ലിംഗ്', '#00BCD4', 6),
  ('Stock & Old Gold', 'സ്‌റ്റോക്ക് & പഴയ സ്വർണം', '#F44336', 7),
  ('Security & Maintenance', 'സെക്യൂരിറ്റി & മെയിന്റനൻസ്', '#607D8B', 8);

-- Holidays (Kerala 2026-2027)
INSERT INTO holidays (date, name) VALUES
  ('2026-11-01', 'Diwali'),
  ('2026-12-25', 'Christmas'),
  ('2027-01-01', 'New Year'),
  ('2027-01-26', 'Republic Day'),
  ('2027-03-14', 'Holi'),
  ('2027-04-14', 'Vishu'),
  ('2027-08-15', 'Independence Day'),
  ('2027-10-02', 'Gandhi Jayanti');

-- NOTE: Users are created via Supabase Auth signup.
-- Demo user credentials (for development):
-- owner@majestic.com / password123 — Hadi Muhammad (Owner)
-- latif@majestic.com / password123 — Abdul Latif (Director)
-- ahmed@majestic.com / password123 — Ahmed (Director, senior mode)
-- james@majestic.com / password123 — James Sheary (Accounts Head)
-- jelisha@majestic.com / password123 — Jelisha (Creative Staff)
-- adil@majestic.com / password123 — Adil (Creative Staff)

