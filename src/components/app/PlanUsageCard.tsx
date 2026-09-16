import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, Crown, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getMyPlanUsage, type ApiLimitUsage } from "@/lib/api";
import { cn } from "@/lib/utils";

function UsageRow({ label, usage }: { label: string; usage: ApiLimitUsage }) {
  if (usage.limit === null) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <Badge variant="outline" className="rounded-full text-[10px]">Illimité</Badge>
      </div>
    );
  }
  const ratio = usage.limit === 0 ? 1 : usage.used / usage.limit;
  const atLimit = usage.used >= usage.limit;
  const nearLimit = !atLimit && ratio >= 0.8;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={cn(
            "font-semibold",
            atLimit ? "text-destructive" : nearLimit ? "text-warning" : "text-foreground",
          )}
        >
          {usage.used}/{usage.limit}
        </span>
      </div>
      <Progress
        value={Math.min(100, ratio * 100)}
        className={cn("mt-1.5 h-1.5", atLimit && "[&>div]:bg-destructive", nearLimit && "[&>div]:bg-warning")}
      />
    </div>
  );
}

function FeatureChip({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        enabled ? "border-success/30 bg-success/10 text-success" : "border-border bg-muted text-muted-foreground",
      )}
    >
      {enabled ? <Check className="size-3" /> : <Lock className="size-3" />}
      {label}
    </span>
  );
}

export function PlanUsageCard() {
  const { data: usage, isLoading } = useQuery({ queryKey: ["plan-usage"], queryFn: getMyPlanUsage });

  if (isLoading || !usage) return null;

  const anyAtLimit =
    (usage.invoices.limit !== null && usage.invoices.used >= usage.invoices.limit) ||
    (usage.clients.limit !== null && usage.clients.used >= usage.clients.limit) ||
    (usage.products.limit !== null && usage.products.used >= usage.products.limit);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Crown className="size-4 text-ocean dark:text-sky" /> Votre plan — {usage.planNom ?? "—"}
          </h2>
          {usage.freeTrial && usage.trialDaysLeft !== null ? (
            <p className="text-sm text-muted-foreground">
              Essai gratuit — {usage.trialDaysLeft} jour{usage.trialDaysLeft > 1 ? "s" : ""} restant{usage.trialDaysLeft > 1 ? "s" : ""}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Consommation du mois en cours</p>
          )}
        </div>
        <Button asChild size="sm" variant="outline" className="rounded-xl">
          <Link to="/abonnement">Changer de plan</Link>
        </Button>
      </div>

      {anyAtLimit ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" /> Une ou plusieurs limites de votre plan sont atteintes.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <UsageRow label="Factures ce mois-ci" usage={usage.invoices} />
        <UsageRow label="Clients" usage={usage.clients} />
        <UsageRow label="Services / produits" usage={usage.products} />
        <UsageRow label="Taxes personnalisées" usage={usage.customTaxes} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
        <FeatureChip label="Multi-devises" enabled={usage.multiCurrency} />
        <FeatureChip label="Rapports" enabled={usage.reportsAccess} />
        <FeatureChip label="Dépenses" enabled={usage.expensesEnabled} />
        <FeatureChip label="Export ZIP" enabled={usage.bulkExportEnabled} />
      </div>
    </div>
  );
}

export function PlanFeatureLocked({ label }: { label: string }) {
  return (
    <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Lock className="size-5" />
      </span>
      <div>
        <p className="font-semibold">{label} — non inclus dans votre plan</p>
        <p className="mt-1 text-sm text-muted-foreground">Passez à un plan supérieur pour débloquer cette fonctionnalité.</p>
      </div>
      <Button asChild className="rounded-xl">
        <Link to="/abonnement">Voir les plans</Link>
      </Button>
    </div>
  );
}
