# 🇮🇩 Portal Karang Taruna Iremda RT 02/03

Portal digital resmi Karang Taruna Iremda RT 02/03 sebagai wadah kolaborasi, komunikasi, publikasi kegiatan, dan pengelolaan perlombaan memperingati Hari Kemerdekaan Republik Indonesia secara real-time dan transparan.

---

## ✨ Fitur Utama

### 📱 Antarmuka Publik (User-Facing)
*   **Hero Banner & Parallax Reveal**: Tampilan hero GIF interaktif dengan animasi masuk Anime.js dan efek gulir parallax lembar putih yang modern.
*   **Infinite Announcements Ticker**: Baris pengumuman meluncur (infinite scroll) yang secara real-time tersinkronisasi dengan Supabase dan otomatis jeda saat di-hover (`pause-on-hover`).
*   **Galeri Kegiatan Berita & Foto**: 
    *   Berita terbaru yang terintegrasi dengan penampil detail artikel dan sub-galeri foto.
    *   Galeri kenangan dengan konsep *zero-gap photo grid* dan *lightbox slideshow* interaktif untuk menelusuri memori per tahun.
*   **Agenda & Pendaftaran Lomba**:
    *   Rundown jadwal perlombaan lengkap dengan status, lokasi, penanggung jawab (PJ), dan badge kategori usia berwarna.
    *   Formulir pendaftaran digital interaktif (`RegistrationModal`) bertenaga animasi Anime.js dengan pembatasan kunci registrasi otomatis sebelum bulan Agustus.
*   **Klasemen Perolehan Medali**: Tabel medali interaktif yang memfilter perolehan medali emas, perak, dan perunggu berdasarkan tipe lomba (Individu vs Grup) atau kategori usia secara presisi.
*   **Bagan Pengurus & Anggota**: Diagram visual kepengurusan pengurus harian lengkap dengan foto profil mereka, serta grid daftar seluruh 19 anggota karang taruna secara seimbang.
*   **Tombol Back-to-Top**: Tombol melayang dinamis dengan ring indikator kemajuan scroll halaman bertipe SVG circular progress.

### 🔐 Panel Dasbor Admin (CRUD & Control)
*   **Overview Ringkasan**: Statistik aktif (jumlah peserta aktif, lomba berjalan, berita, media) dan daftar pintasan aksi cepat admin.
*   **Kelola Lomba**: Form pembuatan lomba, ubah detail lomba (CRUD), serta form penguncian pemenang lomba (Juara 1, 2, 3) untuk memperbarui klasemen secara otomatis.
*   **Input & Kelola Peserta**: Pendaftaran manual peserta oleh admin yang otomatis terkelompokkan ke dalam 6 divisi utama (Anak-Anak, Remaja, Bapak-Bapak, Ibu-Ibu, Individu Segala Umur, Grup Segala Umur).
*   **Pendaftaran Warga**: Peninjau registrasi mandiri dari warga dengan fitur pencarian cepat, filter kategori, ekspor data lembar kerja Excel (CSV), serta tombol konfirmasi (centang hijau) untuk menyalin pendaftar langsung menjadi peserta aktif.
*   **Berita & Media**: Sistem pengelolaan artikel berita dan foto galeri lengkap dengan uploader banyak berkas gambar (*multi-image upload*) dan galeri preview sebelum disimpan.
*   **Ticker Pengumuman**: Kelola teks baris pengumuman berjalan serta sakelar aktif/nonaktif status pengumuman secara instan.
*   **Kelola Organisasi**: Pengaturan pengurus harian (RT, Ketua, Sekretaris, Bendahara) lengkap dengan uploader foto profil, serta tambah/hapus anggota katar secara dinamis.

---

## 🛠️ Tech Stack

| Lapisan | Teknologi | Deskripsi |
|---|---|---|
| **Frontend** | React 19 + Vite 8 | Single Page Application (SPA) berkecepatan tinggi |
| **Styling** | Tailwind CSS v4 | CSS framework dengan konfigurasi tema warna Merah-Emas-Abu |
| **Animasi** | Anime.js v4 | Manajemen animasi micro-interactions & elastic spring |
| **Ikon** | `@iconify/react` | Library SVG ikon on-demand terpadu |
| **Backend** | Supabase | PostgreSQL, Realtime Subscription, dan Storage bucket |
| **Routing** | React Router v7 | Peta navigasi halaman web SPA |
| **Fonts** | Google Fonts | Barlow Condensed (Headings) & Barlow (Body Text) |

---

## 🚀 Memulai Instalasi Lokal

### Prerequisites
Pastikan Anda sudah menginstal Node.js (v18+) dan npm di sistem Anda.

### 1. Kloning Repositori
```bash
git clone https://github.com/KIRRUU0/katar.git
cd katar
```

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Buat berkas `.env` di direktori utama proyek Anda dan isi dengan kredensial Supabase Anda:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```
*(Lihat `.env.example` sebagai referensi)*

### 4. Jalankan Server Pengembangan (Dev Mode)
```bash
npm run dev
```
Buka [http://localhost:5173](http://localhost:5173) di browser Anda untuk melihat aplikasi berjalan.

### 5. Bangun untuk Produksi (Production Build)
```bash
npm run build
```

---

## 🗄️ Struktur Database (Supabase)

Proyek ini menggunakan beberapa tabel utama di PostgreSQL Supabase. Skema SQL lengkap dapat Anda temukan pada berkas [`supabase_schema.sql`](file:///c:/Project/Katar/supabase_schema.sql).

### Tabel-Tabel Utama:
1.  `tournaments`: Menyimpan informasi detail lomba, kategori usia, status berjalan, PJ, dan daftar pemenang (Juara 1, 2, 3).
2.  `participants`: Menyimpan daftar peserta aktif lomba yang terdaftar (individu atau grup).
3.  `registrations`: Menyimpan data pengajuan pendaftaran mandiri warga sebelum dikonfirmasi admin.
4.  `news`: Menyimpan artikel kabar berita kegiatan warga dengan array link gambar.
5.  `media`: Menyimpan data album kenangan galeri foto per tahun dengan array link gambar.
6.  `announcements`: Menyimpan teks pengumuman penting untuk Live Ticker berjalan.
7.  `organization`: Menyimpan pengurus harian katar (termasuk foto profil pengurus inti) dan daftar anggota.

---

## 📜 Hak Cipta & Lisensi

&copy; 2026 Karang Taruna Iremda RT 02/03. Hak Cipta Dilindungi.
Aplikasi ini dikembangkan secara kolaboratif oleh Pemuda RT 02/03 untuk mendukung kelancaran kegiatan warga.
