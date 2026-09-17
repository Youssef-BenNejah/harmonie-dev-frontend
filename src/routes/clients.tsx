import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Eye, Plus, Search, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, PageHeader } from "@/components/app/AdminLayout";
import { DataTable, type Column } from "@/components/app/DataTable";
import { DetailField, DetailSheet } from "@/components/app/DetailSheet";
import { EmptyState } from "@/components/app/EmptyState";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/mock-data";
import {
  ApiError,
  createClient,
  deleteClient,
  getClientById,
  listClients,
  listEntreprises,
  listPersons,
  type ApiClient,
  type ApiClientType,
} from "@/lib/api";
import { requireAuth } from "@/lib/route-guards";

export const Route = createFileRoute("/clients")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Clients — Harmonie-dev" },
      { name: "description", content: "Retrouvez vos clients particuliers et entreprises, et convertissez vos contacts." },
    ],
  }),
  component: Clients,
});

const clientLabel = (c: ApiClient) => (c.type === "PERSON" ? `${c.person?.prenom ?? ""} ${c.person?.nom ?? ""}`.trim() : (c.entreprise?.nom ?? ""));
const clientEmail = (c: ApiClient) => (c.type === "PERSON" ? c.person?.email : c.entreprise?.email) ?? "";
const clientPhone = (c: ApiClient) => (c.type === "PERSON" ? c.person?.telephone : c.entreprise?.telephone) ?? "";
const clientTypeLabel = (t: ApiClientType) => (t === "PERSON" ? "Personne" : "Entreprise");

