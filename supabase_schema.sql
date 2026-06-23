-- ============================================================
-- KATAR RT 03 - League 17-an Database Schema
-- Supabase (PostgreSQL) Migration Script
-- ============================================================

-- 1. YEARS TABLE
CREATE TABLE IF NOT EXISTS years (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year_number INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TOURNAMENTS TABLE
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year_id UUID REFERENCES years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('individu', 'grup')),
  category TEXT CHECK (category IN ('anak_4_6', 'anak_7_12', 'remaja_pria', 'remaja_putri', 'ibu_ibu', 'bapak_bapak', 'pasangan')),
  status TEXT NOT NULL DEFAULT 'belum' CHECK (status IN ('belum', 'jalan', 'selesai')),
  location TEXT,
  schedule TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  pj TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PARTICIPANTS TABLE (untuk tipe individu)
CREATE TABLE IF NOT EXISTS participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  origin_block TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TEAMS TABLE (untuk tipe grup)
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  origin_block TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TEAM_MEMBERS TABLE
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. WINNERS TABLE
CREATE TABLE IF NOT EXISTS winners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank IN (1, 2, 3)),
  winner_name_or_team TEXT NOT NULL,
  origin_block TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. ANNOUNCEMENTS TABLE (Live Ticker)
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. FINANCES TABLE (Transparansi Keuangan)
CREATE TABLE IF NOT EXISTS finances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('masuk', 'keluar')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. NEWS TABLE (Galeri Berita)
CREATE TABLE IF NOT EXISTS news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. MEDIA TABLE (Foto Kenangan)
CREATE TABLE IF NOT EXISTS media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. REGISTRATIONS TABLE (Pendaftaran Lomba)
CREATE TABLE IF NOT EXISTS registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  contact TEXT,
  members TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE years ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;


-- Public READ policies (semua orang bisa baca)
CREATE POLICY "Public read years" ON years FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read tournaments" ON tournaments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read participants" ON participants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read teams" ON teams FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read team_members" ON team_members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read winners" ON winners FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read announcements" ON announcements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read finances" ON finances FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read news" ON news FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read media" ON media FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read registrations" ON registrations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert registrations" ON registrations FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Admin WRITE policies (hanya authenticated user)
CREATE POLICY "Admin insert years" ON years FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update years" ON years FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete registrations" ON registrations FOR DELETE TO authenticated USING (true);
CREATE POLICY "Admin delete years" ON years FOR DELETE TO authenticated USING (true);

CREATE POLICY "Admin insert tournaments" ON tournaments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update tournaments" ON tournaments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete tournaments" ON tournaments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Admin insert participants" ON participants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update participants" ON participants FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete participants" ON participants FOR DELETE TO authenticated USING (true);

CREATE POLICY "Admin insert teams" ON teams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update teams" ON teams FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete teams" ON teams FOR DELETE TO authenticated USING (true);

CREATE POLICY "Admin insert team_members" ON team_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update team_members" ON team_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete team_members" ON team_members FOR DELETE TO authenticated USING (true);

CREATE POLICY "Admin insert winners" ON winners FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update winners" ON winners FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete winners" ON winners FOR DELETE TO authenticated USING (true);

CREATE POLICY "Admin insert announcements" ON announcements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update announcements" ON announcements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete announcements" ON announcements FOR DELETE TO authenticated USING (true);

CREATE POLICY "Admin insert finances" ON finances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update finances" ON finances FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete finances" ON finances FOR DELETE TO authenticated USING (true);

CREATE POLICY "Admin insert news" ON news FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update news" ON news FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete news" ON news FOR DELETE TO authenticated USING (true);

CREATE POLICY "Admin insert media" ON media FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update media" ON media FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete media" ON media FOR DELETE TO authenticated USING (true);

-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE winners;
ALTER PUBLICATION supabase_realtime ADD TABLE registrations;

-- ============================================================
-- SEED DATA (Demo)
-- ============================================================

