import { AlertCircle } from "lucide-react";
import { useAccounts, useDashboard } from "@/lib/queries";
import { AddAccountDialog } from "@/components/accounts/add-account-dialog";
import { AccountSection } from "@/components/accounts/account-section";
import { MetricCards } from "@/components/dashboard/metric-cards";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransactionsHistory } from "@/components/transactions/transactions-history";

export function DashboardPage() {
  const dashboard = useDashboard();
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data ?? [];

  const tabungan = accounts.filter((account) => account.type === "TABUNGAN");
  const hutang = accounts.filter((account) => account.type === "HUTANG_MODAL");

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Dasbor</h1>
          <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
            Ringkasan rekening bank, e-wallet, dan hutang modal dalam satu tampilan.
          </p>
        </div>
        <div className="ml-auto max-sm:w-full">
          <AddAccountDialog defaultType="TABUNGAN" />
        </div>
      </div>

      {dashboard.error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="size-5 shrink-0" />
          <p>
            Kan de dashboard-data niet laden: {dashboard.error.message}. Herstel de
            verbinding of laad de pagina opnieuw.
          </p>
        </div>
      ) : null}

      <MetricCards summary={dashboard.data} isLoading={dashboard.isLoading} />

      <div className="grid gap-4 lg:grid-cols-2">
        <AccountSection type="TABUNGAN" accounts={tabungan} />
        <AccountSection type="HUTANG_MODAL" accounts={hutang} />
      </div>

      <TransactionForm accounts={accounts} />

      <TransactionsHistory />
    </div>
  );
}