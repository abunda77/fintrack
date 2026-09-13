import { useEffect, useState } from "react";
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

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}

function prefersReducedMotion() {
  const media = (window as { matchMedia?: (query: string) => { matches: boolean } })
    .matchMedia;
  return media ? media("(prefers-reduced-motion: reduce)").matches : false;
}

/** Animeret teller vanuit 0 naar het doel (Stat-Led reveal). */
function useCountUp(target: number, duration = 550): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    let start: number | null = null;
    const frame = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min((ts - start) / duration, 1);
      setValue(Math.round(target * easeOutCubic(t)));
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

interface SupportingSpec {
  label: string;
  value: number;
  icon: LucideIcon;
  tintClass: string;
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
  const netWorth = useCountUp(summary?.netWorth ?? 0);

  const supporting: SupportingSpec[] = [
    {
      label: "Total Tabungan",
      value: summary?.totalSavings ?? 0,
      icon: PiggyBank,
      tintClass: "bg-positive/12 text-positive",
      caption:
        summary ? `${summary.savingsAccountCount} rekening tabungan aktif` : undefined,
    },
    {
      label: "Total Hutang Modal",
      value: summary?.totalDebt ?? 0,
      icon: HandCoins,
      tintClass: "bg-negative/12 text-negative",
      caption: summary ? `${summary.debtAccountCount} sumber hutang aktif` : undefined,
    },
    {
      label: "Total Aset Liquid",
      value: summary?.totalLiquidAssets ?? 0,
      icon: Coins,
      tintClass: "bg-warning/12 text-warning",
      tooltip:
        "Mengikuti definisi pada spreadsheet referensi: hutang modal diperlakukan sebagai dana yang masih dapat diputar, bukan aset bersih. Secara akuntansi, nilai tersebut perlu diberi label yang jelas.",
    },
  ];

  return (
    <>
      <section aria-labelledby="networth-label">
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0 flex-1">
            <p
              id="networth-label"
              className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
            >
              Kekayaan Bersih
            </p>
            {isLoading ? (
              <Skeleton className="mt-1.5 h-11 w-56" />
            ) : (
              <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl [overflow-wrap:anywhere]">
                {formatIDR(netWorth)}
              </p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              Tabungan dikurangi sisa hutang
            </p>
          </div>
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground/5">
            <Scale className="size-4 text-muted-foreground/70" />
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {supporting.map((c) => (
          <Card key={c.label} size="sm">
            <CardContent className="flex items-center gap-2.5 pt-3">
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${c.tintClass}`}>
                <c.icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
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
                  <Skeleton className="mt-1 h-5 w-28" />
                ) : (
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">
                    {formatIDR(c.value)}
                  </p>
                )}
                {c.caption ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.caption}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}