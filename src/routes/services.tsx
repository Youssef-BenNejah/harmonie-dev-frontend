import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Layers, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/app/AdminLayout";
import { DetailField, DetailSheet } from "@/components/app/DetailSheet";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/mock-data";
import {
  ApiError,
  createService,
  createServiceCategory,
  deleteService,
  deleteServiceCategory,
  getServiceById,
  listServiceCategories,
  listServices,
  updateService,
  type ApiService,
  type ApiServiceCategory,
  type ServiceCategoryPayload,
  type ServicePayload,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Harmonie-dev" },
      { name: "description", content: "Votre catalogue de produits et services facturables." },
    ],
  }),
  component: Services,
});

type FormState = ServicePayload;
const emptyForm = (categoryId: string): FormState => ({ name: "", price: 0, currency: "TND", description: "", reference: "", categoryId });
const emptyCategory: ServiceCategoryPayload = { name: "", description: "", color: "#1565C6" };

function Services() {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading: categoriesLoading, isError: categoriesError } = useQuery({
    queryKey: ["service-categories"],
    queryFn: listServiceCategories,
  });
  const { data: rows = [], isLoading, isError } = useQuery({ queryKey: ["services"], queryFn: listServices });

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiService | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(""));
  const [catOpen, setCatOpen] = useState(false);
  const [newCategory, setNewCategory] = useState(emptyCategory);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const { data: viewing } = useQuery({
    queryKey: ["service", viewingId],
    queryFn: () => getServiceById(viewingId as string),
    enabled: !!viewingId,
  });

  const invalidateServices = () => queryClient.invalidateQueries({ queryKey: ["services"] });
  const invalidateCategories = () => queryClient.invalidateQueries({ queryKey: ["service-categories"] });

  const onError = (err: unknown, fallback: string) => {
    const message = err instanceof ApiError ? err.message : fallback;
    toast.error(fallback, { description: message });
  };

  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: (s) => {
      toast.success("Service ajouté", { description: s.name });
      setOpen(false);
      invalidateServices();
    },
    onError: (err) => onError(err, "Échec de la création"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ServicePayload }) => updateService(id, payload),
    onSuccess: (s) => {
      toast.success("Service mis à jour", { description: s.name });
      setOpen(false);
      invalidateServices();
    },
    onError: (err) => onError(err, "Échec de la mise à jour"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: (_data, id) => {
      const s = rows.find((r) => r.id === id);
      toast("Service supprimé", { description: s?.name });
      invalidateServices();
    },
    onError: (err) => onError(err, "Échec de la suppression"),
  });

  const createCategoryMutation = useMutation({
    mutationFn: createServiceCategory,
    onSuccess: () => {
      setNewCategory(emptyCategory);
      invalidateCategories();
    },
    onError: (err) => onError(err, "Échec de la création de la catégorie"),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteServiceCategory,
    onSuccess: (_data, id) => {
      if (activeCategory === id) setActiveCategory(null);
      invalidateCategories();
    },
    onError: (err) => onError(err, "Échec de la suppression de la catégorie"),
  });

  const categoryById = (id?: string | null) => categories.find((c) => c.id === id);
  const filtered = activeCategory ? rows.filter((s) => s.categoryId === activeCategory) : rows;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(activeCategory ?? categories[0]?.id ?? ""));
    setOpen(true);
  };

  const openEdit = (s: ApiService) => {
    setEditing(s);
    setForm({ name: s.name, price: s.price, currency: s.currency, description: s.description ?? "", reference: s.reference ?? "", categoryId: s.categoryId ?? "" });
    setOpen(true);
  };

  const save = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const remove = (s: ApiService) => {
    deleteMutation.mutate(s.id);
  };

  const addCategory = () => {
    const name = newCategory.name.trim();
    if (!name) return;
    createCategoryMutation.mutate({ ...newCategory, name });
  };

  const removeCategory = (id: string) => {
    deleteCategoryMutation.mutate(id);
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Services"
        subtitle="Catalogue de produits et prestations facturables."
        actions={
          <>
            <Button variant="outline" className="rounded-xl" onClick={() => setCatOpen(true)}>
              <Tag className="mr-1.5 size-4" /> Catégories
            </Button>
            <Button className="rounded-xl" onClick={openCreate}>
              <Plus className="mr-1.5 size-4" /> Nouveau service
            </Button>
          </>
        }
      />

      {isError || categoriesError ? (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Impossible de charger le catalogue — vérifiez que le serveur backend est démarré.
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            activeCategory === null ? "border-ocean bg-ocean text-primary-foreground" : "border-border bg-background/60 text-muted-foreground hover:text-foreground",
          )}
        >
          Toutes ({rows.length})
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              activeCategory === c.id ? "border-ocean bg-ocean text-primary-foreground" : "border-border bg-background/60 text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="size-2 rounded-full" style={{ background: activeCategory === c.id ? "currentColor" : (c.color ?? "#1565C6") }} />
            {c.name} ({rows.filter((s) => s.categoryId === c.id).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl">
          <EmptyState
            title={isLoading || categoriesLoading ? "Chargement…" : "Aucun service"}
            description="Ajoutez votre premier service pour commencer à facturer."
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => {
            const cat = categoryById(s.categoryId);
            return (
              <div key={s.id} className="glass lift flex flex-col rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-ocean/10 text-ocean dark:text-sky">
                    <Layers className="size-5" />
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => setViewingId(s.id)}>
                      <Eye className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => openEdit(s)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 rounded-lg text-destructive hover:text-destructive" onClick={() => remove(s)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="mt-4 font-semibold">{s.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {cat ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-navy dark:text-sky"
                        style={{ background: `${cat.color ?? "#1565C6"}1a` }}
                      >
                        <span className="size-2 rounded-full" style={{ background: cat.color ?? "#1565C6" }} />
                        {cat.name}
                      </span>
                    ) : null}
                    {s.reference ? (
                      <span className="rounded-full bg-ice px-2.5 py-1 text-xs font-medium text-navy dark:bg-white/10 dark:text-sky">{s.reference}</span>
                    ) : null}
                  </div>
                  <span className="text-lg font-semibold text-gradient-ocean">{formatMoney(s.price, s.currency)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Modifier le service" : "Nouveau service"}</SheetTitle>
            <SheetDescription>Décrivez le produit ou service proposé.</SheetDescription>
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
            <div className="space-y-2">
              <Label>Référence</Label>
              <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prix</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Devise</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TND">TND</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              disabled={!form.name || createMutation.isPending || updateMutation.isPending}
            >
              Enregistrer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={catOpen} onOpenChange={setCatOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Catégories de produits</SheetTitle>
            <SheetDescription>Organisez votre catalogue par catégories.</SheetDescription>
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
            {categories.map((c: ApiServiceCategory) => (
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
        open={!!viewingId}
        onOpenChange={(o) => !o && setViewingId(null)}
        icon={<Layers className="size-5 text-ocean" />}
        title={viewing?.name ?? ""}
        subtitle="Détail du service"
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
            <DetailField label="Catégorie" value={categoryById(viewing.categoryId)?.name} />
            <DetailField label="Référence" value={viewing.reference} />
            <DetailField label="Prix" value={formatMoney(viewing.price, viewing.currency)} />
            <DetailField label="Description" value={viewing.description} />
            <DetailField label="Ajouté le" value={viewing.created?.slice(0, 10)} />
          </>
        ) : null}
      </DetailSheet>
    </AdminLayout>
  );
}
