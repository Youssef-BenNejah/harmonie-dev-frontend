import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, Eye, FileArchive, FileDown, HandCoins, Mail, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/app/AdminLayout";
import { DataTable, type Column } from "@/components/app/DataTable";
import { MarkPaidSheet } from "@/components/app/MarkPaidSheet";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatMoney, type InvoiceStatus } from "@/lib/mock-data";
import {
  ApiError,
  deleteInvoiceApi,
  downloadInvoicePdf,
  downloadInvoicesSummaryPdf,
  downloadInvoicesZip,
  duplicateInvoiceApi,
  listInvoices,
  sendInvoiceByEmail,
  type ApiInvoice,
  type ApiInvoiceType,
} from "@/lib/api";
import { apiClientLabel as clientLabel, apiInvoiceNumberLabel as invoiceNumberLabel } from "@/lib/invoice-adapter";

const statuts: InvoiceStatus[] = ["Facture", "Devis", "Bon de livraison"];

export function InvoiceListPage({
  type,
  title,
  subtitle,
  newLabel,
}: {
  type: ApiInvoiceType;
  title: string;
  subtitle: string;
  newLabel: string;
}) {
  const queryClient = useQueryClient();
  const { data: allInvoices = [], isLoading, isError } = useQuery({ queryKey: ["invoices"], queryFn: listInvoices });
  const rows = useMemo(() => allInvoices.filter((i) => i.type === type), [allInvoices, type]);
  const [statutFilter, setStatutFilter] = useState<string>("tous");
  const [selected, setSelected] = useState<string[]>([]);
  const [payingInvoice, setPayingInvoice] = useState<ApiInvoice | null>(null);

  const filtered = useMemo(
    () => (statutFilter === "tous" ? rows : rows.filter((r) => r.status === statutFilter)),
    [rows, statutFilter],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["invoices"] });
  const onError = (err: unknown, fallback: string) => {
    const message = err instanceof ApiError ? err.message : fallback;
    toast.error(fallback, { description: message });
  };

  const deleteMutation = useMutation({
    mutationFn: deleteInvoiceApi,
    onSuccess: (_data, id) => {
      const inv = rows.find((r) => r.id === id);
      toast("Facture supprimée", { description: inv ? invoiceNumberLabel(inv) : undefined });
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la suppression"),
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateInvoiceApi,
    onSuccess: (copy, id) => {
      const source = rows.find((r) => r.id === id);
      toast.success("Facture dupliquée", { description: source ? `${invoiceNumberLabel(source)} → ${invoiceNumberLabel(copy)}` : invoiceNumberLabel(copy) });
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la duplication"),
  });

  const remove = (inv: ApiInvoice) => deleteMutation.mutate(inv.id);
  const duplicate = (inv: ApiInvoice) => duplicateMutation.mutate(inv.id);

  const [exporting, setExporting] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const downloadOne = async (inv: ApiInvoice) => {
    try {
      await downloadInvoicePdf(inv.id, `${invoiceNumberLabel(inv)}.pdf`);
      toast.success("PDF téléchargé", { description: `${invoiceNumberLabel(inv)}.pdf` });
    } catch {
      toast.error("Échec de la génération du PDF");
    }
  };

  const sendOne = async (inv: ApiInvoice) => {
    setSendingId(inv.id);
    try {
      await sendInvoiceByEmail(inv.id);
      toast.success("Facture envoyée par e-mail", { description: clientLabel(inv.client) });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Échec de l'envoi";
      toast.error("Échec de l'envoi par e-mail", { description: message });
    } finally {
      setSendingId(null);
    }
  };

  const exportSelectedZip = async () => {
    if (selected.length === 0) return;
    setExporting(true);
    try {
      await downloadInvoicesZip(selected);
      toast.success("Export ZIP prêt", { description: `${selected.length} facture(s)` });
    } catch {
      toast.error("Échec de l'export ZIP");
    } finally {
      setExporting(false);
    }
  };

  const downloadSummary = async () => {
    if (filtered.length === 0) return;
    setExporting(true);
    try {
      await downloadInvoicesSummaryPdf(
        filtered.map((r) => r.id),
        `${title.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      );
      toast.success("Récapitulatif téléchargé");
    } catch {
      toast.error("Échec de la génération du récapitulatif");
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<ApiInvoice>[] = [
    {
      key: "number",
      header: "Numéro",
      sortable: true,
      sortValue: (r) => r.number,
      cell: (r) => (
        <Link to="/factures/$id" params={{ id: r.id }} className="font-medium text-ocean hover:underline dark:text-sky">
          {invoiceNumberLabel(r)}
        </Link>
      ),
    },
    { key: "client", header: "Client", cell: (r) => clientLabel(r.client) },
    { key: "date", header: "Date", sortable: true, sortValue: (r) => r.date, cell: (r) => <span className="text-muted-foreground">{formatDate(r.date)}</span> },
    { key: "status", header: "Statut", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "paymentStatus", header: "Paiement", cell: (r) => <StatusBadge status={r.paymentStatus} /> },
    {
      key: "total",
      header: "Total",
      className: "text-right",
      sortable: true,
      sortValue: (r) => r.total,
      cell: (r) => <span className="font-semibold">{formatMoney(r.total, r.currency.code)}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-lg">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl">
            <DropdownMenuItem asChild>
              <Link to="/factures/$id" params={{ id: r.id }}>
                <Eye className="mr-2 size-4" /> Voir le détail
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/factures/nouvelle" search={{ type: r.type, id: r.id }}>
                <Pencil className="mr-2 size-4" /> Modifier
              </Link>
            </DropdownMenuItem>
            {r.paymentStatus !== "Payé" ? (
              <DropdownMenuItem onClick={() => setPayingInvoice(r)}>
                <HandCoins className="mr-2 size-4" /> Marquer payé…
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => downloadOne(r)}>
              <FileDown className="mr-2 size-4" /> Télécharger PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => sendOne(r)} disabled={sendingId === r.id}>
              <Mail className="mr-2 size-4" /> Envoyer par e-mail
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => duplicate(r)}>
              <Copy className="mr-2 size-4" /> Dupliquer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => remove(r)}>
              <Trash2 className="mr-2 size-4" /> Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={selected.length === 0 || exporting}
              onClick={exportSelectedZip}
            >
              <FileArchive className="mr-1.5 size-4" /> Exporter en ZIP
            </Button>
            <Button asChild className="rounded-xl">
              <Link to="/factures/nouvelle" search={{ type }}>
                <Plus className="mr-1.5 size-4" /> {newLabel}
              </Link>
            </Button>
          </>
        }
      />

      {isError ? (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Impossible de charger les factures — vérifiez que le serveur backend est démarré.
        </div>
      ) : null}

      <DataTable
        rows={filtered}
        columns={columns}
        searchKeys={(r) => `${invoiceNumberLabel(r)} ${clientLabel(r.client)}`}
        searchPlaceholder="Rechercher une facture, un client…"
        selectable
        onSelectionChange={setSelected}
        emptyTitle={isLoading ? "Chargement…" : "Aucune facture trouvée"}
        toolbar={
          <Select value={statutFilter} onValueChange={setStatutFilter}>
            <SelectTrigger className="h-10 w-[180px] rounded-xl border-border/70 bg-background/60">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              {statuts.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" className="rounded-xl text-muted-foreground" disabled={exporting} onClick={downloadSummary}>
          <Download className="mr-1.5 size-4" /> Télécharger le récapitulatif
        </Button>
      </div>

      <MarkPaidSheet invoice={payingInvoice} open={!!payingInvoice} onOpenChange={(o) => !o && setPayingInvoice(null)} />
    </AdminLayout>
  );
}
