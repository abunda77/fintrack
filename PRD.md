# PRD — FinTrack Personal Finance

## 1. Informasi Dokumen

| Item | Detail |
|---|---|
| Nama produk | FinTrack Personal Finance |
| Jenis aplikasi | Aplikasi web interaktif untuk pencatatan tabungan dan hutang modal |
| Dokumen | Product Requirements Document |
| Versi | 1.0 |
| Status | Draft untuk implementasi |
| Bahasa UI | Bahasa Indonesia |
| Frontend | React + Vite + TypeScript |
| Styling | TailwindCSS + shadcn/ui |
| Backend | Node.js API |
| Database | SQLite |
| Sumber referensi | `manajemen_keuangan_google_sheet.html` |

---

## 2. Ringkasan Produk

FinTrack adalah aplikasi pencatatan keuangan pribadi yang membantu pengguna memantau saldo rekening tabungan, saldo e-wallet, hutang modal, dan riwayat mutasi dalam satu dashboard.

Aplikasi mempertahankan konsep utama dari referensi HTML:

- **Tabungan** berisi aset likuid seperti rekening bank dan e-wallet.
- **Hutang Modal** berisi sumber pinjaman, paylater, atau kewajiban pembiayaan.
- **Transaksi Debit/Kredit** memperbarui saldo pos yang dipilih berdasarkan jenis pos.
- **Dashboard** menampilkan total tabungan, total hutang, total aset liquid, dan kekayaan bersih.
- **Riwayat transaksi** menyimpan seluruh perubahan saldo dan dapat diekspor.
- **Integrasi Google Sheets** tersedia sebagai fitur opsional untuk sinkronisasi data.

Aplikasi versi React harus mengubah prototipe state in-memory menjadi aplikasi persisten dengan SQLite, validasi terpusat, dan antarmuka komponen yang konsisten menggunakan shadcn/ui.

---

## 3. Latar Belakang dan Masalah

Pengguna saat ini mencatat saldo tabungan dan hutang secara manual pada spreadsheet. Pendekatan tersebut menimbulkan beberapa masalah:

1. Perubahan saldo harus dihitung dan diperbarui secara manual.
2. Riwayat transaksi tidak selalu konsisten dengan saldo terkini.
3. Pengguna sulit melihat ringkasan kondisi keuangan secara cepat.
4. Penambahan rekening atau sumber hutang memerlukan perubahan struktur spreadsheet.
5. Data transaksi belum memiliki validasi dan jejak perubahan yang kuat.
6. Sinkronisasi antara aplikasi dan spreadsheet perlu dilakukan secara terkontrol.

FinTrack menyelesaikan masalah tersebut dengan menyediakan satu alur input transaksi yang otomatis menghitung saldo, menyimpan data ke SQLite, dan memperbarui ringkasan dashboard secara real-time.

---

## 4. Tujuan Produk

### 4.1 Tujuan utama

- Memudahkan pengguna mencatat transaksi debit dan kredit.
- Menghitung saldo rekening dan sisa hutang secara otomatis.
- Menampilkan kondisi keuangan dalam dashboard yang mudah dipahami.
- Menyimpan data secara persisten menggunakan SQLite.
- Menyediakan riwayat transaksi yang dapat ditelusuri dan diekspor.
- Mempertahankan opsi sinkronisasi dengan Google Sheets.

### 4.2 Indikator keberhasilan

- Pengguna dapat mencatat satu transaksi baru dalam waktu kurang dari 30 detik.
- Saldo akun berubah sesuai aturan bisnis setelah transaksi disimpan.
- Nilai pada dashboard selalu konsisten dengan data akun di database.
- Data tetap tersedia setelah browser atau server dimulai ulang.
- Pengguna dapat menambah dan menghapus pos keuangan tanpa mengubah kode aplikasi.
- Export CSV menghasilkan seluruh transaksi sesuai filter yang dipilih.

