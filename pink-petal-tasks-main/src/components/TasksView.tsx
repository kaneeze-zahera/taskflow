import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Star, Trash2, Edit, ChevronDown, ChevronUp, Bell, Filter, Search } from "lucide-react";
import { format, isPast } from "date-fns";
import { cn } from "@/lib/utils";

interface Category { id: string; name: string; color: string; }
interface Subtask { id: string; title: string; is_completed: boolean; }
interface Task {
  id: string; user_id: string; title: string; description: string | null;
  status: string; priority: string; due_date: string | null;
  is_starred: boolean; category_id: string | null; tags: string[];
  completed_at: string | null; created_at: string;
}

const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = ["pending", "in_progress", "completed", "cancelled"];

const priorityBadge = (p: string) => {
  const map: Record<string, string> = {
    urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };
  return map[p] || "";
};

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    pending: "bg-secondary text-secondary-foreground",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-muted text-muted-foreground",
  };
  return map[s] || "";
};

export default function TasksView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subtasks, setSubtasks] = useState<Record<string, Subtask[]>>({});
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  // Form state
  const [form, setForm] = useState({
    title: "", description: "", status: "pending", priority: "medium",
    due_date: "", category_id: "", tags: "", is_starred: false,
  });

  const fetchTasks = async () => {
    if (!user) return;
    const { data } = await supabase.from("tasks").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    setTasks(data || []);
  };

  const fetchCategories = async () => {
    if (!user) return;
    const { data } = await supabase.from("categories").select("*").eq("user_id", user.id);
    setCategories(data || []);
  };

  const fetchSubtasks = async (taskId: string) => {
    const { data } = await supabase.from("subtasks").select("*").eq("task_id", taskId).order("sort_order");
    setSubtasks((prev) => ({ ...prev, [taskId]: data || [] }));
  };

  useEffect(() => {
    fetchTasks();
    fetchCategories();
  }, [user]);

  const openCreate = () => {
    setEditingTask(null);
    setForm({ title: "", description: "", status: "pending", priority: "medium", due_date: "", category_id: "", tags: "", is_starred: false });
    setShowDialog(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ? task.due_date.slice(0, 16) : "",
      category_id: task.category_id || "",
      tags: (task.tags || []).join(", "),
      is_starred: task.is_starred,
    });
    setShowDialog(true);
  };

  const saveTask = async () => {
    if (!form.title.trim() || !user) return;
    const priority = form.priority as "low" | "medium" | "high" | "urgent";
    const status = form.status as "pending" | "in_progress" | "completed" | "cancelled";
    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      status,
      priority,
      due_date: form.due_date || null,
      category_id: form.category_id || null,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      is_starred: form.is_starred,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    };

    if (editingTask) {
      const { error } = await supabase.from("tasks").update(payload).eq("id", editingTask.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Task updated! ✨" });
    } else {
      const { error } = await supabase.from("tasks").insert([{ ...payload, user_id: user.id }]);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Task created! 🎉" });
    }
    setShowDialog(false);
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Task deleted" });
  };

  const toggleStar = async (task: Task) => {
    await supabase.from("tasks").update({ is_starred: !task.is_starred }).eq("id", task.id);
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, is_starred: !t.is_starred } : t));
  };

  const toggleStatus = async (task: Task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    await supabase.from("tasks").update({
      status: newStatus,
      completed_at: newStatus === "completed" ? new Date().toISOString() : null,
    }).eq("id", task.id);
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t));
  };

  const toggleSubtask = async (subtask: Subtask, taskId: string) => {
    await supabase.from("subtasks").update({ is_completed: !subtask.is_completed }).eq("id", subtask.id);
    setSubtasks((prev) => ({
      ...prev,
      [taskId]: (prev[taskId] || []).map((s) => s.id === subtask.id ? { ...s, is_completed: !s.is_completed } : s),
    }));
  };

  const addSubtask = async (taskId: string, title: string) => {
    if (!user || !title.trim()) return;
    const { data } = await supabase.from("subtasks").insert({ task_id: taskId, user_id: user.id, title: title.trim() }).select().single();
    if (data) setSubtasks((prev) => ({ ...prev, [taskId]: [...(prev[taskId] || []), data] }));
  };

  const toggleExpand = (taskId: string) => {
    if (expandedTask === taskId) {
      setExpandedTask(null);
    } else {
      setExpandedTask(taskId);
      if (!subtasks[taskId]) fetchSubtasks(taskId);
    }
  };

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchPriority = filterPriority === "all" || t.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Tasks</h2>
          <p className="text-muted-foreground text-sm">{filtered.length} tasks</p>
        </div>
        <Button onClick={openCreate} className="gradient-hero text-primary-foreground rounded-xl shadow-pink hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" /> New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl h-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 rounded-xl h-10">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36 rounded-xl h-10">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🌸</div>
            <p className="text-lg font-semibold text-foreground mb-1">No tasks found</p>
            <p className="text-muted-foreground text-sm mb-4">Create a new task to get started</p>
            <Button onClick={openCreate} variant="outline" className="rounded-xl border-primary/30 text-primary">
              <Plus className="w-4 h-4 mr-2" /> Create Task
            </Button>
          </div>
        ) : (
          filtered.map((task) => {
            const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== "completed";
            const isExpanded = expandedTask === task.id;
            const taskSubtasks = subtasks[task.id] || [];

            return (
              <div key={task.id} className={cn(
                "bg-card border rounded-2xl shadow-sm hover:shadow-card transition-all",
                task.status === "completed" ? "opacity-70 border-border/50" : "border-border/70"
              )}>
                <div className="p-4 flex items-start gap-3">
                  <Checkbox
                    checked={task.status === "completed"}
                    onCheckedChange={() => toggleStatus(task)}
                    className="mt-0.5 rounded-full data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("font-semibold text-foreground", task.status === "completed" && "line-through text-muted-foreground")}>
                        {task.title}
                      </span>
                      <Badge className={cn("text-xs rounded-full px-2 py-0.5", priorityBadge(task.priority))}>
                        {task.priority}
                      </Badge>
                      <Badge className={cn("text-xs rounded-full px-2 py-0.5", statusBadge(task.status))}>
                        {task.status.replace("_", " ")}
                      </Badge>
                      {(task.tags || []).slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs rounded-full px-2 py-0.5 border-primary/30 text-primary">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">{task.description}</p>
                    )}
                    {task.due_date && (
                      <p className={cn("text-xs mt-1 flex items-center gap-1", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                        <Bell className="w-3 h-3" />
                        {isOverdue ? "Overdue · " : "Due · "}
                        {format(new Date(task.due_date), "MMM d, yyyy h:mm a")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleStar(task)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                      <Star className={cn("w-4 h-4", task.is_starred ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")} />
                    </button>
                    <button onClick={() => openEdit(task)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                    <button onClick={() => toggleExpand(task.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>

                {/* Subtasks */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/50 mt-1 pt-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subtasks</p>
                    {taskSubtasks.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={sub.is_completed}
                          onCheckedChange={() => toggleSubtask(sub, task.id)}
                          className="rounded-full data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <span className={cn("text-sm", sub.is_completed && "line-through text-muted-foreground")}>
                          {sub.title}
                        </span>
                      </div>
                    ))}
                    <SubtaskInput onAdd={(title) => addSubtask(task.id, title)} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Task Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "New Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="What needs to be done?" className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Add details..." className="mt-1 rounded-xl resize-none" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === "none" ? "" : v }))}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="datetime-local" value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="mt-1 rounded-xl" />
              </div>
            </div>
            <div>
              <Label>Tags (comma separated)</Label>
              <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="work, personal, urgent" className="mt-1 rounded-xl" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="starred" checked={form.is_starred}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_starred: !!v }))}
                className="rounded-full data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
              <Label htmlFor="starred">Mark as starred</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={saveTask} className="gradient-hero text-primary-foreground rounded-xl shadow-pink hover:opacity-90">
              {editingTask ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubtaskInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) { onAdd(value.trim()); setValue(""); }
  };
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-1">
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Add subtask..." className="h-8 rounded-lg text-sm" />
      <Button type="submit" size="sm" variant="outline" className="rounded-lg h-8 px-2 border-primary/30 text-primary">
        <Plus className="w-3.5 h-3.5" />
      </Button>
    </form>
  );
}
