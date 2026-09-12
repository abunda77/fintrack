import { Router } from "express";
import { randomUUID } from "node:crypto";
import { type SQLInputValue } from "node:sqlite";
import { db } from "../db";
import { asyncHandler, notFound, badRequest, ApiError } from "../errors";
import { withTransaction } from "../transaction";
import { computeBalance } from "../../shared/balance";
import { CATEGORIES } from "../../shared/categories";
import {
  transactionInputSchema,
  type Transaction,
  type TransactionPage,
} from "../../shared/schemas";
import { buildCsv } from "../csv";
import { pushTransactionTransaction } from "../sync/sheets";

export const transactionsRouter = Router();

interface TxRow {
  id: string;
  accountId: string;
  accountName: string;
  accountType: string;
  type: string;
  amount: number;
  transaction_date: string;
  category: string;
  notes: string | null;
  resulting_balance: number;
  is_opening_balance: number;
  sync_status: "SUCCESS" | "FAILED" | "PENDING" | null;
  created_at: string;
  updated_at: string;
}

function mapTx(r: TxRow): Transaction {
  return {
    id: r.id,
    accountId: r.accountId,
    accountName: r.accountName,
    accountType: r.accountType as Transaction["accountType"],
    type: r.type as Transaction["type"],
    amount: r.amount,
    transactionDate: r.transaction_date,
    category: r.category,
    notes: r.notes,
    resultingBalance: r.resulting_balance,
    isOpeningBalance: r.is_opening_balance === 1,
    syncStatus: r.sync_status,
    createdAt: r.created_at,
  };
}

