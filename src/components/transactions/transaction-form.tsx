import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useId, useState } from "react";
import { CATEGORIES, TX_TYPE_LABELS } from "../../../shared/categories";
import { transactionInputSchema, type Account } from "../../../shared/schemas";
import { txTypeExplanation } from "../../../shared/balance";
import { ClientError } from "@/lib/api";
import { useCreateTransaction } from "@/lib/queries";
import { formatAmountInput, todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

type RawTxForm = {
  accountId: string;
  type: string;
  amount: string;
  transactionDate: string;
  category: string;
  notes: string;
};
type TxField = "type" | "accountId" | "amount" | "transactionDate" | "category" | "notes";

export function TransactionForm({ accounts }: { accounts: Account[] }) {
  const [amountDraft, setAmountDraft] = useState("0");
  const typeGroupId = useId();
  const { register, handleSubmit, setValue, setError, clearErrors, reset, formState, control } =
    useForm<RawTxForm>({
      defaultValues: {
        accountId: "",
        type: "DEBIT",
        amount: "",
        transactionDate: todayISO(),
        category: "",
        notes: "",
      },
    });
  const mutation = useCreateTransaction();

  // Controlled fields registered without DOM ref; driven via setValue().
  register("accountId");
  register("type");
  register("category");

  // useWatch (not getValues) so setValue() re-renders the controlled RadioGroup/Select.
  const selectedType = useWatch({ control, name: "type" }) ?? "DEBIT";
  const selectedAccountId = useWatch({ control, name: "accountId" }) ?? "";
  const selectedCategory = useWatch({ control, name: "category" }) ?? "";
  const selectedAccount = accounts.find(
    (account) => account.id === selectedAccountId,
  );
  const fieldError = formState.errors;

  const onSubmit = handleSubmit(async (data) => {
    const amount = Number((data.amount ?? "").replace(/\D/g, "") || 0);
    const parsed = transactionInputSchema.safeParse({
      accountId: data.accountId,
      type: data.type,
      amount,
      transactionDate: data.transactionDate,
      category: data.category,
      notes: (data.notes ?? "").trim() === "" ? null : data.notes.trim(),
    });
    clearErrors();
    if (!parsed.success) {
      const issues = parsed.error.issues as { path: (string | number)[]; message: string }[];
      for (const issue of issues) {
        setError((issue.path.join(".") || "root") as TxField, { message: issue.message });
      }
      return;
    }
    mutation.mutate(parsed.data, {
      onSuccess: () => {
        toast.success("Transactie opgeslagen.");
        reset();
        setAmountDraft("0");
      },
      onError: (err) => {
        if (err instanceof ClientError && Object.keys(err.fieldErrors ?? {}).length > 0) {
          for (const [key, msgs] of Object.entries(err.fieldErrors)) {
            setError(key as TxField, { message: msgs[0] });
          }
        }
        toast.error(err.message);
      },
    });
  });

  const typeError = fieldError?.type?.message;
  const accountError = fieldError?.accountId?.message;
  const amountError = fieldError?.amount?.message;
  const dateError = fieldError?.transactionDate?.message;
  const categoryError = fieldError?.category?.message;
  const notesError = fieldError?.notes?.message;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="size-4 text-muted-foreground" />
          Voeg transactie toe
        </CardTitle>
        <CardDescription>
          Voeg debit (masuk) of kredit (keluar) toe aan een akun.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Jenis transactie</Label>
            <RadioGroup
              value={selectedType}
              onValueChange={(value) => setValue("type", value as "DEBIT" | "KREDIT")}
            >
              {Object.entries(TX_TYPE_LABELS).map(([value, label]) => {
                const optionId = `${typeGroupId}-${value}`;
                return (
                  <div
                    key={value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <RadioGroupItem id={optionId} value={value} />
                    <label className="cursor-pointer" htmlFor={optionId}>
                      {label}
                    </label>
                  </div>
                );
              })}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              {selectedAccount
                ? txTypeExplanation(selectedAccount.type, selectedType as "DEBIT" | "KREDIT")
                : "Kies eerst een rekening om het effect op het saldo te zien."}
            </p>
            {typeError ? <p className="text-xs text-destructive">{typeError}</p> : null}
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Rekening/pos</Label>
            <Select
              value={selectedAccountId}
              onValueChange={(value: string) => setValue("accountId", value)}
              aria-invalid={accountError ? true : undefined}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Kies rekening..." />
              </SelectTrigger>
              <SelectContent>
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
            {accountError ? <p className="text-xs text-destructive">{accountError}</p> : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="tx-amount">Nominal (Rp)</Label>
            <Input
              id="tx-amount"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={amountDraft}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setAmountDraft(digits === "" ? "0" : formatAmountInput(digits));
                setValue("amount", digits);
              }}
              aria-invalid={amountError ? true : undefined}
            />
            {amountError ? <p className="text-xs text-destructive">{amountError}</p> : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="tx-date">Tanggal</Label>
            <Input
              type="date"
              {...register("transactionDate")}
              id="tx-date"
              aria-invalid={dateError ? true : undefined}
            />
            {dateError ? <p className="text-xs text-destructive">{dateError}</p> : null}
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Kategori</Label>
            <Select
              value={selectedCategory}
              onValueChange={(value: string) => setValue("category", value)}
              aria-invalid={categoryError ? true : undefined}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Kies categorie..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryError ? (
              <p className="text-xs text-destructive">{categoryError}</p>
            ) : null}
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="tx-notes">Catatan</Label>
            <Textarea
              id="tx-notes"
              placeholder="Keterangan tambahan (opsional)"
              {...register("notes")}
              aria-invalid={notesError ? true : undefined}
            />
            {notesError ? <p className="text-xs text-destructive">{notesError}</p> : null}
          </div>

          <div className="sm:col-span-2">
            <Button
              type="submit"
              className="w-full"
              size="sm"
              disabled={mutation.isPending || accounts.length === 0}
            >
              {mutation.isPending ? "Menyimpan..." : "Simpan transaksi"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}