### 4.3 Di luar tujuan versi awal

- Multi-user dan manajemen role kompleks.
- Integrasi bank secara langsung melalui Open Banking.
- Rekonsiliasi otomatis dengan mutasi bank.
- Perencanaan anggaran bulanan yang lengkap.
- Perhitungan bunga pinjaman dan jadwal amortisasi.
- Aplikasi mobile native.

---

## 5. Persona Pengguna

### Persona utama: Pengelola keuangan pribadi

- Memiliki beberapa rekening bank dan e-wallet.
- Memiliki satu atau lebih pinjaman, paylater, atau hutang modal.
- Membutuhkan pencatatan transaksi yang cepat.
- Ingin melihat total aset, kewajiban, dan kekayaan bersih.
- Terbiasa menggunakan spreadsheet tetapi menginginkan alur yang lebih sederhana.

---

## 6. Ruang Lingkup Fitur

### 6.1 Dashboard ringkasan

Dashboard harus menampilkan empat metrik utama:

1. **Total Tabungan** — jumlah saldo seluruh akun bertipe `TABUNGAN`.
2. **Total Hutang Modal** — jumlah sisa hutang seluruh akun bertipe `HUTANG_MODAL`.
3. **Total Aset Liquid** — total tabungan + total hutang modal, mengikuti definisi bisnis pada spreadsheet referensi.
4. **Kekayaan Bersih (Net Worth)** — total tabungan - total hutang modal.

Dashboard juga menampilkan jumlah rekening tabungan dan jumlah sumber hutang.

> Catatan: Definisi “Total Aset Liquid” mengikuti referensi awal. Secara akuntansi, nilai tersebut perlu diberi label atau tooltip yang menjelaskan bahwa hutang modal diperlakukan sebagai dana yang masih dapat diputar, bukan aset bersih.

### 6.2 Manajemen akun atau pos

Pengguna dapat:

- Melihat daftar seluruh rekening tabungan.
- Melihat daftar seluruh sumber hutang modal.
- Menambah pos baru.
- Menentukan tipe pos: `TABUNGAN` atau `HUTANG_MODAL`.
- Menentukan nama pos.
- Menentukan saldo awal.
- Menghapus pos yang dibuat pengguna.
- Melihat saldo terkini pada setiap kartu akun.

Pos bawaan dari data referensi:

#### Tabungan

- JENIUS
- BRI
- SEABANK
- BLUE BCA
- BCA
- JAGOO
- NEOBANK
- SHOPEEPAY
- GOPAY

#### Hutang Modal

- SHOPEE PAYLATER
- SPINJAM
- TIKTOK PAYLATER

Data bawaan harus dimasukkan melalui seed database dan tidak boleh bergantung pada state frontend.

### 6.3 Input transaksi

Form transaksi harus memiliki field berikut:

| Field | Wajib | Detail |
|---|---:|---|
| Jenis transaksi | Ya | `DEBIT` atau `KREDIT` |
| Rekening/pos | Ya | Dropdown akun aktif, dikelompokkan berdasarkan tipe |
| Nominal | Ya | Bilangan bulat positif dalam Rupiah |
| Tanggal | Ya | Default tanggal hari ini |
| Kategori | Ya | Pilihan kategori standar |
| Catatan | Tidak | Keterangan tambahan |

Kategori awal:

- Pemasukan / Gaji
- Hasil Penjualan / Usaha
- Transfer Antar Rekening
- Belanja / Operasional
- Bayar Cicilan / Hutang
- Penarikan Pinjaman Baru
- Saldo Awal
- Lain-lain

Setelah disimpan, aplikasi harus:

1. Memvalidasi input.
2. Menghitung saldo baru berdasarkan tipe akun dan jenis transaksi.
3. Menyimpan transaksi dan perubahan saldo secara atomik dalam satu database transaction.
4. Memperbarui dashboard, kartu akun, dan tabel riwayat.
5. Menampilkan notifikasi berhasil atau gagal.

