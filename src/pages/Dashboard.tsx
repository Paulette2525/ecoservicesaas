import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Building2, Package, ClipboardList, User } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/hooks/useAuth";

const STATUS_LABELS: Record<string, string> = {
  opportunite: "Opportunité",
  prise_de_contact: "Prise de contact",
  commande_probable: "Commande probable",
};

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
}

export default function Dashboard() {
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "manager";

  const [stats, setStats] = useState({ visits: 0, clients: 0, products: 0, demands: 0 });
  const [visitData, setVisitData] = useState<{ name: string; visites: number }[]>([]);
  const [commercialStats, setCommercialStats] = useState<CommercialStats[]>([]);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<RecentReport | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const [v, c, p, d] = await Promise.all([
        supabase.from("visits").select("id", { count: "exact", head: true }),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("client_demands").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        visits: v.count ?? 0,
        clients: c.count ?? 0,
        products: p.count ?? 0,
        demands: d.count ?? 0,
      });
    };

    const fetchVisitChart = async () => {
      const { data } = await supabase
        .from("visits")
        .select("visit_date")
        .order("visit_date", { ascending: true });

      if (data) {
        const byMonth: Record<string, number> = {};
        data.forEach((v) => {
          const month = new Date(v.visit_date).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
          byMonth[month] = (byMonth[month] || 0) + 1;
        });
        setVisitData(Object.entries(byMonth).map(([name, visites]) => ({ name, visites })));
      }
    };

    fetchStats();
    fetchVisitChart();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchAdminData = async () => {
      const [visitsRes, profilesRes] = await Promise.all([
        supabase.from("visits").select("id, commercial_id, client_id, visit_date, status, summary, transcription, report, clients(company_name)").order("visit_date", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name"),
      ]);

      const visits = visitsRes.data ?? [];
      const profiles = profilesRes.data ?? [];
      const profileMap = new Map(profiles.map((p) => [p.user_id, p.full_name]));

      // Commercial stats
      const byCommercial = new Map<string, { visits: number; clients: Set<string>; lastDate: string | null }>();
      visits.forEach((v) => {
        const entry = byCommercial.get(v.commercial_id) ?? { visits: 0, clients: new Set<string>(), lastDate: null };
        entry.visits++;
        entry.clients.add(v.client_id);
        if (!entry.lastDate || v.visit_date > entry.lastDate) entry.lastDate = v.visit_date;
        byCommercial.set(v.commercial_id, entry);
      });

      setCommercialStats(
        Array.from(byCommercial.entries())
          .map(([id, s]) => ({
            name: profileMap.get(id) || "Inconnu",
            totalVisits: s.visits,
            uniqueClients: s.clients.size,
            lastVisit: s.lastDate,
          }))
          .sort((a, b) => b.totalVisits - a.totalVisits)
      );

      // Recent reports
      const withReport = visits
        .filter((v) => v.summary || v.transcription)
        .slice(0, 10);

      setRecentReports(
        withReport.map((v) => ({
          id: v.id,
          commercialName: profileMap.get(v.commercial_id) || "Inconnu",
          clientName: (v.clients as any)?.company_name || "—",
          visitDate: v.visit_date,
          status: v.status,
          summary: v.summary,
          transcription: v.transcription,
          report: v.report,
        }))
      );
    };

    fetchAdminData();
  }, [isAdmin]);

  const kpis = [
    { label: "Visites", value: stats.visits, icon: MapPin, color: "text-primary" },
    { label: "Clients", value: stats.clients, icon: Building2, color: "text-green-600" },
    { label: "Produits", value: stats.products, icon: Package, color: "text-yellow-600" },
    { label: "Demandes", value: stats.demands, icon: ClipboardList, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          {visitData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={visitData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="visites" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">Aucune donnée de visite disponible</p>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          {/* Commercial activity table */}
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
                        <TableCell>
                          {c.lastVisit
                            ? new Date(c.lastVisit).toLocaleDateString("fr-FR")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">Aucune activité</p>
              )}
            </CardContent>
          </Card>

          {/* Recent reports */}
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
                          <Badge variant="secondary">{STATUS_LABELS[r.status] || r.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(r.visitDate).toLocaleDateString("fr-FR")}
                        </p>
                        {r.summary && (
                          <p className="text-sm line-clamp-2">{r.summary}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Aucun rapport disponible</p>
              )}
            </CardContent>
          </Card>

          {/* Report detail dialog */}
          <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Rapport — {selectedReport?.commercialName} → {selectedReport?.clientName}
                </DialogTitle>
              </DialogHeader>
              {selectedReport && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{STATUS_LABELS[selectedReport.status] || selectedReport.status}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(selectedReport.visitDate).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  {selectedReport.summary && (
                    <div>
                      <h4 className="font-semibold mb-1">Résumé IA</h4>
                      <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">{selectedReport.summary}</p>
                    </div>
                  )}
                  {selectedReport.report && (
                    <div>
                      <h4 className="font-semibold mb-1">Rapport</h4>
                      <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">{selectedReport.report}</p>
                    </div>
                  )}
                  {selectedReport.transcription && (
                    <div>
                      <h4 className="font-semibold mb-1">Transcription</h4>
                      <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md max-h-60 overflow-y-auto">{selectedReport.transcription}</p>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
