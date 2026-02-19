import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, CheckSquare, Clock, Star, Flame, Target } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

interface Task {
  id: string; status: string; priority: string;
  created_at: string; completed_at: string | null; category_id: string | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

export default function AnalyticsView() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("tasks").select("id, status, priority, created_at, completed_at, category_id")
        .eq("user_id", user.id);
      setTasks(data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  // Compute stats
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const cancelled = tasks.filter((t) => t.status === "cancelled").length;
  const starred = tasks.filter((t) => (t as any).is_starred).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Last 7 days activity
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dayStr = format(day, "yyyy-MM-dd");
    const created = tasks.filter((t) => t.created_at.startsWith(dayStr)).length;
    const done = tasks.filter((t) => t.completed_at && t.completed_at.startsWith(dayStr)).length;
    return { day: format(day, "EEE"), created, completed: done };
  });

  // Priority breakdown
  const priorityData = ["urgent", "high", "medium", "low"].map((p) => ({
    name: p,
    value: tasks.filter((t) => t.priority === p).length,
    color: PRIORITY_COLORS[p],
  })).filter((d) => d.value > 0);

  // Status breakdown
  const statusData = [
    { name: "Pending", value: pending, color: "#f9a8d4" },
    { name: "In Progress", value: inProgress, color: "#67e8f9" },
    { name: "Completed", value: completed, color: "#86efac" },
    { name: "Cancelled", value: cancelled, color: "#d1d5db" },
  ].filter((d) => d.value > 0);

  if (loading) {
    return (
      <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
        <p className="text-muted-foreground text-sm">Your productivity insights</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Tasks", value: total, icon: CheckSquare, color: "text-primary", bg: "bg-primary/10" },
          { label: "Completed", value: completed, icon: Target, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
          { label: "In Progress", value: inProgress, icon: Flame, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
          { label: "Completion %", value: `${completionRate}%`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
        ].map((s) => (
          <Card key={s.label} className="border-border/50 shadow-card gradient-card">
            <CardContent className="p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-3xl font-bold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completion Rate Bar */}
      <Card className="border-border/50 shadow-card gradient-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Overall Progress</span>
            </div>
            <span className="text-2xl font-bold text-primary">{completionRate}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
            <div className="h-full gradient-hero rounded-full transition-all duration-1000" style={{ width: `${completionRate}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{completed} completed</span>
            <span>{total} total</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Activity */}
        <Card className="border-border/50 shadow-card gradient-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              7-Day Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={last7Days} barSize={12} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="created" name="Created" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-sm bg-primary/50" />Created
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-sm bg-primary" />Completed
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Priority Breakdown */}
        <Card className="border-border/50 shadow-card gradient-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Priority Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {priorityData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">No data yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={priorityData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                      paddingAngle={3} dataKey="value">
                      {priorityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {priorityData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border-border/50 shadow-card gradient-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusData.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground font-medium">{s.name}</span>
                  <span className="text-muted-foreground">{s.value} tasks · {total > 0 ? Math.round((s.value / total) * 100) : 0}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ backgroundColor: s.color, width: `${total > 0 ? (s.value / total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
