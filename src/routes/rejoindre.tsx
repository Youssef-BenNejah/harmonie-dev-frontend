import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/app/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, listPlans, submitJoinRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rejoindre")({
  head: () => ({
    meta: [
      { title: "Rejoindre la plateforme — Harmonie-dev" },
      { name: "description", content: "Demandez l'accès à Harmonie-dev — notre équipe vous contacte sous peu." },
    ],
  }),
  component: JoinForm,
});

const emptyForm = { nom: "", prenom: "", email: "", telephone: "", entreprise: "", message: "" };

function JoinForm() {
  const [form, setForm] = useState(emptyForm);
  const [planId, setPlanId] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data: plans = [] } = useQuery({ queryKey: ["plans"], queryFn: listPlans });

  const update = (patch: Partial<typeof emptyForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submitJoinRequest({ ...form, ...(planId ? { requestedPlanId: planId } : {}) });
      setSent(true);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible d'envoyer la demande";
      toast.error("Échec de l'envoi", { description: message });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Demande envoyée" subtitle="Merci ! Notre équipe vous contacte très prochainement.">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-success/20">
            <CheckCircle2 className="size-8 text-success" />
          </span>
          <p className="text-sm text-white/80">
            Votre demande d'adhésion a bien été reçue. Un membre de notre équipe vous contactera par e-mail ou téléphone pour finaliser
            la création de votre compte.
          </p>
          <Button asChild className="mt-2 h-11 w-full rounded-xl bg-ocean text-primary-foreground hover:bg-ocean/90">
            <Link to="/">Retour à l'accueil</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Rejoindre Harmonie-dev"
      subtitle="Parlez-nous de votre entreprise — nous vous recontactons pour créer votre accès."
      footer={
        <>
          Déjà un compte ?{" "}
          <Link to="/login" className="font-semibold text-white underline-offset-4 hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-white/80">Prénom</Label>
            <Input
              required
              value={form.prenom}
              onChange={(e) => update({ prenom: e.target.value })}
              className="h-11 rounded-xl border-white/20 bg-white/10 text-white placeholder:text-white/40"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/80">Nom</Label>
            <Input
              required
              value={form.nom}
              onChange={(e) => update({ nom: e.target.value })}
              className="h-11 rounded-xl border-white/20 bg-white/10 text-white placeholder:text-white/40"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-white/80">Adresse e-mail</Label>
          <Input
            type="email"
            required
            value={form.email}
            onChange={(e) => update({ email: e.target.value })}
            className="h-11 rounded-xl border-white/20 bg-white/10 text-white placeholder:text-white/40"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-white/80">Téléphone</Label>
          <Input
            required
            value={form.telephone}
            onChange={(e) => update({ telephone: e.target.value })}
            className="h-11 rounded-xl border-white/20 bg-white/10 text-white placeholder:text-white/40"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-white/80">Entreprise</Label>
          <Input
            required
            value={form.entreprise}
            onChange={(e) => update({ entreprise: e.target.value })}
            className="h-11 rounded-xl border-white/20 bg-white/10 text-white placeholder:text-white/40"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-white/80">Votre besoin</Label>
          <Textarea
            value={form.message}
            onChange={(e) => update({ message: e.target.value })}
            placeholder="Décrivez brièvement votre activité et vos besoins en facturation…"
            className="min-h-24 rounded-xl border-white/20 bg-white/10 text-white placeholder:text-white/40"
          />
        </div>
        {plans.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-white/80">Plan souhaité</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {plans.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPlanId(p.id === planId ? null : p.id)}
                  className={cn(
                    "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    planId === p.id
                      ? "border-ocean bg-ocean/20"
                      : "border-white/20 bg-white/5 hover:bg-white/10",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
                      planId === p.id ? "border-ocean bg-ocean" : "border-white/30",
                    )}
                  >
                    {planId === p.id ? <Check className="size-3 text-white" /> : null}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-white">
                      {p.nom} {p.freeTrial ? null : <span className="font-normal text-white/60">— {p.prixMensuel} DT/mois</span>}
                    </span>
                    <span className="block text-xs text-white/60">{p.tagline}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-white/50">Optionnel — notre équipe confirmera le plan lors de la création de votre compte.</p>
          </div>
        ) : null}
        <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-ocean text-primary-foreground hover:bg-ocean/90">
          <Send className="mr-1.5 size-4" /> {loading ? "Envoi…" : "Envoyer ma demande"}
        </Button>
      </form>
    </AuthLayout>
  );
}
