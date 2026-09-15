import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HandCoins } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { ApiError, recordPaymentApi, type ApiInvoice, type ApiPaymentMethod } from "@/lib/api";
import { formatMoney } from "@/lib/mock-data";

const methods: ApiPaymentMethod[] = ["Virement bancaire", "Espèces", "Autres"];

export function MarkPaidSheet({ invoice, open, onOpenChange }: { invoice: ApiInvoice | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const remaining = invoice ? Math.max(0, invoice.total - invoice.paidAmount) : 0;
  const [amount, setAmount] = useState(remaining);
  const [method, setMethod] = useState<ApiPaymentMethod>("Virement bancaire");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const handleOpenChange = (o: boolean) => {
    if (o && invoice) setAmount(Math.max(0, invoice.total - invoice.paidAmount));
    onOpenChange(o);
  };

  const mutation = useMutation({
    mutationFn: recordPaymentApi,
    onSuccess: () => {
      if (!invoice) return;
      const newPaid = Math.min(invoice.paidAmount + amount, invoice.total);
      toast.success(newPaid >= invoice.total ? "Facture marquée payée" : "Paiement partiel enregistré", {
        description: `#${invoice.number}/${invoice.year} — ${formatMoney(amount, invoice.currency.code)}`,
      });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] });
      queryClient.invalidateQueries({ queryKey: ["payments", invoice.id] });
      onOpenChange(false);
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : "Échec de l'enregistrement du paiement";
      toast.error("Échec du paiement", { description: message });
    },
  });

  const submit = () => {
    if (!invoice || amount <= 0) return;
    mutation.mutate({ invoiceId: invoice.id, amountPaid: amount, paymentMethod: method, paymentDate: date });
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HandCoins className="size-5 text-ocean" /> Enregistrer un paiement
          </SheetTitle>
          <SheetDescription>
            {invoice ? `#${invoice.number}/${invoice.year} — reste ${formatMoney(remaining, invoice.currency.code)}` : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Montant encaissé</Label>
              <Input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Méthode de paiement</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as ApiPaymentMethod)}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {methods.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {invoice && amount > 0 && amount < remaining ? (
            <p className="text-xs text-muted-foreground">
              Ce montant est inférieur au solde dû : la facture sera marquée <span className="font-medium text-foreground">Partiellement payé</span>.
            </p>
          ) : null}
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button className="rounded-xl" onClick={submit} disabled={!invoice || amount <= 0 || mutation.isPending}>
            Enregistrer le paiement
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
