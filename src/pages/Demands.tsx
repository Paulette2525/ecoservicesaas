import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Demand {
  id: string;
  client_id: string;
  product_id: string;
  commercial_id: string;
  quantity: number;
  status: string;
  demand_date: string;
  clients?: { company_name: string } | null;
  products?: { name: string; reference: string } | null;
}

const statusLabels: Record<string, string> = {
  disponible: "Disponible",
  en_rupture: "En rupture",
  en_commande: "En commande",
};

const statusColors: Record<string, string> = {
  disponible: "bg-success text-success-foreground",
  en_rupture: "bg-destructive text-destructive-foreground",
  en_commande: "bg-warning text-warning-foreground",
};

export default function Demands() {
  const { user } = useAuth();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; reference: string }[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_id: "", product_id: "", quantity: "1", status: "en_commande" });

  const fetchAll = async () => {
    const [d, c, p] = await Promise.all([
      supabase.from("client_demands").select("*, clients(company_name), products(name, reference)").order("demand_date", { ascending: false }),
      supabase.from("clients").select("id, company_name").order("company_name"),
      supabase.from("products").select("id, name, reference").order("name"),
    ]);
    if (d.data) setDemands(d.data);
    if (c.data) setClients(c.data);
    if (p.data) setProducts(p.data);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSave = async () => {
    if (!form.client_id || !form.product_id) { toast.error("Client et produit requis"); return; }
    const { error } = await supabase.from("client_demands").insert({
      client_id: form.client_id,
      product_id: form.product_id,
      commercial_id: user?.id!,
      quantity: parseInt(form.quantity) || 1,
      status: form.status as any,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Demande créée");
    setOpen(false);
    fetchAll();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("client_demands").update({ status: status as any }).eq("id", id);
    fetchAll();
  };

  const filtered = demands.filter((d) =>
    d.clients?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.products?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Suivi des demandes</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nouvelle demande</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle demande</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Client *</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Produit *</Label>
                <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.reference} — {p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Quantité</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                <div><Label>Statut</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disponible">Disponible</SelectItem>
                      <SelectItem value="en_rupture">En rupture</SelectItem>
                      <SelectItem value="en_commande">En commande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">Créer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par client ou produit..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucune demande trouvée</TableCell></TableRow>
              ) : filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.clients?.company_name}</TableCell>
                  <TableCell>{d.products?.reference} — {d.products?.name}</TableCell>
                  <TableCell>{d.quantity}</TableCell>
                  <TableCell>{new Date(d.demand_date).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>
                    <Select value={d.status} onValueChange={(v) => updateStatus(d.id, v)}>
                      <SelectTrigger className="w-[140px] h-8">
                        <Badge className={statusColors[d.status]}>{statusLabels[d.status]}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disponible">Disponible</SelectItem>
                        <SelectItem value="en_rupture">En rupture</SelectItem>
                        <SelectItem value="en_commande">En commande</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
