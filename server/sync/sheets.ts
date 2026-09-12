import { db } from "../db";
import type { Transaction } from "../../shared/schemas";
import { randomUUID } from "node:crypto";

const TIMEOUT_MS = 10_000;

function getSettings() {
  const row = db
    .prepare(
      "SELECT provider, endpoint_url AS endpointUrl, is_enabled AS isEnabled, last_synced_at AS lastSyncedAt, last_status AS lastStatus, last_error AS lastError FROM sync_settings WHERE provider = 'GOOGLE_SHEETS' LIMIT 1",
    )
    .get() as
    | {
        provider: string;
        endpointUrl: string | null;
        isEnabled: number;
        lastSyncedAt: string | null;
        lastStatus: string;
        lastError: string | null;
      }
    | undefined;
  if (!row) return null;
  return { ...row, isEnabled: row.isEnabled === 1 };
}

export { getSettings };

export function isSyncEnabled(): boolean {
  const s = getSettings();
  return Boolean(s && s.isEnabled && s.endpointUrl);
}

interface GazResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

async function postJson(url: string, payload: Record<string, unknown>): Promise<GazResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return { ok: true, data: parseJsonLoose(text) };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Koneksi gagal";
    return { ok: false, error: reason };
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(url: string): Promise<GazResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return { ok: true, data: parseJsonLoose(text) };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Koneksi gagal";
    return { ok: false, error: reason };
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  // Dukungan JSONP sederhana (callback({...})).
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed);
  }
  const m = trimmed.match(/^[^(]*\(([\s\S]*)\)\s*;?\s*$/);
  if (m) return JSON.parse(m[1]);
  throw new Error("Respons bukan JSON yang valid.");
}

function allActiveBalances() {
  const accounts = db
    .prepare(
      "SELECT id, name, type, current_balance AS currentBalance FROM accounts WHERE status = 'ACTIVE' ORDER BY name",
    )
    .all() as { id: string; name: string; type: string; currentBalance: number }[];

  const balances: Record<string, number> = {};
  const tabunganKeys: string[] = [];
  const hutangKeys: string[] = [];
  for (const a of accounts) {
    balances[a.name] = a.currentBalance;
    if (a.type === "TABUNGAN") tabunganKeys.push(a.name);
    else hutangKeys.push(a.name);
  }
  return { balances, tabunganKeys, hutangKeys };
}

/** Mencatat log sync lalu memperbarui status pengaturan. */
export function recordSyncOutcome(
  logId: string,
  ok: boolean,
  error?: string,
): void {
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE sync_logs SET status = ?, error_message = ?, completed_at = ? WHERE id = ?",
  ).run(ok ? "SUCCESS" : "FAILED", error ?? null, now, logId);
  const lastStatus = ok ? "SUCCESS" : "FAILED";
  db.prepare(
    "UPDATE sync_settings SET last_status = ?, last_error = ?, last_synced_at = ?, updated_at = ? WHERE provider = 'GOOGLE_SHEETS'",
  ).run(lastStatus, error ?? null, now, now);
}

/** Mengirim satu transaksi baru ke Google Apps Script (action ADD_TRANSACTION). */
export async function pushTransactionTransaction(tx: Transaction): Promise<void> {
  const settings = getSettings();
  if (!settings?.endpointUrl) return;
  const logId = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO sync_logs (id, provider, operation, status, reference_id, error_message, created_at, completed_at) VALUES (?, 'GOOGLE_SHEETS', 'PUSH_TRANSACTION', 'PENDING', ?, NULL, ?, NULL)",
  ).run(logId, tx.id, now);

  const { balances, tabunganKeys, hutangKeys } = allActiveBalances();
  const result = await postJson(settings.endpointUrl, {
    action: "ADD_TRANSACTION",
    transaction: {
      id: tx.id,
      date: tx.transactionDate,
      account: tx.accountName,
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      notes: tx.notes,
      resultingBalance: tx.resultingBalance,
    },
    balances,
    tabunganKeys,
    hutangKeys,
  });
  recordSyncOutcome(logId, result.ok, result.error);
}

