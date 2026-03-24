import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Pencil, Phone, Mail, Building2, MapPin, Hash, ChevronLeft, ChevronRight } from "lucide-react";
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
  address: string | null;
  client_code: string | null;
}

const PAGE_SIZE = 50;

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({ company_name: "", city: "", sector: "", phone: "", email: "", notes: "", address: "", client_code: "" });
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((p) => { map[p.user_id] = p.full_name; });
      setProfiles(map);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("clients")
      .select("*", { count: "exact" })
      .order("company_name");

    if (debouncedSearch) {
      const s = `%${debouncedSearch}%`;
      query = query.or(`company_name.ilike.${s},city.ilike.${s},client_code.ilike.${s},address.ilike.${s}`);
    }

    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count } = await query;
    if (data) setClients(data as Client[]);
    if (count !== null) setTotalCount(count);
    setLoading(false);
  }, [debouncedSearch, page]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);
  useEffect(() => { fetchClients(); }, [fetchClients]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getCommercialName = (id: string | null) => {
    if (!id) return "—";
    return profiles[id] || "—";
  };

  const handleSave = async () => {
    if (!form.company_name.trim()) { toast.error("Le nom de l'entreprise est requis"); return; }

    const payload = {
      company_name: form.company_name,
      city: form.city || null,
      sector: form.sector || null,
      phone: form.phone || null,
      email: form.email || null,
      notes: form.notes || null,
      address: form.address || null,
      client_code: form.client_code || null,
      commercial_id: editing ? editing.commercial_id : (user?.id ?? null),
    };

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
    setForm({ company_name: "", city: "", sector: "", phone: "", email: "", notes: "", address: "", client_code: "" });
    fetchClients();
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({
      company_name: c.company_name,
      city: c.city ?? "",
      sector: c.sector ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      notes: c.notes ?? "",
      address: c.address ?? "",
      client_code: c.client_code ?? "",
    });
    setOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ company_name: "", city: "", sector: "", phone: "", email: "", notes: "", address: "", client_code: "" });
    setOpen(true);
  };

  const SkeletonRows = () => (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b">
          {Array.from({ length: 9 }).map((_, j) => (
            <td key={j} className="p-3"><Skeleton className="h-4 w-full" /></td>
          ))}
        </tr>
      ))}
    </>
  );

  const Pagination = () => totalPages > 1 ? (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">{totalCount} client{totalCount > 1 ? "s" : ""} — Page {page + 1}/{totalPages}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />Précédent
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
          Suivant<ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  ) : totalCount > 0 ? (
    <p className="text-sm text-muted-foreground pt-4">{totalCount} client{totalCount > 1 ? "s" : ""}</p>
  ) : null;

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Nom de l'entreprise *</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
                <div><Label>Code client</Label><Input value={form.client_code} onChange={(e) => setForm({ ...form, client_code: e.target.value })} placeholder="Ex: CL0001" /></div>
              </div>
              <div><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
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
        <Input placeholder="Rechercher par nom, code, ville ou adresse..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Mobile: Card list */}
      <div className="space-y-3 sm:hidden">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent></Card>
          ))
        ) : clients.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucun client trouvé</p>
        ) : clients.map((c) => (
          <Card key={c.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium truncate">{c.company_name}</span>
                  </div>
                  {c.client_code && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Hash className="h-3.5 w-3.5 shrink-0" />
                      <span>{c.client_code}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>{c.address}</span>
                    </div>
                  )}
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
                <th className="text-left font-medium p-3">Code</th>
                <th className="text-left font-medium p-3">Entreprise</th>
                <th className="text-left font-medium p-3">Adresse</th>
                <th className="text-left font-medium p-3">Ville</th>
                <th className="text-left font-medium p-3">Secteur</th>
                <th className="text-left font-medium p-3">Téléphone</th>
                <th className="text-left font-medium p-3">Email</th>
                <th className="text-left font-medium p-3">Commercial</th>
                <th className="w-12 p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? <SkeletonRows /> : clients.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-muted-foreground py-8">Aucun client trouvé</td></tr>
              ) : clients.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3 text-muted-foreground">{c.client_code || "—"}</td>
                  <td className="p-3 font-medium">{c.company_name}</td>
                  <td className="p-3">{c.address || "—"}</td>
                  <td className="p-3">{c.city || "—"}</td>
                  <td className="p-3">{c.sector || "—"}</td>
                  <td className="p-3">{c.phone || "—"}</td>
                  <td className="p-3">{c.email || "—"}</td>
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

      <Pagination />
    </div>
  );
}
