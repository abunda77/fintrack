export const CATEGORIES = [
  "Pemasukan / Gaji",
  "Hasil Penjualan / Usaha",
  "Transfer Antar Rekening",
  "Belanja / Operasional",
  "Bayar Cicilan / Hutang",
  "Penarikan Pinjaman Baru",
  "Saldo Awal",
  "Lain-lain",
] as const;

export const TX_TYPE_LABELS: Record<"DEBIT" | "KREDIT", string> = {
  DEBIT: "DEBIT (Masuk)",
  KREDIT: "KREDIT (Keluar)",
};