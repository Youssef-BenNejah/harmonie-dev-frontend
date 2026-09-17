import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, Mail, MessageSquareText, Phone, ShieldCheck, UserCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/app/AdminLayout";
import { DataTable, type Column } from "@/components/app/DataTable";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { formatDate } from "@/lib/mock-data";
import {
  ApiError,
  contactJoinRequest,
  convertJoinRequest,
  listJoinRequests,
  listPlans,
  rejectJoinRequest,
  type ApiJoinRequest,
  type ApiJoinRequestStatus,
} from "@/lib/api";
import { requireSuperAdmin } from "@/lib/route-guards";

export const Route = createFileRoute("/superadmin_/demandes")({
  beforeLoad: requireSuperAdmin,
  head: () => ({
    meta: [
      { title: "Demandes d'adhésion — Harmonie-dev" },
      { name: "description", content: "Contactez et convertissez les demandes d'adhésion à la plateforme." },
    ],
  }),
  component: JoinRequestsPage,
});

const statusLabel: Record<ApiJoinRequestStatus, string> = {
  PENDING: "En attente",
  CONTACTED: "Contacté",
  CONVERTED: "Converti",
  REJECTED: "Rejeté",
};

function JoinRequestsPage() {
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["join-requests"],
    queryFn: listJoinRequests,
  });
  const { data: plans = [] } = useQuery({ queryKey: ["plans"], queryFn: listPlans });
  const [viewing, setViewing] = useState<ApiJoinRequest | null>(null);
  const [converting, setConverting] = useState<ApiJoinRequest | null>(null);
  const [convertPlanId, setConvertPlanId] = useState("");
  const [convertedEmail, setConvertedEmail] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["join-requests"] });

  const onError = (err: unknown, fallback: string) => {
    const message = err instanceof ApiError ? err.message : fallback;
    toast.error(fallback, { description: message });
  };

  const contactMutation = useMutation({
    mutationFn: contactJoinRequest,
    onSuccess: (_, id) => {
      const r = rows.find((row) => row.id === id);
      toast.success("Marqué comme contacté", { description: r ? `${r.prenom} ${r.nom}` : undefined });
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la mise à jour"),
  });

  const rejectMutation = useMutation({
    mutationFn: rejectJoinRequest,
    onSuccess: (_, id) => {
      const r = rows.find((row) => row.id === id);
      toast("Demande rejetée", { description: r ? `${r.prenom} ${r.nom}` : undefined });
      setViewing(null);
      invalidate();
    },
    onError: (err) => onError(err, "Échec du rejet"),
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, planId }: { id: string; planId?: string }) => convertJoinRequest(id, undefined, planId),
    onSuccess: (user) => {
      toast.success("Compte créé et identifiants envoyés par e-mail", { description: user.email });
      setConvertedEmail(user.email);
      setConverting(null);
      setViewing(null);
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la conversion"),
  });

  const openConvert = (r: ApiJoinRequest) => {
    setConverting(r);
    setConvertPlanId(r.requestedPlanId ?? "");
  };

  const confirmConvert = () => {
    if (!converting) return;
    convertMutation.mutate({ id: converting.id, ...(convertPlanId ? { planId: convertPlanId } : {}) });
  };

  const pending = rows.filter((r) => r.status === "PENDING").length;

  const columns: Column<ApiJoinRequest>[] = [
    {
      key: "nom",
      header: "Contact",
      sortable: true,
      sortValue: (r) => r.nom,
      cell: (r) => (
        <div>
          <p className="font-medium">
            {r.prenom} {r.nom}
          </p>
          <p className="text-xs text-muted-foreground">{r.entreprise}</p>
        </div>
      ),
    },
    { key: "email", header: "E-mail", cell: (r) => <span className="text-muted-foreground">{r.email}</span> },
    { key: "telephone", header: "Téléphone", cell: (r) => <span className="text-muted-foreground">{r.telephone}</span> },
    {
      key: "plan",
      header: "Plan demandé",
      cell: (r) =>
        r.requestedPlanNom ? (
          <span className="font-medium">{r.requestedPlanNom}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "created",
      header: "Reçue le",
      sortable: true,
      sortValue: (r) => r.createdAt,
      cell: (r) => <span className="text-muted-foreground">{formatDate(r.createdAt)}</span>,
    },
    { key: "status", header: "Statut", cell: (r) => <StatusBadge status={statusLabel[r.status]} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => setViewing(r)}>
            <Eye className="size-4" />
          </Button>
          {r.status === "PENDING" ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg"
              onClick={() => contactMutation.mutate(r.id)}
            >
              <Mail className="size-4" />
            </Button>
          ) : null}
          {r.status !== "CONVERTED" && r.status !== "REJECTED" ? (
            <Button size="sm" className="rounded-lg" onClick={() => openConvert(r)}>
              <UserCheck className="mr-1 size-3.5" /> Convertir
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout requireRole="ADMIN">
      <PageHeader
        title="Demandes d'adhésion"
        subtitle="Les demandes reçues depuis la page publique — contactez puis convertissez en compte client."
      />

      {isError ? (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Impossible de charger les demandes — vérifiez que le serveur backend est démarré.
        </div>
      ) : null}

      {pending > 0 ? (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <MessageSquareText className="size-5 shrink-0 text-warning" />
          <p className="text-sm">
            <span className="font-semibold">{pending}</span> demande{pending > 1 ? "s" : ""} en attente de traitement.
          </p>
        </div>
      ) : null}

      <DataTable
        rows={rows}
        columns={columns}
        searchKeys={(r) => `${r.nom} ${r.prenom} ${r.email} ${r.entreprise}`}
        searchPlaceholder="Rechercher une demande…"
        emptyTitle={isLoading ? "Chargement…" : "Aucune demande d'adhésion"}
      />

      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <MessageSquareText className="size-5 text-ocean" /> {viewing ? `${viewing.prenom} ${viewing.nom}` : ""}
            </SheetTitle>
            <SheetDescription>{viewing?.entreprise}</SheetDescription>
          </SheetHeader>
          {viewing ? (
            <div className="mt-6 space-y-4">
              <div className="space-y-2 rounded-xl border border-border/60 p-3.5 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" /> {viewing.email}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" /> {viewing.telephone}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-sm font-medium">Message</p>
                <p className="rounded-xl bg-muted/50 p-3.5 text-sm text-muted-foreground">{viewing.message}</p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Plan demandé</span>
                <span className="font-medium">{viewing.requestedPlanNom ?? "Non précisé"}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Reçue le</span>
                <span>{formatDate(viewing.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Statut</span>
                <StatusBadge status={statusLabel[viewing.status]} />
              </div>
            </div>
          ) : null}
          <SheetFooter className="mt-6 gap-2">
            {viewing && viewing.status !== "CONVERTED" && viewing.status !== "REJECTED" ? (
              <Button
                variant="outline"
                className="w-full rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                onClick={() => rejectMutation.mutate(viewing.id)}
              >
                <XCircle className="mr-1.5 size-4" /> Rejeter
              </Button>
            ) : null}
            {viewing && viewing.status === "PENDING" ? (
              <Button variant="outline" className="w-full rounded-xl sm:w-auto" onClick={() => contactMutation.mutate(viewing.id)}>
                <Mail className="mr-1.5 size-4" /> Marquer contacté
              </Button>
            ) : null}
            {viewing && viewing.status !== "CONVERTED" && viewing.status !== "REJECTED" ? (
              <Button className="w-full rounded-xl sm:w-auto" onClick={() => openConvert(viewing)}>
                <UserCheck className="mr-1.5 size-4" /> Convertir en client
              </Button>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!converting} onOpenChange={(o) => !o && setConverting(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <UserCheck className="size-5 text-ocean" /> Convertir {converting ? `${converting.prenom} ${converting.nom}` : ""}
            </SheetTitle>
            <SheetDescription>Choisissez le plan à activer pour ce nouveau compte — un mot de passe sera généré et envoyé par e-mail.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            <Label>Plan d'abonnement</Label>
            <Select value={convertPlanId} onValueChange={setConvertPlanId}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Essai gratuit (par défaut)" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nom}
                    {p.freeTrial ? " (essai gratuit)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {converting?.requestedPlanNom ? (
              <p className="text-xs text-muted-foreground">Plan demandé par le prospect : {converting.requestedPlanNom}</p>
            ) : null}
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" className="rounded-xl" onClick={() => setConverting(null)}>
              Annuler
            </Button>
            <Button className="rounded-xl" onClick={confirmConvert} disabled={convertMutation.isPending}>
              <UserCheck className="mr-1.5 size-4" /> {convertMutation.isPending ? "Conversion…" : "Convertir"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!convertedEmail} onOpenChange={(o) => !o && setConvertedEmail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-success" /> Compte créé
            </SheetTitle>
            <SheetDescription>
              Les identifiants de connexion ont été envoyés par e-mail à <strong>{convertedEmail}</strong>.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="mt-6">
            <Button className="rounded-xl" onClick={() => setConvertedEmail(null)}>
              <CheckCircle2 className="mr-1.5 size-4" /> Fermer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
