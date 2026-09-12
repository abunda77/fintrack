import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { api, type TransactionQuery } from "./api";
import type {
  Account,
  DashboardSummary,
  SyncLog,
  SyncSettings,
  TransactionPage,
} from "../../shared/schemas";

const QUERY_KEYS = {
  dashboard: ["dashboard"] as const,
  accounts: ["accounts"] as const,
  transactions: (params: TransactionQuery) => ["transactions", params] as const,
  syncSettings: ["sync", "settings"] as const,
  syncLogs: ["sync", "logs"] as const,
};

export function useDashboard(): UseQueryResult<DashboardSummary> {
  return useQuery({ queryKey: QUERY_KEYS.dashboard, queryFn: api.getDashboard });
}

export function useAccounts(): UseQueryResult<Account[]> {
  return useQuery({ queryKey: QUERY_KEYS.accounts, queryFn: api.getAccounts });
}

export function useSyncSettings(): UseQueryResult<SyncSettings> {
  return useQuery({ queryKey: QUERY_KEYS.syncSettings, queryFn: api.getSyncSettings });
}

export function useSyncLogs(): UseQueryResult<SyncLog[]> {
  return useQuery({ queryKey: QUERY_KEYS.syncLogs, queryFn: () => api.getSyncLogs(50) });
}

export function useTransactions(
  params: TransactionQuery,
  enabled = true,
): UseQueryResult<TransactionPage> {
  return useQuery({
    queryKey: QUERY_KEYS.transactions(params),
    queryFn: () => api.listTransactions(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useInvalidateAll(): {
  refreshDashboard: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  refreshTransactions: (params?: TransactionQuery) => Promise<void>;
} {
  const qc = useQueryClient();
  return {
    refreshDashboard: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard }),
    refreshAccounts: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts }),
    refreshTransactions: (params?: TransactionQuery) =>
      qc.invalidateQueries({ queryKey: params ? QUERY_KEYS.transactions(params) : ["transactions"] }),
  };
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createAccount,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      void qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useArchiveAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.archiveAccount,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      void qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      void qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createTransaction,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      void qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteTransaction,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      void qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useClearTransactions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.clearTransactions,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      void qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useUpdateSyncSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.updateSyncSettings,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.syncSettings });
    },
  });
}

export function usePushAllSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.pushAllSync,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.syncSettings });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.syncLogs });
      void qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function usePullBalancesSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.pullBalancesSync,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.syncSettings });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.syncLogs });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      void qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}