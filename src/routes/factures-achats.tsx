import { createFileRoute } from "@tanstack/react-router";
import { InvoiceListPage } from "@/components/app/InvoiceList";

export const Route = createFileRoute("/factures-achats")({
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
