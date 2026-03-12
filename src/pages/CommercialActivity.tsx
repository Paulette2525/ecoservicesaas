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
import { CalendarIcon, Filter, MapPin, Building2, FileText, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
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

interface CommercialRow {
  userId: string;
  name: string;
  totalVisits: number;
  uniqueClients: number;
  lastVisit: string | null;
  conversionRate: number;
  reportsGenerated: number;
}

interface VisitDetail {
  id: string;
  clientName: string;
  visitDate: string;
  status: string;
  summary: string | null;
  transcription: string | null;
  report: string | null;
  location: string | null;
}

export default function CommercialActivity() {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("month");
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));

  const [allVisits, setAllVisits] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; full_name: string }[]>([]);
  const [commercialIds, setCommercialIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<VisitDetail | null>(null);

  const applyPreset = (preset: PeriodPreset) => {
    const now = new Date();
    setPeriodPreset(preset);
    if (preset === "week") {
      setDateFrom(startOfWeek(now, { locale: fr }));
      setDateTo(endOfWeek(now, { locale: fr }));
    } else if (preset === "month") {
      setDateFrom(startOfMonth(now));
      setDateTo(endOfMonth(now));
    }
  };

  const dateFromStr = format(dateFrom, "yyyy-MM-dd");
  const dateToStr = format(dateTo, "yyyy-MM-dd'T'23:59:59");

  useEffect(() => {
    const fetchData = async () => {
      const [visitsRes, profilesRes, rolesRes] = await Promise.all([
        supabase
          .from("visits")
          .select("id, commercial_id, client_id, visit_date, status, summary, transcription, report, location, clients(company_name)")
          .gte("visit_date", dateFromStr)
          .lte("visit_date", dateToStr)
          .order("visit_date", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name"),
        supabase.from("user_roles").select("user_id, role").eq("role", "commercial"),
      ]);
      setAllVisits(visitsRes.data ?? []);
      setProfiles(profilesRes.data ?? []);
      setCommercialIds((rolesRes.data ?? []).map((r) => r.user_id));
    };
    fetchData();
  }, [dateFromStr, dateToStr]);

  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.user_id, p.full_name])), [profiles]);

  const commercialRows = useMemo<CommercialRow[]>(() => {
    const allIds = new Set([...commercialIds, ...allVisits.map((v) => v.commercial_id)]);
    return Array.from(allIds)
      .map((uid) => {
        const visits = allVisits.filter((v) => v.commercial_id === uid);
        const clients = new Set(visits.map((v) => v.client_id));
        const commandeCount = visits.filter((v) => v.status === "commande_probable").length;
        const reportsCount = visits.filter((v) => v.summary || v.transcription).length;
        const lastDate = visits.length > 0 ? visits[0].visit_date : null;
        return {
          userId: uid,
          name: profileMap.get(uid) || "Inconnu",
          totalVisits: visits.length,
          uniqueClients: clients.size,
          lastVisit: lastDate,
          conversionRate: visits.length > 0 ? Math.round((commandeCount / visits.length) * 100) : 0,
          reportsGenerated: reportsCount,
        };
      })
      .sort((a, b) => b.totalVisits - a.totalVisits);
  }, [allVisits, profileMap, commercialIds]);

  const getCommercialVisits = (uid: string): VisitDetail[] =>
    allVisits
      .filter((v) => v.commercial_id === uid)
      .map((v) => ({
        id: v.id,
        clientName: (v.clients as any)?.company_name || "—",
        visitDate: v.visit_date,
        status: v.status,
        summary: v.summary,
        transcription: v.transcription,
        report: v.report,
        location: v.location,
      }));

  const getCommercialChartData = (uid: string) => {
    const visits = allVisits.filter((v) => v.commercial_id === uid);
    const byWeek: Record<string, number> = {};
    visits.forEach((v) => {
      const wk = format(new Date(v.visit_date), "'S'ww", { locale: fr });
      byWeek[wk] = (byWeek[wk] || 0) + 1;
    });
    return Object.entries(byWeek).map(([name, visites]) => ({ name, visites }));
  };

  const getClientBreakdown = (uid: string) => {
    const visits = allVisits.filter((v) => v.commercial_id === uid);
    const map = new Map<string, { name: string; count: number }>();
    visits.forEach((v) => {
      const cName = (v.clients as any)?.company_name || "—";
      const entry = map.get(v.client_id) ?? { name: cName, count: 0 };
      entry.count++;
      map.set(v.client_id, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Activité des commerciaux</h1>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(["week", "month"] as PeriodPreset[]).map((p) => (
            <Button key={p} variant={periodPreset === p ? "default" : "outline"} size="sm" onClick={() => applyPreset(p)}>
              {p === "week" ? "Cette semaine" : "Ce mois"}
            </Button>
          ))}
          <Separator orientation="vertical" className="h-6" />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={periodPreset === "custom" ? "default" : "outline"} size="sm" className="gap-1">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(dateFrom, "dd/MM/yy")} — {format(dateTo, "dd/MM/yy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 flex" align="end">
              <div className="p-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Date début</p>
                <Calendar mode="single" selected={dateFrom} onSelect={(d) => { if (d) { setDateFrom(d); setPeriodPreset("custom"); } }} className="p-0 pointer-events-auto" />
              </div>
              <Separator orientation="vertical" />
              <div className="p-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Date fin</p>
                <Calendar mode="single" selected={dateTo} onSelect={(d) => { if (d) { setDateTo(d); setPeriodPreset("custom"); } }} className="p-0 pointer-events-auto" />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Summary table */}
      <Card>
        <CardHeader>
          <CardTitle>Récapitulatif par commercial</CardTitle>
        </CardHeader>
        <CardContent>
          {commercialRows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commercial</TableHead>
                  <TableHead className="text-center">Visites</TableHead>
                  <TableHead className="text-center">Clients visités</TableHead>
                  <TableHead className="text-center">Taux conversion</TableHead>
                  <TableHead className="text-center">Rapports</TableHead>
                  <TableHead>Dernière visite</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {commercialRows.map((c) => (
                  <TableRow
                    key={c.userId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedId(expandedId === c.userId ? null : c.userId)}
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-center">{c.totalVisits}</TableCell>
                    <TableCell className="text-center">{c.uniqueClients}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={c.conversionRate >= 50 ? "default" : "secondary"}>{c.conversionRate}%</Badge>
                    </TableCell>
                    <TableCell className="text-center">{c.reportsGenerated}</TableCell>
                    <TableCell>{c.lastVisit ? new Date(c.lastVisit).toLocaleDateString("fr-FR") : "—"}</TableCell>
                    <TableCell>
                      {expandedId === c.userId ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-6">Aucune activité sur cette période</p>
          )}
        </CardContent>
      </Card>

      {/* Expanded detail for selected commercial */}
      {expandedId && (() => {
        const row = commercialRows.find((c) => c.userId === expandedId);
        if (!row) return null;
        const visits = getCommercialVisits(expandedId);
        const chartData = getCommercialChartData(expandedId);
        const clientBreakdown = getClientBreakdown(expandedId);

        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Détail — {row.name}
            </h2>

            {/* Individual KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Visites</CardTitle>
                  <MapPin className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent><p className="text-2xl font-bold">{row.totalVisits}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Clients visités</CardTitle>
                  <Building2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent><p className="text-2xl font-bold">{row.uniqueClients}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Rapports générés</CardTitle>
                  <FileText className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent><p className="text-2xl font-bold">{row.reportsGenerated}</p></CardContent>
              </Card>
            </div>

            {/* Performance chart */}
            {chartData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Performance par semaine</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="visites" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Client breakdown */}
            {clientBreakdown.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Clients visités</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {clientBreakdown.map((cb) => (
                      <div key={cb.name} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span className="text-sm font-medium truncate">{cb.name}</span>
                        <Badge variant="secondary">{cb.count} visite{cb.count > 1 ? "s" : ""}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent visits list */}
            <Card>
              <CardHeader><CardTitle className="text-base">Dernières visites</CardTitle></CardHeader>
              <CardContent>
                {visits.length > 0 ? (
                  <div className="space-y-2">
                    {visits.slice(0, 15).map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={(e) => { e.stopPropagation(); setSelectedVisit(v); }}
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{v.clientName}</span>
                            <Badge className={STATUS_COLORS[v.status]}>{STATUS_LABELS[v.status] || v.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{new Date(v.visitDate).toLocaleDateString("fr-FR")}</p>
                        </div>
                        {(v.summary || v.transcription) && <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Aucune visite</p>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Visit detail dialog */}
      <Dialog open={!!selectedVisit} onOpenChange={(open) => !open && setSelectedVisit(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détail de la visite</DialogTitle>
          </DialogHeader>
          {selectedVisit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Client</p>
                  <p className="font-medium">{selectedVisit.clientName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Date</p>
                  <p className="font-medium">{new Date(selectedVisit.visitDate).toLocaleDateString("fr-FR")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Statut</p>
                  <Badge className={STATUS_COLORS[selectedVisit.status]}>{STATUS_LABELS[selectedVisit.status]}</Badge>
                </div>
                {selectedVisit.location && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Lieu</p>
                    <p className="font-medium">{selectedVisit.location}</p>
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
                  {selectedVisit.summary ? (
                    <div className="whitespace-pre-wrap text-sm bg-muted/50 rounded-md border p-4 max-h-96 overflow-y-auto leading-relaxed">{selectedVisit.summary}</div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-6">Aucun résumé disponible</p>
                  )}
                </TabsContent>
                <TabsContent value="transcription" className="mt-3">
                  {selectedVisit.transcription ? (
                    <div className="whitespace-pre-wrap text-sm font-mono bg-muted/50 rounded-md border p-4 max-h-96 overflow-y-auto leading-relaxed">{selectedVisit.transcription}</div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-6">Aucune transcription disponible</p>
                  )}
                </TabsContent>
                <TabsContent value="report" className="mt-3">
                  {selectedVisit.report ? (
                    <div className="whitespace-pre-wrap text-sm bg-muted/50 rounded-md border p-4 max-h-96 overflow-y-auto leading-relaxed">{selectedVisit.report}</div>
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
