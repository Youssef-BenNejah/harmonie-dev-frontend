import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Upload, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/app/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, updateMyProfile, uploadMyPhoto, useCurrentUser } from "@/lib/api";
import { requireAuth } from "@/lib/route-guards";

export const Route = createFileRoute("/profil")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Mon profil — Harmonie-dev" },
      { name: "description", content: "Gérez vos informations personnelles et votre mot de passe." },
    ],
  }),
  component: Profil,
});

function Profil() {
  const currentUser = useCurrentUser();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.firstName ?? "");
      setLastName(currentUser.lastName ?? "");
    }
  }, [currentUser]);

  const onError = (err: unknown, fallback: string) => {
    const message = err instanceof ApiError ? err.message : fallback;
    toast.error(fallback, { description: message });
  };

  const updateMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => toast.success("Profil mis à jour"),
    onError: (err) => onError(err, "Échec de la mise à jour"),
  });

  const photoMutation = useMutation({
    mutationFn: uploadMyPhoto,
    onSuccess: () => toast.success("Photo mise à jour"),
    onError: (err) => onError(err, "Échec de l'envoi de la photo"),
  });

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    photoMutation.mutate(file);
    e.target.value = "";
  };

  const savePassword = () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    toast("Fonctionnalité à venir", { description: "Utilisez « Mot de passe oublié » depuis l'écran de connexion pour le moment." });
    setShowPasswordForm(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  const name = firstName || currentUser?.email?.charAt(0).toUpperCase() || "";

  return (
    <AdminLayout>
      <PageHeader title="Mon profil" subtitle="Vos informations personnelles et la sécurité de votre compte." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass h-fit rounded-2xl p-6 text-center">
          <label className="group relative mx-auto flex size-24 cursor-pointer items-center justify-center rounded-full bg-ocean text-3xl font-semibold text-primary-foreground shadow-[0_10px_30px_-8px_var(--ocean)]">
            {currentUser?.photoUrl ? (
              <img src={currentUser.photoUrl} alt="Photo de profil" className="size-24 rounded-full object-cover" />
            ) : (
              name.charAt(0).toUpperCase()
            )}
            <span className="absolute inset-0 grid place-items-center rounded-full bg-midnight/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Upload className="size-5" />
            </span>
            <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={onPhotoChange} disabled={photoMutation.isPending} />
          </label>
          <h2 className="mt-4 text-lg font-semibold">
            {firstName} {lastName}
          </h2>
          <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-ocean/25 bg-ocean/10 px-2.5 py-1 text-xs font-medium text-ocean dark:text-sky">
            <UserRound className="size-3.5" /> {currentUser?.role === "ADMIN" ? "Super Admin" : "Propriétaire"}
          </span>
        </div>

        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h2 className="text-base font-semibold">Informations du compte</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Adresse e-mail</Label>
              <Input value={currentUser?.email ?? ""} disabled className="rounded-xl" />
            </div>
          </div>
          <Button
            className="mt-4 rounded-xl"
            onClick={() => updateMutation.mutate({ firstName, lastName })}
            disabled={!firstName || !lastName || updateMutation.isPending}
          >
            Enregistrer
          </Button>

          <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-6">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="size-4 text-ocean" /> Mot de passe
              </h3>
              <p className="text-sm text-muted-foreground">Modifiez le mot de passe de votre compte.</p>
            </div>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowPasswordForm((v) => !v)}>
              Changer le mot de passe
            </Button>
          </div>

          {showPasswordForm ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nouveau mot de passe</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Confirmer le mot de passe</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="rounded-xl" />
              </div>
              <div className="sm:col-span-2">
                <Button className="rounded-xl" onClick={savePassword}>
                  Enregistrer le mot de passe
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AdminLayout>
  );
}
