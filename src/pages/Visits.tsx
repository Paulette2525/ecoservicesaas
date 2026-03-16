import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, MessageSquare, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import VisitRecorder from "@/components/VisitRecorder";

interface Visit {
  id: string;
  client_id: string;
  commercial_id: string;
  visit_date: string;
  location: string | null;
  status: string;
  report: string | null;
  summary: string | null;
  transcription: string | null;
  contact_role: string | null;
  contact_name: string | null;
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

const contactRoleLabels: Record<string, string> = {
  directeur: "Directeur",
  responsable_achat: "Responsable achat",
  technicien: "Technicien",
  commercial: "Commercial",
  magasinier: "Magasinier",
};

const statusColors: Record<string, string> = {
  opportunite: "bg-warning text-warning-foreground",
  prise_de_contact: "bg-secondary text-secondary-foreground",
  commande_probable: "bg-success text-success-foreground",
};

export default function Visits() {
  const { user, role } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Visit | null>(null);
  const [form, setForm] = useState({
    client_id: "", visit_date: new Date().toISOString().split("T")[0],
    location: "", status: "prise_de_contact" as string, report: "",
    contact_role: "", contact_name: "",
  });

  const [recorderOpen, setRecorderOpen] = useState(false);
  const [recorderVisitId, setRecorderVisitId] = useState("");
  const [recorderClientName, setRecorderClientName] = useState("");
  const [recorderVisitDate, setRecorderVisitDate] = useState("");

  const [detailVisit, setDetailVisit] = useState<Visit | null>(null);

  const isAdmin = role === "admin" || role === "manager";

  const fetchVisits = async () => {
    const { data } = await supabase
      .from("visits")
      .select("*, clients(company_name)")
      .order("visit_date", { ascending: false });
    if (data) setVisits(data as Visit[]);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("id, company_name").order("company_name");
    if (data) setClientOptions(data);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name");
    if (data) setProfiles(new Map(data.map((p) => [p.user_id, p.full_name])));
  };

  useEffect(() => { fetchVisits(); fetchClients(); fetchProfiles(); }, []);

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
      setOpen(false);
      setEditing(null);
      fetchVisits();
    } else {
      const { data, error } = await supabase.from("visits").insert(payload).select("id").single();
      if (error) { toast.error(error.message); return; }
      toast.success("Visite créée");
      setOpen(false);
      const clientName = clientOptions.find((c) => c.id === form.client_id)?.company_name || "";
      setRecorderVisitId(data.id);
      setRecorderClientName(clientName);
      setRecorderVisitDate(form.visit_date);
      setRecorderOpen(true);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm({ client_id: "", visit_date: new Date().toISOString().split("T")[0], location: "", status: "prise_de_contact", report: "" });
    setOpen(true);
  };

  const openEdit = (v: Visit) => {
    setEditing(v);
    setForm({ client_id: v.client_id, visit_date: v.visit_date.split("T")[0], location: v.location ?? "", status: v.status, report: v.report ?? "" });
    setOpen(true);
  };

  const openRecorderForVisit = (v: Visit) => {
    setRecorderVisitId(v.id);
    setRecorderClientName(v.clients?.company_name || "");
    setRecorderVisitDate(v.visit_date.split("T")[0]);
    setRecorderOpen(true);
  };

