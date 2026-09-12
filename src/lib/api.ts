import type {
  Account,
  AccountInput,
  DashboardSummary,
  SyncLog,
  SyncSettings,
  SyncSettingsInput,
  Transaction,
  TransactionInput,
  TransactionPage,
} from "../../shared/schemas";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fieldErrors: Record<string, string[]>;
  };
}

export class ClientError extends Error {
  readonly code: string;
  readonly fieldErrors: Record<string, string[]>;
  readonly status: number;

  constructor(status: number, code: string, message: string, fieldErrors: Record<string, string[]>) {
    super(message);
    this.name = "ClientError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ClientError(0, "NETWORK_ERROR", "Tidak dapat terhubung ke server. Pastikan server API berjalan.", {});
  }

  if (!res.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }
    const err = body?.error;
    throw new ClientError(
      res.status,
      err?.code ?? "INTERNAL_ERROR",
      err?.message ?? "Terjadi kesalahan.",
      err?.fieldErrors ?? {},
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  getHealth: () => request<{ ok: boolean }>("/api/health"),

  getDashboard: () => request<DashboardSummary>("/api/dashboard/summary"),

  getAccounts: () => request<Account[]>("/api/accounts"),

  createAccount: (input: AccountInput) =>
    request<Account>("/api/accounts", { method: "POST", body: JSON.stringify(input) }),

  archiveAccount: (id: string) =>
    request<{ ok: boolean }>(`/api/accounts/${id}/archive`, { method: "POST" }),

  deleteAccount: (id: string) =>
    request<{ ok: boolean }>(`/api/accounts/${id}`, { method: "DELETE" }),

  listTransactions: (params: TransactionQuery): Promise<TransactionPage> => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
    return request<TransactionPage>(`/api/transactions?${qs.toString()}`);
  },

  createTransaction: (input: TransactionInput) =>
    request<Transaction>("/api/transactions", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  deleteTransaction: (id: string) =>
    request<{ ok: boolean }>(`/api/transactions/${id}`, { method: "DELETE" }),

  clearTransactions: () =>
    request<{ ok: boolean; clearedAt: string }>("/api/transactions/clear", { method: "POST" }),

  getSyncSettings: () => request<SyncSettings>("/api/sync/settings"),

  updateSyncSettings: (input: SyncSettingsInput) =>
    request<SyncSettings>("/api/sync/settings", {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  pushAllSync: () =>
    request<{ ok: boolean; pushed: number }>("/api/sync/google-sheets/push", { method: "POST" }),

  pullBalancesSync: () =>
    request<{ ok: boolean; created: number; updated: number }>("/api/sync/google-sheets/pull", {
      method: "POST",
    }),

  getSyncLogs: (limit = 50) => request<SyncLog[]>(`/api/sync/logs?limit=${limit}`),
};

export interface TransactionQuery {
  from?: string;
  to?: string;
  accountId?: string;
  type?: string;
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function transactionsExportUrl(params: TransactionQuery): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  return `/api/transactions/export.csv?${qs.toString()}`;
}