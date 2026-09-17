import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Download, FileCheck2, HandCoins, Mail, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/app/AdminLayout";
import { MarkPaidSheet } from "@/components/app/MarkPaidSheet";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { amountInWords, formatDate, formatMoney } from "@/lib/mock-data";
import {
  ApiError,
  convertInvoiceApi,
  deleteInvoiceApi,
  deletePaymentApi,
  downloadInvoicePdf,
  duplicateInvoiceApi,
  getInvoiceById,
  getMyCompany,
  listPaymentsForInvoice,
  sendInvoiceByEmail,
} from "@/lib/api";
import { apiClientLabel, apiInvoiceNumberLabel } from "@/lib/invoice-adapter";
import { requireAuth } from "@/lib/route-guards";

export const Route = createFileRoute("/factures/$id")({
  beforeLoad: requireAuth,
  head: ({ params }) => ({
    meta: [{ title: `Facture ${params.id} — Harmonie-dev` }],
  }),
  component: FactureDetail,
});

function FactureDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading, isError } = useQuery({ queryKey: ["invoice", id], queryFn: () => getInvoiceById(id) });
  const { data: history = [] } = useQuery({ queryKey: ["payments", id], queryFn: () => listPaymentsForInvoice(id), enabled: !!invoice });
  const { data: company } = useQuery({ queryKey: ["company"], queryFn: getMyCompany });

  const [payOpen, setPayOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);

  const onError = (err: unknown, fallback: string) => {
    const message = err instanceof ApiError ? err.message : fallback;
    toast.error(fallback, { description: message });
  };

  const convertMutation = useMutation({
    mutationFn: convertInvoiceApi,
    onSuccess: (copy) => {
      toast.success("Convertie en facture", { description: invoice ? `${apiInvoiceNumberLabel(invoice)} → ${apiInvoiceNumberLabel(copy)}` : undefined });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      navigate({ to: "/factures/$id", params: { id: copy.id } });
    },
    onError: (err) => onError(err, "Échec de la conversion"),
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateInvoiceApi,
    onSuccess: (copy) => {
      toast.success("Facture dupliquée", { description: invoice ? `${apiInvoiceNumberLabel(invoice)} → ${apiInvoiceNumberLabel(copy)}` : undefined });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      navigate({ to: "/factures/$id", params: { id: copy.id } });
    },
    onError: (err) => onError(err, "Échec de la duplication"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInvoiceApi,
    onSuccess: () => {
      toast("Facture supprimée", { description: invoice ? apiInvoiceNumberLabel(invoice) : undefined });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      navigate({ to: invoice?.type === "Standard" ? "/factures-ventes" : "/factures-achats" });
    },
    onError: (err) => onError(err, "Échec de la suppression"),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: deletePaymentApi,
    onSuccess: () => {
      toast("Paiement supprimé");
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["payments", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (err) => onError(err, "Échec de la suppression du paiement"),
  });

  if (isLoading || !invoice) {
    return (
      <AdminLayout>
        <PageHeader title={isError ? "Facture introuvable" : "Chargement…"} subtitle="" />
      </AdminLayout>
    );
  }

  const listRoute = invoice.type === "Standard" ? "/factures-ventes" : "/factures-achats";
  const progress = invoice.total > 0 ? Math.round((invoice.paidAmount / invoice.total) * 100) : 0;
  const totalHT = invoice.subtotal - invoice.taxAmount - invoice.timbre;
  const client = invoice.client;

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadInvoicePdf(invoice.id, `${apiInvoiceNumberLabel(invoice)}.pdf`);
      toast.success("PDF téléchargé", { description: `${apiInvoiceNumberLabel(invoice)}.pdf` });
    } catch {
      toast.error("Échec de la génération du PDF");
    } finally {
      setDownloading(false);
    }
  };

  const sendByEmail = async () => {
    setSending(true);
    try {
      await sendInvoiceByEmail(invoice.id);
      toast.success("Facture envoyée par e-mail", { description: apiClientLabel(invoice.client) });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Échec de l'envoi";
      toast.error("Échec de l'envoi par e-mail", { description: message });
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title={apiInvoiceNumberLabel(invoice)}
        subtitle={`${invoice.status} ${invoice.type === "Proforma" ? "(proforma)" : ""} pour ${apiClientLabel(invoice.client)}`}
        actions={
          <>
            <Button variant="outline" className="rounded-xl" asChild>
              <Link to={listRoute}>
                <ArrowLeft className="mr-1.5 size-4" /> Retour
              </Link>
            </Button>
            <Button variant="outline" className="rounded-xl" asChild>
              <Link to="/factures/nouvelle" search={{ type: invoice.type, id: invoice.id }}>
                <Pencil className="mr-1.5 size-4" /> Modifier
              </Link>
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={sendByEmail} disabled={sending}>
              <Mail className="mr-1.5 size-4" /> {sending ? "Envoi…" : "Envoyer"}
            </Button>
            <Button className="rounded-xl" onClick={downloadPdf} disabled={downloading}>
              <Download className="mr-1.5 size-4" /> {downloading ? "Génération…" : "Télécharger PDF"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass overflow-hidden rounded-2xl p-8 sm:p-10 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border/60 pb-6">
            <div className="flex items-center gap-3">
              {company?.logoUrl ? (
                <img src={company.logoUrl} alt={company.name} className="size-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <img src="/logo-mark.png" alt="Harmonie-dev" className="size-14 shrink-0" />
              )}
              <div>
                <p className="text-lg font-semibold">{company?.name || "Votre entreprise"}</p>
                <p className="text-sm text-muted-foreground">{company?.address}</p>
                <p className="text-sm text-muted-foreground">
                  {company?.phone} {company?.matriculeFisc ? `· MF ${company.matriculeFisc}` : ""}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-gradient-ocean">{invoice.status}</p>
              <p className="mt-1 text-sm text-muted-foreground">N° {apiInvoiceNumberLabel(invoice)}</p>
              <p className="text-sm text-muted-foreground">Émise le {formatDate(invoice.date)}</p>
              <p className="text-sm text-muted-foreground">Échéance {formatDate(invoice.expirationDate)}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Facturé à</p>
              <p className="mt-1 font-semibold">{apiClientLabel(invoice.client)}</p>
              {client.type === "PERSON" ? (
                <>
                  {client.person?.cin ? <p className="text-sm text-muted-foreground">CIN : {client.person.cin}</p> : null}
                  {client.person?.adresse ? <p className="text-sm text-muted-foreground">{client.person.adresse}</p> : null}
                </>
              ) : (
                <>
                  {client.entreprise?.fisc ? <p className="text-sm text-muted-foreground">MF : {client.entreprise.fisc}</p> : null}
                  {client.entreprise?.adresse ? <p className="text-sm text-muted-foreground">{client.entreprise.adresse}</p> : null}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <StatusBadge status={invoice.status} />
              <StatusBadge status={invoice.paymentStatus} />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-ice/50 text-left text-xs tracking-wide text-navy uppercase dark:bg-white/5 dark:text-sky">
                  <th className="px-4 py-3 font-semibold">Réf</th>
                  <th className="px-4 py-3 font-semibold">Article</th>
                  <th className="px-4 py-3 text-center font-semibold">Qté</th>
                  <th className="px-4 py-3 text-right font-semibold">Prix</th>
                  <th className="px-4 py-3 text-right font-semibold">Taxe</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((l) => (
                  <tr key={l.id} className="border-t border-border/50">
                    <td className="px-4 py-3 text-muted-foreground">{l.ref || "—"}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{l.article}</p>
                      <p className="text-xs text-muted-foreground">{l.description}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{l.quantity}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatMoney(l.price, invoice.currency.code)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{l.taxName ? `${l.taxName} (${l.taxRate}%)` : "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoney(l.total, invoice.currency.code)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total HT</span>
              <span className="font-medium">{formatMoney(totalHT, invoice.currency.code)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total taxes</span>
              <span className="font-medium">{formatMoney(invoice.taxAmount, invoice.currency.code)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Timbre fiscal</span>
              <span className="font-medium">{formatMoney(invoice.timbre, invoice.currency.code)}</span>
            </div>
            <div className="my-2 h-px bg-border" />
            <div className="flex justify-between text-base">
              <span className="font-semibold">Total TTC</span>
              <span className="font-bold text-gradient-ocean">{formatMoney(invoice.total, invoice.currency.code)}</span>
            </div>
          </div>

          <p className="mt-6 text-sm text-muted-foreground italic">
            La présente facture est arrêtée à la somme de {amountInWords(invoice.total, invoice.currency.name)}.
          </p>

          {invoice.note ? (
            <div className="mt-6 rounded-xl border border-border/60 bg-ice/40 p-4 text-sm dark:bg-white/5">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Note</p>
              <p className="mt-1">{invoice.note}</p>
            </div>
          ) : null}

          <p className="mt-10 text-center text-xs text-muted-foreground">
            Facture générée par ordinateur, valable sans signature ni cachet.
          </p>
          <div className="mt-4 flex items-center justify-center gap-1.5 border-t border-border/50 pt-4 text-xs text-muted-foreground">
            <img src="/logo-mark.png" alt="" className="size-4" />
            Généré avec Harmonie-dev
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Suivi du paiement</h2>
              {invoice.paymentStatus !== "Payé" ? (
                <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setPayOpen(true)}>
                  <HandCoins className="mr-1.5 size-3.5" /> Encaisser
                </Button>
              ) : null}
            </div>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-2xl font-semibold">{formatMoney(invoice.paidAmount, invoice.currency.code)}</span>
              <span className="text-sm text-muted-foreground">/ {formatMoney(invoice.total, invoice.currency.code)}</span>
            </div>
            <Progress value={progress} className="mt-3" />
            <p className="mt-2 text-xs text-muted-foreground">{progress}% encaissé</p>

            <div className="mt-5 border-t border-border/60 pt-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Historique des paiements</p>
              {history.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Aucun paiement enregistré.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {history.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{formatMoney(p.amountPaid, invoice.currency.code)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(p.paymentDate)} · {p.paymentMethod}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-destructive hover:text-destructive"
                        onClick={() => deletePaymentMutation.mutate(p.id)}
                        disabled={deletePaymentMutation.isPending}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h2 className="text-base font-semibold">Actions</h2>
            <div className="mt-4 space-y-2">
              {invoice.type === "Proforma" && !invoice.isConverted ? (
                <Button className="w-full rounded-xl" onClick={() => convertMutation.mutate(invoice.id)} disabled={convertMutation.isPending}>
                  <FileCheck2 className="mr-1.5 size-4" /> Convertir en facture
                </Button>
              ) : null}
              <Button variant="outline" className="w-full rounded-xl" onClick={() => duplicateMutation.mutate(invoice.id)} disabled={duplicateMutation.isPending}>
                <Copy className="mr-1.5 size-4" /> Dupliquer
              </Button>
              <Button
                variant="outline"
                className="w-full justify-center rounded-xl text-destructive hover:text-destructive"
                onClick={() => deleteMutation.mutate(invoice.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-1.5 size-4" /> Supprimer la facture
              </Button>
            </div>
          </div>
        </div>
      </div>

      <MarkPaidSheet invoice={invoice} open={payOpen} onOpenChange={setPayOpen} />
    </AdminLayout>
  );
}
