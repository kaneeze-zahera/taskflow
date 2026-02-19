import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Folder } from "lucide-react";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

const PRESET_COLORS = [
  "#f9a8d4", "#fda4af", "#fdba74", "#fde047",
  "#86efac", "#67e8f9", "#a5b4fc", "#d8b4fe",
];

export default function CategoriesView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", color: "#f9a8d4", icon: "folder" });
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  const fetchCategories = async () => {
    if (!user) return;
    const { data } = await supabase.from("categories").select("*").eq("user_id", user.id).order("created_at");
    setCategories(data || []);

    // Fetch task counts per category
    const counts: Record<string, number> = {};
    for (const cat of data || []) {
      const { count } = await supabase.from("tasks").select("id", { count: "exact", head: true })
        .eq("category_id", cat.id).eq("user_id", user.id);
      counts[cat.id] = count || 0;
    }
    setTaskCounts(counts);
  };

  useEffect(() => { fetchCategories(); }, [user]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", color: "#f9a8d4", icon: "folder" });
    setShowDialog(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, color: cat.color, icon: cat.icon || "folder" });
    setShowDialog(true);
  };

  const save = async () => {
    if (!form.name.trim() || !user) return;
    if (editing) {
      await supabase.from("categories").update({ name: form.name.trim(), color: form.color, icon: form.icon }).eq("id", editing.id);
      toast({ title: "Category updated!" });
    } else {
      await supabase.from("categories").insert([{ name: form.name.trim(), color: form.color, icon: form.icon, user_id: user.id }]);
      toast({ title: "Category created! 🎉" });
    }
    setShowDialog(false);
    fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("categories").delete().eq("id", id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Category deleted" });
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Categories</h2>
          <p className="text-muted-foreground text-sm">Organize tasks by category</p>
        </div>
        <Button onClick={openCreate} className="gradient-hero text-primary-foreground rounded-xl shadow-pink hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" /> New Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-3">📁</div>
          <p className="text-lg font-semibold text-foreground mb-1">No categories yet</p>
          <p className="text-muted-foreground text-sm mb-4">Create categories to organize your tasks</p>
          <Button onClick={openCreate} variant="outline" className="rounded-xl border-primary/30 text-primary">
            <Plus className="w-4 h-4 mr-2" /> Create Category
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-card border border-border/70 rounded-2xl p-5 shadow-sm hover:shadow-card transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: cat.color + "30", border: `2px solid ${cat.color}40` }}
                >
                  <Folder className="w-5 h-5" style={{ color: cat.color }} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => deleteCategory(cat.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
              <p className="font-semibold text-foreground mb-1">{cat.name}</p>
              <p className="text-sm text-muted-foreground">{taskCounts[cat.id] || 0} tasks</p>
              <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ backgroundColor: cat.color, width: "60%" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Category name" className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setForm((f) => ({ ...f, color }))}
                    className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      outline: form.color === color ? `3px solid ${color}` : "none",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
                <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="w-8 h-8 rounded-full cursor-pointer border-0 bg-transparent p-0" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={save} className="gradient-hero text-primary-foreground rounded-xl shadow-pink hover:opacity-90">
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
