import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Package, Filter } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Product {
  id: string;
  reference: string;
  name: string;
  category: string | null;
  description: string | null;
  stock_available: number;
  supply_delay_days: number | null;
  price_ht: number | null;
  price_ttc: number | null;
  supplier: string | null;
  code_article: string | null;
}

const formatPrice = (price: number | null) => {
  if (price == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "DZD", minimumFractionDigits: 0 }).format(price);
};

export default function Products() {
  const { role } = useAuth();
  const canEdit = role === "admin" || role === "manager";
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    reference: "", name: "", category: "", description: "", stock_available: "0",
    supply_delay_days: "", price_ht: "", price_ttc: "", supplier: "", code_article: "",
  });

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    if (data) setProducts(data as Product[]);
  };

  useEffect(() => { fetchProducts(); }, []);

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))] as string[];
  const suppliers = [...new Set(products.map(p => p.supplier).filter(Boolean))] as string[];

  const handleSave = async () => {
    if (!form.reference.trim() || !form.name.trim()) { toast.error("Référence et nom requis"); return; }

    const payload = {
      reference: form.reference,
      name: form.name,
      category: form.category || null,
      description: form.description || null,
      stock_available: parseInt(form.stock_available) || 0,
      supply_delay_days: form.supply_delay_days ? parseInt(form.supply_delay_days) : null,
      price_ht: form.price_ht ? parseFloat(form.price_ht) : null,
      price_ttc: form.price_ttc ? parseFloat(form.price_ttc) : null,
      supplier: form.supplier || null,
      code_article: form.code_article || null,
    };

    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Produit mis à jour");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Produit créé");
    }
    setOpen(false);
    setEditing(null);
    fetchProducts();
  };

  const openNew = () => {
    setEditing(null);
    setForm({ reference: "", name: "", category: "", description: "", stock_available: "0", supply_delay_days: "", price_ht: "", price_ttc: "", supplier: "", code_article: "" });
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      reference: p.reference, name: p.name, category: p.category ?? "",
      description: p.description ?? "", stock_available: String(p.stock_available),
      supply_delay_days: p.supply_delay_days ? String(p.supply_delay_days) : "",
      price_ht: p.price_ht ? String(p.price_ht) : "",
      price_ttc: p.price_ttc ? String(p.price_ttc) : "",
      supplier: p.supplier ?? "", code_article: p.code_article ?? "",
    });
    setOpen(true);
  };

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.reference.toLowerCase().includes(search.toLowerCase()) ||
      (p.category?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (p.code_article?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchCategory = categoryFilter === "all" || p.category === categoryFilter;
    const matchSupplier = supplierFilter === "all" || p.supplier === supplierFilter;
    return matchSearch && matchCategory && matchSupplier;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Catalogue produits</h1>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />Nouveau produit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Référence *</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
                  <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Code article</Label><Input value={form.code_article} onChange={(e) => setForm({ ...form, code_article: e.target.value })} /></div>
                  <div><Label>Catégorie</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                </div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Prix HT</Label><Input type="number" value={form.price_ht} onChange={(e) => setForm({ ...form, price_ht: e.target.value })} /></div>
                  <div><Label>Prix TTC</Label><Input type="number" value={form.price_ttc} onChange={(e) => setForm({ ...form, price_ttc: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Stock disponible</Label><Input type="number" value={form.stock_available} onChange={(e) => setForm({ ...form, stock_available: e.target.value })} /></div>
                  <div><Label>Délai approvisionnement (jours)</Label><Input type="number" value={form.supply_delay_days} onChange={(e) => setForm({ ...form, supply_delay_days: e.target.value })} /></div>
                </div>
                <div><Label>Fournisseur</Label><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
                <Button onClick={handleSave} className="w-full">{editing ? "Mettre à jour" : "Créer"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par nom, référence, code..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.sort().map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile: Card list */}
      <div className="space-y-3 sm:hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucun produit trouvé</p>
        ) : filtered.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium truncate">{p.name}</span>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">{p.reference}</p>
                  {p.category && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{p.category}</span>}
                  <div className="flex items-center gap-3 text-sm">
                    <span>Stock : <Badge variant={p.stock_available > 0 ? "default" : "destructive"}>{p.stock_available}</Badge></span>
                    {p.supply_delay_days && <span className="text-muted-foreground">{p.supply_delay_days}j délai</span>}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {p.price_ht != null && <span>HT: {formatPrice(p.price_ht)}</span>}
                    {p.price_ttc != null && <span>TTC: {formatPrice(p.price_ttc)}</span>}
                  </div>
                </div>
                {canEdit && (
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: Table */}
      <Card className="hidden sm:block">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium p-3">Référence</th>
                <th className="text-left font-medium p-3">Nom</th>
                <th className="text-left font-medium p-3">Catégorie</th>
                <th className="text-right font-medium p-3">Prix HT</th>
                <th className="text-right font-medium p-3">Prix TTC</th>
                <th className="text-left font-medium p-3">Stock</th>
                {canEdit && <th className="w-12 p-3"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-8">Aucun produit trouvé</td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3 font-mono text-sm">{p.reference}</td>
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3 text-right">{formatPrice(p.price_ht)}</td>
                  <td className="p-3 text-right">{formatPrice(p.price_ttc)}</td>
                  <td className="p-3">
                    <Badge variant={p.stock_available > 0 ? "default" : "destructive"}>{p.stock_available}</Badge>
                  </td>
                  {canEdit && (
                    <td className="p-3">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
