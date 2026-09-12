import { db } from "./db";

/**
 * Helper transaksi database SQLite.
 * Semua perubahan saldo + insert transaksi harus atomik (PRD pasal 7.3, 12 & 15).
 */
export function withTransaction<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE;");
  try {
    const result = fn();
    db.exec("COMMIT;");
    return result;
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}