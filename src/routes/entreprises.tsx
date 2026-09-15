import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Eye, Pencil, Plus, Trash2 } from "lucide-react";
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
  createEntreprise,
  deleteEntreprise,
  listEntreprises,
  updateEntreprise,
  type ApiEntreprise,
  type EntreprisePayload,
} from "@/lib/api";

export const Route = createFileRoute("/entreprises")({
  head: () => ({
    meta: [
      { title: "Entreprises — Harmonie-dev" },
      { name: "description", content: "Gérez le répertoire des entreprises partenaires et clientes." },
    ],
  }),
  component: Entreprises,
});

type FormState = EntreprisePayload;
const emptyForm: FormState = { nom: "", email: "", telephone: "", pays: "", siteweb: "", rib: "", fisc: "", adresse: "" };

function Entreprises() {
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading, isError } = useQuery({ queryKey: ["entreprises"], queryFn: listEntreprises });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiEntreprise | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [viewing, setViewing] = useState<ApiEntreprise | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["entreprises"] });

  const onError = (err: unknown, fallback: string) => {
    const message = err instanceof ApiError ? err.message : fallback;
    toast.error(fallback, { description: message });
  };

  const createMutation = useMutation({
    mutationFn: createEntreprise,
    onSuccess: (e) => {
      toast.success("Entreprise ajoutée", { description: e.nom });
      setOpen(false);
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la création"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EntreprisePayload }) => updateEntreprise(id, payload),
    onSuccess: (e) => {
      toast.success("Entreprise mise à jour", { description: e.nom });
      setOpen(false);
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la mise à jour"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEntreprise,
    onSuccess: (_, id) => {
      const e = rows.find((r) => r.id === id);
      toast("Entreprise supprimée", { description: e?.nom });
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la suppression"),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: ApiEntreprise) => {
    setEditing(c);
    setForm({
      nom: c.nom,
      email: c.email,
      telephone: c.telephone,
      pays: c.pays,
      siteweb: c.siteweb ?? "",
      rib: c.rib ?? "",
      fisc: c.fisc,
      adresse: c.adresse,
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

  const columns: Column<ApiEntreprise>[] = [
    {
      key: "nom",
      header: "Entreprise",
      sortable: true,
      sortValue: (r) => r.nom,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ocean/10 text-ocean dark:text-sky">
            <Building2 className="size-4" />
          </span>
          <div>
            <p className="font-medium">{r.nom}</p>
            <p className="text-xs text-muted-foreground">
              {r.fisc} · {r.pays}
            </p>
          </div>
        </div>
      ),
    },
    { key: "email", header: "E-mail", cell: (r) => <span className="text-muted-foreground">{r.email}</span> },
    { key: "telephone", header: "Téléphone", cell: (r) => <span className="text-muted-foreground">{r.telephone}</span> },
    { key: "siteweb", header: "Site web", cell: (r) => <span className="text-muted-foreground">{r.siteweb || "—"}</span> },
    {
      key: "isClient",
      header: "Statut",
      cell: (r) => <StatusBadge status="Entreprise" className={r.isClient ? "" : "opacity-60"} />,
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
        title="Entreprises"
        subtitle="Sociétés partenaires, fournisseurs et clientes."
        actions={
          <Button className="rounded-xl" onClick={openCreate}>
            <Plus className="mr-1.5 size-4" /> Nouvelle entreprise
          </Button>
        }
      />

      {isError ? (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Impossible de charger les entreprises — vérifiez que le serveur backend est démarré.
        </div>
      ) : null}

      <DataTable
        rows={rows}
        columns={columns}
        searchKeys={(r) => `${r.nom} ${r.email} ${r.fisc} ${r.pays}`}
        searchPlaceholder="Rechercher une entreprise…"
        emptyTitle={isLoading ? "Chargement…" : "Aucune entreprise trouvée"}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-ocean" /> {editing ? "Modifier l'entreprise" : "Nouvelle entreprise"}
            </SheetTitle>
            <SheetDescription>Renseignez les informations de la société.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 grid gap-4">
            <div className="space-y-2">
              <Label>Raison sociale</Label>
              <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Matricule fiscal</Label>
                <Input value={form.fisc} onChange={(e) => setForm({ ...form, fisc: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>RIB</Label>
                <Input value={form.rib} onChange={(e) => setForm({ ...form, rib: e.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Pays</Label>
                <Input value={form.pays} onChange={(e) => setForm({ ...form, pays: e.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Site web</Label>
              <Input value={form.siteweb} onChange={(e) => setForm({ ...form, siteweb: e.target.value })} className="rounded-xl" />
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
            <Button className="rounded-xl" onClick={save} disabled={!form.nom || saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <DetailSheet
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        icon={<Building2 className="size-5 text-ocean" />}
        title={viewing?.nom ?? ""}
        subtitle="Détail de l'entreprise"
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
            <DetailField label="Raison sociale" value={viewing.nom} />
            <DetailField label="Matricule fiscal" value={viewing.fisc} />
            <DetailField label="RIB" value={viewing.rib ?? undefined} />
            <DetailField label="E-mail" value={viewing.email} />
            <DetailField label="Téléphone" value={viewing.telephone} />
            <DetailField label="Pays" value={viewing.pays} />
            <DetailField label="Site web" value={viewing.siteweb ?? undefined} />
            <DetailField label="Adresse" value={viewing.adresse} />
            <DetailField
              label="Contact principal"
              value={viewing.mainContact ? `${viewing.mainContact.prenom} ${viewing.mainContact.nom}` : undefined}
            />
            <DetailField label="Statut" value={<StatusBadge status="Entreprise" className={viewing.isClient ? "" : "opacity-60"} />} />
            <DetailField label="Ajoutée le" value={formatDate(viewing.created)} />
          </>
        ) : null}
      </DetailSheet>
    </AdminLayout>
  );
}
