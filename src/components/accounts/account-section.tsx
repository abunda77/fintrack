import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  Account,
  AccountType,
} from "../../../shared/schemas";
import { useArchiveAccount, useDeleteAccount } from "@/lib/queries";
import { formatIDR } from "@/lib/format";
import { Archive, Banknote, MoreHorizontal, Trash2 } from "lucide-react";

const TYPE_META: Record<
  AccountType,
  { label: string; balanceLabel: string; colorClass: string }
> = {
  TABUNGAN: {
    label: "Tabungan",
    balanceLabel: "Saldo",
    colorClass: "text-emerald-700 dark:text-emerald-400",
  },
  HUTANG_MODAL: {
    label: "Hutang Modal",
    balanceLabel: "Sisa hutang",
    colorClass: "text-rose-700 dark:text-rose-400",
  },
};

export function AccountSection({
  type,
  accounts,
}: {
  type: AccountType;
  accounts: Account[];
}) {
  const meta = TYPE_META[type];
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const archiveMutation = useArchiveAccount();
  const deleteMutation = useDeleteAccount();

  if (accounts.length === 0) return null;

  function archive(account: Account) {
    archiveMutation.mutate(account.id, {
      onSuccess: () => toast.success(`Akun "${account.name}" gearchiveerd.`),
      onError: (err) => toast.error(err.message),
    });
  }

  function remove(target: Account) {
    deleteMutation.mutate(target.id, {
      onSuccess: () => toast.success(`Akun "${target.name}" verwijderd.`),
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="size-4 text-muted-foreground" />
          {meta.label}
          <Badge variant="secondary" className="ml-auto">
            {accounts.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          {type === "TABUNGAN"
            ? "Rekening bank en e-wallet"
            : "Sumber pinjaman, paylater en kewajiban"}
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {accounts.map((account) => (
          <div key={account.id} className="flex items-center gap-3 py-2 px-1">
            <div className="min-w-0">
              <p className="truncate font-medium">{account.name}</p>
              <p className="text-xs text-muted-foreground">
                {account.transactionCount}{" "}
                {account.transactionCount === 1 ? "transactie" : "transacties"}
              </p>
            </div>
            <p
              className={`ml-auto font-bold tabular-nums ${meta.colorClass}`}
              title={meta.balanceLabel}
            >
              {formatIDR(account.currentBalance)}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Acties voor ${account.name}`}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40!">
                <DropdownMenuItem onSelect={() => archive(account)}>
                  <Archive className="size-4" />
                  Arsipkan
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={account.transactionCount > 0}
                  title={
                    account.transactionCount > 0
                      ? "Hapus alleen akun zonder riwayat. Arsipkan om te verbergen."
                      : undefined
                  }
                  onSelect={() => setDeleteTarget(account)}
                >
                  <Trash2 className="size-4" />
                  Hapus
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </CardContent>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun "{deleteTarget?.name ?? ""}" dan z'n transacties worden permanent
              verwijderd. Deze actie kan niet worden ongedaan gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleer</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && remove(deleteTarget)}
            >
              {deleteMutation.isPending ? "Verwijderen..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}