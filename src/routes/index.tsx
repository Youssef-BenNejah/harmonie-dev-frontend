import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Check,
  CheckCircle2,
  FileText,
  Receipt,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { listPlans } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Harmonie-dev — Facturation moderne pour entreprises tunisiennes" },
      {
        name: "description",
        content: "Devis, factures, dépenses et rapports dans une seule plateforme élégante. Rejoignez Harmonie-dev dès aujourd'hui.",
      },
      { property: "og:title", content: "Harmonie-dev — Facturation moderne" },
      { property: "og:description", content: "Gérez vos factures, clients et dépenses en toute simplicité." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: FileText, title: "Factures & devis", desc: "Créez des factures, devis et bons de livraison conformes, avec timbre fiscal et taxes par article." },
  { icon: Users, title: "Clients & entreprises", desc: "Centralisez vos personnes et entreprises, convertissez-les en clients en un clic." },
  { icon: Wallet, title: "Dépenses", desc: "Suivez vos dépenses par catégorie et devise, sans jamais perdre le fil." },
  { icon: BarChart3, title: "Rapports en direct", desc: "Chiffre d'affaires, impayés et tendances visualisés en temps réel." },
  { icon: Receipt, title: "Paiements & relances", desc: "Marquez vos factures payées, partiellement payées, et gardez l'historique complet." },
  { icon: ShieldCheck, title: "Accès sécurisé", desc: "Chaque compte est validé et provisionné par notre équipe — pas d'inscription libre." },
];

const steps = [
  { title: "Faites votre demande", desc: "Remplissez le formulaire avec les informations de votre entreprise." },
  { title: "Nous vous contactons", desc: "Notre équipe échange avec vous pour valider votre besoin." },
  { title: "Recevez vos accès", desc: "Vos identifiants vous sont envoyés par e-mail, prêts à l'emploi." },
];

