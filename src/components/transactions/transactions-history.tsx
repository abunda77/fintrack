import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CATEGORIES } from "../../../shared/categories";
import type { Transaction } from "../../../shared/schemas";
import { transactionsExportUrl, type TransactionQuery } from "@/lib/api";
import { formatDateID, formatIDR } from "@/lib/format";
import { useAccounts, useClearTransactions, useDeleteTransaction, useTransactions } from "@/lib/queries";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Search, Trash2 } from "lucide-react";

type Filters = {
  search: string;
  from: string;
  to: string;
  accountId: string;
  type: string;
  category: string;
};

const EMPTY_FILTERS: Filters = { search: "", from: "", to: "", accountId: "", type: "", category: "" };

/* ── deterministic color assignment for varied-text columns ── */
const ACCOUNT_COLORS = [
  "text-blue-600 dark:text-blue-400",
  "text-violet-600 dark:text-violet-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-amber-600 dark:text-amber-400",
  "text-rose-600 dark:text-rose-400",
  "text-cyan-600 dark:text-cyan-400",
  "text-fuchsia-600 dark:text-fuchsia-400",
  "text-teal-600 dark:text-teal-400",
] as const;

const CATEGORY_COLORS = [
  "text-sky-600 dark:text-sky-400",
  "text-orange-600 dark:text-orange-400",
  "text-indigo-600 dark:text-indigo-400",
  "text-lime-600 dark:text-lime-400",
  "text-pink-600 dark:text-pink-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-yellow-600 dark:text-yellow-400",
  "text-purple-600 dark:text-purple-400",
  "text-red-600 dark:text-red-400",
  "text-teal-600 dark:text-teal-400",
] as const;

/** Simple string → palette-index hash, deterministic per value */
function hashColor(value: string, palette: readonly string[]): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function syncBadge(status: Transaction["syncStatus"]) {
  if (!status) return null;
  const meta: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    SUCCESS: { label: "Tersinkron", variant: "default" },
    PENDING: { label: "Tertunda", variant: "secondary" },
    FAILED: { label: "Gagal", variant: "destructive" },
  };
  const { label, variant } = meta[status];
  return (
    <Badge variant={variant} className="w-fit">
      {label}
    </Badge>
  );
}

