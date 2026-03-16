import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Phone, Mail, Building2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Client {
  id: string;
  company_name: string;
  city: string | null;
  sector: string | null;
  phone: string | null;
  email: string | null;
  commercial_id: string | null;
  notes: string | null;
}

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({ company_name: "", city: "", sector: "", phone: "", email: "", notes: "" });

  const fetchData = async () => {
    const [clientsRes, profilesRes] = await Promise.all([
      supabase.from("clients").select("*").order("company_name"),
      supabase.from("profiles").select("user_id, full_name"),
    ]);
    if (clientsRes.data) setClients(clientsRes.data);
    if (profilesRes.data) {
      const map: Record<string, string> = {};
      profilesRes.data.forEach((p) => { map[p.user_id] = p.full_name; });
      setProfiles(map);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getCommercialName = (id: string | null) => {
    if (!id) return "—";
    return profiles[id] || "—";
  };

  const handleSave = async () => {
    if (!form.company_name.trim()) { toast.error("Le nom de l'entreprise est requis"); return; }

    const payload = { ...form, commercial_id: editing ? editing.commercial_id : (user?.id ?? null) };

    if (editing) {
      const { error } = await supabase.from("clients").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Client mis à jour");
    } else {
      const { error } = await supabase.from("clients").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Client créé");
    }
    setOpen(false);
    setEditing(null);
    setForm({ company_name: "", city: "", sector: "", phone: "", email: "", notes: "" });
    fetchData();
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({ company_name: c.company_name, city: c.city ?? "", sector: c.sector ?? "", phone: c.phone ?? "", email: c.email ?? "", notes: c.notes ?? "" });
    setOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ company_name: "", city: "", sector: "", phone: "", email: "", notes: "" });
    setOpen(true);
  };

  const filtered = clients.filter((c) =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.city?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Clients</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} size="sm" className="sm:size-default w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />Nouveau client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier le client" : "Nouveau client"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Nom de l'entreprise *</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label>Secteur</Label><Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                <span className="font-medium">Commercial attribué : </span>
                {editing ? getCommercialName(editing.commercial_id) : "Vous (automatique)"}
              </div>
              <Button onClick={handleSave} className="w-full">{editing ? "Mettre à jour" : "Créer"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par nom ou ville..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Mobile: Card list */}
      <div className="space-y-3 sm:hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucun client trouvé</p>
        ) : filtered.map((c) => (
          <Card key={c.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium truncate">{c.company_name}</span>
                  </div>
                  {c.city && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>{c.city}</span>
                    </div>
                  )}
                  {c.sector && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{c.sector}</span>
                  )}
                  <div className="flex flex-wrap gap-3 text-sm">
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-primary">
                        <Phone className="h-3.5 w-3.5" />{c.phone}
                      </a>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-primary">
                        <Mail className="h-3.5 w-3.5" />{c.email}
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Commercial : {getCommercialName(c.commercial_id)}</p>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => openEdit(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
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
                <th className="text-left font-medium p-3">Entreprise</th>
                <th className="text-left font-medium p-3">Ville</th>
                <th className="text-left font-medium p-3">Secteur</th>
                <th className="text-left font-medium p-3">Téléphone</th>
                <th className="text-left font-medium p-3">Email</th>
                <th className="text-left font-medium p-3">Commercial</th>
                <th className="w-12 p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted-foreground py-8">Aucun client trouvé</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{c.company_name}</td>
                  <td className="p-3">{c.city}</td>
                  <td className="p-3">{c.sector}</td>
                  <td className="p-3">{c.phone}</td>
                  <td className="p-3">{c.email}</td>
                  <td className="p-3">{getCommercialName(c.commercial_id)}</td>
                  <td className="p-3">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
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
