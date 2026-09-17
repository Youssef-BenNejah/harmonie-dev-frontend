import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Eye, Trash2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentPreview } from "@/components/app/DocumentPreview";
import {
  ApiError,
  bulkImportInvoices,
  listClients,
  listCurrencies,
  uploadInvoiceDocument,
  type ApiInvoiceImportResult,
  type ApiInvoiceType,
  type ApiPaymentStatus,
} from "@/lib/api";
import { apiClientLabel } from "@/lib/invoice-adapter";

const STATUSES: ApiPaymentStatus[] = ["impayé", "Partiellement payé", "Payé", "Retard"];

type FileRow = {
  id: string;
  file: File;
  clientId: string;
  date: string;
  devise: string;
  montant: string;
  statut: ApiPaymentStatus;
  rowType: ApiInvoiceType;
};

function FileThumbnail({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  if (!url) return null;
  return <DocumentPreview url={url} isPdf={file.type === "application/pdf"} className="w-72" />;
}

export function BulkImportInvoicesDialog({
  open,
  onOpenChange,
  type,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ApiInvoiceType;
  onImported: () => void;
}) {
  const filesInputRef = useRef<HTMLInputElement>(null);
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: listClients });
  const { data: currencies = [] } = useQuery({ queryKey: ["currencies"], queryFn: listCurrencies });

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rows, setRows] = useState<FileRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ApiInvoiceImportResult | null>(null);

  const reset = () => {
    setRows([]);
    setResult(null);
    if (filesInputRef.current) filesInputRef.current.value = "";
  };

  const addFiles = (files: FileList) => {
    const defaultClient = clients[0]?.id ?? "";
    const defaultDevise = currencies[0]?.code ?? "TND";
    const defaultDate = fromDate || new Date().toISOString().slice(0, 10);
    const newRows: FileRow[] = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${Math.random()}`,
      file,
      clientId: defaultClient,
      date: defaultDate,
      devise: defaultDevise,
      montant: "",
      statut: "impayé",
      rowType: type,
    }));
    setRows((prev) => [...prev, ...newRows]);
    setResult(null);
  };

  const updateRow = (id: string, patch: Partial<FileRow>) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const rowError = (r: FileRow): string | null => {
    if (!r.clientId) return "Client requis";
    if (!r.date || (fromDate && r.date < fromDate) || (toDate && r.date > toDate)) return "Date hors période";
    if (!r.devise) return "Devise requise";
    const montant = Number(r.montant.replace(",", "."));
    if (!r.montant || Number.isNaN(montant)) return "Montant invalide";
    return null;
  };

  const validRows = rows.filter((r) => !rowError(r));
  const invalidRows = rows.filter((r) => rowError(r));

  const submit = async () => {
    if (!fromDate || !toDate || validRows.length === 0) return;
    setImporting(true);
    try {
      const rowsPayload = await Promise.all(
        validRows.map(async (r, i) => {
          const { url } = await uploadInvoiceDocument(r.file);
          const client = clients.find((c) => c.id === r.clientId);
          return {
            line: i + 1,
            client: client ? apiClientLabel(client) : "",
            date: r.date,
            devise: r.devise,
            montant: Number(r.montant.replace(",", ".")),
            statut: r.statut,
            type: r.rowType,
            factureImage: url,
          };
        }),
      );
      const res = await bulkImportInvoices({ fromDate, toDate, rows: rowsPayload });
      setResult(res);
      if (res.imported > 0) {
        toast.success(`${res.imported} facture(s) importée(s)`, {
          description: res.failed > 0 ? `${res.failed} ligne(s) en échec` : undefined,
        });
        onImported();
        setRows((prev) => prev.filter((r) => rowError(r) !== null));
      } else {
        toast.error("Aucune facture importée", { description: "Vérifiez les erreurs ci-dessous." });
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Échec de l'import";
      toast.error("Échec de l'import", { description: message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Import en masse</DialogTitle>
          <DialogDescription>
            Réimportez vos anciennes factures pour une période donnée — utile après avoir souscrit à un plan pour
            reprendre votre historique. Choisissez vos scans (image ou PDF), une ligne apparaît par fichier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Du</Label>
              <Input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Au</Label>
              <Input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-dashed border-border/70 p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Upload className="size-4 shrink-0" />
              {rows.length > 0 ? `${rows.length} fichier(s) sélectionné(s)` : "Aucun fichier sélectionné"}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              disabled={!fromDate || !toDate}
              onClick={() => filesInputRef.current?.click()}
            >
              Choisir des fichiers
            </Button>
            <input
              ref={filesInputRef}
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {rows.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="size-4" /> {validRows.length} ligne(s) prête(s)
                </span>
                {invalidRows.length > 0 ? (
                  <span className="flex items-center gap-1.5 text-warning">
                    <AlertTriangle className="size-4" /> {invalidRows.length} à corriger
                  </span>
                ) : null}
              </div>
              <div className="max-h-[360px] overflow-auto rounded-xl border border-border/60">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b border-border/60 text-left text-muted-foreground">
                      <th className="px-2 py-2 font-medium">Document</th>
                      <th className="px-2 py-2 font-medium">Client</th>
                      <th className="px-2 py-2 font-medium">Date</th>
                      <th className="px-2 py-2 font-medium">Devise</th>
                      <th className="px-2 py-2 font-medium">Montant</th>
                      <th className="px-2 py-2 font-medium">Statut</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const error = rowError(r);
                      return (
                        <tr key={r.id} className="border-b border-border/40 last:border-0">
                          <td className="px-2 py-1.5">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button type="button" className="flex items-center gap-1 text-ocean hover:underline dark:text-sky">
                                  <Eye className="size-3.5" /> {r.file.name.length > 16 ? `${r.file.name.slice(0, 14)}…` : r.file.name}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-2">
                                <FileThumbnail file={r.file} />
                              </PopoverContent>
                            </Popover>
                          </td>
                          <td className="px-2 py-1.5">
                            <Select value={r.clientId} onValueChange={(v) => updateRow(r.id, { clientId: v })}>
                              <SelectTrigger className="h-8 w-36 rounded-lg text-xs">
                                <SelectValue placeholder="Client" />
                              </SelectTrigger>
                              <SelectContent>
                                {clients.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {apiClientLabel(c)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="date"
                              value={r.date}
                              onChange={(e) => updateRow(r.id, { date: e.target.value })}
                              className="h-8 w-36 rounded-lg text-xs"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Select value={r.devise} onValueChange={(v) => updateRow(r.id, { devise: v })}>
                              <SelectTrigger className="h-8 w-20 rounded-lg text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {currencies.map((c) => (
                                  <SelectItem key={c.id} value={c.code}>
                                    {c.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="number"
                              min={0}
                              step="0.001"
                              value={r.montant}
                              onChange={(e) => updateRow(r.id, { montant: e.target.value })}
                              placeholder="0.000"
                              className="h-8 w-24 rounded-lg text-xs"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Select value={r.statut} onValueChange={(v) => updateRow(r.id, { statut: v as ApiPaymentStatus })}>
                              <SelectTrigger className="h-8 w-32 rounded-lg text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-1.5">
                              {error ? (
                                <span className="text-warning" title={error}>
                                  <AlertTriangle className="size-3.5" />
                                </span>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 rounded-lg text-destructive hover:text-destructive"
                                onClick={() => removeRow(r.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="rounded-xl border border-border/60 p-3 text-sm">
              <p className="font-medium">
                {result.imported} importée(s), {result.failed} échec(s)
              </p>
              {result.results.some((r) => !r.success) ? (
                <ul className="mt-2 space-y-1">
                  {result.results
                    .filter((r) => !r.success)
                    .map((r) => (
                      <li key={r.line} className="flex items-start gap-1.5 text-destructive">
                        <XCircle className="mt-0.5 size-3.5 shrink-0" /> Ligne {r.line} : {r.message}
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button className="rounded-xl" disabled={validRows.length === 0 || importing} onClick={submit}>
            {importing ? "Import en cours…" : `Importer ${validRows.length || ""} facture(s)`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
