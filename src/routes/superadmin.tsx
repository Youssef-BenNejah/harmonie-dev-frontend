import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeAlert,
  CheckCircle2,
  KeyRound,
  Pencil,
  PowerOff,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPlus,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/app/AdminLayout";
import { DataTable, type Column } from "@/components/app/DataTable";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { formatDate } from "@/lib/mock-data";
import {
  ApiError,
  adminApproveRenewal,
  adminCreateUser,
  adminDeleteUser,
  adminListUsers,
  adminRejectRenewal,
  adminResetPassword,
  adminUpdateUser,
  listPlans,
  type ApiAccountStatus,
  type ApiUser,
} from "@/lib/api";
import { requireSuperAdmin } from "@/lib/route-guards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/superadmin")({
  beforeLoad: requireSuperAdmin,
  head: () => ({
    meta: [
      { title: "Super Admin — Harmonie-dev" },
      { name: "description", content: "Gérez les comptes de toutes les entreprises abonnées à la plateforme." },
    ],
  }),
  component: SuperAdmin,
});

type EtatLabel = "Active" | "Suspendue" | "Désactivé" | "expiré";
const etats: EtatLabel[] = ["Active", "Suspendue", "Désactivé", "expiré"];

const statusToLabel: Record<ApiAccountStatus, EtatLabel> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspendue",
  DISABLED: "Désactivé",
  EXPIRED: "expiré",
};
const labelToStatus: Record<EtatLabel, ApiAccountStatus> = {
  Active: "ACTIVE",
  Suspendue: "SUSPENDED",
  "Désactivé": "DISABLED",
  "expiré": "EXPIRED",
};

const daysUntil = (iso: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) : null);

type AddForm = { name: string; surname: string; email: string; etat: EtatLabel; planExpiration: string; planId: string };
const emptyAddForm = (): AddForm => ({
  name: "",
  surname: "",
  email: "",
  etat: "Active",
  planExpiration: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
  planId: "",
});

type EditForm = { etat: EtatLabel; planExpiration: string; planId: string };

