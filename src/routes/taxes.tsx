import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Percent, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/app/AdminLayout";
import { DataTable, type Column } from "@/components/app/DataTable";
import { DetailField, DetailSheet } from "@/components/app/DetailSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import {
  ApiError,
  createTax,
  deleteTax,
  getTaxById,
  listTaxes,
  setDefaultTax,
  updateTax,
  type ApiTax,
  type TaxPayload,
} from "@/lib/api";

export const Route = createFileRoute("/taxes")({
  head: () => ({
    meta: [
      { title: "Taxes — Harmonie-dev" },
      { name: "description", content: "Configurez les taux de taxe applicables à vos factures." },
    ],
  }),
  component: Taxes,
});

type FormState = TaxPayload;
const emptyForm: FormState = { name: "", taxvalue: 0, isActive: true, isDefault: false };

function Taxes() {
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading, isError } = useQuery({ queryKey: ["taxes"], queryFn: listTaxes });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiTax | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const { data: viewing } = useQuery({
    queryKey: ["tax", viewingId],
    queryFn: () => getTaxById(viewingId as string),
    enabled: !!viewingId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["taxes"] });

  const onError = (err: unknown, fallback: string) => {
    const message = err instanceof ApiError ? err.message : fallback;
    toast.error(fallback, { description: message });
  };

  const createMutation = useMutation({
    mutationFn: createTax,
    onSuccess: (t) => {
      toast.success("Taxe ajoutée", { description: t.name });
      setOpen(false);
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la création"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TaxPayload }) => updateTax(id, payload),
    onSuccess: (t) => {
      toast.success("Taxe mise à jour", { description: t.name });
      setOpen(false);
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la mise à jour"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTax,
    onSuccess: (_data, id) => {
      const t = rows.find((r) => r.id === id);
      toast("Taxe supprimée", { description: t?.name });
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la suppression"),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (t: ApiTax) => {
    setEditing(t);
    setForm({ name: t.name, taxvalue: t.taxvalue, isActive: t.isActive, isDefault: t.isDefault });
    setOpen(true);
  };

  const save = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const remove = (t: ApiTax) => {
    deleteMutation.mutate(t.id);
  };

  const setDefaultMutation = useMutation({
    mutationFn: setDefaultTax,
    onSuccess: (t) => {
      toast.success("Taxe par défaut mise à jour", { description: t.name });
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la mise à jour"),
  });

  const columns: Column<ApiTax>[] = [
    {
      key: "name",
      header: "Taxe",
      sortable: true,
      sortValue: (r) => r.name,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-ocean/10 text-ocean dark:text-sky">
            <Percent className="size-4" />
          </span>
          <div>
            <p className="font-medium">{r.name}</p>
            {r.isDefault ? <p className="text-xs text-ocean dark:text-sky">Taxe par défaut</p> : null}
          </div>
        </div>
      ),
    },
    {
      key: "taxvalue",
      header: "Taux",
      className: "text-right",
      sortable: true,
      sortValue: (r) => r.taxvalue,
      cell: (r) => <span className="font-semibold">{r.taxvalue}%</span>,
    },
    {
      key: "isActive",
      header: "Statut",
      cell: (r) => (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
            r.isActive ? "border-success/30 bg-success/15 text-success" : "border-border bg-muted text-muted-foreground"
          }`}
        >
          <span className="size-1.5 rounded-full bg-current opacity-70" />
          {r.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) => (
        <div className="flex justify-end gap-1.5">
          {!r.isDefault ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg"
              title="Définir par défaut"
              onClick={() => setDefaultMutation.mutate(r.id)}
              disabled={setDefaultMutation.isPending}
            >
              <Star className="size-4" />
            </Button>
          ) : null}
          <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => setViewingId(r.id)}>
            <Eye className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => openEdit(r)}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 rounded-lg text-destructive hover:text-destructive" onClick={() => remove(r)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Taxes"
        subtitle="Taux de TVA et taxes appliqués à vos factures."
        actions={
          <Button className="rounded-xl" onClick={openCreate}>
            <Plus className="mr-1.5 size-4" /> Nouvelle taxe
          </Button>
        }
      />

      {isError ? (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Impossible de charger les taxes — vérifiez que le serveur backend est démarré.
        </div>
      ) : null}

      <DataTable
        rows={rows}
        columns={columns}
        searchKeys={(r) => r.name}
        searchPlaceholder="Rechercher une taxe…"
        emptyTitle={isLoading ? "Chargement…" : "Aucune taxe"}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Modifier la taxe" : "Nouvelle taxe"}</SheetTitle>
            <SheetDescription>Nom et taux appliqué au sous-total.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 grid gap-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Taux (%)</Label>
              <Input type="number" min={0} max={100} value={form.taxvalue} onChange={(e) => setForm({ ...form, taxvalue: Number(e.target.value) })} className="rounded-xl" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5">
              <Label className="text-sm">Taxe active</Label>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5">
              <Label className="text-sm">Définir par défaut</Label>
              <Switch checked={form.isDefault} onCheckedChange={(v) => setForm({ ...form, isDefault: v })} />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              className="rounded-xl"
              onClick={save}
              disabled={!form.name || createMutation.isPending || updateMutation.isPending}
            >
              Enregistrer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <DetailSheet
        open={!!viewingId}
        onOpenChange={(o) => !o && setViewingId(null)}
        icon={<Percent className="size-5 text-ocean" />}
        title={viewing?.name ?? ""}
        subtitle="Détail de la taxe"
        footer={
          viewing ? (
            <Button
              className="w-full rounded-xl"
              onClick={() => {
                openEdit(viewing);
                setViewingId(null);
              }}
            >
              <Pencil className="mr-1.5 size-4" /> Modifier
            </Button>
          ) : null
        }
      >
        {viewing ? (
          <>
            <DetailField label="Nom" value={viewing.name} />
            <DetailField label="Taux" value={`${viewing.taxvalue}%`} />
            <DetailField label="Active" value={viewing.isActive ? "Oui" : "Non"} />
            <DetailField label="Par défaut" value={viewing.isDefault ? "Oui" : "Non"} />
          </>
        ) : null}
      </DetailSheet>
    </AdminLayout>
  );
}
