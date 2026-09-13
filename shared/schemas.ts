import { z } from "zod";

export const ACCOUNT_TYPES = ["TABUNGAN", "HUTANG_MODAL"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const TX_TYPES = ["DEBIT", "KREDIT"] as const;
export type TxType = (typeof TX_TYPES)[number];

export const ACCOUNT_STATUSES = ["ACTIVE", "ARCHIVED"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const SYNC_STATUSES = ["IDLE", "SUCCESS", "FAILED"] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const SYNC_LOG_STATUSES = ["PENDING", "SUCCESS", "FAILED"] as const;
export type SyncLogStatus = (typeof SYNC_LOG_STATUSES)[number];

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const accountInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama akun tidak boleh kosong.")
    .max(50, "Nama akun maksimal 50 karakter."),
  type: z.enum(ACCOUNT_TYPES, { message: "Tipe akun tidak valid." }),
  openingBalance: z.coerce
    .number()
    .int("Saldo awal harus bilangan bulat.")
    .min(0, "Saldo awal tidak boleh negatif.")
    .max(1_000_000_000_000, "Saldo awal terlalu besar."),
});

export const accountRenameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama akun tidak boleh kosong.")
    .max(50, "Nama akun maksimal 50 karakter."),
});

export const transactionInputSchema = z.object({
  accountId: z.string().min(1, "Rekening/pos wajib dipilih."),
  type: z.enum(TX_TYPES, { message: "Jenis transaksi tidak valid." }),
  amount: z.coerce
    .number()
    .int("Nominal harus bilangan bulat.")
    .positive("Nominal harus lebih besar dari nol."),
  transactionDate: z
    .string()
    .regex(ISO_DATE_RE, "Tanggal harus berformat YYYY-MM-DD.")
    .refine((s) => !Number.isNaN(Date.parse(s)), "Tanggal tidak valid."),
  category: z.string().trim().min(1, "Kategori wajib dipilih."),
  notes: z
    .string()
    .max(500, "Catatan maksimal 500 karakter.")
    .optional()
    .nullable()
    .default(null),
});

export const loginInputSchema = z.object({
  username: z.string().trim().min(1, "Username wajib diisi.").max(100, "Username terlalu panjang."),
  password: z.string().min(1, "Password wajib diisi.").max(200, "Password terlalu panjang."),
});

export const syncSettingsInputSchema = z.object({
  endpointUrl: z
    .string()
    .trim()
    .max(2000, "URL terlalu panjang.")
    .refine((v) => v === "" || /^https?:\/\/.+/i.test(v), "URL harus valid (http/https).")
    .optional()
    .nullable()
    .default(null),
  isEnabled: z.boolean().optional().default(false),
});

export type AccountInput = z.infer<typeof accountInputSchema>;
export type TransactionInput = z.infer<typeof transactionInputSchema>;
export type SyncSettingsInput = z.infer<typeof syncSettingsInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;

export interface AuthSession {
  authenticated: boolean;
  username: string | null;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  currentBalance: number;
  isDefault: boolean;
  status: AccountStatus;
  transactionCount: number;
  createdAt: string;
  updatedAt: string;
}

export type TxSyncStatus = "SUCCESS" | "FAILED" | "PENDING" | null;

export interface Transaction {
  id: string;
  accountId: string;
  accountName: string;
  accountType: AccountType;
  type: TxType;
  amount: number;
  transactionDate: string;
  category: string;
  notes: string | null;
  resultingBalance: number;
  isOpeningBalance: boolean;
  syncStatus: TxSyncStatus;
  createdAt: string;
}

export interface TransactionPage {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardSummary {
  totalSavings: number;
  totalDebt: number;
  totalLiquidAssets: number;
  netWorth: number;
  savingsAccountCount: number;
  debtAccountCount: number;
}

export interface SyncSettings {
  provider: string;
  endpointUrl: string | null;
  isEnabled: boolean;
  lastSyncedAt: string | null;
  lastStatus: SyncStatus;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncLog {
  id: string;
  provider: string;
  operation: "PUSH_TRANSACTION" | "PUSH_ALL" | "PULL_BALANCES";
  status: SyncLogStatus;
  referenceId: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}