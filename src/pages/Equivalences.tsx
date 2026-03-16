import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

interface Product { id: string; reference: string; name: string; }
interface Equivalence { id: string; product_id: string; equivalent_id: string; }

export default function Equivalences() {
  const [products, setProducts] = useState<Product[]>([]);
  const [equivalences, setEquivalences] = useState<Equivalence[]>([]);
  const [productA, setProductA] = useState("");
  const [productB, setProductB] = useState("");

  const fetch = async () => {
    const [p, e] = await Promise.all([
      supabase.from("products").select("id, reference, name").order("name"),
      supabase.from("product_equivalences").select("*"),
    ]);
    if (p.data) setProducts(p.data);
    if (e.data) setEquivalences(e.data);
  };

  useEffect(() => { fetch(); }, []);

  const addEquivalence = async () => {
    if (!productA || !productB || productA === productB) { toast.error("Sélectionnez deux produits différents"); return; }

    const { error } = await supabase.from("product_equivalences").insert([
      { product_id: productA, equivalent_id: productB },
      { product_id: productB, equivalent_id: productA },
    ]);
    if (error) { toast.error(error.message); return; }
    toast.success("Équivalence ajoutée");
    setProductA(""); setProductB("");
    fetch();
  };

  const removeEquivalence = async (e: Equivalence) => {
    await supabase.from("product_equivalences").delete().or(`and(product_id.eq.${e.product_id},equivalent_id.eq.${e.equivalent_id}),and(product_id.eq.${e.equivalent_id},equivalent_id.eq.${e.product_id})`);
    toast.success("Équivalence supprimée");
    fetch();
  };

  const getName = (id: string) => products.find((p) => p.id === id);

  const seen = new Set<string>();
  const uniqueEquiv = equivalences.filter((e) => {
    const key = [e.product_id, e.equivalent_id].sort().join("-");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Équivalences produits</h1>

      <Card>
        <CardHeader><CardTitle className="text-base sm:text-lg">Ajouter une équivalence</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
            <div className="flex-1">
              <Label>Produit A</Label>
              <Select value={productA} onValueChange={setProductA}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.reference} — {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Produit B</Label>
              <Select value={productB} onValueChange={setProductB}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.reference} — {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={addEquivalence} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />Ajouter</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base sm:text-lg">Équivalences existantes</CardTitle></CardHeader>
        <CardContent>
          {uniqueEquiv.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Aucune équivalence configurée</p>
          ) : (
            <div className="space-y-2">
              {uniqueEquiv.map((e) => {
                const a = getName(e.product_id);
                const b = getName(e.equivalent_id);
                return (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="shrink-0">{a?.reference}</Badge>
                        <span className="truncate text-sm">{a?.name}</span>
                      </div>
                      <span className="text-muted-foreground hidden sm:inline">⟷</span>
                      <span className="text-muted-foreground sm:hidden text-xs">↕</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="shrink-0">{b?.reference}</Badge>
                        <span className="truncate text-sm">{b?.name}</span>
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
