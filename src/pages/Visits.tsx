import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Visit {
  id: string;
  client_id: string;
  commercial_id: string;
  visit_date: string;
  location: string | null;
  status: string;
  report: string | null;
  summary: string | null;
  clients?: { company_name: string } | null;
}

interface ClientOption {
  id: string;
  company_name: string;
}

const statusLabels: Record<string, string> = {
  opportunite: "Opportunité",
  prise_de_contact: "Prise de contact",
  commande_probable: "Commande probable",
};

const statusColors: Record<string, string> = {
  opportunite: "bg-warning text-warning-foreground",
  prise_de_contact: "bg-secondary text-secondary-foreground",
  commande_probable: "bg-success text-success-foreground",
};

export default function Visits() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Visit | null>(null);
  const [form, setForm] = useState({
    client_id: "", visit_date: new Date().toISOString().split("T")[0],
    location: "", status: "prise_de_contact" as string, report: "",
  });

  const fetchVisits = async () => {
    const { data } = await supabase
      .from("visits")
      .select("*, clients(company_name)")
      .order("visit_date", { ascending: false });
    if (data) setVisits(data);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("id, company_name").order("company_name");
    if (data) setClientOptions(data);
  };

  useEffect(() => { fetchVisits(); fetchClients(); }, []);

  const handleSave = async () => {
    if (!form.client_id) { toast.error("Sélectionnez un client"); return; }

    const payload = {
      client_id: form.client_id,
      commercial_id: user?.id!,
      visit_date: form.visit_date,
      location: form.location || null,
      status: form.status as any,
      report: form.report || null,
    };

    if (editing) {
      const { error } = await supabase.from("visits").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Visite mise à jour");
    } else {
      const { error } = await supabase.from("visits").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Visite créée");
    }
    setOpen(false);
    setEditing(null);
    fetchVisits();
  };

  const openNew = () => {
    setEditing(null);
    setForm({ client_id: "", visit_date: new Date().toISOString().split("T")[0], location: "", status: "prise_de_contact", report: "" });
    setOpen(true);
  };

  const openEdit = (v: Visit) => {
    setEditing(v);
    setForm({
      client_id: v.client_id,
      visit_date: v.visit_date.split("T")[0],
      location: v.location ?? "",
      status: v.status,
      report: v.report ?? "",
    });
    setOpen(true);
  };

  const filtered = visits.filter((v) =>
    v.clients?.company_name?.toLowerCase().includes(search.toLowerCase()) ?? false
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Visites commerciales</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nouvelle visite</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier la visite" : "Nouvelle visite"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Client *</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                  <SelectContent>
                    {clientOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Date</Label><Input type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} /></div>
                <div><Label>Localisation</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prise_de_contact">Prise de contact</SelectItem>
                    <SelectItem value="opportunite">Opportunité</SelectItem>
                    <SelectItem value="commande_probable">Commande probable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Compte rendu</Label><Textarea value={form.report} onChange={(e) => setForm({ ...form, report: e.target.value })} rows={4} /></div>
              <Button onClick={handleSave} className="w-full">{editing ? "Mettre à jour" : "Créer"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par client..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Lieu</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucune visite trouvée</TableCell></TableRow>
              ) : filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.clients?.company_name}</TableCell>
                  <TableCell>{new Date(v.visit_date).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>{v.location}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[v.status]}>{statusLabels[v.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
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
