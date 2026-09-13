# Changelog

Semua perubahan penting pada FinTrack dicatat di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/),
dan versioning mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Diubah
- Penerjemahan sebagian teks antarmuka ke Bahasa Indonesia pada halaman dasbor, pengaturan, akun, dan transaksi.

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