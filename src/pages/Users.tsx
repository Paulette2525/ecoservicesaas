import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, UserPlus } from "lucide-react";
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

    // Create user via edge function (admin invite)
    const { data, error } = await supabase.functions.invoke("invite-user", {
      body: { email: form.email, password: form.password, full_name: form.full_name, role: form.role },
    });

    if (error) {
      toast.error("Erreur lors de l'invitation", { description: error.message });
      return;
    }

    toast.success("Utilisateur créé avec succès");
    setOpen(false);
    setForm({ email: "", password: "", full_name: "", role: "commercial" });
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-2" />Inviter un utilisateur</Button>
          </DialogTrigger>
          <DialogContent>
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucun utilisateur</TableCell></TableRow>
              ) : users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell><Badge variant="outline">{roleLabels[u.role ?? ""] ?? u.role}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? "default" : "secondary"}>
                      {u.is_active ? "Actif" : "Inactif"}
                    </Badge>
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