-- Years
INSERT INTO years (year_number) VALUES (2024), (2025), (2026);

-- Tournaments 2025
INSERT INTO tournaments (year_id, name, type, category, status, location, schedule, pj) VALUES
  ((SELECT id FROM years WHERE year_number = 2025), 'Lomba Balap Karung', 'individu', 'bapak_bapak', 'selesai', 'Lapangan Gang 3', '2025-08-01 08:00:00+07', 'Hirzan Arziqi'),
  ((SELECT id FROM years WHERE year_number = 2025), 'Lomba Tarik Tambang', 'grup', 'pasangan', 'selesai', 'Pos Ronda RT 03', '2025-08-01 10:00:00+07', 'Ridho Ramadhani'),
  ((SELECT id FROM years WHERE year_number = 2025), 'Lomba Makan Kerupuk', 'individu', 'anak_7_12', 'selesai', 'Lapangan Gang 3', '2025-08-02 08:00:00+07', 'Tri Dewi Setyawati');

-- Tournaments 2026
INSERT INTO tournaments (year_id, name, type, category, status, location, schedule, pj) VALUES
  ((SELECT id FROM years WHERE year_number = 2026), 'Lomba Balap Karung', 'individu', 'bapak_bapak', 'belum', 'Lapangan Gang 3', '2026-08-01 08:00:00+07', 'Hirzan Arziqi'),
  ((SELECT id FROM years WHERE year_number = 2026), 'Lomba Tarik Tambang', 'grup', 'pasangan', 'belum', 'Pos Ronda RT 03', '2026-08-01 10:00:00+07', 'Ridho Ramadhani'),
  ((SELECT id FROM years WHERE year_number = 2026), 'Lomba Panjat Pinang', 'grup', 'remaja_pria', 'belum', 'Jalan Utama Depan Musholla', '2026-08-02 09:00:00+07', 'Muhammad Haekal Arrafi'),
  ((SELECT id FROM years WHERE year_number = 2026), 'Lomba Makan Kerupuk', 'individu', 'anak_7_12', 'belum', 'Lapangan Gang 3', '2026-08-02 14:00:00+07', 'Tri Dewi Setyawati'),
  ((SELECT id FROM years WHERE year_number = 2026), 'Lomba 17an Anak: Estafet Kelereng', 'individu', 'anak_4_6', 'belum', 'Gang 2', '2026-08-03 08:00:00+07', 'Nadia Istifana'),
  ((SELECT id FROM years WHERE year_number = 2026), 'Lomba Futsal Antar Gang', 'grup', 'remaja_pria', 'belum', 'Lapangan Gang 3', '2026-08-03 15:00:00+07', 'Bintang R Sinaga');

-- Winners 2025 (Historical data)
INSERT INTO winners (tournament_id, rank, winner_name_or_team, origin_block) VALUES
  ((SELECT id FROM tournaments WHERE name = 'Lomba Balap Karung' AND status = 'selesai'), 1, 'Pak Budi', 'Gang 1'),
  ((SELECT id FROM tournaments WHERE name = 'Lomba Balap Karung' AND status = 'selesai'), 2, 'Mas Andi', 'Gang 3'),
  ((SELECT id FROM tournaments WHERE name = 'Lomba Balap Karung' AND status = 'selesai'), 3, 'Kang Dedi', 'Gang 2'),
  ((SELECT id FROM tournaments WHERE name = 'Lomba Tarik Tambang' AND status = 'selesai'), 1, 'Tim Garuda', 'Gang 1'),
  ((SELECT id FROM tournaments WHERE name = 'Lomba Tarik Tambang' AND status = 'selesai'), 2, 'Tim Elang', 'Gang 2'),
  ((SELECT id FROM tournaments WHERE name = 'Lomba Tarik Tambang' AND status = 'selesai'), 3, 'Tim Rajawali', 'Gang 3'),
  ((SELECT id FROM tournaments WHERE name = 'Lomba Makan Kerupuk' AND status = 'selesai'), 1, 'Bu Siti', 'Gang 2'),
  ((SELECT id FROM tournaments WHERE name = 'Lomba Makan Kerupuk' AND status = 'selesai'), 2, 'Pak Joko', 'Gang 1'),
  ((SELECT id FROM tournaments WHERE name = 'Lomba Makan Kerupuk' AND status = 'selesai'), 3, 'Mbak Rina', 'Gang 3');

