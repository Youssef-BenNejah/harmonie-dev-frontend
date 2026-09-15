import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/app/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ApiError, forgotPassword, resetPassword, verifyResetCode } from "@/lib/api";

export const Route = createFileRoute("/mot-de-passe-oublie")({
  head: () => ({
    meta: [
      { title: "Mot de passe oublié — Harmonie-dev" },
      { name: "description", content: "Réinitialisez le mot de passe de votre compte Facture en trois étapes." },
      { property: "og:title", content: "Mot de passe oublié — Harmonie-dev" },
      { property: "og:description", content: "Recevez un code de vérification et choisissez un nouveau mot de passe." },
    ],
  }),
  component: ForgotPassword,
});

const field = "h-11 rounded-xl border-white/20 bg-white/10 text-white placeholder:text-white/40";

function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onError = (err: unknown, fallback: string) => {
    const message = err instanceof ApiError ? err.message : fallback;
    toast.error(fallback, { description: message });
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      toast.success("Code envoyé", { description: "Vérifiez votre boîte de réception." });
      setStep(2);
    } catch (err) {
      onError(err, "Échec de l'envoi du code");
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async () => {
    setLoading(true);
    try {
      const { resetToken: token } = await verifyResetCode(email, code);
      setResetToken(token);
      setStep(3);
    } catch (err) {
      onError(err, "Code invalide ou expiré");
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(resetToken, newPassword);
      toast.success("Mot de passe modifié");
      setStep(4);
    } catch (err) {
      onError(err, "Échec de la réinitialisation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={step === 4 ? "Mot de passe mis à jour" : "Réinitialiser le mot de passe"}
      subtitle={
        step === 1
          ? "Saisissez votre e-mail pour recevoir un code."
          : step === 2
            ? "Entrez le code à 6 chiffres reçu par e-mail."
            : step === 3
              ? "Choisissez un nouveau mot de passe."
              : undefined
      }
      footer={
        <Link to="/login" className="font-semibold text-white underline-offset-4 hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <span key={s} className={`h-1 flex-1 rounded-full ${step >= s ? "bg-sky" : "bg-white/20"}`} />
        ))}
      </div>

      {step === 1 ? (
        <form className="space-y-4" onSubmit={submitEmail}>
          <div className="space-y-2">
            <Label className="text-white/80">Adresse e-mail</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@entreprise.tn"
              className={field}
            />
          </div>
          <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-ocean hover:bg-ocean/90">
            {loading ? "Envoi…" : "Envoyer le code"}
          </Button>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="space-y-5">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="size-12 rounded-xl border-white/25 bg-white/10 text-lg text-white transition-all data-[active=true]:border-sky data-[active=true]:ring-2 data-[active=true]:ring-sky/50"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button
            className="h-11 w-full rounded-xl bg-ocean hover:bg-ocean/90"
            disabled={code.length < 6 || loading}
            onClick={submitCode}
          >
            {loading ? "Vérification…" : "Vérifier le code"}
          </Button>
        </div>
      ) : null}

      {step === 3 ? (
        <form className="space-y-4" onSubmit={submitNewPassword}>
          <div className="space-y-2">
            <Label className="text-white/80">Nouveau mot de passe</Label>
            <Input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className={field}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/80">Confirmer</Label>
            <Input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={field}
            />
          </div>
          <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-ocean hover:bg-ocean/90">
            {loading ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      ) : null}

      {step === 4 ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="animate-float grid size-16 place-items-center rounded-full bg-success/20 text-success">
            <CheckCircle2 className="size-9" />
          </span>
          <p className="text-sm text-white/80">Votre mot de passe a été réinitialisé avec succès.</p>
          <Button asChild className="mt-2 h-11 w-full rounded-xl bg-ocean hover:bg-ocean/90">
            <Link to="/login">Se connecter</Link>
          </Button>
        </div>
      ) : null}
    </AuthLayout>
  );
}
