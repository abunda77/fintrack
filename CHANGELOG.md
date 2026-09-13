# Changelog

Semua perubahan penting pada FinTrack dicatat di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/),
dan versioning mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Ditambahkan
- **Autentikasi username/password** untuk mengakses aplikasi. Kredensial dibaca dari `.env` (`AUTH_USERNAME`, `AUTH_PASSWORD`) dan dibandingkan secara konstan-waktu (`timingSafeEqual`).
- **Sesi cookie bertanda tangan** — `POST /api/auth/login` menerbitkan cookie `fintrack_session` (HttpOnly, SameSite=Lax, `Secure` saat produksi) berisi token bertanda tangan HMAC-SHA256; tidak ada penyimpanan sesi di server.
- **Endpoint autentikasi** — `POST /api/auth/login`, `POST /api/auth/logout`, dan `GET /api/auth/session`. Seluruh rute `/api/*` selain `/api/health` dan `/api/auth/*` kini dilindungi middleware `requireAuth` dan mengembalikan `401` tanpa sesi valid.
- **Rate limit login** — maksimal 10 percobaan per 15 menit per IP untuk mencegah brute force.
- **Halaman login** di frontend, `AuthProvider`, dan tombol keluar pada header; sesi yang berakhir otomatis mengembalikan pengguna ke halaman login.
- **Variabel environment baru** — `AUTH_USERNAME`, `AUTH_PASSWORD` (wajib), serta `AUTH_SECRET` dan `AUTH_SESSION_HOURS` (opsional).
- **Unit test autentikasi** untuk verifikasi kredensial dan validasi token sesi (termasuk token yang dipalsukan).

### Diubah
- Penerjemahan sebagian teks antarmuka ke Bahasa Indonesia pada halaman dasbor, pengaturan, akun, dan transaksi.
- Server kini gagal start dengan pesan jelas bila `AUTH_USERNAME` atau `AUTH_PASSWORD` belum diisi.
- `.env.example` dan `README.md` diperbarui dengan konfigurasi autentikasi, daftar variabel environment, dan perintah npm yang sesuai.

## [1.0.0] - 2026-09-12

Rilis awal FinTrack — aplikasi pencatatan tabungan dan hutang modal.

### Ditambahkan

- **Dasbor** ringkasan keuangan dalam satu tampilan: kartu metrik, daftar akun tabungan & hutang modal, form pencatatan transaksi, dan riwayat transaksi.
- **Manajemen akun** — buat, ubah nama, atur saldo awal, dan hapus akun bertipe `TABUNGAN` atau `HUTANG_MODAL`, termasuk penandaan akun default.
- **Pencatatan transaksi** — input transaksi `DEBIT` (masuk) dan `KREDIT` (keluar) dengan 8 kategori pemasukan/pengeluaran, validasi saldo, dan riwayat transaksi yang dapat diubah atau dihapus.
- **Aturan bisnis saldo** (PRD pasal 7.1 & 7.2) sebagai fungsi murni — saldo tabungan tidak dapat menjadi negatif, penarikan hutang modal menambah saldo hutang, pembayaran/pelunasan menguranginya. Dilindungi oleh unit test.
- **Ekspor CSV** riwayat transaksi.
- **Sinkronisasi Google Sheets** — kirim transaksi dan tarik saldo dari spreadsheet dengan pengaturan provider, status, dan log sinkronisasi pada halaman pengaturan.
- **Sunting halaman Pengaturan** untuk data sinkronisasi.
- **Arsitektur berbagi kode** — skema validasi (Zod), kategori, dan aturan saldo dipakai bersama antara server dan klien.
- **Stack modern** — React 19, Vite 6, Tailwind CSS 4, TypeScript 5.7, shadcn/ui, TanStack Query, React Hook Form, Express 4 dengan SQLite bawaan Node (`node:sqlite`).

### Kerangka Kerja & Dokumentasi

- Menambahkan `README.md` dengan petunjuk instalasi, menjalankan dev server, build, dan struktur direktori.
- Menambahkan berkas `CHANGELOG.md` ini.
- Menyempurnakan `.gitignore` agar tidak mengunggah artefak build, cache, database lokal, dan berkas lingkungan.