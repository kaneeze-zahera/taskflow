import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Bell, BellOff, Calendar } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { cn } from "@/lib/utils";

interface Task { id: string; title: string; }
interface Reminder {
  id: string; task_id: string; user_id: string;
  remind_at: string; is_sent: boolean; message: string | null;
}

export default function RemindersView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ task_id: "", remind_at: "", message: "" });

  const fetch = async () => {
    if (!user) return;
    const { data: rem } = await supabase.from("reminders").select("*").eq("user_id", user.id).order("remind_at");
    const { data: tsk } = await supabase.from("tasks").select("id, title").eq("user_id", user.id)
      .neq("status", "completed").order("title");
    setReminders(rem || []);
    setTasks(tsk || []);
  };

  useEffect(() => { fetch(); }, [user]);

  const save = async () => {
    if (!form.task_id || !form.remind_at || !user) return;
    const { error } = await supabase.from("reminders").insert([{
      task_id: form.task_id,
      user_id: user.id,
      remind_at: new Date(form.remind_at).toISOString(),
      message: form.message || null,
    }]);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Reminder set! 🔔" });
    setShowDialog(false);
    setForm({ task_id: "", remind_at: "", message: "" });
    fetch();
  };

  const deleteReminder = async (id: string) => {
    await supabase.from("reminders").delete().eq("id", id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Reminder removed" });
  };

  const taskTitle = (id: string) => tasks.find((t) => t.id === id)?.title || "Unknown task";

  const getTimeLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    if (isPast(d)) return "Overdue";
    return format(d, "MMM d");
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reminders</h2>
          <p className="text-muted-foreground text-sm">{reminders.length} reminders set</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gradient-hero text-primary-foreground rounded-xl shadow-pink hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" /> Set Reminder
        </Button>
      </div>

      {reminders.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-3">🔔</div>
          <p className="text-lg font-semibold text-foreground mb-1">No reminders yet</p>
          <p className="text-muted-foreground text-sm mb-4">Set reminders to stay on top of your tasks</p>
          <Button onClick={() => setShowDialog(true)} variant="outline" className="rounded-xl border-primary/30 text-primary">
            <Plus className="w-4 h-4 mr-2" /> Set Reminder
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((rem) => {
            const overdue = isPast(new Date(rem.remind_at)) && !rem.is_sent;
            return (
              <div key={rem.id} className={cn(
                "bg-card border rounded-2xl p-4 flex items-center gap-4 shadow-sm",
                overdue ? "border-destructive/30" : "border-border/70"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  rem.is_sent ? "bg-muted" : overdue ? "bg-destructive/10" : "bg-primary/10"
                )}>
                  {rem.is_sent ? <BellOff className="w-5 h-5 text-muted-foreground" /> :
                    <Bell className={cn("w-5 h-5", overdue ? "text-destructive" : "text-primary")} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{taskTitle(rem.task_id)}</p>
                  {rem.message && <p className="text-sm text-muted-foreground mt-0.5 truncate">{rem.message}</p>}
                  <p className={cn("text-xs mt-1 flex items-center gap-1", overdue ? "text-destructive" : "text-muted-foreground")}>
                    <Calendar className="w-3 h-3" />
                    {getTimeLabel(rem.remind_at)} · {format(new Date(rem.remind_at), "h:mm a")}
                    {rem.is_sent && " · Sent"}
                  </p>
                </div>
                <button onClick={() => deleteReminder(rem.id)} className="p-2 rounded-xl hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Set Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Task *</Label>
              <Select value={form.task_id} onValueChange={(v) => setForm((f) => ({ ...f, task_id: v }))}>
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  {tasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Remind at *</Label>
              <Input type="datetime-local" value={form.remind_at}
                onChange={(e) => setForm((f) => ({ ...f, remind_at: e.target.value }))}
                className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Reminder note..." className="mt-1 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={save} className="gradient-hero text-primary-foreground rounded-xl shadow-pink hover:opacity-90">
              Set Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