### 6.4 Riwayat transaksi

Tabel riwayat menampilkan:

- Tanggal.
- Nama rekening/pos.
- Jenis transaksi.
- Nominal.
- Kategori.
- Catatan.
- Saldo akun setelah transaksi.
- Status sinkronisasi Google Sheets.
- Aksi hapus.

Kemampuan minimum:

- Urutan transaksi terbaru di bagian atas.
- Filter berdasarkan tanggal.
- Filter berdasarkan akun.
- Filter berdasarkan tipe transaksi.
- Filter berdasarkan kategori.
- Pencarian berdasarkan akun atau catatan.
- Pagination atau virtualized list ketika data besar.
- Hapus satu catatan transaksi dengan konfirmasi.
- Bersihkan seluruh riwayat dengan dialog konfirmasi.
- Export data terfilter ke CSV.

### 6.5 Hapus riwayat

Pengguna dapat menghapus riwayat transaksi tanpa mengubah saldo akun saat ini hanya jika fitur tersebut dimaksudkan sebagai pembersihan catatan tampilan.

Untuk menjaga konsistensi data, implementasi final harus memilih salah satu pendekatan berikut:

- **Rekomendasi:** soft delete transaksi dan mempertahankan saldo akun sebagai snapshot saat ini.
- Hard delete hanya untuk data yang belum masuk periode rekonsiliasi.
- Reset riwayat sekaligus menghitung ulang saldo dari saldo awal jika histori merupakan sumber kebenaran utama.

MVP menggunakan soft delete agar penghapusan riwayat tidak merusak saldo terkini dan audit internal.

### 6.6 Integrasi Google Sheets

Fitur ini bersifat opsional dan dapat diaktifkan melalui halaman pengaturan.

Kemampuan:

- Menyimpan URL Google Apps Script Web App.
- Mengirim transaksi baru ke Google Sheets.
- Mengirim ringkasan akun dan saldo.
- Sinkronisasi seluruh data secara manual.
- Menarik saldo dan daftar akun dari sheet `Ringkasan_Saldo`.
- Menampilkan status: siap, mengirim, tersinkron, atau gagal.
- Menyimpan waktu sinkronisasi terakhir.
- Menyimpan error sinkronisasi tanpa menghapus data lokal.

Sinkronisasi tidak boleh menjadi prasyarat untuk menyimpan transaksi ke SQLite. Jika Google Sheets gagal, transaksi lokal tetap tersimpan dan berstatus `PENDING` atau `FAILED`.

### 6.7 Notifikasi

Gunakan komponen `Toast` shadcn/ui untuk memberi informasi tentang:

- Transaksi berhasil disimpan.
- Akun berhasil ditambahkan.
- Akun berhasil dihapus.
- Sinkronisasi berhasil.
- Validasi gagal.
- Koneksi Google Sheets gagal.
- Export berhasil dibuat.

---

## 7. Aturan Bisnis

### 7.1 Aturan saldo tabungan

Untuk akun bertipe `TABUNGAN`:

- `DEBIT` menambah saldo.
- `KREDIT` mengurangi saldo.

Rumus:

```text
saldo_baru = saldo_sebelumnya + nominal  // DEBIT
saldo_baru = saldo_sebelumnya - nominal  // KREDIT
```

Saldo tabungan negatif tidak diperbolehkan secara default. Transaksi kredit yang melebihi saldo harus ditolak dengan pesan yang jelas, kecuali pengaturan overdraft diaktifkan pada fase berikutnya.

### 7.2 Aturan saldo hutang modal

Untuk akun bertipe `HUTANG_MODAL`:

- `DEBIT` dianggap sebagai pembayaran atau pelunasan hutang.
- `KREDIT` dianggap sebagai penarikan pinjaman baru.

Rumus:

```text
saldo_baru = max(0, saldo_sebelumnya - nominal)  // DEBIT
saldo_baru = saldo_sebelumnya + nominal           // KREDIT
```

