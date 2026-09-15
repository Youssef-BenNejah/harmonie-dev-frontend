import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { cn } from "@/lib/utils";

function useCounter(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export function KpiCard({
  label,
  value,
  suffix,
  prefix,
  trend,
  icon: Icon,
  data,
  accent = "var(--ocean)",
  decimals = 0,
  footnote,
}: {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  trend: number;
  icon: LucideIcon;
  data: number[];
  accent?: string;
  decimals?: number;
  footnote?: string;
}) {
  const animated = useCounter(value);
  const up = trend >= 0;

  return (
    <div className="glass lift rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {prefix}
            {animated.toLocaleString("fr-FR", {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })}
            {suffix ? <span className="ml-1 text-base font-medium text-muted-foreground">{suffix}</span> : null}
          </p>
          {footnote ? <p className="mt-1 text-xs text-muted-foreground">{footnote}</p> : null}
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-ocean/10 text-ocean dark:text-sky">
          <Icon className="size-5" />
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-4">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
            up ? "bg-success/15 text-success" : "bg-destructive/12 text-destructive",
          )}
        >
          {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
          {Math.abs(trend)}%
        </span>
        <Sparkline data={data} stroke={accent} className="h-9 w-28" />
      </div>
    </div>
  );
}
