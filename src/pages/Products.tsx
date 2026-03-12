import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil } from "lucide-react";
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
}

export default function Products() {
  const { role } = useAuth();
  const canEdit = role === "admin" || role === "manager";
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    reference: "", name: "", category: "", description: "", stock_available: "0", supply_delay_days: "",
  });

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    if (data) setProducts(data);
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleSave = async () => {
    if (!form.reference.trim() || !form.name.trim()) { toast.error("Référence et nom requis"); return; }

    const payload = {
      reference: form.reference,
      name: form.name,
      category: form.category || null,
      description: form.description || null,
      stock_available: parseInt(form.stock_available) || 0,
      supply_delay_days: form.supply_delay_days ? parseInt(form.supply_delay_days) : null,
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
    setForm({ reference: "", name: "", category: "", description: "", stock_available: "0", supply_delay_days: "" });
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      reference: p.reference, name: p.name, category: p.category ?? "",
      description: p.description ?? "", stock_available: String(p.stock_available),
      supply_delay_days: p.supply_delay_days ? String(p.supply_delay_days) : "",
    });
    setOpen(true);
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.reference.toLowerCase().includes(search.toLowerCase()) ||
    (p.category?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Catalogue produits</h1>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nouveau produit</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Référence *</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
                  <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                </div>
                <div><Label>Catégorie</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Stock disponible</Label><Input type="number" value={form.stock_available} onChange={(e) => setForm({ ...form, stock_available: e.target.value })} /></div>
                  <div><Label>Délai approvisionnement (jours)</Label><Input type="number" value={form.supply_delay_days} onChange={(e) => setForm({ ...form, supply_delay_days: e.target.value })} /></div>
                </div>
                <Button onClick={handleSave} className="w-full">{editing ? "Mettre à jour" : "Créer"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par nom, référence ou catégorie..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Délai</TableHead>
                {canEdit && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground py-8">Aucun produit trouvé</TableCell></TableRow>
              ) : filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.reference}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell>
                    <Badge variant={p.stock_available > 0 ? "default" : "destructive"}>
                      {p.stock_available}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.supply_delay_days ? `${p.supply_delay_days}j` : "—"}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