Sistem harus menyimpan saldo hutang sebagai nilai non-negatif.

### 7.3 Saldo awal

Saat akun baru dibuat dengan saldo awal lebih dari nol:

- Untuk `TABUNGAN`, buat transaksi `DEBIT` dengan kategori `Saldo Awal`.
- Untuk `HUTANG_MODAL`, buat transaksi `KREDIT` dengan kategori `Saldo Awal`.
- Transaksi saldo awal diberi penanda `isOpeningBalance = true`.
- Saldo akun dan transaksi saldo awal harus disimpan dalam satu operasi atomik.

### 7.4 Identitas dan integritas data

- Nama akun harus unik, case-insensitive.
- Nama akun disimpan dalam format uppercase untuk konsistensi UI.
- Nominal harus berupa integer Rupiah dan lebih besar dari nol untuk transaksi.
- Tanggal transaksi tidak boleh kosong.
- Akun yang sudah memiliki histori tidak boleh dihapus permanen pada MVP; gunakan status `archived`.
- ID transaksi dibuat oleh backend, bukan frontend.
- Waktu pembuatan dan pembaruan disimpan dalam format ISO 8601.

---

## 8. Arsitektur Teknis

### 8.1 Struktur aplikasi

```text
React + Vite + TypeScript
        |
        | HTTP JSON API
        v
Node.js API Server
        |
        v
SQLite
```

Frontend bertanggung jawab atas tampilan, interaksi, validasi awal, dan cache query. Backend menjadi sumber kebenaran untuk saldo, transaksi, dan aturan bisnis.

### 8.2 Teknologi yang disarankan

| Area | Teknologi |
|---|---|
| Frontend | React, Vite, TypeScript |
| Routing | React Router |
| Data fetching | TanStack Query |
| Form | React Hook Form |
| Validasi | Zod |
| UI | shadcn/ui |
| Styling | TailwindCSS |
| Ikon | Lucide React |
| Backend | Node.js + Fastify atau Express |
| ORM/query | Drizzle ORM atau better-sqlite3 |
| Database | SQLite |
| Testing unit | Vitest |
| Testing UI | React Testing Library |
| Testing API | Supertest atau Fastify inject |
| E2E | Playwright |

### 8.3 Struktur direktori yang disarankan

```text
src/
  app/
    router.tsx
    providers.tsx
  components/
    ui/                 # shadcn/ui
    layout/
    dashboard/
    accounts/
    transactions/
    settings/
  features/
    accounts/
    transactions/
    sync/
  lib/
    api-client.ts
    currency.ts
    validators.ts
  pages/
    dashboard-page.tsx
    settings-page.tsx
server/
  db/
    schema.ts
    migrations/
    seed.ts
  modules/
    accounts/
    transactions/
    sync/
  routes/
  app.ts
```

---

## 9. Model Data SQLite

### 9.1 Tabel `accounts`

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | TEXT | Primary key, UUID |
| `name` | TEXT | Wajib, unik case-insensitive |
| `type` | TEXT | `TABUNGAN` atau `HUTANG_MODAL` |
| `opening_balance` | INTEGER | Default 0, dalam Rupiah |
| `current_balance` | INTEGER | Default 0, dalam Rupiah |
| `is_default` | INTEGER | Boolean 0/1 |
| `status` | TEXT | `ACTIVE` atau `ARCHIVED` |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601 |

### 9.2 Tabel `transactions`

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | TEXT | Primary key, UUID |
| `account_id` | TEXT | Foreign key ke `accounts.id` |
| `type` | TEXT | `DEBIT` atau `KREDIT` |
| `amount` | INTEGER | Wajib, integer positif |
| `transaction_date` | TEXT | Wajib, format `YYYY-MM-DD` |
| `category` | TEXT | Wajib |
| `notes` | TEXT | Nullable |
| `resulting_balance` | INTEGER | Snapshot saldo setelah transaksi |
| `is_opening_balance` | INTEGER | Boolean 0/1 |
| `deleted_at` | TEXT | Nullable untuk soft delete |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601 |

