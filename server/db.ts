import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
mkdirSync(dataDir, { recursive: true });

export const dbPath =
  process.env.FINTRACK_DB || path.join(dataDir, "fintrack.db");

export const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

const DDL = `
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('TABUNGAN','HUTANG_MODAL')),
  opening_balance INTEGER NOT NULL DEFAULT 0,
  current_balance INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_name_active
  ON accounts(name COLLATE NOCASE) WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  type TEXT NOT NULL CHECK (type IN ('DEBIT','KREDIT')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  transaction_date TEXT NOT NULL,
  category TEXT NOT NULL,
  notes TEXT,
  resulting_balance INTEGER NOT NULL,
  is_opening_balance INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_account_date
  ON transactions(account_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_deleted
  ON transactions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transactions_category
  ON transactions(category);

CREATE TABLE IF NOT EXISTS sync_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL UNIQUE,
  endpoint_url TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 0,
  last_synced_at TEXT,
  last_status TEXT NOT NULL DEFAULT 'IDLE',
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  status TEXT NOT NULL,
  reference_id TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
`;

export function migrate(): void {
  db.exec(DDL);
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO sync_settings (provider, is_enabled, last_status, created_at, updated_at) VALUES ('GOOGLE_SHEETS', 0, 'IDLE', ?, ?)",
  );
  const now = new Date().toISOString();
  stmt.run(now, now);
}

/** Data awal dari referensi spreadsheet (manajemen_keuangan_google_sheet.html). */
export const SEED_ACCOUNTS: {
  name: string;
  type: "TABUNGAN" | "HUTANG_MODAL";
  balance: number;
}[] = [
  { name: "JENIUS", type: "TABUNGAN", balance: 7_386_423 },
  { name: "BRI", type: "TABUNGAN", balance: 6_354_576 },
  { name: "SEABANK", type: "TABUNGAN", balance: 10_507_882 },
  { name: "BLUE BCA", type: "TABUNGAN", balance: 1_038_665 },
  { name: "BCA", type: "TABUNGAN", balance: 500 },
  { name: "JAGOO", type: "TABUNGAN", balance: 10_000 },
  { name: "NEOBANK", type: "TABUNGAN", balance: 9_424 },
  { name: "SHOPEEPAY", type: "TABUNGAN", balance: 5_000 },
  { name: "GOPAY", type: "TABUNGAN", balance: 100 },
  { name: "SHOPEE PAYLATER", type: "HUTANG_MODAL", balance: 300_000 },
  { name: "SPINJAM", type: "HUTANG_MODAL", balance: 3_800_000 },
  { name: "TIKTOK PAYLATER", type: "HUTANG_MODAL", balance: 1_300_000 },
];

/**
 * Seed akun bawaan beserta transaksi "Saldo Awal" setiap akun.
 * Dipanggil hanya ketika tabel accounts masih kosong.
 */
export function seedIfEmpty(): void {
  const count = db.prepare("SELECT COUNT(*) AS c FROM accounts").get() as {
    c: number;
  };
  if (count.c > 0) return;

  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  db.exec("BEGIN IMMEDIATE;");
  try {
    const insertAccount = db.prepare(
      `INSERT INTO accounts (id, name, type, opening_balance, current_balance, is_default, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, 'ACTIVE', ?, ?)`,
    );
    const insertTx = db.prepare(
      `INSERT INTO transactions (id, account_id, type, amount, transaction_date, category, notes, resulting_balance, is_opening_balance, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'Saldo Awal', NULL, ?, 1, NULL, ?, ?)`,
    );

    for (const acc of SEED_ACCOUNTS) {
      const accountId = randomUUID();
      const txType = acc.type === "TABUNGAN" ? "DEBIT" : "KREDIT";
      insertAccount.run(
        accountId,
        acc.name.toUpperCase(),
        acc.type,
        acc.balance,
        acc.balance,
        now,
        now,
      );
      if (acc.balance > 0) {
        insertTx.run(
          randomUUID(),
          accountId,
          txType,
          acc.balance,
          today,
          acc.balance,
          now,
          now,
        );
      }
    }
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}