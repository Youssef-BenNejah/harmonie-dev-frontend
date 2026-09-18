import { CountrySelect } from "@/components/app/CountrySelect";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/app/AdminLayout";
import { DataTable, type Column } from "@/components/app/DataTable";
import { DetailField, DetailSheet } from "@/components/app/DetailSheet";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { formatDate } from "@/lib/mock-data";
import {
  ApiError,
  createPerson,
  deletePerson,
  listPersons,
  updatePerson,
  type ApiPerson,
  type PersonPayload,
} from "@/lib/api";
import { requireAuth } from "@/lib/route-guards";

export const Route = createFileRoute("/personnes")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Personnes — Harmonie-dev" },
      { name: "description", content: "Gérez votre répertoire de contacts individuels." },
    ],
  }),
  component: Personnes,
});

type FormState = PersonPayload;
const emptyForm: FormState = { prenom: "", nom: "", email: "", telephone: "", pays: "", cin: "", adresse: "" };

function Personnes() {
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading, isError } = useQuery({ queryKey: ["persons"], queryFn: listPersons });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiPerson | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [viewing, setViewing] = useState<ApiPerson | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["persons"] });

  const onError = (err: unknown, fallback: string) => {
    const message = err instanceof ApiError ? err.message : fallback;
    toast.error(fallback, { description: message });
  };

  const createMutation = useMutation({
    mutationFn: createPerson,
    onSuccess: (p) => {
      toast.success("Personne ajoutée", { description: `${p.prenom} ${p.nom}` });
      setOpen(false);
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la création"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PersonPayload }) => updatePerson(id, payload),
    onSuccess: (p) => {
      toast.success("Personne mise à jour", { description: `${p.prenom} ${p.nom}` });
      setOpen(false);
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la mise à jour"),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePerson,
    onSuccess: (_, id) => {
      const p = rows.find((r) => r.id === id);
      toast("Personne supprimée", { description: p ? `${p.prenom} ${p.nom}` : undefined });
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la suppression"),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: ApiPerson) => {
    setEditing(p);
    setForm({
      prenom: p.prenom,
      nom: p.nom,
      email: p.email,
      telephone: p.telephone,
      pays: p.pays,
      cin: p.cin ?? "",
      adresse: p.adresse,
    });
    setOpen(true);
  };

  const save = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  const columns: Column<ApiPerson>[] = [
    {
      key: "nom",
      header: "Nom complet",
      sortable: true,
      sortValue: (r) => r.nom,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ice text-xs font-semibold text-navy dark:bg-white/10 dark:text-sky">
            {r.prenom[0]}
            {r.nom[0]}
          </span>
          <div>
            <p className="font-medium">
              {r.prenom} {r.nom}
            </p>
            <p className="text-xs text-muted-foreground">
              {r.pays}
              {r.entreprise ? ` · ${r.entreprise.nom}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    { key: "email", header: "E-mail", cell: (r) => <span className="text-muted-foreground">{r.email}</span> },
    { key: "telephone", header: "Téléphone", cell: (r) => <span className="text-muted-foreground">{r.telephone}</span> },
    { key: "cin", header: "CIN", cell: (r) => <span className="text-muted-foreground">{r.cin || "—"}</span> },
    {
      key: "isClient",
      header: "Statut",
      cell: (r) => <StatusBadge status={r.isClient ? "Personne" : "Contact"} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => setViewing(r)}>
            <Eye className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => openEdit(r)}>
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-destructive hover:text-destructive"
            onClick={() => deleteMutation.mutate(r.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Personnes"
        subtitle="Votre répertoire de contacts individuels."
        actions={
          <Button className="rounded-xl" onClick={openCreate}>
            <Plus className="mr-1.5 size-4" /> Nouvelle personne
          </Button>
        }
      />

      {isError ? (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Impossible de charger les personnes — vérifiez que le serveur backend est démarré.
        </div>
      ) : null}

      <DataTable
        rows={rows}
        columns={columns}
        searchKeys={(r) => `${r.nom} ${r.prenom} ${r.email} ${r.pays}`}
        searchPlaceholder="Rechercher une personne…"
        emptyTitle={isLoading ? "Chargement…" : "Aucune personne trouvée"}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <UserRound className="size-5 text-ocean" /> {editing ? "Modifier la personne" : "Nouvelle personne"}
            </SheetTitle>
            <SheetDescription>Renseignez les informations du contact.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pays</Label>
                <CountrySelect value={form.pays} onChange={(pays) => setForm({ ...form, pays })} />
              </div>
              <div className="space-y-2">
                <Label>CIN</Label>
                <Input value={form.cin} onChange={(e) => setForm({ ...form, cin: e.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className="rounded-xl" />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button className="rounded-xl" onClick={save} disabled={!form.nom || !form.prenom || saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <DetailSheet
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        icon={<UserRound className="size-5 text-ocean" />}
        title={viewing ? `${viewing.prenom} ${viewing.nom}` : ""}
        subtitle="Détail de la personne"
        footer={
          viewing ? (
            <Button
              className="w-full rounded-xl"
              onClick={() => {
                openEdit(viewing);
                setViewing(null);
              }}
            >
              <Pencil className="mr-1.5 size-4" /> Modifier
            </Button>
          ) : null
        }
      >
        {viewing ? (
          <>
            <DetailField label="Prénom" value={viewing.prenom} />
            <DetailField label="Nom" value={viewing.nom} />
            <DetailField label="E-mail" value={viewing.email} />
            <DetailField label="Téléphone" value={viewing.telephone} />
            <DetailField label="Pays" value={viewing.pays} />
            <DetailField label="CIN" value={viewing.cin ?? undefined} />
            <DetailField label="Adresse" value={viewing.adresse} />
            <DetailField label="Entreprise liée" value={viewing.entreprise?.nom} />
            <DetailField label="Statut" value={<StatusBadge status={viewing.isClient ? "Personne" : "Contact"} />} />
            <DetailField label="Ajoutée le" value={formatDate(viewing.created)} />
          </>
        ) : null}
      </DetailSheet>
    </AdminLayout>
  );
}