### 9.3 Tabel `sync_settings`

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | INTEGER | Primary key |
| `provider` | TEXT | Contoh: `GOOGLE_SHEETS` |
| `endpoint_url` | TEXT | Nullable |
| `is_enabled` | INTEGER | Boolean 0/1 |
| `last_synced_at` | TEXT | Nullable |
| `last_status` | TEXT | `IDLE`, `SUCCESS`, `FAILED` |
| `last_error` | TEXT | Nullable |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601 |

### 9.4 Tabel `sync_logs`

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | TEXT | Primary key |
| `provider` | TEXT | Nama provider |
| `operation` | TEXT | `PUSH_TRANSACTION`, `PUSH_ALL`, `PULL_BALANCES` |
| `status` | TEXT | `PENDING`, `SUCCESS`, `FAILED` |
| `reference_id` | TEXT | Nullable, misalnya ID transaksi |
| `error_message` | TEXT | Nullable |
| `created_at` | TEXT | ISO 8601 |
| `completed_at` | TEXT | Nullable |

### 9.5 Indeks

- Index `transactions(account_id, transaction_date)`.
- Index `transactions(deleted_at)`.
- Index `transactions(category)`.
- Unique index case-insensitive pada nama akun aktif.

---

## 10. API Requirements

### 10.1 Accounts

```text
GET    /api/accounts
POST   /api/accounts
GET    /api/accounts/:id
PATCH  /api/accounts/:id
POST   /api/accounts/:id/archive
```

`GET /api/accounts` mengembalikan akun aktif beserta `currentBalance`, jumlah transaksi aktif, dan tipe akun.

### 10.2 Transactions

```text
GET    /api/transactions
POST   /api/transactions
GET    /api/transactions/:id
DELETE /api/transactions/:id
POST   /api/transactions/clear
GET    /api/transactions/export.csv
```

Parameter query yang didukung:

```text
from, to, accountId, type, category, search, page, pageSize
```

### 10.3 Dashboard

```text
GET /api/dashboard/summary
```

Response minimum:

```json
{
  "totalSavings": 25312570,
  "totalDebt": 5400000,
  "totalLiquidAssets": 30712570,
  "netWorth": 19912570,
  "savingsAccountCount": 9,
  "debtAccountCount": 3
}
```

### 10.4 Google Sheets sync

```text
GET  /api/sync/settings
PUT  /api/sync/settings
POST /api/sync/google-sheets/push
POST /api/sync/google-sheets/pull
GET  /api/sync/logs
```

Backend harus mengontrol validasi endpoint dan timeout request. Endpoint Google Apps Script tidak boleh disimpan di localStorage sebagai satu-satunya sumber konfigurasi.

---

## 11. Persyaratan UI/UX

### 11.1 Prinsip desain

- Gunakan layout dashboard yang bersih, responsif, dan berorientasi data.
- Gunakan bahasa Indonesia yang konsisten.
- Gunakan warna semantik:
  - Emerald/hijau untuk tabungan dan debit positif.
  - Rose/merah untuk hutang dan kredit.
  - Amber/kuning untuk ringkasan aset liquid.
  - Slate untuk informasi netral.
- Seluruh komponen interaktif menggunakan komponen shadcn/ui.
- Hindari penggunaan `alert()` browser.
- Semua modal dapat ditutup dengan tombol close, Escape, atau klik overlay jika tidak sedang submit.
- Tabel harus memiliki empty state, loading state, dan error state.

### 11.2 Komponen shadcn/ui minimum

- `Button`
- `Card`
- `Badge`
- `Input`
- `Label`
- `Select`
- `RadioGroup`
- `Textarea`
- `Dialog`
- `AlertDialog`
- `Table`
- `Toast`
- `Tooltip`
- `Skeleton`
- `Separator`
- `DropdownMenu`
- `Pagination`

