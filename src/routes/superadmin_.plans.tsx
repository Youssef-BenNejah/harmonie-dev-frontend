import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/app/AdminLayout";
import { DataTable, type Column } from "@/components/app/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import {
  ApiError,
  createPlanApi,
  deletePlanApi,
  listPlans,
  updatePlanApi,
  type ApiPlan,
  type PlanPayload,
} from "@/lib/api";
import { requireSuperAdmin } from "@/lib/route-guards";

export const Route = createFileRoute("/superadmin_/plans")({
  beforeLoad: requireSuperAdmin,
  head: () => ({
    meta: [
      { title: "Plans d'abonnement — Harmonie-dev" },
      { name: "description", content: "Configurez les plans d'abonnement et leurs limites d'utilisation." },
    ],
  }),
  component: SuperAdminPlans,
});

type FormState = {
  nom: string;
  tagline: string;
  prixMensuel: number;
  prixAnnuel: number;
  populaire: boolean;
  fonctionnalitesText: string;
  isFreeTrial: boolean;
  trialDurationDays: string;
  maxInvoicesPerMonth: string;
  maxClients: string;
  maxProducts: string;
  maxCustomTaxes: string;
  multiCurrency: boolean;
  reportsAccess: boolean;
  expensesEnabled: boolean;
  bulkExportEnabled: boolean;
};

const emptyForm: FormState = {
  nom: "",
  tagline: "",
  prixMensuel: 0,
  prixAnnuel: 0,
  populaire: false,
  fonctionnalitesText: "",
  isFreeTrial: false,
  trialDurationDays: "",
  maxInvoicesPerMonth: "",
  maxClients: "",
  maxProducts: "",
  maxCustomTaxes: "",
  multiCurrency: true,
  reportsAccess: true,
  expensesEnabled: true,
  bulkExportEnabled: true,
};

const toApiPlan = (plan: ApiPlan): FormState => ({
  nom: plan.nom,
  tagline: plan.tagline,
  prixMensuel: plan.prixMensuel,
  prixAnnuel: plan.prixAnnuel,
  populaire: plan.populaire,
  fonctionnalitesText: plan.fonctionnalites.join("\n"),
  isFreeTrial: plan.freeTrial,
  trialDurationDays: plan.trialDurationDays === null ? "" : String(plan.trialDurationDays),
  maxInvoicesPerMonth: plan.maxInvoicesPerMonth === null ? "" : String(plan.maxInvoicesPerMonth),
  maxClients: plan.maxClients === null ? "" : String(plan.maxClients),
  maxProducts: plan.maxProducts === null ? "" : String(plan.maxProducts),
  maxCustomTaxes: plan.maxCustomTaxes === null ? "" : String(plan.maxCustomTaxes),
  multiCurrency: plan.multiCurrency,
  reportsAccess: plan.reportsAccess,
  expensesEnabled: plan.expensesEnabled,
  bulkExportEnabled: plan.bulkExportEnabled,
});

const parseLimit = (v: string): number | null => (v.trim() === "" ? null : Math.max(0, Number(v)));

const toPayload = (form: FormState): PlanPayload => ({
  nom: form.nom,
  tagline: form.tagline,
  prixMensuel: form.prixMensuel,
  prixAnnuel: form.prixAnnuel,
  populaire: form.populaire,
  fonctionnalites: form.fonctionnalitesText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean),
  freeTrial: form.isFreeTrial,
  trialDurationDays: parseLimit(form.trialDurationDays),
  maxInvoicesPerMonth: parseLimit(form.maxInvoicesPerMonth),
  maxClients: parseLimit(form.maxClients),
  maxProducts: parseLimit(form.maxProducts),
  maxCustomTaxes: parseLimit(form.maxCustomTaxes),
  multiCurrency: form.multiCurrency,
  reportsAccess: form.reportsAccess,
  expensesEnabled: form.expensesEnabled,
  bulkExportEnabled: form.bulkExportEnabled,
});

