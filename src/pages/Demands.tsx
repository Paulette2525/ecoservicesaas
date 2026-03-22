import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import SelectWithOther from "@/components/SelectWithOther";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, ClipboardList, ChevronsUpDown, Check, FileText, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Demand {
  id: string;
  client_id: string;
  product_id: string;
  commercial_id: string;
  quantity: number;
  status: string;
  demand_date: string;
  attachment_url: string | null;
  clients?: { company_name: string } | null;
  products?: { name: string; reference: string } | null;
}

interface ProductOption {
  id: string;
  name: string;
  reference: string;
  supplier: string | null;
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
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_id: "", product_id: "", quantity: "1", status: "en_commande" });
  const [productSearch, setProductSearch] = useState("");
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchAll = async () => {
    const [d, c, p] = await Promise.all([
      supabase.from("client_demands").select("id, client_id, product_id, commercial_id, quantity, status, demand_date, attachment_url, clients(company_name), products(name, reference)").order("demand_date", { ascending: false }),
      supabase.from("clients").select("id, company_name").order("company_name"),
      supabase.from("products").select("id, name, reference, supplier").order("name").limit(10000),
    ]);
    if (d.data) setDemands(d.data as any as Demand[]);
    if (c.data) setClients(c.data);
    if (p.data) setProducts(p.data);
  };

  useEffect(() => { fetchAll(); }, []);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 50);
    const s = productSearch.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(s) ||
      p.reference.toLowerCase().includes(s) ||
      (p.supplier?.toLowerCase().includes(s))
    ).slice(0, 50);
  }, [products, productSearch]);

  const selectedProduct = products.find(p => p.id === form.product_id);

  const handleSave = async () => {
    if (!form.client_id || !form.product_id) { toast.error("Client et produit requis"); return; }
    setUploading(true);

    let attachmentUrl: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("demand-attachments").upload(path, file);
      if (uploadError) { toast.error("Erreur upload : " + uploadError.message); setUploading(false); return; }
      attachmentUrl = path;
    }

    const { error } = await supabase.from("client_demands").insert({
      client_id: form.client_id,
      product_id: form.product_id,
      commercial_id: user?.id!,
      quantity: parseInt(form.quantity) || 1,
      status: form.status as any,
      attachment_url: attachmentUrl,
    });
    if (error) { toast.error(error.message); setUploading(false); return; }
    toast.success("Demande créée");
    setOpen(false);
    setFile(null);
    setForm({ client_id: "", product_id: "", quantity: "1", status: "en_commande" });
    setUploading(false);
    fetchAll();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("client_demands").update({ status: status as any }).eq("id", id);
    fetchAll();
  };

  const getAttachmentUrl = (path: string) => {
    const { data } = supabase.storage.from("demand-attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const downloadAttachment = async (path: string) => {
    const { data, error } = await supabase.storage.from("demand-attachments").download(path);
    if (error || !data) { toast.error("Erreur téléchargement"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = path.split("/").pop() || "fichier.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = demands.filter((d) =>
    d.clients?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.products?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const AttachmentBadge = ({ url }: { url: string | null }) => {
    if (!url) return null;
    return (
      <Button variant="ghost" size="sm" className="h-7 gap-1 text-primary" onClick={() => downloadAttachment(url)}>
        <FileText className="h-3.5 w-3.5" />
        <span className="text-xs">PDF</span>
      </Button>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Suivi des demandes</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setFile(null); setProductSearch(""); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />Nouvelle demande</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nouvelle demande</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Client *</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* Combobox produit avec recherche */}
              <div><Label>Produit *</Label>
                <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={productPopoverOpen} className="w-full justify-between font-normal">
                      {selectedProduct ? `${selectedProduct.reference} — ${selectedProduct.name}` : "Rechercher un produit..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput placeholder="Référence, nom ou fournisseur..." value={productSearch} onValueChange={setProductSearch} />
                      <CommandList>
                        <CommandEmpty>Aucun produit trouvé</CommandEmpty>
                        <CommandGroup>
                          {filteredProducts.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={p.id}
                              onSelect={() => {
                                setForm({ ...form, product_id: p.id });
                                setProductPopoverOpen(false);
                                setProductSearch("");
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", form.product_id === p.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span className="font-medium">{p.reference} — {p.name}</span>
                                {p.supplier && <span className="text-xs text-muted-foreground">{p.supplier}</span>}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Quantité</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
                <div><Label>Statut</Label>
                  <SelectWithOther
                    options={[
                      { value: "disponible", label: "Disponible" },
                      { value: "en_rupture", label: "En rupture" },
                      { value: "en_commande", label: "En commande" },
                    ]}
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                    otherPlaceholder="Saisir un statut..."
                  />
                </div>
              </div>

              {/* Upload PDF */}
              <div>
                <Label>Pièce jointe (PDF)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer border border-input rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors w-full">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{file ? file.name : "Choisir un fichier..."}</span>
                    <input type="file" accept=".pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                  {file && <Button variant="ghost" size="sm" onClick={() => setFile(null)}>×</Button>}
                </div>
              </div>

              <Button onClick={handleSave} className="w-full" disabled={uploading}>
                {uploading ? "Envoi en cours..." : "Créer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par client ou produit..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Mobile: Card list */}
      <div className="space-y-3 sm:hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucune demande trouvée</p>
        ) : filtered.map((d) => (
          <Card key={d.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium truncate">{d.clients?.company_name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{d.products?.reference} — {d.products?.name}</p>
                </div>
                <span className="text-sm font-medium shrink-0">×{d.quantity}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{new Date(d.demand_date).toLocaleDateString("fr-FR")}</span>
                  <AttachmentBadge url={d.attachment_url} />
                </div>
                <Select value={d.status} onValueChange={(v) => updateStatus(d.id, v)}>
                  <SelectTrigger className="w-[130px] h-8">
                    <Badge className={statusColors[d.status] || "bg-muted text-muted-foreground"}>{statusLabels[d.status] || d.status}</Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponible">Disponible</SelectItem>
                    <SelectItem value="en_rupture">En rupture</SelectItem>
                    <SelectItem value="en_commande">En commande</SelectItem>
                  </SelectContent>
                </Select>
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
                <th className="text-left font-medium p-3">Client</th>
                <th className="text-left font-medium p-3">Produit</th>
                <th className="text-left font-medium p-3">Quantité</th>
                <th className="text-left font-medium p-3">Date</th>
                <th className="text-left font-medium p-3">Fichier</th>
                <th className="text-left font-medium p-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted-foreground py-8">Aucune demande trouvée</td></tr>
              ) : filtered.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{d.clients?.company_name}</td>
                  <td className="p-3">{d.products?.reference} — {d.products?.name}</td>
                  <td className="p-3">{d.quantity}</td>
                  <td className="p-3">{new Date(d.demand_date).toLocaleDateString("fr-FR")}</td>
                  <td className="p-3"><AttachmentBadge url={d.attachment_url} /></td>
                  <td className="p-3">
                    <Select value={d.status} onValueChange={(v) => updateStatus(d.id, v)}>
                      <SelectTrigger className="w-[140px] h-8">
                        <Badge className={statusColors[d.status] || "bg-muted text-muted-foreground"}>{statusLabels[d.status] || d.status}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disponible">Disponible</SelectItem>
                        <SelectItem value="en_rupture">En rupture</SelectItem>
                        <SelectItem value="en_commande">En commande</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