### 11.3 Responsivitas

- Desktop: dashboard tiga atau empat kartu metrik dan layout form + daftar akun.
- Tablet: daftar akun dua kolom.
- Mobile: satu kolom, form transaksi di atas, tabel dapat digeser horizontal atau berubah menjadi card list.
- Header tetap mudah digunakan pada layar kecil.
- Nominal Rupiah tidak boleh terpotong atau tampil dalam format ambigu.

### 11.4 Format Rupiah

- Input menggunakan pemisah ribuan lokal Indonesia.
- Backend menerima integer, bukan string terformat.
- Tampilan menggunakan format `Rp 1.234.567`.
- Nilai nol ditampilkan sebagai `Rp 0`.
- Nilai negatif hanya diperbolehkan untuk net worth, bukan saldo akun.

---

## 12. Alur Pengguna Utama

### 12.1 Mencatat transaksi tabungan

1. Pengguna membuka dashboard.
2. Pengguna memilih `DEBIT` atau `KREDIT`.
3. Pengguna memilih rekening tabungan.
4. Pengguna memasukkan nominal, tanggal, kategori, dan catatan.
5. Pengguna menekan `Simpan Transaksi`.
6. Backend memvalidasi dan menghitung saldo baru.
7. Database menyimpan transaksi dan saldo baru secara atomik.
8. Dashboard dan riwayat diperbarui.
9. Toast sukses ditampilkan.
10. Jika sinkronisasi aktif, transaksi masuk antrean sinkronisasi.

### 12.2 Mencatat pembayaran hutang

1. Pengguna memilih `DEBIT`.
2. Pengguna memilih sumber hutang modal.
3. Sistem menampilkan konteks bahwa debit berarti pelunasan hutang.
4. Pengguna memasukkan nominal pembayaran.
5. Sistem mengurangi saldo hutang dan tidak membiarkan hasil di bawah nol.
6. Transaksi disimpan dengan saldo akhir hutang.

### 12.3 Menambah rekening baru

1. Pengguna menekan `Tambah Rekening`.
2. Dialog dibuka.
3. Pengguna memilih `Tabungan` atau `Hutang Modal`.
4. Pengguna memasukkan nama dan saldo awal.
5. Sistem memvalidasi nama unik.
6. Sistem membuat akun dan transaksi saldo awal bila saldo awal lebih besar dari nol.
7. Kartu akun dan dropdown transaksi diperbarui.

### 12.4 Menghapus riwayat

1. Pengguna menekan `Bersihkan Riwayat`.
2. Sistem menampilkan `AlertDialog` berisi konsekuensi tindakan.
3. Pengguna mengonfirmasi.
4. Sistem melakukan soft delete seluruh transaksi aktif.
5. Saldo akun tidak berubah pada MVP.
6. Tabel menampilkan empty state.

---

## 13. Validasi dan Error Handling

### Validasi frontend

- Nama akun tidak boleh kosong.
- Nama akun tidak boleh duplikat.
- Nominal harus berupa angka positif.
- Tanggal harus valid.
- Akun harus aktif.
- Catatan maksimum 500 karakter.

### Validasi backend

Semua validasi harus diulang di backend menggunakan schema Zod atau validasi setara. Frontend tidak boleh menjadi satu-satunya lapisan proteksi.

### Error response standar

```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Saldo rekening tidak mencukupi untuk transaksi ini.",
    "fieldErrors": {}
  }
}
```

Kode error minimum:

- `VALIDATION_ERROR`
- `ACCOUNT_NOT_FOUND`
- `ACCOUNT_ARCHIVED`
- `DUPLICATE_ACCOUNT`
- `INSUFFICIENT_BALANCE`
- `TRANSACTION_NOT_FOUND`
- `SYNC_FAILED`
- `INTERNAL_ERROR`

