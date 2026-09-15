import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Layers, Pencil, Plus, RefreshCcw, Sparkles, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/app/AdminLayout";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { formatDate } from "@/lib/mock-data";
import {
  ApiError,
  createPlanApi,
  deletePlanApi,
  listPlans,
  refreshCurrentUser,
  requestRenewal,
  updatePlanApi,
  useCurrentUser,
  type ApiPlan,
  type PlanPayload,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/abonnement")({
  head: () => ({
    meta: [
      { title: "Abonnement — Harmonie-dev" },
      { name: "description", content: "Suivez votre essai gratuit et choisissez le plan adapté à votre activité." },
    ],
  }),
  component: Abonnement,
});

const TRIAL_DAYS = 15;

type PlanFormState = PlanPayload;
const emptyPlanForm: PlanFormState = { nom: "", tagline: "", prixMensuel: 0, prixAnnuel: 0, populaire: false, fonctionnalites: [] };

function AbonnementManagement() {
  const queryClient = useQueryClient();
  const { data: planRows = [], isLoading } = useQuery({ queryKey: ["plans"], queryFn: listPlans });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiPlan | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyPlanForm);
  const [featureDraft, setFeatureDraft] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["plans"] });
  const onError = (err: unknown, fallback: string) => {
    const message = err instanceof ApiError ? err.message : fallback;
    toast.error(fallback, { description: message });
  };

  const createMutation = useMutation({
    mutationFn: createPlanApi,
    onSuccess: (p) => {
      toast.success("Plan ajouté", { description: p.nom });
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
      const p = planRows.find((r) => r.id === id);
      toast("Plan supprimé", { description: p?.nom });
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la suppression"),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyPlanForm);
    setFeatureDraft("");
    setOpen(true);
  };

  const openEdit = (p: ApiPlan) => {
    setEditing(p);
    setForm({ nom: p.nom, tagline: p.tagline, prixMensuel: p.prixMensuel, prixAnnuel: p.prixAnnuel, populaire: p.populaire, fonctionnalites: [...p.fonctionnalites] });
    setFeatureDraft("");
    setOpen(true);
  };

  const addFeature = () => {
    const f = featureDraft.trim();
    if (!f) return;
    setForm((s) => ({ ...s, fonctionnalites: [...s.fonctionnalites, f] }));
    setFeatureDraft("");
  };

  const removeFeature = (idx: number) => {
    setForm((s) => ({ ...s, fonctionnalites: s.fonctionnalites.filter((_, i) => i !== idx) }));
  };

  const save = () => {
    if (!form.nom.trim()) return;
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const remove = (p: ApiPlan) => deleteMutation.mutate(p.id);

  return (
    <AdminLayout>
      <PageHeader
        title="Abonnement"
        subtitle="Gérez les types d'abonnement et les fonctionnalités incluses dans chaque offre."
        actions={
          <Button className="rounded-xl" onClick={openCreate}>
            <Plus className="mr-1.5 size-4" /> Nouveau plan
          </Button>
        }
      />

      {planRows.length === 0 ? (
        <div className="glass rounded-2xl">
          <EmptyState title={isLoading ? "Chargement…" : "Aucun plan"} description="Ajoutez votre première offre d'abonnement." />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {planRows.map((p) => (
            <div
              key={p.id}
              className={cn(
                "glass lift relative flex flex-col rounded-3xl p-6",
                p.populaire && "border-ocean/50 ring-2 ring-ocean/30",
              )}
            >
              {p.populaire ? (
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-ocean px-3 py-1 text-xs font-semibold text-primary-foreground shadow-[0_10px_25px_-8px_var(--ocean)]">
                  <Star className="size-3" /> Le plus populaire
                </span>
              ) : null}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{p.nom}</h2>
                  <p className="text-sm text-muted-foreground">{p.tagline}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => openEdit(p)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 rounded-lg text-destructive hover:text-destructive" onClick={() => remove(p)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <p className="mt-5 flex items-baseline gap-3">
                <span className="text-2xl font-bold text-gradient-ocean">{p.prixMensuel} DT<span className="text-sm text-muted-foreground">/mois</span></span>
                <span className="text-sm text-muted-foreground">{p.prixAnnuel} DT/an</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {p.fonctionnalites.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ocean dark:text-sky" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Layers className="size-5 text-ocean" /> {editing ? "Modifier le plan" : "Nouveau plan"}
            </SheetTitle>
            <SheetDescription>Définissez le tarif et les fonctionnalités incluses.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 grid gap-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Description courte</Label>
              <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prix mensuel (DT)</Label>
                <Input type="number" min={0} value={form.prixMensuel} onChange={(e) => setForm({ ...form, prixMensuel: Number(e.target.value) })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Prix annuel (DT)</Label>
                <Input type="number" min={0} value={form.prixAnnuel} onChange={(e) => setForm({ ...form, prixAnnuel: Number(e.target.value) })} className="rounded-xl" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5">
              <Label className="text-sm">Mettre en avant (populaire)</Label>
              <Switch checked={form.populaire} onCheckedChange={(v) => setForm({ ...form, populaire: v })} />
            </div>
            <div className="space-y-2">
              <Label>Fonctionnalités incluses</Label>
              <div className="flex gap-2">
                <Input
                  value={featureDraft}
                  onChange={(e) => setFeatureDraft(e.target.value)}
                  placeholder="Ex. Jusqu'à 50 factures / mois"
                  className="rounded-xl"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                />
                <Button type="button" className="rounded-xl" onClick={addFeature}>
                  Ajouter
                </Button>
              </div>
              <ul className="mt-1 space-y-1.5">
                {form.fonctionnalites.map((f, i) => (
                  <li key={`${f}-${i}`} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-ocean dark:text-sky" /> {f}
                    </span>
                    <Button variant="ghost" size="icon" className="size-6 rounded-lg text-destructive hover:text-destructive" onClick={() => removeFeature(i)}>
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
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

function Abonnement() {
  const currentUser = useCurrentUser();
  const [annual, setAnnual] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const { data: planRows = [] } = useQuery({ queryKey: ["plans"], queryFn: listPlans });

  const daysLeft = useMemo(() => {
    if (!currentUser?.planExpiresAt) return null;
    const diff = new Date(currentUser.planExpiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [currentUser?.planExpiresAt]);

  if (currentUser?.role === "ADMIN") {
    return <AbonnementManagement />;
  }

  const isExpired = currentUser?.status === "EXPIRED" || (daysLeft !== null && daysLeft <= 0);
  const progress = daysLeft === null ? 0 : Math.min(100, Math.max(0, Math.round(((TRIAL_DAYS - daysLeft) / TRIAL_DAYS) * 100)));

  const askForRenewal = async () => {
    setRequesting(true);
    try {
      await requestRenewal();
      await refreshCurrentUser();
      toast.success("Demande envoyée", { description: "Le Super Admin a été notifié de votre demande de renouvellement." });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible d'envoyer la demande";
      toast.error("Échec de la demande", { description: message });
    } finally {
      setRequesting(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader title="Abonnement" subtitle="Gérez votre essai gratuit et votre offre Facture." />

      <div className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 opacity-30">
          <svg viewBox="0 0 1440 200" className="animate-wave h-full w-[200%]" preserveAspectRatio="none" aria-hidden>
            <path fill="var(--sky)" fillOpacity="0.5" d="M0,120L80,110C160,100,320,80,480,96C640,112,800,160,960,160C1120,160,1280,112,1360,88L1440,64L1440,200L0,200Z" />
          </svg>
        </div>
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-ocean dark:text-sky">
              <Sparkles className="size-4" /> {isExpired ? "Abonnement expiré" : "Essai gratuit — compte actif"}
            </p>
            <h1 className={cn("mt-1 text-2xl font-semibold tracking-tight sm:text-3xl", isExpired && "text-destructive")}>
              {isExpired
                ? "Votre abonnement est expiré"
                : daysLeft !== null
                  ? `Il vous reste ${daysLeft} jour${daysLeft > 1 ? "s" : ""} d'essai`
                  : "Aucune date d'expiration définie"}
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {currentUser?.planExpiresAt ? (
                <>
                  {isExpired ? "Votre accès s'est terminé le" : "Votre période d'essai se termine le"} {formatDate(currentUser.planExpiresAt)}.{" "}
                </>
              ) : null}
              {currentUser?.renewalRequested
                ? "Votre demande de renouvellement est en attente d'approbation."
                : "Demandez un renouvellement ou choisissez un plan pour continuer sans interruption."}
            </p>
            <div className="mt-4">
              {currentUser?.renewalRequested ? (
                <span className="inline-flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-2 text-sm font-medium text-warning">
                  <Clock className="size-4" /> Demande envoyée — en attente d'approbation du Super Admin
                </span>
              ) : (
                <Button variant="outline" className="rounded-xl" onClick={askForRenewal} disabled={requesting}>
                  <RefreshCcw className="mr-1.5 size-4" /> Demander un renouvellement
                </Button>
              )}
            </div>
          </div>
          <div className="w-full max-w-xs">
            <Progress value={progress} className="h-2.5" />
            <p className="mt-2 text-right text-xs text-muted-foreground">
              {Math.max(0, TRIAL_DAYS - (daysLeft ?? TRIAL_DAYS))} / {TRIAL_DAYS} jours utilisés
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
        <span className={cn("text-sm font-medium", !annual && "text-foreground", annual && "text-muted-foreground")}>Mensuel</span>
        <Switch checked={annual} onCheckedChange={setAnnual} />
        <span className={cn("flex items-center gap-1.5 text-sm font-medium", annual && "text-foreground", !annual && "text-muted-foreground")}>
          Annuel
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">-17%</span>
        </span>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {planRows.map((p) => (
          <div
            key={p.id}
            className={cn(
              "glass lift relative flex flex-col rounded-3xl p-6",
              p.populaire && "border-ocean/50 ring-2 ring-ocean/30",
            )}
          >
            {p.populaire ? (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ocean px-3 py-1 text-xs font-semibold text-primary-foreground shadow-[0_10px_25px_-8px_var(--ocean)]">
                Le plus populaire
              </span>
            ) : null}
            <h2 className="text-lg font-semibold">{p.nom}</h2>
            <p className="text-sm text-muted-foreground">{p.tagline}</p>
            <p className="mt-5 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gradient-ocean">{annual ? p.prixAnnuel : p.prixMensuel} DT</span>
              <span className="text-sm text-muted-foreground">/{annual ? "an" : "mois"}</span>
            </p>
            <ul className="mt-5 flex-1 space-y-2.5">
              {p.fonctionnalites.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ocean dark:text-sky" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className={cn("mt-6 w-full rounded-xl", !p.populaire && "bg-secondary text-secondary-foreground hover:bg-secondary/80")}
              onClick={() => toast("Fonctionnalité à venir", { description: `Plan ${p.nom} — paiement bientôt disponible.` })}
            >
              Choisir ce plan
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-8 glass rounded-2xl">
        <div className="border-b border-border/60 p-5">
          <h2 className="text-base font-semibold">Historique de facturation</h2>
        </div>
        <EmptyState title="Aucune facture d'abonnement" description="Vos factures de renouvellement apparaîtront ici une fois votre plan activé." />
      </div>
    </AdminLayout>
  );
}