-- Announcements
INSERT INTO announcements (message, is_active) VALUES
  ('🏆 Pendaftaran Lomba 17 Agustus 2026 dibuka! Hubungi Ketua RT.', true),
  ('⚽ Lomba Futsal Antar Gang — kuota terbatas, segera daftar!', true),
  ('📢 Rapat koordinasi panitia 17-an hari Minggu jam 19:00 di Pos Ronda.', true),
  ('🎉 Selamat kepada Gang 1 sebagai Juara Umum tahun 2025!', true);

-- Finances
INSERT INTO finances (description, amount, type) VALUES
  ('Iuran Warga Bulan Juli', 2500000, 'masuk'),
  ('Donasi Pak RT', 1000000, 'masuk'),
  ('Sumbangan Toko Berkah', 500000, 'masuk'),
  ('Pembelian Hadiah Lomba', 1500000, 'keluar'),
  ('Sewa Sound System', 750000, 'keluar'),
  ('Cetak Spanduk & Banner', 350000, 'keluar'),
  ('Konsumsi Panitia', 400000, 'keluar');

-- News
INSERT INTO news (title, description, image_url) VALUES
  ('Rapat Perdana Panitia 17-an 2026', 'Rapat koordinasi panitia 17 Agustus 2026 telah diselenggarakan di Pos Ronda RT 03 dengan antusiasme tinggi.', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=640'),
  ('Gotong Royong Bersihkan Lapangan', 'Warga RT 03 bersama-sama membersihkan lapangan Gang 3 sebagai persiapan lomba 17 Agustus.', 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=640'),
  ('Latihan Futsal Tim Gang 1', 'Tim futsal Gang 1 berlatih keras menjelang turnamen antar-gang.', 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=640'),
  ('Dekorasi Merah Putih Dimulai', 'Pemasangan bendera dan umbul-umbul merah putih di sepanjang gang telah dimulai.', 'https://images.unsplash.com/photo-1577401132921-cb39bb12c7e0?w=640');

-- Media
INSERT INTO media (title, year, description, image_url) VALUES
  ('Gotong Royong Lapangan Gang 3', 2025, 'Warga bahu-membahu membersihkan dan menyiapkan area panggung kemerdekaan.', 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800'),
  ('Keseruan Balap Karung Anak-Anak', 2025, 'Tawa ceria anak-anak RT 03 beradu cepat di garis finish balap karung.', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800'),
  ('Latihan Futsal Bersama', 2025, 'Sesi latihan pemuda karang taruna mempererat keakraban antar gang.', 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800'),
  ('Pemasangan Bendera Lingkungan', 2024, 'Kerja sama memasang umbul-umbul merah putih di sepanjang gang jalan utama.', 'https://images.unsplash.com/photo-1577401132921-cb39bb12c7e0?w=800'),
  ('Malam Tirakatan & Doa Bersama', 2024, 'Malam penuh khidmat merenungkan jasa pahlawan diikuti seluruh warga RT 03.', 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800'),
  ('Pembagian Hadiah Juara Lomba', 2024, 'Momen penyerahan piala dan hadiah hiburan bagi para juara di panggung utama.', 'https://images.unsplash.com/photo-1531058020387-3be344559be6?w=800');


-- 12. ORGANIZATION TABLE (Pengelolaan Organisasi)
CREATE TABLE IF NOT EXISTS organization (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_key TEXT NOT NULL CHECK (role_key IN ('rt', 'katar', 'sekretaris', 'bendahara', 'member')),
  role_name TEXT NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  year INTEGER DEFAULT 2026,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Partial unique index to ensure at most one active record for each core executive role per year
CREATE UNIQUE INDEX IF NOT EXISTS organization_core_role_key_year_idx ON organization (role_key, year) WHERE role_key != 'member';

-- Enable RLS
ALTER TABLE organization ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read organization" ON organization FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insert organization" ON organization FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update organization" ON organization FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete organization" ON organization FOR DELETE TO authenticated USING (true);

-- Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE organization;

-- Seed Organization Data
INSERT INTO organization (role_key, role_name, name, image_url, display_order, year) VALUES
  ('rt', 'Pelindung / Ketua RT', 'Bapak Abdul Mukmin', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400', 0, 2026),
  ('katar', 'Ketua Karang Taruna', 'Ridho Ramadhani', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400', 0, 2026),
  ('sekretaris', 'Sekretaris', 'Tri Dewi Setyawati', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400', 0, 2026),
  ('bendahara', 'Bendahara', 'Bintang R Sinaga', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 0, 2026),
  ('member', 'Anggota', 'Muhammad Haekal Arrafi', null, 1, 2026),
  ('member', 'Anggota', 'Hirzan Arziqi', null, 2, 2026),
  ('member', 'Anggota', 'Rizq Ahmad Pratama', null, 3, 2026),
  ('member', 'Anggota', 'Muhamad Rifai', null, 4, 2026),
  ('member', 'Anggota', 'Syazkiya Alifah An Nur', null, 5, 2026),
  ('member', 'Anggota', 'Nadia Istifana', null, 6, 2026),
  ('member', 'Anggota', 'Mutiara Fatharani Nurdiana', null, 7, 2026),
  ('member', 'Anggota', 'Kenzi Alfaruq', null, 8, 2026),
  ('member', 'Anggota', 'Tri Dewi Setyawati', null, 9, 2026),
  ('member', 'Anggota', 'Cakra Aditia', null, 10, 2026),
  ('member', 'Anggota', 'Syakira Harisma Putri', null, 11, 2026),
  ('member', 'Anggota', 'Siti Aisyah', null, 12, 2026),
  ('member', 'Anggota', 'Hadiil Alwan', null, 13, 2026),
  ('member', 'Anggota', 'Fatia Isnaini Yulman', null, 14, 2026),
  ('member', 'Anggota', 'Muhammad Rizki Arifi', null, 15, 2026),
  ('member', 'Anggota', 'Syifa Auliya Ilmi', null, 16, 2026),
  ('member', 'Anggota', 'Muhamad Iqbal', null, 17, 2026),
  ('member', 'Anggota', 'Ning Fauziah Pratiwi', null, 18, 2026),
  ('member', 'Anggota', 'Bunga Reyfan Ramadhani', null, 19, 2026);


-- 13. PAGE VIEWS TABLE (Visitor Analytics)
CREATE TABLE IF NOT EXISTS page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public insert page_views" ON page_views FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin read page_views" ON page_views FOR SELECT TO authenticated USING (true);

-- 14. POPUP BANNERS TABLE (Announcement Banner Modal)
CREATE TABLE IF NOT EXISTS popup_banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  ratio TEXT NOT NULL DEFAULT 'horizontal' CHECK (ratio IN ('horizontal', 'vertical')),
  link_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE popup_banners ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read popup_banners" ON popup_banners FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insert popup_banners" ON popup_banners FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin update popup_banners" ON popup_banners FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete popup_banners" ON popup_banners FOR DELETE TO authenticated USING (true);

-- Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE popup_banners;

-- 15. CATEGORY SETTINGS TABLE (Custom Category Age Ranges)
CREATE TABLE IF NOT EXISTS category_settings (
  category_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE category_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read category_settings" ON category_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin write category_settings" ON category_settings FOR ALL TO authenticated USING (true);

-- Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE category_settings;


