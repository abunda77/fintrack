import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Coins,
  HandCoins,
  Info,
  PiggyBank,
  Scale,
  type LucideIcon,
} from "lucide-react";
import type { DashboardSummary } from "../../../shared/schemas";
import { formatIDR } from "@/lib/format";

interface CardSpec {
  label: string;
  value: number;
  icon: LucideIcon;
  iconClass: string;
  valueClass: string;
  caption?: string;
  tooltip?: string;
}

export function MetricCards({
  summary,
  isLoading,
}: {
  summary: DashboardSummary | undefined;
  isLoading: boolean;
}) {
  const cards: CardSpec[] = [
    {
      label: "Total Tabungan",
      value: summary?.totalSavings ?? 0,
      icon: PiggyBank,
      iconClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
      valueClass: "text-emerald-700 dark:text-emerald-400",
      caption:
        summary ? `${summary.savingsAccountCount} rekening tabungan aktif` : undefined,
    },
    {
      label: "Total Hutang Modal",
      value: summary?.totalDebt ?? 0,
      icon: HandCoins,
      iconClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
      valueClass: "text-rose-700 dark:text-rose-400",
      caption: summary ? `${summary.debtAccountCount} sumber hutang aktif` : undefined,
    },
    {
      label: "Total Aset Liquid",
      value: summary?.totalLiquidAssets ?? 0,
      icon: Coins,
      iconClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
      valueClass: "text-amber-700 dark:text-amber-400",
      tooltip:
        "Mengikuti definisi pada spreadsheet referensi: hutang modal diperlakukan sebagai dana yang masih dapat diputar, bukan aset bersih. Secara akuntansi, nilai tersebut perlu diberi label yang jelas.",
    },
    {
      label: "Kekayaan Bersih",
      value: summary?.netWorth ?? 0,
      icon: Scale,
      iconClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
      valueClass: "text-slate-800 dark:text-slate-100",
      caption: "Tabungan dikurangi sisa hutang",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="flex items-start gap-3 pt-5">
            <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${c.iconClass}`}>
              <c.icon className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <span className="truncate">{c.label}</span>
                {c.tooltip ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Info tentang ${c.label}`}
                        className="text-muted-foreground/70"
                      >
                        <Info className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{c.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
              {isLoading ? (
                <Skeleton className="mt-1.5 h-7 w-40" />
              ) : (
                <p
                  className={`mt-1 truncate text-xl font-bold tabular-nums sm:text-2xl ${c.valueClass}`}
                >
                  {formatIDR(c.value)}
                </p>
              )}
              {c.caption ? (
                <p className="mt-0.5 text-[11px] text-muted-foreground">{c.caption}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}