import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Clock, Star, TrendingUp, Plus, Flame, Target, Calendar } from "lucide-react";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { AppView } from "@/components/Sidebar";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  is_starred: boolean;
  category_id: string | null;
}

interface DashboardProps {
  onNavigate: (view: AppView) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchTasks = async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setTasks(data || []);
      setLoading(false);
    };
    fetchTasks();

    const channel = supabase
      .channel("dashboard-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` },
        () => fetchTasks()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const starred = tasks.filter((t) => t.is_starred).length;
  const overdue = tasks.filter((t) => t.due_date && isPast(new Date(t.due_date)) && t.status !== "completed").length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const todayTasks = tasks.filter((t) =>
    t.due_date && isToday(new Date(t.due_date)) && t.status !== "completed"
  );
  const upcomingTasks = tasks
    .filter((t) => t.status !== "completed")
    .slice(0, 5);

  const priorityColor = (p: string) => {
    const map: Record<string, string> = {
      urgent: "priority-urgent priority-bg-urgent",
      high: "priority-high priority-bg-high",
      medium: "priority-medium priority-bg-medium",
      low: "priority-low priority-bg-low",
    };
    return map[p] || "text-muted-foreground bg-muted";
  };

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {greeting}, {displayName}! 👋
          </h2>
          <p className="text-muted-foreground mt-0.5">
            {format(new Date(), "EEEE, MMMM d yyyy")} · {pending} tasks pending
          </p>
        </div>
        <Button
          onClick={() => onNavigate("tasks")}
          className="gradient-hero text-primary-foreground rounded-xl shadow-pink hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Tasks", value: total, icon: CheckSquare, color: "text-primary", bg: "bg-primary/10" },
          { label: "Completed", value: completed, icon: Target, color: "text-green-600", bg: "bg-green-500/10" },
          { label: "Starred", value: starred, icon: Star, color: "text-yellow-500", bg: "bg-yellow-500/10" },
          { label: "Overdue", value: overdue, icon: Clock, color: "text-destructive", bg: "bg-destructive/10" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50 shadow-card hover:shadow-md transition-shadow gradient-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg)}>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Bar */}
      <Card className="border-border/50 shadow-card gradient-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Completion Rate</span>
            </div>
            <span className="text-2xl font-bold text-primary">{completionRate}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="h-full gradient-hero rounded-full transition-all duration-700"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {completed} of {total} tasks completed
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <Card className="border-border/50 shadow-card gradient-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4 text-primary" />
              Due Today
              {todayTasks.length > 0 && (
                <span className="ml-auto bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
                  {todayTasks.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🌸</div>
                <p className="text-muted-foreground text-sm">No tasks due today!</p>
              </div>
            ) : (
              todayTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  <span className="flex-1 text-sm font-medium text-foreground truncate">{task.title}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColor(task.priority))}>
                    {task.priority}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card className="border-border/50 shadow-card gradient-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-primary" />
              Recent Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded-xl" />
              ))
            ) : upcomingTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">✨</div>
                <p className="text-muted-foreground text-sm">No tasks yet. Create your first!</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 rounded-xl border-primary/30 text-primary"
                  onClick={() => onNavigate("tasks")}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Task
                </Button>
              </div>
            ) : (
              upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0",
                    task.status === "completed" ? "bg-green-500" : "bg-primary"
                  )} />
                  <span className="flex-1 text-sm font-medium text-foreground truncate">{task.title}</span>
                  {task.is_starred && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColor(task.priority))}>
                    {task.priority}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
