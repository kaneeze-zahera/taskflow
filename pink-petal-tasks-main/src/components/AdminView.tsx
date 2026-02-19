import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, CheckSquare, BarChart2, Trash2, Star } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Profile { id: string; display_name: string | null; avatar_url: string | null; created_at: string; }
interface UserWithRole extends Profile { role: string; email?: string; task_count?: number; }
interface Task { id: string; title: string; user_id: string; status: string; priority: string; created_at: string; }

export default function AdminView() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    // Fetch all profiles
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    // Fetch all user roles
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    // Fetch all tasks
    const { data: allTasks } = await supabase.from("tasks").select("id, title, user_id, status, priority, created_at")
      .order("created_at", { ascending: false }).limit(50);

    const roleMap: Record<string, string> = {};
    (roles || []).forEach((r) => { roleMap[r.user_id] = r.role; });

    const taskCountMap: Record<string, number> = {};
    (allTasks || []).forEach((t) => { taskCountMap[t.user_id] = (taskCountMap[t.user_id] || 0) + 1; });

    setUsers((profiles || []).map((p) => ({
      ...p,
      role: roleMap[p.id] || "user",
      task_count: taskCountMap[p.id] || 0,
    })));
    setTasks(allTasks || []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) fetchData(); }, [isAdmin]);

  const promoteToAdmin = async (userId: string) => {
    const { error } = await supabase.from("user_roles").upsert({ user_id: userId, role: "admin" });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "User promoted to admin!" });
    fetchData();
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from("tasks").delete().eq("id", taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    toast({ title: "Task deleted" });
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-full p-6">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground">Access Denied</p>
          <p className="text-muted-foreground">Admin privileges required</p>
        </div>
      </div>
    );
  }

  const totalUsers = users.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const adminCount = users.filter((u) => u.role === "admin").length;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 gradient-hero rounded-xl flex items-center justify-center shadow-pink">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Admin Panel</h2>
          <p className="text-muted-foreground text-sm">Platform overview & management</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: totalUsers, icon: Users, color: "text-primary", bg: "bg-primary/10" },
          { label: "Admin Users", value: adminCount, icon: Star, color: "text-yellow-500", bg: "bg-yellow-500/10" },
          { label: "Total Tasks", value: totalTasks, icon: CheckSquare, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Completed", value: completedTasks, icon: BarChart2, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
        ].map((s) => (
          <Card key={s.label} className="border-border/50 shadow-card gradient-card">
            <CardContent className="p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-3xl font-bold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users Table */}
        <Card className="border-border/50 shadow-card gradient-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-primary" />
              All Users
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />)
            ) : users.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No users found</p>
            ) : (
              users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <div className="w-8 h-8 gradient-hero rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground text-xs font-bold">
                      {(u.display_name || "U").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{u.display_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{u.task_count} tasks · {format(new Date(u.created_at), "MMM d yyyy")}</p>
                  </div>
                  <Badge className={cn("text-xs rounded-full", u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    {u.role}
                  </Badge>
                  {u.role !== "admin" && u.id !== user?.id && (
                    <Button size="sm" variant="outline" onClick={() => promoteToAdmin(u.id)}
                      className="rounded-lg h-7 px-2 text-xs border-primary/30 text-primary">
                      Promote
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card className="border-border/50 shadow-card gradient-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="w-4 h-4 text-primary" />
              All Tasks (Recent)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />)
            ) : tasks.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No tasks found</p>
            ) : (
              tasks.slice(0, 10).map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.status} · {task.priority}</p>
                  </div>
                  <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