/** Sinkronisasi massal seluruh akun, saldo, dan transaksi aktif. */
export async function pushAllToSheets(): Promise<{
  pushed: number;
  ok: boolean;
  error?: string;
}> {
  const settings = getSettings();
  const logId = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO sync_logs (id, provider, operation, status, reference_id, error_message, created_at, completed_at) VALUES (?, 'GOOGLE_SHEETS', 'PUSH_ALL', 'PENDING', NULL, NULL, ?, NULL)",
  ).run(logId, now);

  if (!settings?.endpointUrl) {
    recordSyncOutcome(logId, false, "URL endpoint belum diatur.");
    return { pushed: 0, ok: false, error: "URL endpoint belum diatur." };
  }

  const { balances, tabunganKeys, hutangKeys } = allActiveBalances();
  const transactions = db
    .prepare(
      `SELECT t.id, t.transaction_date AS date, a.name AS account, t.type, t.amount, t.category, t.notes, t.resulting_balance AS resultingBalance
       FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       WHERE t.deleted_at IS NULL
       ORDER BY t.transaction_date, t.created_at`,
    )
    .all() as {
    id: string;
    date: string;
    account: string;
    type: string;
    amount: number;
    category: string;
    notes: string | null;
    resultingBalance: number;
  }[];

  const result = await postJson(settings.endpointUrl, {
    action: "SYNC_ALL",
    balances,
    transactions,
    tabunganKeys,
    hutangKeys,
  });
  recordSyncOutcome(logId, result.ok, result.error);
  return { pushed: transactions.length, ok: result.ok, error: result.error };
}

export interface PullBalancesResult {
  ok: boolean;
  error?: string;
  created: number;
  updated: number;
}

/**
 * Menarik saldo & daftar akun dari sheet "Ringkasan_Saldo" (doGet di Apps Script).
 * Akun yang belum ada dibuat; akun yang ada diperbarui saldonya.
 */
export async function pullBalancesFromSheets(): Promise<PullBalancesResult> {
  const settings = getSettings();
  const logId = randomUUID();
  const now = new Date().toISOString();
  const r = await (async () => {
    if (!settings?.endpointUrl) {
      return { ok: false as const, error: "URL endpoint belum diatur.", created: 0, updated: 0 };
    }
    db.prepare(
      "INSERT INTO sync_logs (id, provider, operation, status, reference_id, error_message, created_at, completed_at) VALUES (?, 'GOOGLE_SHEETS', 'PULL_BALANCES', 'PENDING', NULL, NULL, ?, NULL)",
    ).run(logId, now);

    const res = await getJson(settings.endpointUrl);
    if (!res.ok) {
      return { ok: false as const, error: res.error, created: 0, updated: 0 };
    }
    const data = (res.data ?? {}) as {
      status?: string;
      tabunganKeys?: string[];
      hutangKeys?: string[];
      balances?: Record<string, number>;
    };
    if (data.status === "error" || !data.balances) {
      return {
        ok: false as const,
        error: typeof data === "object" && "message" in data ? String((data as { message?: string }).message) : "Balances tidak ditemukan di respons.",
        created: 0,
        updated: 0,
      };
    }
    return applyBalances(data.balances, data.tabunganKeys ?? [], data.hutangKeys ?? []);
  })();

  recordSyncOutcome(logId, r.ok, r.ok ? undefined : r.error);
  return r;
}

function applyBalances(
  balances: Record<string, number>,
  tabunganKeys: string[],
  hutangKeys: string[],
): { ok: true; created: number; updated: number } {
  const tabSet = new Set(tabunganKeys.map((k) => k.toUpperCase()));
  const hutSet = new Set(hutangKeys.map((k) => k.toUpperCase()));
  let created = 0;
  let updated = 0;

  const findByName = db.prepare(
    "SELECT id, name FROM accounts WHERE name = ? COLLATE NOCASE AND status = 'ACTIVE' LIMIT 1",
  );

  db.exec("BEGIN IMMEDIATE;");
  try {
    const updateBalance = db.prepare(
      "UPDATE accounts SET current_balance = ?, updated_at = ? WHERE id = ?",
    );
    const insertAccount = db.prepare(
      `INSERT INTO accounts (id, name, type, opening_balance, current_balance, is_default, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, 'ACTIVE', ?, ?)`,
    );
    const insertTx = db.prepare(
      `INSERT INTO transactions (id, account_id, type, amount, transaction_date, category, notes, resulting_balance, is_opening_balance, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'Saldo Awal', NULL, ?, 1, NULL, ?, ?)`,
    );

    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    for (const [rawName, rawBalance] of Object.entries(balances)) {
      const name = rawName.trim();
      if (!name) continue;
      const upper = name.toUpperCase();
      const amount = Math.max(0, Math.trunc(Number(rawBalance) || 0));
      const type = hutSet.has(upper) ? "HUTANG_MODAL" : tabSet.has(upper) ? "TABUNGAN" : "TABUNGAN";
      const existing = findByName.get(upper) as { id: string; name: string } | undefined;
      if (existing) {
        updateBalance.run(amount, now, existing.id);
        updated += 1;
      } else {
        const accountId = randomUUID();
        const txType = type === "TABUNGAN" ? "DEBIT" : "KREDIT";
        insertAccount.run(accountId, upper, type, amount, amount, now, now);
        if (amount > 0) {
          insertTx.run(randomUUID(), accountId, txType, amount, today, amount, now, now);
        }
        created += 1;
      }
    }
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
  return { ok: true, created, updated };
}