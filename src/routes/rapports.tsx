import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/app/AdminLayout";
import { PlanFeatureLocked } from "@/components/app/PlanUsageCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/mock-data";
import {
  ApiError,
  downloadReportPdf,
  getRevenueSeries,
  getReportOverview,
  getTopClients,
  getTopServices,
  isPlanLimitError,
  listCurrencies,
  type ApiCurrencyAmount,
} from "@/lib/api";

const DEFAULT_CURRENCY = "TND";

export const Route = createFileRoute("/rapports")({
  head: () => ({
    meta: [
      { title: "Rapports — Harmonie-dev" },
      { name: "description", content: "Analysez vos revenus, dépenses, meilleurs clients et services." },
    ],
  }),
  component: Rapports,
});

function otherCurrencies(amounts: ApiCurrencyAmount[] | undefined, selected: string) {
  return (amounts ?? []).filter((c) => c.currency !== selected && c.amount !== 0);
}

function Rapports() {
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const { data: currencies = [] } = useQuery({ queryKey: ["currencies"], queryFn: listCurrencies });
  const { data: overview, error: overviewError } = useQuery({
    queryKey: ["report-overview", currency],
    queryFn: () => getReportOverview(undefined, undefined, currency),
    retry: (failureCount, err) => !isPlanLimitError(err) && failureCount < 3,
  });
  const { data: revenueSeries = [] } = useQuery({ queryKey: ["report-revenue-series", currency], queryFn: () => getRevenueSeries(9, currency) });
  const { data: topClients = [], isLoading: topClientsLoading } = useQuery({
    queryKey: ["report-top-clients", currency],
    queryFn: () => getTopClients(5, currency),
  });
  const { data: topServices = [], isLoading: topServicesLoading } = useQuery({
    queryKey: ["report-top-services", currency],
    queryFn: () => getTopServices(5, currency),
  });
  const [exporting, setExporting] = useState(false);

  const currencyOptions = currencies.some((c) => c.code === DEFAULT_CURRENCY)
    ? currencies
    : [{ id: DEFAULT_CURRENCY, code: DEFAULT_CURRENCY, name: "Dinar tunisien", symbol: "DT", createdBy: "" }, ...currencies];

  const exportPdf = async () => {
    setExporting(true);
    try {
      await downloadReportPdf(undefined, undefined, currency);
      toast.success("Rapport téléchargé");
    } catch (err) {
      toast.error("Échec de la génération du rapport", { description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setExporting(false);
    }
  };

  if (isPlanLimitError(overviewError)) {
    return (
      <AdminLayout>
        <PageHeader title="Rapports" subtitle="Analyse de votre activité sur les 9 derniers mois." />
        <PlanFeatureLocked label="Les rapports" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Rapports"
        subtitle="Analyse de votre activité sur les 9 derniers mois."
        actions={
          <>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-10 w-[130px] rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="rounded-xl" onClick={exportPdf} disabled={exporting}>
              <Download className="mr-1.5 size-4" /> {exporting ? "Génération…" : "Exporter"}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass rounded-2xl p-5">
          <p className="text-sm text-muted-foreground">Revenus (9 mois)</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-semibold">
            <TrendingUp className="size-5 text-success" /> {formatMoney(overview?.totalRevenue ?? 0, currency)}
          </p>
          {otherCurrencies(overview?.revenueByCurrency, currency).map((c) => (
            <p key={c.currency} className="mt-1 text-sm text-muted-foreground">
              + {formatMoney(c.amount, c.currency)}
            </p>
          ))}
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-sm text-muted-foreground">Dépenses (9 mois)</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-semibold">
            <TrendingDown className="size-5 text-destructive" /> {formatMoney(overview?.totalExpenses ?? 0, currency)}
          </p>
          {otherCurrencies(overview?.expensesByCurrency, currency).map((c) => (
            <p key={c.currency} className="mt-1 text-sm text-muted-foreground">
              + {formatMoney(c.amount, c.currency)}
            </p>
          ))}
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-sm text-muted-foreground">Marge (9 mois)</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatMoney((overview?.totalRevenue ?? 0) - (overview?.totalExpenses ?? 0), currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {currency === DEFAULT_CURRENCY ? "Devise par défaut : Dinar (TND)" : `Devise sélectionnée : ${currency}`}
          </p>
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-5">
        <h2 className="text-base font-semibold">Revenus vs. dépenses</h2>
        <div className="mt-4 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueSeries} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="mois" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)" }}
                formatter={(v: number) => `${v.toLocaleString("fr-FR")} ${currency}`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenus" name="Revenus" fill="var(--ocean)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="depenses" name="Dépenses" fill="var(--sky)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h2 className="text-base font-semibold">Meilleurs clients</h2>
          {topClients.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{topClientsLoading ? "Chargement…" : "Aucune facture enregistrée."}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {topClients.map((c, i) => (
                <li key={c.clientId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-full bg-ice text-xs font-semibold text-navy dark:bg-white/10 dark:text-sky">{i + 1}</span>
                    <span className="text-sm font-medium">{c.nom}</span>
                  </div>
                  <span className="text-sm font-semibold">{formatMoney(c.total, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="glass rounded-2xl p-5">
          <h2 className="text-base font-semibold">Services les plus vendus</h2>
          {topServices.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{topServicesLoading ? "Chargement…" : "Aucune vente enregistrée."}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {topServices.map((s, i) => (
                <li key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-full bg-ice text-xs font-semibold text-navy dark:bg-white/10 dark:text-sky">{i + 1}</span>
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  <span className="text-sm font-semibold">{formatMoney(s.totalSold, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
