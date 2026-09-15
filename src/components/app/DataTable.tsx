import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./EmptyState";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  searchKeys,
  searchPlaceholder = "Rechercher…",
  pageSize = 6,
  toolbar,
  selectable,
  onSelectionChange,
  emptyTitle = "Aucun résultat",
}: {
  rows: T[];
  columns: Column<T>[];
  searchKeys: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  toolbar?: ReactNode;
  selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  emptyTitle?: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = q ? rows.filter((r) => searchKeys(r).toLowerCase().includes(q)) : [...rows];
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        out.sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), "fr");
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, query, sort, columns, searchKeys]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * pageSize, current * pageSize);

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    setSelected(next);
    onSelectionChange?.(next);
  };

  return (
    <div className="glass rounded-2xl">
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="h-10 rounded-xl border-border/70 bg-background/60 pl-9"
          />
        </div>
        {toolbar}
      </div>

      {/* Desktop/tablet: full table with horizontal scroll if needed */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
              {selectable ? <th className="w-10 px-4 py-3" /> : null}
              {columns.map((c) => (
                <th key={c.key} className={cn("px-4 py-3 font-semibold", c.className)}>
                  {c.sortable ? (
                    <button
                      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                      onClick={() =>
                        setSort((s) =>
                          s?.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: "asc" },
                        )
                      }
                    >
                      {c.header}
                      <ArrowUpDown className="size-3.5" />
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((row) => (
              <tr key={row.id} className="border-t border-border/50 transition-colors hover:bg-ice/40 dark:hover:bg-white/5">
                {selectable ? (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--ocean)]"
                      checked={selected.includes(row.id)}
                      onChange={() => toggle(row.id)}
                      aria-label="Sélectionner la ligne"
                    />
                  </td>
                ) : null}
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {slice.length === 0 ? <EmptyState title={emptyTitle} description="Essayez d'ajuster votre recherche ou vos filtres." /> : null}
      </div>

      {/* Mobile: stacked cards, no sideways scrolling required */}
      <div className="sm:hidden">
        {slice.length === 0 ? (
          <EmptyState title={emptyTitle} description="Essayez d'ajuster votre recherche ou vos filtres." />
        ) : (
          <ul className="divide-y divide-border/50">
            {slice.map((row) => {
              const [primary, ...rest] = columns.filter((c) => c.key !== "actions");
              const actionsCol = columns.find((c) => c.key === "actions");
              return (
                <li key={row.id} className="p-4">
                  <div className="flex items-start gap-3">
                    {selectable ? (
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 accent-[var(--ocean)]"
                        checked={selected.includes(row.id)}
                        onChange={() => toggle(row.id)}
                        aria-label="Sélectionner la ligne"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 text-sm">{primary?.cell(row)}</div>
                  </div>
                  {rest.length > 0 ? (
                    <dl className="mt-3 space-y-1.5 border-t border-border/50 pt-3">
                      {rest.map((c) => (
                        <div key={c.key} className="flex items-center justify-between gap-3 text-sm">
                          <dt className="text-muted-foreground">{c.header}</dt>
                          <dd className="text-right font-medium">{c.cell(row)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {actionsCol ? (
                    <div className="mt-3 flex items-center justify-end gap-1 border-t border-border/50 pt-3">{actionsCol.cell(row)}</div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 p-4 text-sm text-muted-foreground">
        <span>
          {filtered.length} élément{filtered.length > 1 ? "s" : ""}
          {selected.length ? ` · ${selected.length} sélectionné(s)` : ""}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-xl" disabled={current <= 1} onClick={() => setPage(current - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-foreground">
            {current} / {pages}
          </span>
          <Button variant="outline" size="icon" className="rounded-xl" disabled={current >= pages} onClick={() => setPage(current + 1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
