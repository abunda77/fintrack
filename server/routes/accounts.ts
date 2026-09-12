import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db";
import { asyncHandler, badRequest, conflict, notFound } from "../errors";
import { withTransaction } from "../transaction";
import {
  accountInputSchema,
  accountRenameSchema,
  type Account,
} from "../../shared/schemas";

export const accountsRouter = Router();

interface AccountRow {
  id: string;
  name: string;
  type: string;
  opening_balance: number;
  current_balance: number;
  is_default: number;
  status: string;
  created_at: string;
  updated_at: string;
  transaction_count: number;
}

function mapAccount(r: AccountRow): Account {
  return {
    id: r.id,
    name: r.name,
    type: r.type as Account["type"],
    openingBalance: r.opening_balance,
    currentBalance: r.current_balance,
    isDefault: r.is_default === 1,
    status: r.status as Account["status"],
    transactionCount: r.transaction_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const BASE_SELECT = `
  SELECT a.*, (SELECT COUNT(*) FROM transactions t WHERE t.account_id = a.id AND t.deleted_at IS NULL) AS transaction_count
  FROM accounts a
`;

function findAccount(id: string): AccountRow | undefined {
  return db.prepare(`${BASE_SELECT} WHERE a.id = ?`).get(id) as
    | AccountRow
    | undefined;
}

function assertUniqueName(name: string, excludeId?: string): void {
  const dup = db
    .prepare(
      `SELECT id FROM accounts WHERE name = ? COLLATE NOCASE AND status = 'ACTIVE' AND id != ? LIMIT 1`,
    )
    .get(name, excludeId ?? "") as unknown as { id: string } | undefined;
  if (dup) {
    throw conflict("DUPLICATE_ACCOUNT", `Akun dengan nama "${name}" sudah ada.`);
  }
}

accountsRouter.get("/", (_req, res) => {
  const rows = db
    .prepare(`${BASE_SELECT} WHERE a.status = 'ACTIVE' ORDER BY a.type DESC, a.name`)
    .all() as unknown as AccountRow[];
  res.json(rows.map(mapAccount));
});

accountsRouter.post("/", asyncHandler(async (req, res) => {
  const input = accountInputSchema.parse(req.body);
  const name = input.name.toUpperCase();
  let accountId = "";

  withTransaction(() => {
    assertUniqueName(name);
    const now = new Date().toISOString();
    accountId = randomUUID();
    db.prepare(
      `INSERT INTO accounts (id, name, type, opening_balance, current_balance, is_default, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, 'ACTIVE', ?, ?)`,
    ).run(
      accountId,
      name,
      input.type,
      input.openingBalance,
      input.openingBalance,
      now,
      now,
    );

    if (input.openingBalance > 0) {
      const txType = input.type === "TABUNGAN" ? "DEBIT" : "KREDIT";
      db.prepare(
        `INSERT INTO transactions (id, account_id, type, amount, transaction_date, category, notes, resulting_balance, is_opening_balance, deleted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'Saldo Awal', NULL, ?, 1, NULL, ?, ?)`,
      ).run(
        randomUUID(),
        accountId,
        txType,
        input.openingBalance,
        new Date().toISOString().slice(0, 10),
        input.openingBalance,
        now,
        now,
      );
    }
  });

  const created = findAccount(accountId);
  res.status(201).json(created ? mapAccount(created) : null);
}));

accountsRouter.get("/:id", (req, res) => {
  const row = findAccount(req.params.id);
  if (!row) throw notFound("ACCOUNT_NOT_FOUND", "Akun tidak ditemukan.");
  res.json(mapAccount(row));
});

accountsRouter.patch("/:id", asyncHandler(async (req, res) => {
  const row = findAccount(req.params.id);
  if (!row) throw notFound("ACCOUNT_NOT_FOUND", "Akun tidak ditemukan.");
  const input = accountRenameSchema.parse(req.body);
  const name = input.name.toUpperCase();

  withTransaction(() => {
    assertUniqueName(name, row.id);
    const now = new Date().toISOString();
    db.prepare("UPDATE accounts SET name = ?, updated_at = ? WHERE id = ?").run(
      name,
      now,
      row.id,
    );
  });
  res.json(mapAccount(findAccount(row.id)!));
}));

accountsRouter.post("/:id/archive", asyncHandler(async (req, res) => {
  const row = findAccount(req.params.id);
  if (!row) throw notFound("ACCOUNT_NOT_FOUND", "Akun tidak ditemukan.");
  if (row.status === "ARCHIVED") {
    throw badRequest("ACCOUNT_ARCHIVED", "Akun sudah diarsipkan.");
  }
  const now = new Date().toISOString();
  db.prepare("UPDATE accounts SET status = 'ARCHIVED', updated_at = ? WHERE id = ?").run(
    now,
    row.id,
  );
  res.json({ ok: true, id: row.id, status: "ARCHIVED" });
}));

accountsRouter.delete("/:id", asyncHandler(async (req, res) => {
  const row = findAccount(req.params.id);
  if (!row) throw notFound("ACCOUNT_NOT_FOUND", "Akun tidak ditemukan.");
  if (row.is_default === 1) {
    throw badRequest("ACCOUNT_DEFAULT", "Akun bawaan tidak dapat dihapus.");
  }
  if (row.transaction_count > 0) {
    throw conflict(
      "ACCOUNT_HAS_HISTORY",
      "Akun memiliki riwayat transaksi. Arsipkan akun untuk menyembunyikannya.",
    );
  }
  db.prepare("DELETE FROM transactions WHERE account_id = ?").run(row.id);
  db.prepare("DELETE FROM accounts WHERE id = ?").run(row.id);
  res.json({ ok: true, id: row.id });
}));