  const filtered = visits.filter((v) =>
    v.clients?.company_name?.toLowerCase().includes(search.toLowerCase()) ?? false
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Visites commerciales</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} size="sm" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />Nouvelle visite
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.report}
                  onChange={(e) => setForm({ ...form, report: e.target.value })}
                  rows={3}
                  disabled={!isAdmin && !!editing?.transcription}
                  className={!isAdmin && !!editing?.transcription ? "opacity-60 cursor-not-allowed" : ""}
                />
                {!isAdmin && !!editing?.transcription && (
                  <p className="text-xs text-muted-foreground mt-1">Les notes générées par l'enregistrement ne peuvent pas être modifiées manuellement.</p>
                )}
              </div>
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                <span className="font-medium">Commercial attribué : </span>
                {editing ? (profiles.get(editing.commercial_id) || "—") : "Vous (automatique)"}
              </div>
              <Button onClick={handleSave} className="w-full">{editing ? "Mettre à jour" : "Créer"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par client..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Mobile: Card list */}
      <div className="space-y-3 sm:hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucune visite trouvée</p>
        ) : filtered.map((v) => (
          <Card
            key={v.id}
            className="overflow-hidden"
            onClick={() => isAdmin && v.transcription && setDetailVisit(v)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <span className="font-medium">{v.clients?.company_name}</span>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(v.visit_date).toLocaleDateString("fr-FR")}
                    </div>
                    {v.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {v.location}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={statusColors[v.status]}>{statusLabels[v.status]}</Badge>
                    {v.transcription && <Badge variant="outline" className="text-xs">📝 Transcrit</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">Commercial : {profiles.get(v.commercial_id) || "—"}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" onClick={() => openRecorderForVisit(v)} title={v.transcription ? "Ré-enregistrer" : "Ajouter des notes"}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
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
                <th className="text-left font-medium p-3">Commercial</th>
                <th className="text-left font-medium p-3">Date</th>
                <th className="text-left font-medium p-3">Lieu</th>
                <th className="text-left font-medium p-3">Statut</th>
                {isAdmin && <th className="text-left font-medium p-3">Notes</th>}
                <th className="w-12 p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">Aucune visite trouvée</td></tr>
              ) : filtered.map((v) => (
                <tr key={v.id} className={`border-b last:border-0 ${isAdmin && v.transcription ? "cursor-pointer hover:bg-muted/50" : ""}`} onClick={() => isAdmin && v.transcription && setDetailVisit(v)}>
                  <td className="p-3 font-medium">{v.clients?.company_name}</td>
                  <td className="p-3">{profiles.get(v.commercial_id) || "—"}</td>
                  <td className="p-3">{new Date(v.visit_date).toLocaleDateString("fr-FR")}</td>
                  <td className="p-3">{v.location}</td>
                  <td className="p-3">
                    <Badge className={statusColors[v.status]}>{statusLabels[v.status]}</Badge>
                  </td>
                  {isAdmin && (
                    <td className="p-3">
                      {v.transcription ? (
                        <Badge variant="outline" className="text-xs">📝 Transcrit</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                  <td className="p-3">
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => openRecorderForVisit(v)} title={v.transcription ? "Ré-enregistrer" : "Ajouter des notes"}>
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <VisitRecorder
        open={recorderOpen}
        onOpenChange={setRecorderOpen}
        visitId={recorderVisitId}
        clientName={recorderClientName}
        visitDate={recorderVisitDate}
        onComplete={fetchVisits}
      />

      {/* Detail dialog */}
      <Dialog open={!!detailVisit} onOpenChange={(v) => !v && setDetailVisit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détail de la visite</DialogTitle>
          </DialogHeader>
          {detailVisit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Commercial</p>
                  <p className="font-medium">{profiles.get(detailVisit.commercial_id) || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Client</p>
                  <p className="font-medium">{detailVisit.clients?.company_name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Date</p>
                  <p className="font-medium">{new Date(detailVisit.visit_date).toLocaleDateString("fr-FR")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Statut</p>
                  <Badge className={statusColors[detailVisit.status]}>{statusLabels[detailVisit.status]}</Badge>
                </div>
                {detailVisit.location && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Lieu</p>
                    <p className="font-medium">{detailVisit.location}</p>
                  </div>
                )}
              </div>

              <Tabs defaultValue="summary">
                <TabsList className="w-full">
                  <TabsTrigger value="summary" className="flex-1 text-xs sm:text-sm">Résumé IA</TabsTrigger>
                  <TabsTrigger value="transcription" className="flex-1 text-xs sm:text-sm">Transcription</TabsTrigger>
                  <TabsTrigger value="report" className="flex-1 text-xs sm:text-sm">Rapport</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="mt-3">
                  {detailVisit.summary ? (
                    <div className="whitespace-pre-wrap text-sm bg-muted/50 rounded-md border p-3 sm:p-4 max-h-96 overflow-y-auto leading-relaxed">
                      {detailVisit.summary}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-6">Aucun résumé disponible</p>
                  )}
                </TabsContent>
                <TabsContent value="transcription" className="mt-3">
                  {detailVisit.transcription ? (
                    <div className="whitespace-pre-wrap text-sm font-mono bg-muted/50 rounded-md border p-3 sm:p-4 max-h-96 overflow-y-auto leading-relaxed">
                      {detailVisit.transcription}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-6">Aucune transcription disponible</p>
                  )}
                </TabsContent>
                <TabsContent value="report" className="mt-3">
                  {detailVisit.report ? (
                    <div className="whitespace-pre-wrap text-sm bg-muted/50 rounded-md border p-3 sm:p-4 max-h-96 overflow-y-auto leading-relaxed">
                      {detailVisit.report}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-6">Aucun rapport disponible</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
