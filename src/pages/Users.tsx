import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, User } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  role?: string;
}

const roleLabels: Record<string, string> = {
  admin: "Administrateur",
  manager: "Manager",
  commercial: "Commercial",
};

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "commercial" });

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");
    const { data: roles } = await supabase.from("user_roles").select("*");

    if (profiles) {
      const merged = profiles.map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.user_id)?.role ?? "—",
      }));
      setUsers(merged);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleInvite = async () => {
    if (!form.email || !form.password || !form.full_name) {
      toast.error("Tous les champs sont requis");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: form.email, password: form.password, full_name: form.full_name, role: form.role },
      });

      if (error) {
        let message = error.message;
        try {
          if (error.context && typeof error.context.json === 'function') {
            const body = await error.context.json();
            message = body?.error || message;
          }
        } catch {}
        toast.error("Erreur lors de l'invitation", { description: message });
        return;
      }

      if (data?.error) {
        toast.error("Erreur lors de l'invitation", { description: data.error });
        return;
      }

      toast.success("Utilisateur créé avec succès");
      setOpen(false);
      setForm({ email: "", password: "", full_name: "", role: "commercial" });
      fetchUsers();
    } catch (err: any) {
      toast.error("Erreur lors de l'invitation", { description: err?.message || "Erreur inconnue" });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Gestion des utilisateurs</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto"><UserPlus className="h-4 w-4 mr-2" />Inviter un utilisateur</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Inviter un utilisateur</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nom complet *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Mot de passe temporaire *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div><Label>Rôle</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleInvite} className="w-full">Créer le compte</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mobile: Card list */}
      <div className="space-y-3 sm:hidden">
        {users.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucun utilisateur</p>
        ) : users.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium truncate">{u.full_name || "—"}</p>
                  <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{roleLabels[u.role ?? ""] ?? u.role}</Badge>
                    <Badge variant={u.is_active ? "default" : "secondary"}>
                      {u.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
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
                <th className="text-left font-medium p-3">Nom</th>
                <th className="text-left font-medium p-3">Email</th>
                <th className="text-left font-medium p-3">Rôle</th>
                <th className="text-left font-medium p-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-muted-foreground py-8">Aucun utilisateur</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{u.full_name || "—"}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3"><Badge variant="outline">{roleLabels[u.role ?? ""] ?? u.role}</Badge></td>
                  <td className="p-3">
                    <Badge variant={u.is_active ? "default" : "secondary"}>
                      {u.is_active ? "Actif" : "Inactif"}
                    </Badge>
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