---

## 14. Keamanan dan Privasi

- SQLite disimpan di sisi server dan tidak diakses langsung dari browser.
- Endpoint API harus membatasi input berdasarkan schema.
- Jangan merender catatan pengguna menggunakan `dangerouslySetInnerHTML`.
- Escape data saat membuat CSV untuk mengurangi risiko formula injection, terutama pada field yang diawali `=`, `+`, `-`, atau `@`.
- URL sinkronisasi harus divalidasi sebagai URL HTTP/HTTPS.
- Request sinkronisasi memiliki timeout dan batas ukuran payload.
- Jangan menyimpan credential Google atau token rahasia di database lokal tanpa enkripsi.
- Jika aplikasi dibuka lintas jaringan, tambahkan autentikasi sebelum produksi.
- Log error tidak boleh menyimpan data sensitif secara berlebihan.

---

## 15. Non-Functional Requirements

### Performa

- Dashboard pertama kali tampil dalam waktu kurang dari 2 detik pada dataset hingga 10.000 transaksi di lingkungan lokal.
- Submit transaksi menampilkan hasil UI kurang dari 500 ms setelah API merespons.
- Query riwayat menggunakan pagination atau limit.

### Reliabilitas

- Perubahan saldo dan insert transaksi wajib atomik.
- Kegagalan sinkronisasi eksternal tidak boleh menghapus atau membatalkan data lokal yang sudah berhasil disimpan.
- Migrasi database harus dapat dijalankan ulang dengan aman.

### Aksesibilitas

- Semua input memiliki label.
- Dialog memiliki judul dan deskripsi yang jelas.
- Navigasi keyboard didukung.
- Kontras warna memenuhi WCAG AA.
- Status tidak disampaikan hanya melalui warna.

### Maintainability

- Gunakan TypeScript strict mode.
- Pisahkan domain account, transaction, dan sync.
- Hindari business logic saldo di komponen React.
- Tambahkan test untuk setiap aturan debit/kredit.

---

## 16. Acceptance Criteria MVP

### Dashboard

- [ ] Total tabungan dihitung dari seluruh akun `TABUNGAN` aktif.
- [ ] Total hutang dihitung dari seluruh akun `HUTANG_MODAL` aktif.
- [ ] Total aset liquid dan net worth sesuai rumus yang ditentukan.
- [ ] Angka dashboard berubah setelah transaksi berhasil.
- [ ] Loading, empty, dan error state tersedia.

### Akun

- [ ] Seed akun bawaan tersedia setelah instalasi database.
- [ ] Pengguna dapat menambah tabungan.
- [ ] Pengguna dapat menambah hutang modal.
- [ ] Saldo awal membuat transaksi pembuka.
- [ ] Nama akun duplikat ditolak.
- [ ] Akun yang sudah memiliki histori dapat diarsipkan, bukan dihapus permanen.

### Transaksi

- [ ] Pengguna dapat membuat transaksi debit.
- [ ] Pengguna dapat membuat transaksi kredit.
- [ ] Aturan saldo tabungan diterapkan dengan benar.
- [ ] Aturan saldo hutang diterapkan dengan benar.
- [ ] Saldo tabungan tidak boleh negatif.
- [ ] Saldo hutang tidak boleh negatif.
- [ ] Transaksi dan saldo tersimpan atomik.
- [ ] Saldo akhir transaksi tersimpan sebagai snapshot.

### Riwayat

- [ ] Transaksi terbaru muncul di bagian atas.
- [ ] Filter dan pencarian berfungsi.
- [ ] Pengguna dapat menghapus satu transaksi secara soft delete.
- [ ] Pengguna dapat membersihkan riwayat dengan konfirmasi.
- [ ] Export CSV tersedia dan aman dari formula injection.

### Sinkronisasi

