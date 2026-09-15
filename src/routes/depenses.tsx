import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Tag, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/app/AdminLayout";
import { DataTable, type Column } from "@/components/app/DataTable";
import { DetailField, DetailSheet } from "@/components/app/DetailSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/mock-data";
import {
  ApiError,
  createDepense,
  createDepenseCategory,
  deleteDepense,
  deleteDepenseCategory,
  listDepenseCategories,
  listDepenses,
  updateDepense,
  type ApiDepense,
  type ApiDepenseCategory,
  type DepenseCategoryPayload,
  type DepensePayload,
} from "@/lib/api";

export const Route = createFileRoute("/depenses")({
  head: () => ({
    meta: [
      { title: "Dépenses — Harmonie-dev" },
      { name: "description", content: "Suivez et catégorisez les dépenses de votre entreprise." },
    ],
  }),
  component: Depenses,
});

const devisesDepense = ["USD", "EUR", "GBP", "JPY", "CNY", "INR", "TND"];

type FormState = DepensePayload;
const emptyForm = (categoryId: string): FormState => ({ name: "", price: 0, currency: "USD", description: "", reference: "", categoryId });
const emptyCategory: DepenseCategoryPayload = { name: "", color: "#1565C6" };

function Depenses() {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading: categoriesLoading, isError: categoriesError } = useQuery({
    queryKey: ["depense-categories"],
    queryFn: listDepenseCategories,
  });
  const { data: rows = [], isLoading, isError } = useQuery({ queryKey: ["depenses"], queryFn: listDepenses });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiDepense | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(""));
  const [catOpen, setCatOpen] = useState(false);
  const [newCategory, setNewCategory] = useState(emptyCategory);
  const [viewing, setViewing] = useState<ApiDepense | null>(null);

  const invalidateDepenses = () => queryClient.invalidateQueries({ queryKey: ["depenses"] });
  const invalidateCategories = () => queryClient.invalidateQueries({ queryKey: ["depense-categories"] });

  const onError = (err: unknown, fallback: string) => {
    const message = err instanceof ApiError ? err.message : fallback;
    toast.error(fallback, { description: message });
  };

  const totalsByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    for (const d of rows) totals.set(d.currency, (totals.get(d.currency) ?? 0) + d.price);
    return [...totals.entries()];
  }, [rows]);

  const createMutation = useMutation({
    mutationFn: createDepense,
    onSuccess: (d) => {
      toast.success("Dépense ajoutée", { description: d.name });
      setOpen(false);
      invalidateDepenses();
    },
    onError: (err) => onError(err, "Échec de la création"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DepensePayload }) => updateDepense(id, payload),
    onSuccess: (d) => {
      toast.success("Dépense mise à jour", { description: d.name });
      setOpen(false);
      invalidateDepenses();
    },
    onError: (err) => onError(err, "Échec de la mise à jour"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDepense,
    onSuccess: (_data, id) => {
      const d = rows.find((r) => r.id === id);
      toast("Dépense supprimée", { description: d?.name });
      invalidateDepenses();
    },
    onError: (err) => onError(err, "Échec de la suppression"),
  });

  const createCategoryMutation = useMutation({
    mutationFn: createDepenseCategory,
    onSuccess: () => {
      setNewCategory(emptyCategory);
      invalidateCategories();
    },
    onError: (err) => onError(err, "Échec de la création de la catégorie"),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteDepenseCategory,
    onSuccess: () => invalidateCategories(),
    onError: (err) => onError(err, "Échec de la suppression de la catégorie"),
  });

  const categoryById = (id?: string | null) => categories.find((c) => c.id === id);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(categories[0]?.id ?? ""));
    setOpen(true);
  };

  const openEdit = (d: ApiDepense) => {
    setEditing(d);
    setForm({ name: d.name, price: d.price, currency: d.currency, description: d.description ?? "", reference: d.reference ?? "", categoryId: d.categoryId ?? "" });
    setOpen(true);
  };

  const save = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const remove = (d: ApiDepense) => deleteMutation.mutate(d.id);

  const addCategory = () => {
    const name = newCategory.name.trim();
    if (!name) return;
    createCategoryMutation.mutate({ ...newCategory, name });
  };

  const removeCategory = (id: string) => deleteCategoryMutation.mutate(id);

  const columns: Column<ApiDepense>[] = [
    {
      key: "name",
      header: "Dépense",
      sortable: true,
      sortValue: (r) => r.name,
      cell: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">{r.reference}</p>
        </div>
      ),
    },
    {
      key: "depenseCategory",
      header: "Catégorie",
      cell: (r) => {
        const cat = categoryById(r.categoryId);
        return cat ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ice px-2.5 py-1 text-xs font-medium text-navy dark:bg-white/10 dark:text-sky">
            <span className="size-2 rounded-full" style={{ background: cat.color ?? "#1565C6" }} />
            {cat.name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "price",
      header: "Montant",
      className: "text-right",
      sortable: true,
      sortValue: (r) => r.price,
      cell: (r) => <span className="font-semibold">{formatMoney(r.price, r.currency)}</span>,
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
        title="Dépenses"
        subtitle="Suivez les dépenses de votre entreprise par catégorie."
        actions={
          <>
            <Button variant="outline" className="rounded-xl" onClick={() => setCatOpen(true)}>
              <Tag className="mr-1.5 size-4" /> Catégories
            </Button>
            <Button className="rounded-xl" onClick={openCreate}>
              <Plus className="mr-1.5 size-4" /> Nouvelle dépense
            </Button>
          </>
        }
      />

      {isError || categoriesError ? (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Impossible de charger les dépenses — vérifiez que le serveur backend est démarré.
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="size-4" /> Total des dépenses
          </div>
          {totalsByCurrency.length === 0 ? (
            <p className="mt-2 text-2xl font-semibold">{formatMoney(0, "USD")}</p>
          ) : (
            <div className="mt-2 space-y-1">
              {totalsByCurrency.map(([currency, amount]) => (
                <p key={currency} className="text-2xl font-semibold">
                  {formatMoney(amount, currency)}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        searchKeys={(r) => `${r.name} ${categoryById(r.categoryId)?.name ?? ""}`}
        searchPlaceholder="Rechercher une dépense…"
        emptyTitle={isLoading || categoriesLoading ? "Chargement…" : "Aucune dépense"}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Modifier la dépense" : "Nouvelle dépense"}</SheetTitle>
            <SheetDescription>Renseignez le détail de la dépense.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 grid gap-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Choisir une catégorie…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Montant</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Devise</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {devisesDepense.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Référence</Label>
              <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl" />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              className="rounded-xl"
              onClick={save}
              disabled={!form.name || !form.categoryId || createMutation.isPending || updateMutation.isPending}
            >
              Enregistrer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={catOpen} onOpenChange={setCatOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Catégories de dépenses</SheetTitle>
            <SheetDescription>Ajoutez ou retirez des catégories.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 flex gap-2">
            <Input
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              placeholder="Nouvelle catégorie"
              className="rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
            <Button className="rounded-xl" onClick={addCategory} disabled={createCategoryMutation.isPending}>
              Ajouter
            </Button>
          </div>
          <ul className="mt-2 space-y-2">
            {categories.map((c: ApiDepenseCategory) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: c.color ?? "#1565C6" }} />
                  {c.name}
                </span>
                <Button variant="ghost" size="icon" className="size-7 rounded-lg text-destructive hover:text-destructive" onClick={() => removeCategory(c.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
          <SheetFooter className="mt-6">
            <Button className="rounded-xl" onClick={() => setCatOpen(false)}>
              Fermer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <DetailSheet
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        icon={<Wallet className="size-5 text-ocean" />}
        title={viewing?.name ?? ""}
        subtitle="Détail de la dépense"
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
            <DetailField label="Nom" value={viewing.name} />
            <DetailField label="Catégorie" value={categoryById(viewing.categoryId)?.name} />
            <DetailField label="Référence" value={viewing.reference} />
            <DetailField label="Montant" value={formatMoney(viewing.price, viewing.currency)} />
            <DetailField label="Description" value={viewing.description} />
            <DetailField label="Ajoutée le" value={viewing.created?.slice(0, 10)} />
          </>
        ) : null}
      </DetailSheet>
    </AdminLayout>
  );
}
