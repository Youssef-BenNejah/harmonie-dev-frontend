import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FileWarning, Plus, TrendingUp, Users, Wallet } from "lucide-react";
import { AdminLayout, PageHeader } from "@/components/app/AdminLayout";
import { KpiCard } from "@/components/app/KpiCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/mock-data";
import {
  getDashboardSummary,
  getInvoiceStatusDistribution,
  getRecentActivity,
  getRecentInvoices,
  getRevenueSeries,
  listCurrencies,
  useCurrentUser,
  type ApiCurrencyAmount,
} from "@/lib/api";
import { apiClientLabel, apiInvoiceNumberLabel } from "@/lib/invoice-adapter";

const DEFAULT_CURRENCY = "TND";

export const Route = createFileRoute("/tableau-de-bord")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Harmonie-dev" },
      { name: "description", content: "Vue d'ensemble de votre chiffre d'affaires, factures impayées et dépenses." },
      { property: "og:title", content: "Tableau de bord — Harmonie-dev" },
      { property: "og:description", content: "Vue d'ensemble de votre activité de facturation." },
    ],
  }),
  component: Dashboard,
});

const donutColors = ["var(--ocean)", "var(--sky)", "var(--navy)", "var(--destructive)"];

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  return `il y a ${days} j`;
}

function otherCurrenciesFootnote(amounts: ApiCurrencyAmount[] | undefined, selected: string): { footnote?: string } {
  const others = (amounts ?? []).filter((c) => c.currency !== selected && c.amount !== 0);
  if (others.length === 0) return {};
  return { footnote: others.map((c) => formatMoney(c.amount, c.currency)).join(" · ") };
}

function Dashboard() {
  const currentUser = useCurrentUser();
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const { data: currencies = [] } = useQuery({ queryKey: ["currencies"], queryFn: listCurrencies });
  const { data: summary } = useQuery({ queryKey: ["dashboard-summary", currency], queryFn: () => getDashboardSummary(currency) });
  const { data: revenueSeries = [] } = useQuery({ queryKey: ["dashboard-revenue-series", currency], queryFn: () => getRevenueSeries(9, currency) });
  const { data: statutDistribution = [] } = useQuery({ queryKey: ["dashboard-status-distribution"], queryFn: getInvoiceStatusDistribution });
  const { data: recent = [] } = useQuery({ queryKey: ["dashboard-recent-invoices"], queryFn: () => getRecentInvoices(5) });
  const { data: activities = [] } = useQuery({ queryKey: ["dashboard-recent-activity"], queryFn: () => getRecentActivity(5) });

  const currencyOptions = currencies.some((c) => c.code === DEFAULT_CURRENCY)
    ? currencies
    : [{ id: DEFAULT_CURRENCY, code: DEFAULT_CURRENCY, name: "Dinar tunisien", symbol: "DT", createdBy: "" }, ...currencies];

  return (
    <AdminLayout>
      <div className="glass relative mb-6 overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-40">
          <svg viewBox="0 0 1440 200" className="animate-wave h-full w-[200%]" preserveAspectRatio="none" aria-hidden>
            <path fill="var(--sky)" fillOpacity="0.5" d="M0,120L80,110C160,100,320,80,480,96C640,112,800,160,960,160C1120,160,1280,112,1360,88L1440,64L1440,200L0,200Z" />
          </svg>
        </div>
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ocean dark:text-sky">Bonjour {currentUser?.firstName ?? ""} 👋</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gradient-ocean sm:text-4xl">Tableau de bord</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Votre activité en un coup d'œil : encaissements, impayés et dépenses.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-10 w-[130px] rounded-xl bg-background/70">
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
            <Button asChild className="rounded-xl">
              <Link to="/factures/nouvelle">
                <Plus className="mr-1.5 size-4" /> Nouvelle facture
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Chiffre d'affaires encaissé"
          value={summary?.revenue ?? 0}
          suffix={currency}
          trend={0}
          icon={TrendingUp}
          data={summary?.revenueTrend ?? [0]}
          {...otherCurrenciesFootnote(summary?.revenueByCurrency, currency)}
        />
        <KpiCard label="Factures impayées" value={summary?.unpaidInvoicesCount ?? 0} trend={0} icon={FileWarning} data={summary?.unpaidTrend ?? [0]} accent="var(--sky)" />
        <KpiCard label="Nombre de clients" value={summary?.clientsCount ?? 0} trend={0} icon={Users} data={summary?.clientsTrend ?? [0]} accent="var(--navy)" />
        <KpiCard
          label="Dépenses du mois"
          value={summary?.monthlyExpenses ?? 0}
          suffix={currency}
          trend={0}
          icon={Wallet}
          data={summary?.expensesTrend ?? [0]}
          accent="var(--sky)"
          {...otherCurrenciesFootnote(summary?.expensesByCurrency, currency)}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Revenus sur les 9 derniers mois</h2>
              <p className="text-sm text-muted-foreground">Montant total facturé en {currency}</p>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--ocean)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--ocean)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mois" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)" }}
                  formatter={(v: number) => [`${v.toLocaleString("fr-FR")} ${currency}`, "Revenus"]}
                />
                <Area type="monotone" dataKey="revenus" stroke="var(--ocean)" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="text-base font-semibold">Statut des factures</h2>
          <p className="text-sm text-muted-foreground">Répartition sur 90 jours</p>
          {statutDistribution.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">Aucune facture récente.</p>
          ) : (
            <>
              <div className="h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statutDistribution} dataKey="value" innerRadius={58} outerRadius={86} paddingAngle={3} stroke="none">
                      {statutDistribution.map((entry, i) => (
                        <Cell key={entry.name} fill={donutColors[i % donutColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-2">
                {statutDistribution.map((s, i) => (
                  <li key={s.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="size-2.5 rounded-full" style={{ background: donutColors[i % donutColors.length] }} />
                      {s.name}
                    </span>
                    <span className="font-semibold">{s.value} %</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="glass overflow-hidden rounded-2xl lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border/60 p-5">
            <h2 className="text-base font-semibold">Factures récentes</h2>
            <Button asChild variant="ghost" size="sm" className="rounded-xl">
              <Link to="/factures-ventes">Tout voir</Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="px-5 py-3 font-semibold">Numéro</th>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Statut</th>
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((inv) => (
                  <tr key={inv.id} className="border-t border-border/50 hover:bg-ice/40 dark:hover:bg-white/5">
                    <td className="px-5 py-3 font-medium">
                      <Link to="/factures/$id" params={{ id: inv.id }} className="hover:text-ocean">
                        {apiInvoiceNumberLabel(inv)}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{apiClientLabel(inv.client)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{inv.date}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={inv.paymentStatus} />
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">{formatMoney(inv.total, inv.currency.code)}</td>
                  </tr>
                ))}
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-muted-foreground">
                      Aucune facture pour le moment.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="text-base font-semibold">Activité récente</h2>
          {activities.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Aucune activité récente.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {activities.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1 size-2.5 shrink-0 rounded-full bg-ocean" />
                  <div>
                    <p className="text-sm font-medium leading-tight">{a.titre}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.detail} · {relativeTime(a.temps)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export { PageHeader };