function Clients() {
  const queryClient = useQueryClient();
  const { data: clients = [], isLoading, isError } = useQuery({ queryKey: ["clients"], queryFn: listClients });
  const { data: persons = [] } = useQuery({ queryKey: ["persons"], queryFn: listPersons });
  const { data: entreprises = [] } = useQuery({ queryKey: ["entreprises"], queryFn: listEntreprises });

  const [tab, setTab] = useState<"tous" | ApiClientType>("tous");
  const [convertQuery, setConvertQuery] = useState("");
  const [convertPage, setConvertPage] = useState(1);
  const convertPageSize = 4;
  const [viewingId, setViewingId] = useState<string | null>(null);

  const { data: viewing } = useQuery({
    queryKey: ["client", viewingId],
    queryFn: () => getClientById(viewingId as string),
    enabled: !!viewingId,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    queryClient.invalidateQueries({ queryKey: ["persons"] });
    queryClient.invalidateQueries({ queryKey: ["entreprises"] });
  };

  const onError = (err: unknown, fallback: string) => {
    const message = err instanceof ApiError ? err.message : fallback;
    toast.error(fallback, { description: message });
  };

  const createClientMutation = useMutation({
    mutationFn: createClient,
    onSuccess: (c) => {
      toast.success("Converti en client", { description: clientLabel(c) });
      invalidateAll();
    },
    onError: (err) => onError(err, "Échec de la conversion"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: (_data, id) => {
      const c = clients.find((r) => r.id === id);
      toast("Client supprimé", { description: c ? clientLabel(c) : undefined });
      if (viewingId === id) setViewingId(null);
      invalidateAll();
    },
    onError: (err) => onError(err, "Échec de la suppression"),
  });

  const nonClientPersons = useMemo(() => persons.filter((p) => !p.isClient), [persons]);
  const nonClientCompanies = useMemo(() => entreprises.filter((e) => !e.isClient), [entreprises]);

  const filtered = useMemo(
    () => (tab === "tous" ? clients : clients.filter((c) => c.type === tab)),
    [clients, tab],
  );

  const convertCandidates = useMemo(() => {
    const personCandidates = nonClientPersons.map((p) => ({
      key: `p-${p.id}`,
      id: p.id,
      type: "Person" as const,
      label: `${p.prenom} ${p.nom}`,
      sub: p.pays,
    }));
    const companies = nonClientCompanies.map((e) => ({
      key: `e-${e.id}`,
      id: e.id,
      type: "Company" as const,
      label: e.nom,
      sub: e.pays,
    }));
    const all = [...personCandidates, ...companies];
    const q = convertQuery.trim().toLowerCase();
    return q ? all.filter((c) => c.label.toLowerCase().includes(q)) : all;
  }, [nonClientPersons, nonClientCompanies, convertQuery]);

  const convertPages = Math.max(1, Math.ceil(convertCandidates.length / convertPageSize));
  const convertCurrentPage = Math.min(convertPage, convertPages);
  const convertSlice = convertCandidates.slice(
    (convertCurrentPage - 1) * convertPageSize,
    convertCurrentPage * convertPageSize,
  );

  const converting = createClientMutation.isPending;

  const columns: Column<ApiClient>[] = [
    {
      key: "nom",
      header: "Client",
      sortable: true,
      sortValue: (r) => clientLabel(r),
      cell: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ice text-xs font-semibold text-navy dark:bg-white/10 dark:text-sky">
            {clientLabel(r)
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")}
          </span>
          <p className="font-medium">{clientLabel(r)}</p>
        </div>
      ),
    },
    { key: "type", header: "Type", cell: (r) => <StatusBadge status={clientTypeLabel(r.type)} /> },
    { key: "email", header: "E-mail", cell: (r) => <span className="text-muted-foreground">{clientEmail(r)}</span> },
    { key: "telephone", header: "Téléphone", cell: (r) => <span className="text-muted-foreground">{clientPhone(r)}</span> },
    {
      key: "created",
      header: "Client depuis",
      sortable: true,
      sortValue: (r) => r.created,
      cell: (r) => <span className="text-muted-foreground">{formatDate(r.created)}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => setViewingId(r.id)}>
            <Eye className="size-4" />
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
      <PageHeader title="Clients" subtitle="Vos clients particuliers et entreprises, au même endroit." />

      {isError ? (
        <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Impossible de charger les clients — vérifiez que le serveur backend est démarré.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="mb-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                <TabsTrigger value="tous">Tous</TabsTrigger>
                <TabsTrigger value="PERSON">Personnes</TabsTrigger>
                <TabsTrigger value="COMPANY">Entreprises</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <DataTable
            rows={filtered}
            columns={columns}
            searchKeys={(r) => `${clientLabel(r)} ${clientEmail(r)}`}
            searchPlaceholder="Rechercher un client…"
            emptyTitle={isLoading ? "Chargement…" : "Aucun client trouvé"}
          />
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <User className="size-4 text-ocean" /> Convertir en client
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Contacts qui ne sont pas encore clients.</p>

          {nonClientPersons.length === 0 && nonClientCompanies.length === 0 ? (
            <EmptyState title="Tout est converti" description="Tous vos contacts sont déjà clients." />
          ) : (
            <>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={convertQuery}
                  onChange={(e) => {
                    setConvertQuery(e.target.value);
                    setConvertPage(1);
                  }}
                  placeholder="Rechercher un contact…"
                  className="h-10 rounded-xl border-border/70 bg-background/60 pl-9"
                />
              </div>

              {convertSlice.length === 0 ? (
                <EmptyState title="Aucun résultat" description="Essayez un autre terme de recherche." />
              ) : (
                <ul className="mt-4 space-y-2">
                  {convertSlice.map((c) => (
                    <li key={c.key} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium">{c.label}</p>
                        <p className="text-xs text-muted-foreground">{c.sub}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        disabled={converting}
                        onClick={() =>
                          createClientMutation.mutate(
                            c.type === "Person" ? { type: "PERSON", personId: c.id } : { type: "COMPANY", entrepriseId: c.id },
                          )
                        }
                      >
                        <Plus className="mr-1 size-3.5" /> Convertir
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {convertCandidates.length} contact{convertCandidates.length > 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 rounded-lg"
                    disabled={convertCurrentPage <= 1}
                    onClick={() => setConvertPage((p) => p - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-foreground">
                    {convertCurrentPage} / {convertPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 rounded-lg"
                    disabled={convertCurrentPage >= convertPages}
                    onClick={() => setConvertPage((p) => p + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <DetailSheet
        open={!!viewingId}
        onOpenChange={(o) => !o && setViewingId(null)}
        icon={<User className="size-5 text-ocean" />}
        title={viewing ? clientLabel(viewing) : ""}
        subtitle="Détail du client"
      >
        {viewing ? (
          <>
            <DetailField label="Type" value={clientTypeLabel(viewing.type)} />
            <DetailField label="E-mail" value={clientEmail(viewing)} />
            <DetailField label="Téléphone" value={clientPhone(viewing)} />
            {viewing.type === "PERSON" ? (
              <>
                <DetailField label="CIN" value={viewing.person?.cin} />
                <DetailField label="Adresse" value={viewing.person?.adresse} />
              </>
            ) : (
              <>
                <DetailField label="Matricule fiscal" value={viewing.entreprise?.fisc} />
                <DetailField label="Adresse" value={viewing.entreprise?.adresse} />
              </>
            )}
            <DetailField label="Client depuis" value={formatDate(viewing.created)} />
          </>
        ) : null}
      </DetailSheet>
    </AdminLayout>
  );
}
