import type { AccountType, TxType } from "./schemas";

/**
 * Business rule untuk saldo akun (PRD pasal 7.1 & 7.2).
 * Fungsi MURNI - dipakai oleh server sebagai satu-satunya sumber kebenaran,
 * dan diuji melalui unit test. Fungsi ini TIDAK boleh dipakai untuk menulis negara,
 * hanya untuk memvalidasi & menghitung hasil transaksi.
 */
export type BalanceResult =
  | { ok: true; newBalance: number }
  | { ok: false; code: "INSUFFICIENT_BALANCE" };

export function computeBalance(
  accountType: AccountType,
  txType: TxType,
  currentBalance: number,
  amount: number,
): BalanceResult {
  if (accountType === "TABUNGAN") {
    if (txType === "DEBIT") {
      return { ok: true, newBalance: currentBalance + amount };
    }
    // KREDIT mengurangi saldo tabungan; saldo negatif tidak diizinkan.
    const newBalance = currentBalance - amount;
    if (newBalance < 0) {
      return { ok: false, code: "INSUFFICIENT_BALANCE" };
    }
    return { ok: true, newBalance };
  }

  // HUTANG_MODAL: DEBIT = pembayaran/pelunasan, KREDIT = penarikan baru.
  if (txType === "DEBIT") {
    return { ok: true, newBalance: Math.max(0, currentBalance - amount) };
  }
  return { ok: true, newBalance: currentBalance + amount };
}

export function txTypeExplanation(accountType: AccountType, txType: TxType): string {
  if (accountType === "TABUNGAN") {
    return txType === "DEBIT"
      ? "Debit menambah saldo rekening tabungan."
      : "Kredit mengurangi saldo rekening tabungan.";
  }
  return txType === "DEBIT"
    ? "Debit melunasi/mengurangi sisa hutang modal."
    : "Kredit menambah pinjaman hutang modal baru.";
}