- [ ] Pengguna dapat menyimpan endpoint Google Apps Script.
- [ ] Sinkronisasi manual dapat dijalankan.
- [ ] Kegagalan sync terlihat jelas di UI.
- [ ] Transaksi tetap tersimpan lokal saat sync gagal.
- [ ] Log sinkronisasi tersimpan.

### UI

- [ ] Seluruh UI menggunakan TailwindCSS dan shadcn/ui.
- [ ] Tampilan desktop dan mobile dapat digunakan.
- [ ] Dialog dapat dinavigasi dengan keyboard.
- [ ] Toast tersedia untuk aksi sukses dan gagal.

---

## 17. Strategi Pengujian

### Unit test

- Fungsi perhitungan saldo tabungan.
- Fungsi perhitungan saldo hutang.
- Perhitungan total dashboard.
- Parsing dan format Rupiah.
- Validasi akun dan transaksi.
- Sanitasi export CSV.

### Integration test

- Membuat akun dan saldo awal.
- Membuat transaksi debit/kredit.
- Rollback saat insert transaksi gagal.
- Filter transaksi dari database.
- Soft delete transaksi.
- Penyimpanan dan pembacaan pengaturan sync.

### E2E test

- Pengguna mencatat pemasukan ke rekening tabungan.
- Pengguna mencatat pengeluaran melebihi saldo dan menerima error.
- Pengguna membayar hutang sampai saldo nol.
- Pengguna menambah akun dengan saldo awal.
- Pengguna mengekspor riwayat.
- Pengguna membuka aplikasi kembali dan data tetap tersedia.

---

## 18. Tahapan Implementasi

### Fase 1 — Fondasi aplikasi

- Setup React, Vite, TypeScript.
- Setup TailwindCSS dan shadcn/ui.
- Setup Node.js API.
- Setup SQLite, migration, dan seed.
- Setup struktur domain dan API client.

### Fase 2 — Fitur inti

- Dashboard summary.
- Manajemen akun.
- Input transaksi.
- Aturan saldo.
- Riwayat transaksi.
- Toast, dialog, loading, dan error state.

### Fase 3 — Operasional data

- Filter dan pencarian riwayat.
- Soft delete.
- Export CSV.
- Audit dan pengujian transaksi atomik.

### Fase 4 — Integrasi eksternal

- Pengaturan endpoint Google Apps Script.
- Push transaksi.
- Pull saldo.
- Sync all.
- Sync logs dan retry manual.

### Fase 5 — Hardening

- E2E test.
- Audit aksesibilitas.
- Optimasi query.
- Dokumentasi deployment.
- Backup database SQLite.

---

## 19. Keputusan Produk yang Perlu Dikonfirmasi

1. Apakah aplikasi hanya digunakan satu pengguna lokal, atau sejak awal perlu autentikasi multi-user?
2. Apakah saldo transaksi menjadi sumber kebenaran yang dihitung dari histori, atau `current_balance` menjadi snapshot yang dapat dikoreksi manual?
3. Apakah “Total Aset Liquid = Tabungan + Hutang Modal” harus dipertahankan persis seperti spreadsheet, atau label dan rumus perlu disesuaikan dengan istilah akuntansi?
4. Apakah integrasi Google Sheets termasuk MVP atau dirilis setelah fitur SQLite stabil?
5. Apakah transaksi yang sudah disinkronkan boleh diedit, atau hanya dapat dibatalkan dengan transaksi koreksi?

---

## 20. Definisi Selesai

Fitur dianggap selesai apabila:

- Implementasi frontend dan backend berjalan melalui perintah development standar.
- Database SQLite dapat dibuat dari migrasi bersih dan diisi seed.
- Semua acceptance criteria MVP terpenuhi.
- Test unit, integration, dan E2E utama berhasil.
- Tidak ada business logic saldo yang hanya berjalan di frontend.
- Aplikasi dapat digunakan pada desktop dan mobile.
- Dokumentasi konfigurasi, migrasi, seed, dan integrasi Google Sheets tersedia.
