import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  // Invoice document type (Invoice.status)
  Facture: "bg-ocean/12 text-ocean border-ocean/30 dark:text-sky",
  Devis: "bg-warning/15 text-warning border-warning/30",
  "Bon de livraison": "bg-muted text-muted-foreground border-border",
  // Payment status
  Payé: "bg-success/15 text-success border-success/30",
  "Partiellement payé": "bg-ocean/12 text-ocean border-ocean/30 dark:text-sky",
  "impayé": "bg-muted text-muted-foreground border-border",
  Retard: "bg-destructive/12 text-destructive border-destructive/30",
  // Client type
  Personne: "bg-ice text-navy border-navy/15",
  Entreprise: "bg-ocean/12 text-ocean border-ocean/25 dark:text-sky",
  // Admin (SuperAdmin) état
  Active: "bg-success/15 text-success border-success/30",
  Suspendue: "bg-warning/15 text-warning border-warning/30",
  "Désactivé": "bg-destructive/12 text-destructive border-destructive/30",
  "expiré": "bg-muted text-muted-foreground border-border",
  // Join request status
  "En attente": "bg-warning/15 text-warning border-warning/30",
  "Contacté": "bg-ocean/12 text-ocean border-ocean/30 dark:text-sky",
  "Converti": "bg-success/15 text-success border-success/30",
  "Rejeté": "bg-destructive/12 text-destructive border-destructive/30",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        styles[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
