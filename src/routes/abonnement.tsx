import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, RefreshCcw, Settings2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/app/AdminLayout";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/mock-data";
import { ApiError, listPlans, refreshCurrentUser, requestRenewal, useCurrentUser } from "@/lib/api";
import { requireAuth } from "@/lib/route-guards";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/abonnement")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Abonnement — Harmonie-dev" },
      { name: "description", content: "Suivez votre essai gratuit et choisissez le plan adapté à votre activité." },
    ],
  }),
  component: Abonnement,
});

const TRIAL_DAYS = 15;

function Abonnement() {
  const currentUser = useCurrentUser();
  const [annual, setAnnual] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const { data: planRows = [] } = useQuery({ queryKey: ["plans"], queryFn: listPlans });
  const isSuperAdmin = currentUser?.role === "ADMIN";

  const daysLeft = useMemo(() => {
    if (!currentUser?.planExpiresAt) return null;
    const diff = new Date(currentUser.planExpiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [currentUser?.planExpiresAt]);

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
      <PageHeader
        title="Abonnement"
        subtitle={isSuperAdmin ? "Aperçu des offres proposées aux tenants." : "Gérez votre essai gratuit et votre offre Facture."}
        actions={
          isSuperAdmin ? (
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/superadmin/plans">
                <Settings2 className="mr-1.5 size-4" /> Gérer les plans
              </Link>
            </Button>
          ) : undefined
        }
      />

      {isSuperAdmin ? null : (
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
      )}

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
            {isSuperAdmin ? null : (
              <Button
                className={cn("mt-6 w-full rounded-xl", !p.populaire && "bg-secondary text-secondary-foreground hover:bg-secondary/80")}
                onClick={() => toast("Fonctionnalité à venir", { description: `Plan ${p.nom} — paiement bientôt disponible.` })}
              >
                Choisir ce plan
              </Button>
            )}
          </div>
        ))}
      </div>

      {isSuperAdmin ? null : (
        <div className="mt-8 glass rounded-2xl">
          <div className="border-b border-border/60 p-5">
            <h2 className="text-base font-semibold">Historique de facturation</h2>
          </div>
          <EmptyState title="Aucune facture d'abonnement" description="Vos factures de renouvellement apparaîtront ici une fois votre plan activé." />
        </div>
      )}
    </AdminLayout>
  );
}