function pieces(totalPages: number, page: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const set = new Set<number>([1, 2, page - 1, page, page + 1, totalPages - 1, totalPages]);
  const sorted = [...set].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

function DeleteRowDialog({ transaction }: { transaction: Transaction }) {
  const [open, setOpen] = useState(false);
  const mutation = useDeleteTransaction();
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Hapus ${formatIDR(transaction.amount)}`}>
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus transactie?</AlertDialogTitle>
          <AlertDialogDescription>
            {formatIDR(transaction.amount)} op {transaction.accountName} ({formatDateID(transaction.transactionDate)})
            wordt soft-hapus. Saldo akun blijft behouden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuleer</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate(transaction.id, {
                onSuccess: () => toast.success("Transactie verwijderd."),
                onError: (err) => toast.error(err.message),
              })
            }
          >
            {mutation.isPending ? "Verwijderen..." : "Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ClearHistoryDialog({ total }: { total: number }) {
  const [open, setOpen] = useState(false);
  const mutation = useClearTransactions();
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={total === 0}>
          <Trash2 className="size-4" />
          Hapus riwayat
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus alle transacties?</AlertDialogTitle>
          <AlertDialogDescription>
            Alle {total} transacties in de riwayat worden soft-hapus.
            Saldo akun blijft volledig behouden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuleer</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate(undefined, {
                onSuccess: () => toast.success("Riwayat transacties verwijderd."),
                onError: (err) => toast.error(err.message),
              })
            }
          >
            {mutation.isPending ? "Verwijderen..." : "Hapus al"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TransactionsHistory() {
  const [searchDraft, setSearchDraft] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data ?? [];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchDraft.trim() !== filters.search) {
        setFilters((prev) => ({ ...prev, search: searchDraft.trim() }));
        setPage(1);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchDraft, filters.search]);

  const query: TransactionQuery = {
    from: filters.from || undefined,
    to: filters.to || undefined,
    accountId: filters.accountId || undefined,
    type: filters.type || undefined,
    category: filters.category || undefined,
    search: filters.search || undefined,
    page,
    pageSize: 20,
  };
  const result = useTransactions(query);
  const data = result.data;
  const total = data?.total ?? 0;
  const totalPages = Math.max(data?.totalPages ?? 1, 1);
  const loading = result.isLoading;

  function patch(next: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="size-4 text-muted-foreground" />
          Riwayat transacties
        </CardTitle>
        <CardDescription>
          {loading ? "Laden..." : `${total} ${total === 1 ? "transactie" : "transacties"}`}
        </CardDescription>
      </CardHeader>
      <div className="grid gap-2 px-(--card-spacing) sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative grid gap-1.5">
          <Label htmlFor="f-search">Pencari</Label>
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="f-search"
              className="pl-8!"
              placeholder="Akun of catatan..."
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="f-from">Vanaf</Label>
          <Input
            id="f-from"
            type="date"
            value={filters.from}
            onChange={(e) => patch({ from: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="f-to">Tot</Label>
          <Input
            id="f-to"
            type="date"
            value={filters.to}
            onChange={(e) => patch({ to: e.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="f-account">Akun</Label>
          <Select
            value={filters.accountId}
            onValueChange={(value: string) => patch({ accountId: value })}
          >
            <SelectTrigger className="w-full" id="f-account">
              <SelectValue placeholder="Alle akun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Alle akun</SelectItem>
              <SelectGroup>
                <SelectLabel>Tabungan</SelectLabel>
                {accounts
                  .filter((account) => account.type === "TABUNGAN")
                  .map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Hutang Modal</SelectLabel>
                {accounts
                  .filter((account) => account.type === "HUTANG_MODAL")
                  .map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="f-type">Jenis</Label>
          <Select value={filters.type} onValueChange={(value: string) => patch({ type: value })}>
            <SelectTrigger className="w-full" id="f-type">
              <SelectValue placeholder="Alle typen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Alle typen</SelectItem>
              <SelectItem value="DEBIT">DEBIT (Masuk)</SelectItem>
              <SelectItem value="KREDIT">KREDIT (Keluar)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="f-cat">Kategori</Label>
          <Select
            value={filters.category}
            onValueChange={(value: string) => patch({ category: value })}
          >
            <SelectTrigger className="w-full" id="f-cat">
              <SelectValue placeholder="Alle categorieen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Alle categorieen</SelectItem>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="invisible">Ekspor</Label>
          <Button variant="outline" size="sm" asChild>
            <a
              href={transactionsExportUrl({
                from: filters.from || undefined,
                to: filters.to || undefined,
                accountId: filters.accountId || undefined,
                type: filters.type || undefined,
                category: filters.category || undefined,
                search: filters.search || undefined,
              })}
              className="inline-flex items-center gap-1.5"
            >
              <Download className="size-4" />
              Ekspor CSV
            </a>
          </Button>
        </div>
        <div className="grid gap-1.5 content-end">
          <ClearHistoryDialog total={total} />
        </div>
      </div>
      <CardContent className="pt-0">
        {loading && !data ? (
          <div className="space-y-3 pt-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Akun</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead className="text-right">Saldo resultaat</TableHead>
                <TableHead>Sync</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Geen transacties gevonden. Pas filters aan of voeg een nieuwe transactie toe.
                  </TableCell>
                </TableRow>
              ) : (
                (data?.items ?? []).map((transaction) => {
                  const isDebit = transaction.type === "DEBIT";
                  const amountColor = isDebit
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400";
                  const balanceNegative = transaction.resultingBalance < 0;
                  const balanceColor = balanceNegative
                    ? "text-red-600 dark:text-red-400"
                    : "text-blue-600 dark:text-blue-400";
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDateID(transaction.transactionDate)}</TableCell>
                      <TableCell className={`font-medium ${hashColor(transaction.accountName ?? "", ACCOUNT_COLORS)}`}>
                        {transaction.accountName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isDebit ? "default" : "secondary"}
                          className={`w-fit ${isDebit ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"}`}
                        >
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell className={hashColor(transaction.category ?? "", CATEGORY_COLORS)}>
                        {transaction.notes ? (
                          <span title={transaction.notes}>
                            {transaction.category}
                          </span>
                        ) : (
                          transaction.category
                        )}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums font-semibold ${amountColor}`}>
                        {isDebit ? "+" : "−"}
                        {formatIDR(transaction.amount)}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${balanceColor}`}>
                        {formatIDR(transaction.resultingBalance)}
                      </TableCell>
                      <TableCell>{syncBadge(transaction.syncStatus)}</TableCell>
                      <TableCell>
                        <DeleteRowDialog transaction={transaction} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
        {totalPages > 1 ? (
          <Pagination className="mt-3">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious onClick={() => setPage(Math.max(1, page - 1))} />
              </PaginationItem>
              {pieces(totalPages, page).map((p, index) =>
                p === "…" ? (
                  <PaginationItem key={`e${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink isActive={p === page} onClick={() => setPage(p)}>
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext onClick={() => setPage(Math.min(totalPages, page + 1))} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        ) : null}
      </CardContent>
    </Card>
  );
}