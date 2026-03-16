import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { MapPin, Building2, Package, ClipboardList, User, CalendarIcon, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  opportunite: "Opportunité",
  prise_de_contact: "Prise de contact",
  commande_probable: "Commande probable",
};

const STATUS_COLORS: Record<string, string> = {
  opportunite: "bg-warning text-warning-foreground",
  prise_de_contact: "bg-secondary text-secondary-foreground",
  commande_probable: "bg-success text-success-foreground",
};

type PeriodPreset = "week" | "month" | "custom";

interface CommercialStats {
  name: string;
  totalVisits: number;
  uniqueClients: number;
  lastVisit: string | null;
}

interface RecentReport {
  id: string;
  commercialName: string;
  clientName: string;
  visitDate: string;
  status: string;
  summary: string | null;
  transcription: string | null;
  report: string | null;
  location: string | null;
}

export default function Dashboard() {
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "manager";

  // Period filter
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("month");
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));

  const [stats, setStats] = useState({ visits: 0, clients: 0, products: 0, demands: 0 });
  const [allVisits, setAllVisits] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; full_name: string }[]>([]);
  const [selectedReport, setSelectedReport] = useState<RecentReport | null>(null);

  const applyPreset = (preset: PeriodPreset) => {
    const now = new Date();
    setPeriodPreset(preset);
    if (preset === "week") { setDateFrom(startOfWeek(now, { locale: fr })); setDateTo(endOfWeek(now, { locale: fr })); }
    else if (preset === "month") { setDateFrom(startOfMonth(now)); setDateTo(endOfMonth(now)); }
  };

  const dateFromStr = format(dateFrom, "yyyy-MM-dd");
  const dateToStr = format(dateTo, "yyyy-MM-dd'T'23:59:59");

  useEffect(() => {
    const fetchAll = async () => {
      const [globalClients, globalProducts, visitsRes, profilesRes, demandsRes] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("visits").select("id, commercial_id, client_id, visit_date, status, summary, transcription, report, location, clients(company_name)").gte("visit_date", dateFromStr).lte("visit_date", dateToStr).order("visit_date", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name"),
        supabase.from("client_demands").select("id", { count: "exact", head: true }).gte("demand_date", dateFromStr).lte("demand_date", dateToStr),
      ]);

      setStats({
        visits: visitsRes.data?.length ?? 0,
        clients: globalClients.count ?? 0,
        products: globalProducts.count ?? 0,
        demands: demandsRes.count ?? 0,
      });
      setAllVisits(visitsRes.data ?? []);
      setProfiles(profilesRes.data ?? []);
    };
    fetchAll();
  }, [dateFromStr, dateToStr]);

  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.user_id, p.full_name])), [profiles]);

  const visitChartData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    allVisits.forEach((v) => {
      const month = new Date(v.visit_date).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      byMonth[month] = (byMonth[month] || 0) + 1;
    });
    return Object.entries(byMonth).map(([name, visites]) => ({ name, visites }));
  }, [allVisits]);

  const commercialStats = useMemo<CommercialStats[]>(() => {
    if (!isAdmin) return [];
    const byCommercial = new Map<string, { visits: number; clients: Set<string>; lastDate: string | null }>();
    allVisits.forEach((v) => {
      const entry = byCommercial.get(v.commercial_id) ?? { visits: 0, clients: new Set<string>(), lastDate: null };
      entry.visits++;
      entry.clients.add(v.client_id);
      if (!entry.lastDate || v.visit_date > entry.lastDate) entry.lastDate = v.visit_date;
      byCommercial.set(v.commercial_id, entry);
    });
    return Array.from(byCommercial.entries())
      .map(([id, s]) => ({ name: profileMap.get(id) || "Inconnu", totalVisits: s.visits, uniqueClients: s.clients.size, lastVisit: s.lastDate }))
      .sort((a, b) => b.totalVisits - a.totalVisits);
  }, [allVisits, profileMap, isAdmin]);

  const recentReports = useMemo<RecentReport[]>(() => {
    if (!isAdmin) return [];
    return allVisits
      .filter((v) => v.summary || v.transcription)
      .slice(0, 10)
      .map((v) => ({
        id: v.id,
        commercialName: profileMap.get(v.commercial_id) || "Inconnu",
        clientName: (v.clients as any)?.company_name || "—",
        visitDate: v.visit_date,
        status: v.status,
        summary: v.summary,
        transcription: v.transcription,
        report: v.report,
        location: v.location,
      }));
  }, [allVisits, profileMap, isAdmin]);

  const kpis = [
    { label: "Visites", value: stats.visits, icon: MapPin, color: "text-primary" },
    { label: "Clients", value: stats.clients, icon: Building2, color: "text-green-600" },
    { label: "Produits", value: stats.products, icon: Package, color: "text-yellow-600" },
    { label: "Demandes", value: stats.demands, icon: ClipboardList, color: "text-destructive" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Tableau de bord</h1>

        {/* Period filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(["week", "month"] as PeriodPreset[]).map((p) => (
            <Button
              key={p}
              variant={periodPreset === p ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset(p)}
            >
              {p === "week" ? "Semaine" : "Mois"}
            </Button>
          ))}

          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          <Popover>
            <PopoverTrigger asChild>
              <Button variant={periodPreset === "custom" ? "default" : "outline"} size="sm" className="gap-1 text-xs sm:text-sm">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{format(dateFrom, "dd/MM/yy")} — {format(dateTo, "dd/MM/yy")}</span>
                <span className="sm:hidden">Période</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 flex flex-col sm:flex-row" align="end">
              <div className="p-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Date début</p>
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={(d) => { if (d) { setDateFrom(d); setPeriodPreset("custom"); } }}
                  className={cn("p-0 pointer-events-auto")}
                />
              </div>
              <Separator orientation="vertical" className="hidden sm:block" />
              <Separator className="sm:hidden" />
              <div className="p-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Date fin</p>
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={(d) => { if (d) { setDateTo(d); setPeriodPreset("custom"); } }}
                  className={cn("p-0 pointer-events-auto")}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visites par mois</CardTitle>
        </CardHeader>
        <CardContent>
          {visitChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={visitChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="visites" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">Aucune donnée de visite pour cette période</p>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Activité par commercial
              </CardTitle>
            </CardHeader>
            <CardContent>
              {commercialStats.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Commercial</TableHead>
                      <TableHead className="text-center">Nb visites</TableHead>
                      <TableHead className="text-center">Clients visités</TableHead>
                      <TableHead>Dernière visite</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commercialStats.map((c) => (
                      <TableRow key={c.name}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-center">{c.totalVisits}</TableCell>
                        <TableCell className="text-center">{c.uniqueClients}</TableCell>
                        <TableCell>{c.lastVisit ? new Date(c.lastVisit).toLocaleDateString("fr-FR") : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">Aucune activité sur cette période</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Derniers rapports de visite</CardTitle>
            </CardHeader>
            <CardContent>
              {recentReports.length > 0 ? (
                <div className="space-y-3">
                  {recentReports.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-start justify-between border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedReport(r)}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{r.commercialName}</span>
                          <span className="text-muted-foreground">→</span>
                          <span>{r.clientName}</span>
                          <Badge className={STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status] || r.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{new Date(r.visitDate).toLocaleDateString("fr-FR")}</p>
                        {r.summary && <p className="text-sm line-clamp-2">{r.summary}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Aucun rapport sur cette période</p>
              )}
            </CardContent>
          </Card>

          {/* Report detail dialog with tabs */}
          <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Détail de la visite</DialogTitle>
              </DialogHeader>
              {selectedReport && (
                <div className="space-y-4">
                  {/* Header card */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Commercial</p>
                      <p className="font-medium">{selectedReport.commercialName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Client</p>
                      <p className="font-medium">{selectedReport.clientName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Date</p>
                      <p className="font-medium">{new Date(selectedReport.visitDate).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Statut</p>
                      <Badge className={STATUS_COLORS[selectedReport.status]}>{STATUS_LABELS[selectedReport.status]}</Badge>
                    </div>
                    {selectedReport.location && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground text-xs">Lieu</p>
                        <p className="font-medium">{selectedReport.location}</p>
                      </div>
                    )}
                  </div>

                  <Tabs defaultValue="summary">
                    <TabsList className="w-full">
                      <TabsTrigger value="summary" className="flex-1">Résumé IA</TabsTrigger>
                      <TabsTrigger value="transcription" className="flex-1">Transcription</TabsTrigger>
                      <TabsTrigger value="report" className="flex-1">Rapport</TabsTrigger>
                    </TabsList>
                    <TabsContent value="summary" className="mt-3">
                      {selectedReport.summary ? (
                        <div className="whitespace-pre-wrap text-sm bg-muted/50 rounded-md border p-4 max-h-96 overflow-y-auto leading-relaxed">
                          {selectedReport.summary}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm text-center py-6">Aucun résumé disponible</p>
                      )}
                    </TabsContent>
                    <TabsContent value="transcription" className="mt-3">
                      {selectedReport.transcription ? (
                        <div className="whitespace-pre-wrap text-sm font-mono bg-muted/50 rounded-md border p-4 max-h-96 overflow-y-auto leading-relaxed">
                          {selectedReport.transcription}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm text-center py-6">Aucune transcription disponible</p>
                      )}
                    </TabsContent>
                    <TabsContent value="report" className="mt-3">
                      {selectedReport.report ? (
                        <div className="whitespace-pre-wrap text-sm bg-muted/50 rounded-md border p-4 max-h-96 overflow-y-auto leading-relaxed">
                          {selectedReport.report}
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
        </>
      )}
    </div>
  );
}
