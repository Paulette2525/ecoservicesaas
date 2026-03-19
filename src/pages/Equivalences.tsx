import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, X, Search, ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Product { id: string; reference: string; name: string; supplier: string | null; }
interface Equivalence { id: string; product_id: string; equivalent_id: string; }

function ProductCombobox({ products, value, onChange, label }: {
  products: Product[]; value: string; onChange: (v: string) => void; label: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = products.find(p => p.id === value);

  const filtered = useMemo(() => {
    if (!search) return products.slice(0, 50);
    const q = search.toLowerCase();
    return products.filter(p =>
      p.reference.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.supplier?.toLowerCase().includes(q) ?? false)
    ).slice(0, 50);
  }, [products, search]);

  return (
    <div className="flex-1">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal h-10">
            {selected ? (
              <span className="truncate">{selected.reference} — {selected.name}</span>
            ) : (
              <span className="text-muted-foreground">Rechercher un produit...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Tapez référence ou nom..." value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>Aucun produit trouvé</CommandEmpty>
              <CommandGroup>
                {filtered.map(p => (
                  <CommandItem key={p.id} value={p.id} onSelect={() => { onChange(p.id); setOpen(false); setSearch(""); }}>
                    <Check className={cn("mr-2 h-4 w-4", value === p.id ? "opacity-100" : "opacity-0")} />
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-xs shrink-0">{p.reference}</span>
                      <span className="truncate text-sm">{p.name}</span>
                      {p.supplier && <Badge variant="outline" className="shrink-0 text-[10px] ml-auto">{p.supplier}</Badge>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function Equivalences() {
  const [products, setProducts] = useState<Product[]>([]);
  const [equivalences, setEquivalences] = useState<Equivalence[]>([]);
  const [productA, setProductA] = useState("");
  const [productB, setProductB] = useState("");
  const [searchEquiv, setSearchEquiv] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");

  const fetchData = async () => {
    const [p, e] = await Promise.all([
      supabase.from("products").select("id, reference, name, supplier").order("reference"),
      supabase.from("product_equivalences").select("*"),
    ]);
    if (p.data) setProducts(p.data);
    if (e.data) setEquivalences(e.data);
  };

  useEffect(() => { fetchData(); }, []);

  const suppliers = useMemo(() =>
    [...new Set(products.map(p => p.supplier).filter(Boolean))] as string[]
  , [products]);

  const addEquivalence = async () => {
    if (!productA || !productB || productA === productB) { toast.error("Sélectionnez deux produits différents"); return; }
    const { error } = await supabase.from("product_equivalences").insert([
      { product_id: productA, equivalent_id: productB },
      { product_id: productB, equivalent_id: productA },
    ]);
    if (error) { toast.error(error.message); return; }
    toast.success("Équivalence ajoutée");
    setProductA(""); setProductB("");
    fetchData();
  };

  const removeEquivalence = async (e: Equivalence) => {
    await supabase.from("product_equivalences").delete().or(
      `and(product_id.eq.${e.product_id},equivalent_id.eq.${e.equivalent_id}),and(product_id.eq.${e.equivalent_id},equivalent_id.eq.${e.product_id})`
    );
    toast.success("Équivalence supprimée");
    fetchData();
  };

  const getName = (id: string) => products.find(p => p.id === id);

  const seen = new Set<string>();
  const uniqueEquiv = equivalences.filter(e => {
    const key = [e.product_id, e.equivalent_id].sort().join("-");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const filteredEquiv = useMemo(() => {
    return uniqueEquiv.filter(e => {
      const a = getName(e.product_id);
      const b = getName(e.equivalent_id);
      if (supplierFilter !== "all") {
        if (a?.supplier !== supplierFilter && b?.supplier !== supplierFilter) return false;
      }
      if (searchEquiv) {
        const q = searchEquiv.toLowerCase();
        const match = [a?.reference, a?.name, a?.supplier, b?.reference, b?.name, b?.supplier]
          .some(v => v?.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [uniqueEquiv, supplierFilter, searchEquiv, products]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Équivalences produits</h1>

      <Card>
        <CardHeader><CardTitle className="text-base sm:text-lg">Ajouter une équivalence</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
            <ProductCombobox products={products} value={productA} onChange={setProductA} label="Produit A" />
            <ProductCombobox products={products} value={productB} onChange={setProductB} label="Produit B" />
            <Button onClick={addEquivalence} className="w-full sm:w-auto shrink-0"><Plus className="h-4 w-4 mr-2" />Ajouter</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Équivalences existantes ({filteredEquiv.length})</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={searchEquiv} onChange={e => setSearchEquiv(e.target.value)} className="pl-10" />
            </div>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Fournisseur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les fournisseurs</SelectItem>
                {suppliers.sort().map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEquiv.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Aucune équivalence trouvée</p>
          ) : (
            <div className="space-y-2">
              {filteredEquiv.map(e => {
                const a = getName(e.product_id);
                const b = getName(e.equivalent_id);
                return (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="shrink-0">{a?.reference}</Badge>
                        <span className="truncate text-sm">{a?.name}</span>
                        {a?.supplier && <Badge variant="secondary" className="shrink-0 text-[10px]">{a.supplier}</Badge>}
                      </div>
                      <span className="text-muted-foreground hidden sm:inline">⟷</span>
                      <span className="text-muted-foreground sm:hidden text-xs">↕</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="shrink-0">{b?.reference}</Badge>
                        <span className="truncate text-sm">{b?.name}</span>
                        {b?.supplier && <Badge variant="secondary" className="shrink-0 text-[10px]">{b.supplier}</Badge>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeEquivalence(e)}><X className="h-4 w-4" /></Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
