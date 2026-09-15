import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HandCoins } from "lucide-react";
import { AdminLayout, PageHeader } from "@/components/app/AdminLayout";
import { DataTable, type Column } from "@/components/app/DataTable";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { listAllPayments, type ApiPayment } from "@/lib/api";

export const Route = createFileRoute("/paiements")({
  head: () => ({
    meta: [
      { title: "Paiements — Harmonie-dev" },
      { name: "description", content: "Historique de tous les paiements enregistrés sur vos factures." },
    ],
  }),
  component: Paiements,
});

function Paiements() {
  const { data: rows = [], isLoading, isError } = useQuery({ queryKey: ["all-payments"], queryFn: listAllPayments });

  const total = rows.reduce((sum, p) => sum + p.amountPaid, 0);

  const columns: Column<ApiPayment>[] = [
    {
      key: "invoice",
      header: "Facture",
      cell: (r) => (
        <Link to="/factures/$id" params={{ id: r.invoice.id }} className="font-medium text-ocean hover:underline dark:text-sky">
          {(r.invoice.type === "Proforma" ? "PRO-" : "") + r.invoice.number + "/" + r.invoice.year}
        </Link>
      ),
    },
    {
      key: "amountPaid",
      header: "Montant",
      className: "text-right",
      sortable: true,
      sortValue: (r) => r.amountPaid,
      cell: (r) => <span className="font-semibold">{formatMoney(r.amountPaid, r.invoice.currency.code)}</span>,
    },
    { key: "paymentMethod", header: "Méthode", cell: (r) => <span className="text-muted-foreground">{r.paymentMethod}</span> },
    {
      key: "paymentDate",
      header: "Date",
      sortable: true,
      sortValue: (r) => r.paymentDate,
      cell: (r) => <span className="text-muted-foreground">{formatDate(r.paymentDate)}</span>,
    },
  ];

  return (
    <AdminLayout>
      <PageHeader title="Paiements" subtitle="Historique de tous les paiements enregistrés sur vos factures." />

      {isError ? (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Impossible de charger les paiements — vérifiez que le serveur backend est démarré.
        </div>
      ) : null}

      <div className="mb-6 glass rounded-2xl p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HandCoins className="size-4" /> Total encaissé
        </div>
        <p className="mt-2 text-2xl font-semibold">{formatMoney(total, "TND")}</p>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        searchKeys={(r) => `${r.invoice.number}/${r.invoice.year} ${r.paymentMethod}`}
        searchPlaceholder="Rechercher un paiement…"
        emptyTitle={isLoading ? "Chargement…" : "Aucun paiement enregistré"}
      />
    </AdminLayout>
  );
}
