import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthLayout } from "@/components/app/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ApiError, login } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — Harmonie-dev" },
      { name: "description", content: "Connectez-vous à votre espace de facturation Facture." },
      { property: "og:title", content: "Connexion — Harmonie-dev" },
      { property: "og:description", content: "Accédez à vos factures, clients et rapports." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@harmonie-dev.tn");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success("Connexion réussie", { description: `Bienvenue ${user.firstName ?? user.email}` });
      navigate({ to: user.role === "ADMIN" ? "/superadmin" : "/tableau-de-bord" });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible de se connecter au serveur";
      toast.error("Connexion impossible", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Bon retour parmi nous"
      subtitle="Connectez-vous pour gérer vos factures."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link to="/rejoindre" className="font-semibold text-white underline-offset-4 hover:underline">
            Demander l'accès
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label className="text-white/80">Adresse e-mail</Label>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl border-white/20 bg-white/10 text-white placeholder:text-white/40"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-white/80">Mot de passe</Label>
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl border-white/20 bg-white/10 text-white placeholder:text-white/40"
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-white/80">
            <Checkbox className="border-white/40 data-[state=checked]:bg-sky data-[state=checked]:text-midnight" defaultChecked />
            Se souvenir de moi
          </label>
          <Link to="/mot-de-passe-oublie" className="text-white/80 hover:text-white">
            Mot de passe oublié ?
          </Link>
        </div>
        <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-ocean text-primary-foreground hover:bg-ocean/90">
          {loading ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
    </AuthLayout>
  );
}
