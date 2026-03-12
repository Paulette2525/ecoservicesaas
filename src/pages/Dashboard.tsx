import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Building2, Package, ClipboardList } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const [stats, setStats] = useState({ visits: 0, clients: 0, products: 0, demands: 0 });
  const [visitData, setVisitData] = useState<{ name: string; visites: number }[]>([]);

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

  const kpis = [
    { label: "Visites", value: stats.visits, icon: MapPin, color: "text-primary" },
    { label: "Clients", value: stats.clients, icon: Building2, color: "text-success" },
    { label: "Produits", value: stats.products, icon: Package, color: "text-warning" },
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
                <Bar dataKey="visites" fill="hsl(213, 56%, 24%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">Aucune donnée de visite disponible</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