const limitLabel = (v: number | null) => (v === null ? "Illimité" : String(v));

function SuperAdminPlans() {
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading, isError } = useQuery({ queryKey: ["plans"], queryFn: listPlans });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiPlan | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["plans"] });
  const onError = (err: unknown, fallback: string) => {
    const message = err instanceof ApiError ? err.message : fallback;
    toast.error(fallback, { description: message });
  };

  const createMutation = useMutation({
    mutationFn: createPlanApi,
    onSuccess: (p) => {
      toast.success("Plan créé", { description: p.nom });
      setOpen(false);
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la création"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PlanPayload }) => updatePlanApi(id, payload),
    onSuccess: (p) => {
      toast.success("Plan mis à jour", { description: p.nom });
      setOpen(false);
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la mise à jour"),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePlanApi,
    onSuccess: (_data, id) => {
      const p = rows.find((r) => r.id === id);
      toast("Plan supprimé", { description: p?.nom });
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la suppression"),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: ApiPlan) => {
    setEditing(p);
    setForm(toApiPlan(p));
    setOpen(true);
  };

  const save = () => {
    const payload = toPayload(form);
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const remove = (p: ApiPlan) => {
    if (!confirm(`Supprimer le plan "${p.nom}" ? Les tenants qui l'utilisent retomberont sur le plan d'essai gratuit.`)) return;
    deleteMutation.mutate(p.id);
  };

  const columns: Column<ApiPlan>[] = [
    {
      key: "nom",
      header: "Plan",
      sortable: true,
      sortValue: (r) => r.nom,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-ocean/10 text-ocean dark:text-sky">
            {r.freeTrial ? <Sparkles className="size-4" /> : <Crown className="size-4" />}
          </span>
          <div>
            <p className="flex items-center gap-1.5 font-medium">
              {r.nom}
              {r.populaire ? <Badge className="rounded-full text-[10px]">Populaire</Badge> : null}
              {r.freeTrial ? <Badge variant="outline" className="rounded-full text-[10px]">Essai gratuit</Badge> : null}
            </p>
            <p className="text-xs text-muted-foreground">{r.tagline}</p>
          </div>
        </div>
      ),
    },
    {
      key: "prix",
      header: "Prix / mois",
      sortable: true,
      sortValue: (r) => r.prixMensuel,
      cell: (r) => <span className="font-semibold">{r.prixMensuel} DT</span>,
    },
    {
      key: "invoices",
      header: "Factures / mois",
      cell: (r) => <span>{limitLabel(r.maxInvoicesPerMonth)}</span>,
    },
    {
      key: "clients",
      header: "Clients",
      cell: (r) => <span>{limitLabel(r.maxClients)}</span>,
    },
    {
      key: "features",
      header: "Fonctionnalités",
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.multiCurrency ? <Badge variant="outline" className="rounded-full text-[10px]">Multi-devises</Badge> : null}
          {r.reportsAccess ? <Badge variant="outline" className="rounded-full text-[10px]">Rapports</Badge> : null}
          {r.expensesEnabled ? <Badge variant="outline" className="rounded-full text-[10px]">Dépenses</Badge> : null}
          {r.bulkExportEnabled ? <Badge variant="outline" className="rounded-full text-[10px]">Export ZIP</Badge> : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) => (
        <div className="flex justify-end gap-1.5">
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

  return (
    <AdminLayout requireRole="ADMIN">
      <PageHeader
        title="Plans d'abonnement"
        subtitle="Définissez les plans proposés et les limites d'utilisation de chacun — les tenants sont bloqués automatiquement lorsqu'ils atteignent une limite."
        actions={
          <Button className="rounded-xl" onClick={openCreate}>
            <Plus className="mr-1.5 size-4" /> Nouveau plan
          </Button>
        }
      />

      {isError ? (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Impossible de charger les plans — vérifiez que le serveur backend est démarré.
        </div>
      ) : null}

      <DataTable
        rows={rows}
        columns={columns}
        searchKeys={(r) => `${r.nom} ${r.tagline}`}
        searchPlaceholder="Rechercher un plan…"
        emptyTitle={isLoading ? "Chargement…" : "Aucun plan"}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing ? "Modifier le plan" : "Nouveau plan"}</SheetTitle>
            <SheetDescription>
              Laissez un champ de limite vide pour le rendre illimité. Un seul plan peut être marqué "Essai gratuit" — l'activer ici le
              retire automatiquement des autres.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Accroche</Label>
                <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prix mensuel (DT)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.prixMensuel}
                  onChange={(e) => setForm({ ...form, prixMensuel: Number(e.target.value) })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Prix annuel (DT)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.prixAnnuel}
                  onChange={(e) => setForm({ ...form, prixAnnuel: Number(e.target.value) })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5">
              <Label className="text-sm">Plan populaire (mis en avant)</Label>
              <Switch checked={form.populaire} onCheckedChange={(v) => setForm({ ...form, populaire: v })} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5">
              <div>
                <Label className="text-sm">Plan d'essai gratuit</Label>
                <p className="text-xs text-muted-foreground">Assigné automatiquement à chaque nouveau tenant.</p>
              </div>
              <Switch checked={form.isFreeTrial} onCheckedChange={(v) => setForm({ ...form, isFreeTrial: v })} />
            </div>
            {form.isFreeTrial ? (
              <div className="space-y-2">
                <Label>Durée de l'essai (jours)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.trialDurationDays}
                  onChange={(e) => setForm({ ...form, trialDurationDays: e.target.value })}
                  className="rounded-xl"
                  placeholder="15"
                />
              </div>
            ) : null}

            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-3 text-sm font-semibold">Limites d'utilisation</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Factures / mois</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.maxInvoicesPerMonth}
                    onChange={(e) => setForm({ ...form, maxInvoicesPerMonth: e.target.value })}
                    className="rounded-xl"
                    placeholder="Illimité"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Clients</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.maxClients}
                    onChange={(e) => setForm({ ...form, maxClients: e.target.value })}
                    className="rounded-xl"
                    placeholder="Illimité"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Services / produits</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.maxProducts}
                    onChange={(e) => setForm({ ...form, maxProducts: e.target.value })}
                    className="rounded-xl"
                    placeholder="Illimité"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Taxes personnalisées</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.maxCustomTaxes}
                    onChange={(e) => setForm({ ...form, maxCustomTaxes: e.target.value })}
                    className="rounded-xl"
                    placeholder="Illimité"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-3 text-sm font-semibold">Fonctionnalités incluses</p>
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Multi-devises</Label>
                  <Switch checked={form.multiCurrency} onCheckedChange={(v) => setForm({ ...form, multiCurrency: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Accès aux rapports</Label>
                  <Switch checked={form.reportsAccess} onCheckedChange={(v) => setForm({ ...form, reportsAccess: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Suivi des dépenses</Label>
                  <Switch checked={form.expensesEnabled} onCheckedChange={(v) => setForm({ ...form, expensesEnabled: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Export ZIP en masse</Label>
                  <Switch checked={form.bulkExportEnabled} onCheckedChange={(v) => setForm({ ...form, bulkExportEnabled: v })} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fonctionnalités affichées (une par ligne)</Label>
              <Textarea
                value={form.fonctionnalitesText}
                onChange={(e) => setForm({ ...form, fonctionnalitesText: e.target.value })}
                className="min-h-24 rounded-xl"
                placeholder={"Jusqu'à 20 factures / mois\nSupport par e-mail"}
              />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              className="rounded-xl"
              onClick={save}
              disabled={!form.nom || createMutation.isPending || updateMutation.isPending}
            >
              Enregistrer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