function buildListParams(query: Record<string, unknown>) {
  const conditions: string[] = ["t.deleted_at IS NULL"];
  const params: SQLInputValue[] = [];

  const from = typeof query.from === "string" && query.from ? (query.from as string) : undefined;
  const to = typeof query.to === "string" && query.to ? (query.to as string) : undefined;
  const accountId = typeof query.accountId === "string" && query.accountId ? query.accountId : undefined;
  const type =
    typeof query.type === "string" && (query.type === "DEBIT" || query.type === "KREDIT")
      ? query.type
      : undefined;
  const category = typeof query.category === "string" && query.category ? query.category : undefined;
  const search = typeof query.search === "string" && query.search.trim() ? query.search.trim() : undefined;

  if (from) {
    conditions.push("t.transaction_date >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("t.transaction_date <= ?");
    params.push(to);
  }
  if (accountId) {
    conditions.push("t.account_id = ?");
    params.push(accountId);
  }
  if (type) {
    conditions.push("t.type = ?");
    params.push(type);
  }
  if (category) {
    conditions.push("t.category = ?");
    params.push(category);
  }
  if (search) {
    conditions.push("(a.name LIKE ? COLLATE NOCASE OR t.notes LIKE ? COLLATE NOCASE)");
    params.push(`%${search}%`, `%${search}%`);
  }
  return { where: conditions.join(" AND "), params };
}

const SELECT_COLS = `
  t.id,
  t.account_id AS accountId,
  a.name AS accountName,
  a.type AS accountType,
  t.type,
  t.amount,
  t.transaction_date,
  t.category,
  t.notes,
  t.resulting_balance,
  t.is_opening_balance,
  (SELECT sl.status FROM sync_logs sl WHERE sl.reference_id = t.id ORDER BY sl.created_at DESC LIMIT 1) AS sync_status,
  t.created_at,
  t.updated_at
`;

transactionsRouter.get("/", (req, res) => {
  const rawPage = Number(req.query.page ?? 1);
  const rawPageSize = Number(req.query.pageSize ?? 20);
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const pageSize =
    Number.isInteger(rawPageSize) && rawPageSize >= 1 && rawPageSize <= 200
      ? rawPageSize
      : 20;

  const { where, params } = buildListParams({ ...req.query });

  const totalRow = db
    .prepare(
      `SELECT COUNT(*) AS c FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE ${where}`,
    )
    .get(...params) as unknown as { c: number };
  const total = totalRow.c;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;

  const rows = db
    .prepare(
      `SELECT ${SELECT_COLS}
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       WHERE ${where}
       ORDER BY t.transaction_date DESC, t.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, offset) as unknown as TxRow[];

  const result: TransactionPage = {
    items: rows.map(mapTx),
    total,
    page,
    pageSize,
    totalPages,
  };
  res.json(result);
});

transactionsRouter.post("/", asyncHandler(async (req, res) => {
  const input = transactionInputSchema.parse(req.body);

  const account = db
    .prepare("SELECT * FROM accounts WHERE id = ?")
    .get(input.accountId) as
    | {
        id: string;
        name: string;
        type: "TABUNGAN" | "HUTANG_MODAL";
        current_balance: number;
        status: string;
      }
    | undefined;
  if (!account) throw notFound("ACCOUNT_NOT_FOUND", "Rekening/pos tidak ditemukan.");
  if (account.status !== "ACTIVE") {
    throw badRequest("ACCOUNT_ARCHIVED", "Akun sudah diarsipkan dan tidak dapat digunakan.");
  }
  if (!CATEGORIES.includes(input.category as (typeof CATEGORIES)[number])) {
    throw badRequest("VALIDATION_ERROR", "Kategori transaksi tidak valid.");
  }

  const balance = computeBalance(
    account.type,
    input.type,
    account.current_balance,
    input.amount,
  );
  if (!balance.ok) {
    throw new ApiError(
      422,
      "INSUFFICIENT_BALANCE",
      "Saldo rekening tidak mencukupi untuk transaksi ini.",
    );
  }

  const txId = randomUUID();
  const now = new Date().toISOString();
  withTransaction(() => {
    db.prepare(
      `INSERT INTO transactions (id, account_id, type, amount, transaction_date, category, notes, resulting_balance, is_opening_balance, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)`,
    ).run(
      txId,
      input.accountId,
      input.type,
      input.amount,
      input.transactionDate,
      input.category,
      input.notes ?? null,
      balance.newBalance,
      now,
      now,
    );
    db.prepare(
      "UPDATE accounts SET current_balance = ?, updated_at = ? WHERE id = ?",
    ).run(balance.newBalance, now, input.accountId);
  });

  const created = db
    .prepare(
      `SELECT ${SELECT_COLS} FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE t.id = ?`,
    )
    .get(txId) as unknown as TxRow;
  const tx = mapTx(created);

  // Sinkronisasi ke Google Sheets bersifat opsional & asinkron;
  // kegagalan tidak membatalkan penyimpanan lokal (PRD 6.6).
  void pushTransactionTransaction(tx).catch(() => undefined);

  res.status(201).json(tx);
}));

transactionsRouter.get("/export.csv", (req, res) => {
  const { where, params } = buildListParams({ ...req.query });
  const rows = db
    .prepare(
      `SELECT ${SELECT_COLS}
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       WHERE ${where}
       ORDER BY t.transaction_date DESC, t.created_at DESC`,
    )
    .all(...params) as unknown as TxRow[];

  const csv = buildCsv(
    ["Tanggal", "Nama Akun", "Tipe Akun", "Jenis", "Nominal", "Kategori", "Catatan", "Saldo Akhir", "Waktu Dibuat"],
    rows.map((r) => ({
      Tanggal: r.transaction_date,
      "Nama Akun": r.accountName,
      "Tipe Akun": r.accountType,
      Jenis: r.type,
      Nominal: r.amount,
      Kategori: r.category,
      Catatan: r.notes,
      "Saldo Akhir": r.resulting_balance,
      "Waktu Dibuat": r.created_at,
    })),
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=\"riwayat-transaksi.csv\"",
  );
  res.send(csv);
});

transactionsRouter.post("/clear", asyncHandler(async (_req, res) => {
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL",
  ).run(now, now);
  res.json({ ok: true, clearedAt: now });
}));

transactionsRouter.get("/:id", (req, res) => {
  const row = db
    .prepare(
      `SELECT ${SELECT_COLS} FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE t.id = ? AND t.deleted_at IS NULL`,
    )
    .get(req.params.id) as TxRow | undefined;
  if (!row) throw notFound("TRANSACTION_NOT_FOUND", "Transaksi tidak ditemukan.");
  res.json(mapTx(row));
});

transactionsRouter.delete("/:id", asyncHandler(async (req, res) => {
  const row = db
    .prepare("SELECT id FROM transactions WHERE id = ? AND deleted_at IS NULL")
    .get(req.params.id) as { id: string } | undefined;
  if (!row) throw notFound("TRANSACTION_NOT_FOUND", "Transaksi tidak ditemukan.");
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?",
  ).run(now, now, req.params.id);
  res.json({ ok: true, id: req.params.id });
}));