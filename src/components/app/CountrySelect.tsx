import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COUNTRIES, findCountryByName } from "@/lib/countries";
import { cn } from "@/lib/utils";

// Flags are bundled SVGs (flag-icons) rather than emoji — Windows doesn't render flag emoji,
// and the desktop build has to work offline.
export function Flag({ code, className }: { code: string; className?: string }) {
  return <span className={cn("fi rounded-[2px]", `fi-${code.toLowerCase()}`, className)} aria-hidden />;
}

/** Stores the French country name (what the backend already keeps as free text) and shows its flag. */
export function CountrySelect({ value, onChange, disabled }: { value: string; onChange: (name: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const selected = findCountryByName(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" disabled={disabled} className="w-full justify-between rounded-xl font-normal">
          <span className="flex items-center gap-2 truncate">
            {selected ? <Flag code={selected.code} /> : null}
            {selected?.name ?? (value || <span className="text-muted-foreground">Choisir un pays</span>)}
          </span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un pays…" />
          <CommandList>
            <CommandEmpty>Aucun pays trouvé.</CommandEmpty>
            {COUNTRIES.map((c) => (
              <CommandItem
                key={c.code}
                value={`${c.name} ${c.code}`}
                onSelect={() => {
                  onChange(c.name);
                  setOpen(false);
                }}
              >
                <Flag code={c.code} className="mr-2" />
                {c.name}
                <Check className={cn("ml-auto size-4", selected?.code === c.code ? "opacity-100" : "opacity-0")} />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
