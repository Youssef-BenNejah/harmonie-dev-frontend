import { createFileRoute } from "@tanstack/react-router";
import { InvoiceListPage } from "@/components/app/InvoiceList";
import { requireAuth } from "@/lib/route-guards";

export const Route = createFileRoute("/factures-achats")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Factures Achats — Harmonie-dev" },
      { name: "description", content: "Suivez vos factures proforma et achats fournisseurs." },
    ],
  }),
  component: () => (
    <InvoiceListPage
      type="Proforma"
      title="Factures Achats"
      subtitle="Vos factures proforma et achats fournisseurs."
      newLabel="Nouvelle facture proforma"
    />
  ),
});
