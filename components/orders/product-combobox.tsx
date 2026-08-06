"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ProductOption = {
  id: string;
  sku: string;
  name: string;
  buyingPrice: number;
};

type ProductComboboxProps = {
  options: ProductOption[];
  value: string | null;
  onSelect: (product: ProductOption) => void;
  disabled?: boolean;
};

/**
 * Product autocomplete combobox.
 * Searchable by SKU or name. Selecting a product calls `onSelect`
 * so the parent row can auto-fill buying price.
 */
export function ProductCombobox({
  options,
  value,
  onSelect,
  disabled,
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(q) || o.sku.toLowerCase().includes(q),
    );
  }, [options, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="truncate">
              {selected.sku} — {selected.name}
            </span>
          ) : (
            <span className="text-muted-foreground">Search product…</span>
          )}
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0" sideOffset={4}>
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 size-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search by name or SKU…"
              value={query}
              onValueChange={setQuery}
              className="h-10 border-0 focus:ring-0"
            />
          </div>
          <CommandList>
            <CommandEmpty>No product found.</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-y-auto">
              {filtered.slice(0, 50).map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={() => {
                    onSelect(option);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">
                    <span className="font-mono text-xs text-muted-foreground">
                      {option.sku}
                    </span>{" "}
                    {option.name}
                  </span>
                  <Check
                    className={cn(
                      "ml-2 size-4 shrink-0",
                      value === option.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}