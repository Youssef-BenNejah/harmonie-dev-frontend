import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/app/AdminLayout";
import { DataTable, type Column } from "@/components/app/DataTable";
import { DetailField, DetailSheet } from "@/components/app/DetailSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import {
  ApiError,
  createCurrency,
  deleteCurrency,
  listCurrencies,
  updateCurrency,
  type ApiCurrency,
  type CurrencyPayload,
} from "@/lib/api";
import { requireAuth } from "@/lib/route-guards";

export const Route = createFileRoute("/devise")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Devise — Harmonie-dev" },
      { name: "description", content: "Gérez les devises utilisées pour vos factures." },
    ],
  }),
  component: Devise,
});

type FormState = CurrencyPayload;
const emptyForm: FormState = { code: "", name: "", symbol: "" };

function Devise() {
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading, isError } = useQuery({ queryKey: ["currencies"], queryFn: listCurrencies });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiCurrency | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [viewing, setViewing] = useState<ApiCurrency | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["currencies"] });
  const onError = (err: unknown, fallback: string) => {
    const message = err instanceof ApiError ? err.message : fallback;
    toast.error(fallback, { description: message });
  };

  const createMutation = useMutation({
    mutationFn: createCurrency,
    onSuccess: (d) => {
      toast.success("Devise ajoutée", { description: d.code });
      setOpen(false);
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la création"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CurrencyPayload }) => updateCurrency(id, payload),
    onSuccess: (d) => {
      toast.success("Devise mise à jour", { description: d.code });
      setOpen(false);
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la mise à jour"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCurrency,
    onSuccess: (_data, id) => {
      const d = rows.find((r) => r.id === id);
      toast("Devise supprimée", { description: d?.code });
      invalidate();
    },
    onError: (err) => onError(err, "Échec de la suppression"),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (d: ApiCurrency) => {
    setEditing(d);
    setForm({ code: d.code, name: d.name, symbol: d.symbol });
    setOpen(true);
  };

  const save = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const remove = (d: ApiCurrency) => {
    deleteMutation.mutate(d.id);
  };

  const columns: Column<ApiCurrency>[] = [
    {
      key: "code",
      header: "Devise",
      sortable: true,
      sortValue: (r) => r.code,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-ocean/10 text-sm font-bold text-ocean dark:text-sky">{r.symbol}</span>
          <div>
            <p className="font-medium">{r.code}</p>
            <p className="text-xs text-muted-foreground">{r.name}</p>
          </div>
        </div>
      ),
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
        title="Devise"
        subtitle="Les monnaies disponibles pour la facturation."
        actions={
          <Button className="rounded-xl" onClick={openCreate}>
            <Plus className="mr-1.5 size-4" /> Nouvelle devise
          </Button>
        }
      />

      {isError ? (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Impossible de charger les devises — vérifiez que le serveur backend est démarré.
        </div>
      ) : null}

      <DataTable
        rows={rows}
        columns={columns}
        searchKeys={(r) => `${r.code} ${r.name}`}
        searchPlaceholder="Rechercher une devise…"
        emptyTitle={isLoading ? "Chargement…" : "Aucune devise"}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Coins className="size-5 text-ocean" /> {editing ? "Modifier la devise" : "Nouvelle devise"}
            </SheetTitle>
            <SheetDescription>Code ISO, nom et symbole.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="rounded-xl" maxLength={3} />
              </div>
              <div className="space-y-2">
                <Label>Symbole</Label>
                <Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              className="rounded-xl"
              onClick={save}
              disabled={!form.code || !form.name || createMutation.isPending || updateMutation.isPending}
            >
              Enregistrer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <DetailSheet
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        icon={<Coins className="size-5 text-ocean" />}
        title={viewing?.code ?? ""}
        subtitle="Détail de la devise"
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
            <DetailField label="Code" value={viewing.code} />
            <DetailField label="Nom" value={viewing.name} />
            <DetailField label="Symbole" value={viewing.symbol} />
          </>
        ) : null}
      </DetailSheet>
    </AdminLayout>
  );
}
