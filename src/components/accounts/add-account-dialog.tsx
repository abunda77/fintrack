import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { accountInputSchema } from "../../../shared/schemas";
import { ClientError } from "@/lib/api";
import { useCreateAccount } from "@/lib/queries";
import { formatAmountInput } from "@/lib/format";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type RawAccountForm = { name: string; type: string; openingBalance: string };
type AccountField = "name" | "type" | "openingBalance";

export function AddAccountDialog({ defaultType }: { defaultType: "TABUNGAN" | "HUTANG_MODAL" }) {
  const [open, setOpen] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState("0");
  const typeGroupId = useId();
  const mutations = useCreateAccount();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    reset,
    formState,
    control,
  } = useForm<RawAccountForm>({
    defaultValues: { name: "", type: defaultType, openingBalance: "" },
  });

  register("type");

  const selectedType = useWatch({ control, name: "type" });
  const errName = formState.errors?.name?.message;
  const errType = formState.errors?.type?.message;
  const errBalance = formState.errors?.openingBalance?.message;

  const onSubmit = handleSubmit(async (data) => {
    const balance = Number((data.openingBalance ?? "").replace(/\D/g, "") || 0);
    const parsed = accountInputSchema.safeParse({
      name: data.name,
      type: data.type,
      openingBalance: balance,
    });
    clearErrors();
    if (!parsed.success) {
      const issues = parsed.error.issues as { path: (string | number)[]; message: string }[];
      for (const issue of issues)
        setError((issue.path.join(".") || "root") as AccountField, { message: issue.message });
      return;
    }
    mutations.mutate(parsed.data, {
      onSuccess: (account) => {
        toast.success(`Akun "${account.name}" toegevoegd.`);
        setOpen(false);
        reset();
        setBalanceDraft("0");
      },
      onError: (err) => {
        if (err instanceof ClientError && Object.keys(err.fieldErrors ?? {}).length > 0) {
          for (const [key, msgs] of Object.entries(err.fieldErrors)) {
            setError(key as AccountField, { message: msgs[0] });
          }
        }
        toast.error(err.message);
      },
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Tambah akun
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah akun</DialogTitle>
          <DialogDescription>
            Buat pos baru untuk tabungan atau hutang modal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="ap-name">Nama akun</Label>
            <Input
              {...register("name")}
              id="ap-name"
              placeholder="Misal: BRI Extra, SPayLater..."
              aria-invalid={errName ? true : undefined}
            />
            {errName ? <p className="text-xs text-destructive">{errName}</p> : null}
          </div>

          <div className="grid gap-1.5">
            <Label>Tipe akun</Label>
            <RadioGroup
              value={selectedType ?? defaultType}
              onValueChange={(value: string) => setValue("type", value, { shouldValidate: true })}
            >
              {[
                { value: "TABUNGAN", label: "Tabungan" },
                { value: "HUTANG_MODAL", label: "Hutang Modal" },
              ].map((opt) => {
                const optionId = `${typeGroupId}-${opt.value}`;
                return (
                  <div
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <RadioGroupItem id={optionId} value={opt.value} />
                    <label className="cursor-pointer" htmlFor={optionId}>
                      {opt.label}
                    </label>
                  </div>
                );
              })}
            </RadioGroup>
            {errType ? <p className="text-xs text-destructive">{errType}</p> : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ap-balance">Saldo Awal</Label>
            <Input
              id="ap-balance"
              inputMode="numeric"
              autoComplete="off"
              value={balanceDraft}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setBalanceDraft(digits === "" ? "0" : formatAmountInput(digits));
                setValue("openingBalance", digits);
              }}
              aria-invalid={errBalance ? true : undefined}
            />
            <p className="text-xs text-muted-foreground">
              Jumlah dalam Rupiah (misal: 1.500.000). Kosong = Rp 0.
            </p>
            {errBalance ? <p className="text-xs text-destructive">{errBalance}</p> : null}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={mutations.isPending}>
              {mutations.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}