function PricingSection() {
  const { data: plans = [], isLoading } = useQuery({ queryKey: ["plans"], queryFn: listPlans });
  const [annual, setAnnual] = useState(false);

  if (!isLoading && plans.length === 0) return null;

  return (
    <div className="mt-16 sm:mt-24" id="tarifs">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
          <Sparkles className="size-3.5" /> Tarifs
        </span>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">
          Un plan pour chaque étape de votre activité
        </h2>
        <p className="mt-3 text-sm text-white/70 sm:text-base">
          Commencez avec l'essai gratuit, passez au plan supérieur quand vous en avez besoin. Sans engagement.
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
        <span className={cn("text-sm font-medium", !annual ? "text-white" : "text-white/50")}>Mensuel</span>
        <Switch checked={annual} onCheckedChange={setAnnual} />
        <span className={cn("flex items-center gap-1.5 text-sm font-medium", annual ? "text-white" : "text-white/50")}>
          Annuel
          <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs font-semibold text-success">-17%</span>
        </span>
      </div>

      {isLoading ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <div
              key={p.id}
              className={cn(
                "relative flex flex-col rounded-3xl border p-6 backdrop-blur-xl transition-transform hover:-translate-y-1",
                p.populaire ? "border-sky/60 bg-white/15 shadow-[0_20px_60px_-20px_rgba(79,163,222,0.5)]" : "border-white/15 bg-white/10",
              )}
            >
              {p.populaire ? (
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-sky px-3 py-1 text-xs font-semibold text-midnight shadow-lg">
                  <Star className="size-3" /> Le plus populaire
                </span>
              ) : null}
              <h3 className="text-lg font-semibold text-white">{p.nom}</h3>
              <p className="mt-1 text-sm text-white/60">{p.tagline}</p>
              <p className="mt-5 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">
                  {p.freeTrial ? "Gratuit" : `${annual ? p.prixAnnuel : p.prixMensuel} DT`}
                </span>
                {p.freeTrial ? null : <span className="text-sm text-white/60">/{annual ? "an" : "mois"}</span>}
              </p>
              {p.freeTrial && p.trialDurationDays ? (
                <p className="mt-1 text-xs text-white/50">{p.trialDurationDays} jours, sans carte bancaire</p>
              ) : null}
              <ul className="mt-5 flex-1 space-y-2.5">
                {p.fonctionnalites.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                    <Check className="mt-0.5 size-4 shrink-0 text-sky" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={cn(
                  "mt-6 w-full rounded-xl",
                  p.populaire
                    ? "bg-sky text-midnight hover:bg-sky/90"
                    : "bg-white/10 text-white hover:bg-white/20",
                )}
              >
                <Link to="/rejoindre">{p.freeTrial ? "Démarrer l'essai" : "Demander l'accès"}</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Landing() {
  return (
    <div className="surface-ocean relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute -top-32 -left-24 size-96 rounded-full bg-sky/20 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-24 size-96 rounded-full bg-ocean/25 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <img src="/logo-mark.png" alt="" className="size-9 shrink-0 sm:size-10" />
          <span className="text-base font-semibold text-white sm:text-lg">Harmonie-dev</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="#tarifs"
            className="hidden rounded-xl px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white sm:inline-flex"
          >
            Tarifs
          </a>
          <Button asChild size="sm" variant="ghost" className="rounded-xl text-white hover:bg-white/10 hover:text-white">
            <Link to="/login">Connexion</Link>
          </Button>
          <Button asChild size="sm" className="rounded-xl bg-sky text-midnight hover:bg-sky/90">
            <Link to="/rejoindre">Rejoindre</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6 sm:pt-16 sm:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
            <Sparkles className="size-3.5" /> Nouvelle génération de facturation
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:mt-6 sm:text-5xl lg:text-6xl">
            La facturation, en toute <span className="text-sky">harmonie</span>.
          </h1>
          <p className="mt-4 text-base text-white/75 sm:mt-5 sm:text-lg lg:text-xl">
            Devis, factures, clients, dépenses et rapports réunis dans une seule plateforme rapide et élégante — pensée pour les
            entreprises tunisiennes.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row">
            <Button asChild size="lg" className="h-12 w-full max-w-xs rounded-xl bg-ocean px-6 text-base text-primary-foreground hover:bg-ocean/90 sm:w-auto sm:max-w-none">
              <Link to="/rejoindre">
                <Zap className="mr-2 size-5" /> Demander l'accès
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 w-full max-w-xs rounded-xl border-white/25 bg-white/5 px-6 text-base text-white hover:bg-white/15 hover:text-white sm:w-auto sm:max-w-none">
              <Link to="/login">J'ai déjà un compte</Link>
            </Button>
          </div>
        </div>

        <div className="mt-14 grid gap-4 sm:mt-20 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl sm:p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-sky/20">
                <f.icon className="size-5 text-sky" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm text-white/70">{f.desc}</p>
            </div>
          ))}
        </div>

        <PricingSection />

        <div className="mt-16 rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl sm:mt-24 sm:p-8 lg:p-12">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white sm:text-2xl lg:text-3xl">Comment ça marche</h2>
            <p className="mt-2 text-sm text-white/70 sm:text-base">L'accès à Harmonie-dev est géré par notre équipe — simple et sécurisé.</p>
          </div>
          <div className="mt-8 grid gap-6 sm:mt-10 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="text-center">
                <span className="mx-auto grid size-10 place-items-center rounded-full bg-sky text-sm font-bold text-midnight">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-semibold text-white">{s.title}</h3>
                <p className="mt-1 text-sm text-white/70">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center sm:mt-10">
            <Button asChild size="lg" className="h-12 w-full max-w-xs rounded-xl bg-sky px-8 text-base text-midnight hover:bg-sky/90 sm:w-auto sm:max-w-none">
              <Link to="/rejoindre">
                <CheckCircle2 className="mr-2 size-5" /> Faire ma demande
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-4 py-6 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Harmonie-dev — Tous droits réservés.
      </footer>
    </div>
  );
}
