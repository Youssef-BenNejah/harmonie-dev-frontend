import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Check,
  FileText,
  Receipt,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
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
  { icon: FileText, title: "Factures & devis conformes", desc: "Créez des factures, devis et bons de livraison conformes, avec timbre fiscal et taxes calculées par article." },
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

const stats = [
  { value: "15 jours", label: "d'essai gratuit, sans carte bancaire" },
  { value: "100%", label: "conforme à la fiscalité tunisienne" },
  { value: "< 24 h", label: "pour recevoir vos accès" },
];

function ProductMockup() {
  return (
    <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
      <div className="absolute -top-6 -right-4 z-20 hidden w-36 rotate-6 rounded-2xl border border-border bg-card p-3.5 shadow-xl sm:block">
        <p className="text-[10px] font-medium text-muted-foreground">Facture #0142</p>
        <p className="mt-1 text-lg leading-none font-bold text-navy">
          2 450 <span className="text-xs font-medium text-muted-foreground">TND</span>
        </p>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
          <span className="size-1.5 rounded-full bg-success" /> Payée
        </span>
      </div>

      <div className="relative z-10 rounded-3xl border border-border bg-card p-6 shadow-2xl shadow-ocean/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Chiffre d'affaires</p>
            <p className="mt-1 text-2xl font-bold text-navy">18 240 TND</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-xs font-semibold text-success">
            <TrendingUp className="size-3.5" /> +12%
          </span>
        </div>
        <div className="mt-5 flex h-24 items-end gap-1.5">
          {[40, 65, 45, 80, 55, 95, 70].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-ocean to-sky" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="mt-6 space-y-3 border-t border-border pt-5">
          {[
            { label: "Sami Trabelsi", amount: "540 TND" },
            { label: "Atelier Ferjani", amount: "1 200 TND" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-full bg-ice text-xs font-semibold text-navy">
                  {row.label[0]}
                </span>
                <span className="font-medium text-navy">{row.label}</span>
              </div>
              <span className="font-semibold text-navy">{row.amount}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -bottom-5 -left-5 z-20 hidden -rotate-3 items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3 shadow-xl sm:flex">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ocean/10 text-ocean">
          <Zap className="size-4" />
        </span>
        <div>
          <p className="text-xs font-semibold text-navy">Facture envoyée</p>
          <p className="text-[10px] text-muted-foreground">il y a 2 min</p>
        </div>
      </div>

      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-ice via-transparent to-transparent blur-2xl" />
    </div>
  );
}

function PricingSection() {
  const { data: plans = [], isLoading } = useQuery({ queryKey: ["plans"], queryFn: listPlans });
  const [annual, setAnnual] = useState(false);

  if (!isLoading && plans.length === 0) return null;

  return (
    <section id="tarifs" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold text-ocean">Tarifs</span>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
          Un plan pour chaque étape de votre activité
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Commencez avec l'essai gratuit, passez au plan supérieur quand vous en avez besoin. Sans engagement.
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
        <span className={cn("text-sm font-medium", !annual ? "text-navy" : "text-muted-foreground")}>Mensuel</span>
        <Switch checked={annual} onCheckedChange={setAnnual} />
        <span className={cn("flex items-center gap-1.5 text-sm font-medium", annual ? "text-navy" : "text-muted-foreground")}>
          Annuel
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">-17%</span>
        </span>
      </div>

      {isLoading ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-3xl border border-border bg-muted" />
          ))}
        </div>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <div
              key={p.id}
              className={cn(
                "relative flex flex-col rounded-3xl border p-6 transition-transform hover:-translate-y-1",
                p.populaire ? "border-ocean/40 bg-navy text-white shadow-2xl shadow-ocean/20" : "border-border bg-card",
              )}
            >
              {p.populaire ? (
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-sky px-3 py-1 text-xs font-semibold text-midnight shadow-lg">
                  <Star className="size-3" /> Le plus populaire
                </span>
              ) : null}
              <h3 className={cn("text-lg font-semibold", p.populaire ? "text-white" : "text-navy")}>{p.nom}</h3>
              <p className={cn("mt-1 text-sm", p.populaire ? "text-white/60" : "text-muted-foreground")}>{p.tagline}</p>
              <p className="mt-5 flex items-baseline gap-1">
                <span className={cn("text-3xl font-bold", p.populaire ? "text-white" : "text-navy")}>
                  {p.freeTrial ? "Gratuit" : `${annual ? p.prixAnnuel : p.prixMensuel} DT`}
                </span>
                {p.freeTrial ? null : (
                  <span className={cn("text-sm", p.populaire ? "text-white/60" : "text-muted-foreground")}>
                    /{annual ? "an" : "mois"}
                  </span>
                )}
              </p>
              {p.freeTrial && p.trialDurationDays ? (
                <p className={cn("mt-1 text-xs", p.populaire ? "text-white/50" : "text-muted-foreground")}>
                  {p.trialDurationDays} jours, sans carte bancaire
                </p>
              ) : null}
              <ul className="mt-5 flex-1 space-y-2.5">
                {p.fonctionnalites.map((f) => (
                  <li
                    key={f}
                    className={cn("flex items-start gap-2 text-sm", p.populaire ? "text-white/80" : "text-muted-foreground")}
                  >
                    <Check className={cn("mt-0.5 size-4 shrink-0", p.populaire ? "text-sky" : "text-ocean")} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={cn(
                  "mt-6 w-full rounded-xl",
                  p.populaire ? "bg-sky text-midnight hover:bg-sky/90" : "bg-ice text-navy hover:bg-ice/70",
                )}
              >
                <Link to="/rejoindre">{p.freeTrial ? "Démarrer l'essai" : "Demander l'accès"}</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo-mark.png" alt="" className="size-8 shrink-0" />
            <span className="text-base font-semibold text-navy">Harmonie-dev</span>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            <a href="#fonctionnalites" className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-navy">
              Fonctionnalités
            </a>
            <a href="#tarifs" className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-navy">
              Tarifs
            </a>
            <a href="#comment" className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-navy">
              Comment ça marche
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="rounded-lg text-navy hover:bg-ice/60">
              <Link to="/login">Connexion</Link>
            </Button>
            <Button asChild size="sm" className="rounded-lg bg-ocean text-primary-foreground hover:bg-ocean/90">
              <Link to="/rejoindre">Rejoindre</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-20 lg:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-navy shadow-sm">
                <Sparkles className="size-3.5 text-ocean" /> Nouvelle génération de facturation
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-navy sm:text-5xl lg:text-[3.3rem] lg:leading-[1.08]">
                La facturation, en toute{" "}
                <span className="relative inline-block text-ocean">
                  harmonie
                  <svg
                    className="absolute -bottom-1.5 left-0 w-full text-sky"
                    viewBox="0 0 140 10"
                    fill="none"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <path d="M2 7.5C25 2 45 2 70 5.5C95 9 115 3 138 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>
                .
              </h1>
              <p className="mt-6 max-w-lg text-base text-muted-foreground sm:text-lg">
                Devis, factures, clients, dépenses et rapports réunis dans une seule plateforme rapide et élégante — pensée pour
                les entreprises tunisiennes.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 w-full rounded-xl bg-ocean px-6 text-base text-primary-foreground hover:bg-ocean/90 sm:w-auto">
                  <Link to="/rejoindre">
                    <Zap className="mr-2 size-5" /> Demander l'accès
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-xl border-border bg-card px-6 text-base text-navy hover:bg-ice/50 sm:w-auto">
                  <Link to="/login">J'ai déjà un compte</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Check className="size-4 text-success" /> Essai gratuit 15 jours
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-4 text-success" /> Sans carte bancaire
                </span>
              </div>
            </div>

            <ProductMockup />
          </div>
        </section>

        <section className="border-y border-border bg-card/60">
          <div className="mx-auto grid max-w-6xl divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {stats.map((s) => (
              <div key={s.label} className="px-6 py-7 text-center">
                <p className="text-2xl font-bold text-navy sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="fonctionnalites" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-2xl">
            <span className="text-sm font-semibold text-ocean">Fonctionnalités</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">Tout ce qu'il faut, rien de superflu</h2>
            <p className="mt-3 text-base text-muted-foreground">
              Une plateforme pensée pour la facturation tunisienne, du devis jusqu'au paiement.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-3xl border border-border bg-navy p-8 text-white sm:col-span-2">
              <span className="grid size-11 place-items-center rounded-xl bg-white/15">
                <FileText className="size-5" />
              </span>
              <h3 className="mt-5 text-xl font-semibold">{features[0]!.title}</h3>
              <p className="mt-2 max-w-md text-sm text-white/70">{features[0]!.desc}</p>
            </div>
            {features.slice(1).map((f) => (
              <div key={f.title} className="rounded-3xl border border-border bg-card p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-ice text-ocean">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold text-navy">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="comment" className="border-y border-border bg-ice/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-sm font-semibold text-ocean">Comment ça marche</span>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">Un accès géré, pas une inscription libre</h2>
              <p className="mt-3 text-base text-muted-foreground">
                Notre équipe valide chaque compte pour garantir un démarrage sans friction.
              </p>
            </div>
            <div className="relative mt-14 grid gap-10 sm:grid-cols-3">
              <div className="pointer-events-none absolute top-6 right-0 left-0 hidden h-px bg-border sm:block" />
              {steps.map((s, i) => (
                <div key={s.title} className="relative text-center">
                  <span className="relative z-10 mx-auto grid size-12 place-items-center rounded-full bg-ocean text-base font-bold text-white shadow-lg shadow-ocean/30">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-semibold text-navy">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PricingSection />

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-ocean to-sky px-6 py-14 text-center sm:px-12">
            <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-white/10 blur-3xl" />
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Prêt à simplifier votre facturation ?</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/80 sm:text-base">
              Rejoignez les entreprises tunisiennes qui gèrent déjà leurs factures avec Harmonie-dev.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 w-full max-w-xs rounded-xl bg-white px-6 text-base text-navy hover:bg-white/90 sm:w-auto sm:max-w-none">
                <Link to="/rejoindre">
                  <Zap className="mr-2 size-5" /> Faire ma demande
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="" className="size-6" />
            <span className="text-sm font-semibold text-navy">Harmonie-dev</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Harmonie-dev — Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