function SuperAdmin() {
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading, isError } = useQuery({ queryKey: ["admin-users"], queryFn: adminListUsers });
  const { data: plans = [] } = useQuery({ queryKey: ["plans"], queryFn: listPlans });
  const planName = (id: string | null) => plans.find((p) => p.id === id)?.nom ?? "—";

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(emptyAddForm());
  const [editing, setEditing] = useState<ApiUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ etat: "Active", planExpiration: "", planId: "" });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  const onError = (err: unknown, fallback: string) => {
    const message = err instanceof ApiError ? err.message : fallback;
    toast.error(fallback, { description: message });
  };

  const pendingRenewals = rows.filter((r) => r.renewalRequested).length;

  const counts = {
    Active: rows.filter((r) => r.status === "ACTIVE").length,
    Suspendue: rows.filter((r) => r.status === "SUSPENDED").length,
    "Désactivé": rows.filter((r) => r.status === "DISABLED").length,
    "expiré": rows.filter((r) => r.status === "EXPIRED").length,
  };

  const createMutation = useMutation({
    mutationFn: adminCreateUser,
    onSuccess: (user) => {
      toast.success("Compte créé — identifiants envoyés par e-mail", { description: user.email });
      setAddOpen(false);
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la création"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof adminUpdateUser>[1] }) => adminUpdateUser(id, payload),
    onSuccess: (user) => {
      toast.success("Compte mis à jour", { description: `${user.firstName} ${user.lastName}` });
      setEditing(null);
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la mise à jour"),
  });

  const approveMutation = useMutation({
    mutationFn: adminApproveRenewal,
    onSuccess: (user) => {
      toast.success("Renouvellement approuvé", { description: `${user.firstName} ${user.lastName} — plan prolongé de 30 jours` });
      invalidate();
    },
    onError: (err) => onError(err, "Échec de l'approbation"),
  });

  const rejectMutation = useMutation({
    mutationFn: adminRejectRenewal,
    onSuccess: (user) => {
      toast("Demande rejetée", { description: `${user.firstName} ${user.lastName}` });
      invalidate();
    },
    onError: (err) => onError(err, "Échec du rejet"),
  });

  const deleteMutation = useMutation({
    mutationFn: adminDeleteUser,
    onSuccess: (_data, id) => {
      const u = rows.find((r) => r.id === id);
      toast("Compte supprimé", { description: u ? `${u.firstName} ${u.lastName}` : undefined });
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la suppression"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: adminResetPassword,
    onSuccess: (_data, id) => {
      const u = rows.find((r) => r.id === id);
      toast.success("Mot de passe réinitialisé", { description: u ? `Nouveaux identifiants envoyés à ${u.email}` : undefined });
    },
    onError: (err) => onError(err, "Échec de la réinitialisation"),
  });

  const openAdd = () => {
    setAddForm(emptyAddForm());
    setAddOpen(true);
  };

  const createAdmin = () => {
    if (!addForm.name || !addForm.surname || !addForm.email) return;
    createMutation.mutate({
      email: addForm.email,
      firstName: addForm.name,
      lastName: addForm.surname,
      status: labelToStatus[addForm.etat],
      planExpiresAt: new Date(addForm.planExpiration).toISOString(),
      ...(addForm.planId ? { planId: addForm.planId } : {}),
    });
  };

  const openEdit = (u: ApiUser) => {
    setEditing(u);
    setEditForm({
      etat: statusToLabel[u.status],
      planExpiration: u.planExpiresAt ? u.planExpiresAt.slice(0, 10) : "",
      planId: u.planId ?? "",
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    const isExpired = editForm.planExpiration ? new Date(editForm.planExpiration) < new Date() : false;
    const nextEtat: EtatLabel = isExpired && editForm.etat === "Active" ? "expiré" : editForm.etat;
    updateMutation.mutate({
      id: editing.id,
      payload: {
        firstName: editing.firstName ?? "",
        lastName: editing.lastName ?? "",
        status: labelToStatus[nextEtat],
        ...(editForm.planExpiration ? { planExpiresAt: new Date(editForm.planExpiration).toISOString() } : {}),
        ...(editForm.planId && editForm.planId !== editing.planId ? { planId: editForm.planId } : {}),
      },
    });
  };

  const approve = (u: ApiUser) => approveMutation.mutate(u.id);
  const reject = (u: ApiUser) => rejectMutation.mutate(u.id);
  const remove = (u: ApiUser) => deleteMutation.mutate(u.id);
  const resetPassword = (u: ApiUser) => resetPasswordMutation.mutate(u.id);

  const columns: Column<ApiUser>[] = [
    {
      key: "name",
      header: "Nom",
      sortable: true,
      sortValue: (r) => `${r.firstName ?? ""} ${r.lastName ?? ""}`,
      cell: (r) => (
        <div>
          <p className="flex items-center gap-1.5 font-medium">
            {r.firstName} {r.lastName}
            {r.renewalRequested ? <BadgeAlert className="size-4 text-warning" aria-label="Renouvellement demandé" /> : null}
          </p>
          <p className="text-xs text-muted-foreground">{r.email}</p>
        </div>
      ),
    },
    { key: "etat", header: "État", cell: (r) => <StatusBadge status={statusToLabel[r.status]} /> },
    {
      key: "plan",
      header: "Plan",
      sortable: true,
      sortValue: (r) => planName(r.planId),
      cell: (r) => <span className="text-sm font-medium">{planName(r.planId)}</span>,
    },
    {
      key: "daysLeft",
      header: "Jours restants",
      sortable: true,
      sortValue: (r) => daysUntil(r.planExpiresAt) ?? Number.POSITIVE_INFINITY,
      cell: (r) => {
        const d = daysUntil(r.planExpiresAt);
        if (d === null) return <span className="text-muted-foreground">—</span>;
        return (
          <span className={cn("font-semibold", d <= 0 ? "text-destructive" : d <= 7 ? "text-warning" : "text-foreground")}>
            {d <= 0 ? "Expiré" : `${d} j`}
          </span>
        );
      },
    },
    {
      key: "planExpiresAt",
      header: "Date d'expiration",
      sortable: true,
      sortValue: (r) => r.planExpiresAt ?? "",
      cell: (r) => <span className="text-muted-foreground">{r.planExpiresAt ? formatDate(r.planExpiresAt) : "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) => (
        <div className="flex justify-end gap-1.5">
          {r.renewalRequested ? (
            <>
              <Button size="sm" className="rounded-lg" onClick={() => approve(r)}>
                <CheckCircle2 className="mr-1 size-3.5" /> Approuver
              </Button>
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => reject(r)}>
                <XCircle className="mr-1 size-3.5" /> Rejeter
              </Button>
            </>
          ) : null}
          <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => openEdit(r)}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 rounded-lg text-destructive hover:text-destructive" onClick={() => remove(r)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  const isExpiredPicked = editing && editForm.planExpiration ? new Date(editForm.planExpiration) < new Date() : false;

  return (
    <AdminLayout requireRole="ADMIN">
      <PageHeader
        title="Super Admin"
        subtitle="Panneau d'administration de la plateforme — gérez toutes les entreprises abonnées."
        actions={
          <Button className="rounded-xl" onClick={openAdd}>
            <UserPlus className="mr-1.5 size-4" /> Ajouter un utilisateur
          </Button>
        }
      />

      {isError ? (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Impossible de charger les utilisateurs — vérifiez que le serveur backend est démarré.
        </div>
      ) : null}

      {pendingRenewals > 0 ? (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <BadgeAlert className="size-5 shrink-0 text-warning" />
          <p className="text-sm">
            <span className="font-semibold">{pendingRenewals}</span> demande{pendingRenewals > 1 ? "s" : ""} de renouvellement en attente
            d'approbation.
          </p>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Utilisateur actif</p>
            <ShieldCheck className="size-5 text-success" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{counts.Active}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Utilisateur suspendu</p>
            <ShieldAlert className="size-5 text-warning" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{counts.Suspendue}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Utilisateur désactivé</p>
            <ShieldOff className="size-5 text-destructive" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{counts["Désactivé"]}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Utilisateur expiré</p>
            <PowerOff className="size-5 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{counts["expiré"]}</p>
        </div>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        searchKeys={(r) => `${r.firstName ?? ""} ${r.lastName ?? ""} ${r.email} ${statusToLabel[r.status]}`}
        searchPlaceholder="Rechercher un utilisateur…"
        emptyTitle={isLoading ? "Chargement…" : "Aucun utilisateur trouvé"}
      />

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-ocean" /> Nouvel utilisateur
            </SheetTitle>
            <SheetDescription>Crée un compte tenant — un mot de passe est généré et envoyé par e-mail.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input value={addForm.surname} onChange={(e) => setAddForm({ ...addForm, surname: e.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>État</Label>
                <Select value={addForm.etat} onValueChange={(v) => setAddForm({ ...addForm, etat: v as EtatLabel })}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {etats.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date d'expiration</Label>
                <Input type="date" value={addForm.planExpiration} onChange={(e) => setAddForm({ ...addForm, planExpiration: e.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Plan d'abonnement</Label>
              <Select value={addForm.planId} onValueChange={(v) => setAddForm({ ...addForm, planId: v })}>
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
              <p className="text-xs text-muted-foreground">Laissez vide pour assigner automatiquement le plan d'essai gratuit.</p>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" className="rounded-xl" onClick={() => setAddOpen(false)}>
              Annuler
            </Button>
            <Button
              className="rounded-xl"
              onClick={createAdmin}
              disabled={!addForm.name || !addForm.surname || !addForm.email || createMutation.isPending}
            >
              {createMutation.isPending ? "Création…" : "Créer le compte"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-ocean" /> {editing ? `${editing.firstName} ${editing.lastName}` : ""}
            </SheetTitle>
            <SheetDescription>Modifier l'état du compte et sa date d'expiration.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 grid gap-4">
            {editing?.renewalRequested ? (
              <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-sm">
                <BadgeAlert className="size-4 shrink-0 text-warning" /> Ce client a demandé un renouvellement.
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>État</Label>
              <Select value={editForm.etat} onValueChange={(v) => setEditForm({ ...editForm, etat: v as EtatLabel })}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {etats.map((e) => (
                    <SelectItem key={e} value={e} disabled={e === "Active" && isExpiredPicked}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isExpiredPicked ? (
                <p className="text-xs text-warning">La date d'expiration choisie est passée — "Active" est indisponible tant qu'elle n'est pas repoussée.</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Date d'expiration</Label>
              <Input type="date" value={editForm.planExpiration} onChange={(e) => setEditForm({ ...editForm, planExpiration: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Plan d'abonnement</Label>
              <Select value={editForm.planId} onValueChange={(v) => setEditForm({ ...editForm, planId: v })}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Choisir un plan" />
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
            </div>
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => editing && resetPassword(editing)}
              disabled={resetPasswordMutation.isPending}
            >
              <KeyRound className="mr-1.5 size-4" /> Réinitialiser le mot de passe
            </Button>
          </div>
          <SheetFooter className="mt-6 gap-2">
            {editing?.renewalRequested ? (
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  if (editing) approve(editing);
                  setEditing(null);
                }}
              >
                <CheckCircle2 className="mr-1.5 size-4" /> Approuver (+30 j)
              </Button>
            ) : null}
            <Button variant="outline" className="rounded-xl" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button className="rounded-xl" onClick={saveEdit} disabled={updateMutation.isPending}>
              <CheckCircle2 className="mr-1.5 size-4" /> Enregistrer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
