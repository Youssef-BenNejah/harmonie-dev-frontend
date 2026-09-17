import { createFileRoute } from "@tanstack/react-router";
import { InvoiceListPage } from "@/components/app/InvoiceList";
import { requireAuth } from "@/lib/route-guards";

export const Route = createFileRoute("/factures-ventes")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Factures Ventes — Harmonie-dev" },
      { name: "description", content: "Suivez et gérez vos factures de vente standard." },
    ],
  }),
  component: () => (
    <InvoiceListPage
      type="Standard"
      title="Factures Ventes"
      subtitle="Vos factures standard émises à vos clients."
      newLabel="Nouvelle facture"
    />
  ),
});
