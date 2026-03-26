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
import { Plus, X, Search, ChevronsUpDown, Check, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  reference: string;
  name: string;
  supplier: string | null;
  stock_available: number;
}

type EquivType = "strict" | "avec_joint" | "sans_joint" | "autre_labo";

interface Equivalence {
  id: string;
  product_id: string;
  equivalent_id: string;
  equivalence_type: EquivType;
}

const EQUIV_TYPE_CONFIG: Record<EquivType, { label: string; color: string; badgeClass: string }> = {
  strict: { label: "Strict", color: "bg-green-100 text-green-800 border-green-300", badgeClass: "border-green-300 bg-green-50 text-green-700" },
  avec_joint: { label: "Avec joint (E)", color: "bg-blue-100 text-blue-800 border-blue-300", badgeClass: "border-blue-300 bg-blue-50 text-blue-700" },
  sans_joint: { label: "Sans joint", color: "bg-muted text-muted-foreground", badgeClass: "border-border bg-muted text-muted-foreground" },
  autre_labo: { label: "Autre labo", color: "bg-orange-100 text-orange-800 border-orange-300", badgeClass: "border-orange-300 bg-orange-50 text-orange-700" },
};

const EQUIV_TYPE_ORDER: EquivType[] = ["strict", "avec_joint", "sans_joint", "autre_labo"];

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

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <Badge className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
        <AlertTriangle className="h-3 w-3" />
        Rupture
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-50 text-green-700 border-green-300 gap-1">
      <Package className="h-3 w-3" />
      {stock} en stock
    </Badge>
  );
}

function EquivalentCard({ product, type, onRemove }: {
  product: Product; type: EquivType; onRemove: () => void;
}) {
  const config = EQUIV_TYPE_CONFIG[type];
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Badge className={cn("shrink-0 text-[10px]", config.badgeClass)}>{config.label}</Badge>
        <span className="font-mono text-xs shrink-0">{product.reference}</span>
        <span className="truncate text-sm">{product.name}</span>
        {product.supplier && <Badge variant="secondary" className="shrink-0 text-[10px]">{product.supplier}</Badge>}
        <StockBadge stock={product.stock_available} />
      </div>
      <Button variant="ghost" size="icon" className="shrink-0" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function Equivalences() {
  const [products, setProducts] = useState<Product[]>([]);
  const [equivalences, setEquivalences] = useState<Equivalence[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productA, setProductA] = useState("");
  const [productB, setProductB] = useState("");
  const [equivType, setEquivType] = useState<EquivType>("strict");
  const [searchEquiv, setSearchEquiv] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchData = async () => {
    const [p, e] = await Promise.all([
      supabase.from("products").select("id, reference, name, supplier, stock_available").order("reference"),
      supabase.from("product_equivalences").select("*"),
    ]);
    if (p.data) setProducts(p.data);
    if (e.data) setEquivalences(e.data as Equivalence[]);
  };

  useEffect(() => { fetchData(); }, []);

  const suppliers = useMemo(() =>
    [...new Set(products.map(p => p.supplier).filter(Boolean))] as string[]
  , [products]);

  const selectedProductData = products.find(p => p.id === selectedProduct);

  // Get equivalents for the selected product, grouped by type
  const productEquivalents = useMemo(() => {
    if (!selectedProduct) return [];
    return equivalences.filter(e =>
      e.product_id === selectedProduct || e.equivalent_id === selectedProduct
    );
  }, [equivalences, selectedProduct]);

  // Deduplicate and group
  const groupedEquivalents = useMemo(() => {
    const seen = new Set<string>();
    const groups: Record<EquivType, { equiv: Equivalence; product: Product }[]> = {
      strict: [], avec_joint: [], sans_joint: [], autre_labo: [],
    };

    for (const e of productEquivalents) {
      const key = [e.product_id, e.equivalent_id].sort().join("-");
      if (seen.has(key)) continue;
      seen.add(key);

      const otherId = e.product_id === selectedProduct ? e.equivalent_id : e.product_id;
      const otherProduct = products.find(p => p.id === otherId);
      if (otherProduct) {
        groups[e.equivalence_type].push({ equiv: e, product: otherProduct });
      }
    }
    return groups;
  }, [productEquivalents, selectedProduct, products]);

  const hasAnyEquivalent = EQUIV_TYPE_ORDER.some(t => groupedEquivalents[t].length > 0);

  const addEquivalence = async () => {
    if (!productA || !productB || productA === productB) {
      toast.error("Sélectionnez deux produits différents");
      return;
    }
    const { error } = await supabase.from("product_equivalences").insert([
      { product_id: productA, equivalent_id: productB, equivalence_type: equivType },
      { product_id: productB, equivalent_id: productA, equivalence_type: equivType },
    ]);
    if (error) { toast.error(error.message); return; }
    toast.success("Équivalence ajoutée");
    setProductA(""); setProductB(""); setEquivType("strict");
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

  // All equivalences list (deduplicated)
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
      if (typeFilter !== "all" && e.equivalence_type !== typeFilter) return false;
      if (searchEquiv) {
        const q = searchEquiv.toLowerCase();
        const match = [a?.reference, a?.name, a?.supplier, b?.reference, b?.name, b?.supplier]
          .some(v => v?.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [uniqueEquiv, supplierFilter, typeFilter, searchEquiv, products]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Équivalences produits</h1>

      {/* Recherche produit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Rechercher un produit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xl">
            <ProductCombobox products={products} value={selectedProduct} onChange={setSelectedProduct} label="Produit" />
          </div>

          {selectedProductData && (
            <div className="mt-4 space-y-4">
              {/* Fiche produit */}
              <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border bg-muted/30">
                <Badge variant="outline" className="font-mono">{selectedProductData.reference}</Badge>
                <span className="font-medium">{selectedProductData.name}</span>
                {selectedProductData.supplier && (
                  <Badge variant="secondary">{selectedProductData.supplier}</Badge>
                )}
                <StockBadge stock={selectedProductData.stock_available} />
              </div>

              {/* Équivalents groupés */}
              {hasAnyEquivalent ? (
                <div className="space-y-3">
                  {EQUIV_TYPE_ORDER.map(type => {
                    const items = groupedEquivalents[type];
                    if (items.length === 0) return null;
                    const config = EQUIV_TYPE_CONFIG[type];
                    return (
                      <div key={type}>
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <span className={cn("inline-block w-3 h-3 rounded-full border", config.color)} />
                          {config.label} ({items.length})
                        </h3>
                        <div className="space-y-1.5">
                          {items.map(({ equiv, product }) => (
                            <EquivalentCard
                              key={equiv.id}
                              product={product}
                              type={type}
                              onRemove={() => removeEquivalence(equiv)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Aucune équivalence pour ce produit</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
