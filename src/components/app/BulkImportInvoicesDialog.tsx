import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  bulkImportInvoices,
  type ApiInvoiceImportResult,
  type ApiInvoiceType,
  type ApiPaymentStatus,
  type InvoiceImportRowPayload,
} from "@/lib/api";
import { parseCsvWithHeader } from "@/lib/csv";

const VALID_STATUSES: ApiPaymentStatus[] = ["impayé", "Partiellement payé", "Payé", "Retard"];
const TEMPLATE_HEADER = "numero,client,date,devise,montant,montantPaye,statut,type,note";
const TEMPLATE_EXAMPLE = ",Amine Ben Salah,2025-09-12,TND,1200.000,,Payé,Standard,Ancienne facture";

type ParsedRow = {
  line: number;
  payload: InvoiceImportRowPayload | null;
  skipReason: string | null;
};

function downloadTemplate() {
  const blob = new Blob([`${TEMPLATE_HEADER}\n${TEMPLATE_EXAMPLE}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modele-import-factures.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ApiInvoiceImportResult | null>(null);

  const validRows = useMemo(() => rows.filter((r) => r.payload !== null), [rows]);
  const skippedRows = useMemo(() => rows.filter((r) => r.payload === null), [rows]);

  const reset = () => {
    setFileName(null);
    setRows([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onPickFile = async (file: File) => {
    setResult(null);
    setFileName(file.name);
    const text = await file.text();
    const records = parseCsvWithHeader(text);

    const parsed: ParsedRow[] = records.map((record, i) => {
      const line = i + 2; // 1 for header + 1-based index
      const client = record["client"] ?? "";
      const date = record["date"] ?? "";
      const devise = record["devise"] ?? "";
      const montantRaw = record["montant"] ?? "";
      const montant = Number(montantRaw.replace(",", "."));

      if (!client) return { line, payload: null, skipReason: "Client manquant" };
      if (!date || Number.isNaN(Date.parse(date))) return { line, payload: null, skipReason: "Date invalide" };
      if (!devise) return { line, payload: null, skipReason: "Devise manquante" };
      if (!montantRaw || Number.isNaN(montant)) return { line, payload: null, skipReason: "Montant invalide" };
      if (fromDate && date < fromDate) return { line, payload: null, skipReason: "Date avant la période sélectionnée" };
      if (toDate && date > toDate) return { line, payload: null, skipReason: "Date après la période sélectionnée" };

      const statutRaw = record["statut"];
      const statut = statutRaw && (VALID_STATUSES as string[]).includes(statutRaw) ? (statutRaw as ApiPaymentStatus) : undefined;
      const typeRaw = record["type"];
      const rowType = typeRaw === "Standard" || typeRaw === "Proforma" ? (typeRaw as ApiInvoiceType) : type;
      const montantPayeRaw = record["montantpaye"];
      const montantPaye = montantPayeRaw ? Number(montantPayeRaw.replace(",", ".")) : undefined;
      const numeroRaw = record["numero"];
      const numero = numeroRaw ? Number(numeroRaw) : undefined;

      const payload: InvoiceImportRowPayload = {
        line,
        client,
        date,
        devise,
        montant,
        ...(montantPaye !== undefined && !Number.isNaN(montantPaye) ? { montantPaye } : {}),
        ...(statut ? { statut } : {}),
        type: rowType,
        ...(numero !== undefined && !Number.isNaN(numero) ? { numero } : {}),
        ...(record["note"] ? { note: record["note"] } : {}),
      };
      return { line, payload, skipReason: null };
    });
    setRows(parsed);
  };

  const submit = async () => {
    if (!fromDate || !toDate || validRows.length === 0) return;
    setImporting(true);
    try {
      const res = await bulkImportInvoices({
        fromDate,
        toDate,
        rows: validRows.map((r) => r.payload!),
      });
      setResult(res);
      if (res.imported > 0) {
        toast.success(`${res.imported} facture(s) importée(s)`, {
          description: res.failed > 0 ? `${res.failed} ligne(s) en échec` : undefined,
        });
        onImported();
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
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Import en masse</DialogTitle>
          <DialogDescription>
            Réimportez vos anciennes factures depuis un fichier CSV pour une période donnée — utile après avoir souscrit
            à un plan pour reprendre votre historique.
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
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setRows([]);
                  setFileName(null);
                }}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Au</Label>
              <Input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setRows([]);
                  setFileName(null);
                }}
                className="h-10 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-dashed border-border/70 p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Upload className="size-4 shrink-0" />
              {fileName ?? "Aucun fichier sélectionné"}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" className="rounded-lg" onClick={downloadTemplate}>
                <Download className="mr-1.5 size-3.5" /> Modèle CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={!fromDate || !toDate}
                onClick={() => fileInputRef.current?.click()}
              >
                Choisir un fichier
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onPickFile(file);
                }}
              />
            </div>
          </div>

          {rows.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="size-4" /> {validRows.length} ligne(s) prête(s)
                </span>
                {skippedRows.length > 0 ? (
                  <span className="flex items-center gap-1.5 text-warning">
                    <AlertTriangle className="size-4" /> {skippedRows.length} ignorée(s)
                  </span>
                ) : null}
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-border/60">
                <table className="w-full text-xs">
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.line} className="border-b border-border/40 last:border-0">
                        <td className="px-3 py-1.5 text-muted-foreground">L{r.line}</td>
                        <td className="px-3 py-1.5">
                          {r.payload ? `${r.payload.client} · ${r.payload.date} · ${r.payload.montant} ${r.payload.devise}` : "—"}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {r.payload ? (
                            <span className="text-success">OK</span>
                          ) : (
                            <span className="text-warning">{r.skipReason}</span>
                          )}
                        </td>
                      </tr>
                    ))}
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
