import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WORLD_CURRENCIES, type WorldCurrency } from "@/lib/currencies";
import { cn } from "@/lib/utils";

export function CurrencySelect({ value, onSelect, disabled }: { value: string; onSelect: (c: WorldCurrency) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const selected = WORLD_CURRENCIES.find((c) => c.code === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" disabled={disabled} className="w-full justify-between rounded-xl font-normal">
          <span className="truncate">{selected ? `${selected.code} — ${selected.name}` : <span className="text-muted-foreground">Choisir une devise</span>}</span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher une devise…" />
          <CommandList>
            <CommandEmpty>Aucune devise trouvée.</CommandEmpty>
            {WORLD_CURRENCIES.map((c) => (
              <CommandItem
                key={c.code}
                value={`${c.code} ${c.name}`}
                onSelect={() => {
                  onSelect(c);
                  setOpen(false);
                }}
              >
                <span className="w-12 font-medium">{c.code}</span>
                <span className="truncate">{c.name}</span>
                <span className="ml-2 text-muted-foreground">{c.symbol}</span>
                <Check className={cn("ml-auto size-4", value === c.code ? "opacity-100" : "opacity-0")} />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
