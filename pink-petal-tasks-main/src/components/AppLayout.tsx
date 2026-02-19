import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Sidebar, { AppView } from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import TasksView from "@/components/TasksView";
import CategoriesView from "@/components/CategoriesView";
import RemindersView from "@/components/RemindersView";
import AnalyticsView from "@/components/AnalyticsView";
import SettingsView from "@/components/SettingsView";
import AdminView from "@/components/AdminView";
import { Bell, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function AppLayout() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("is_read", false);
      setNotifCount(count || 0);
    };
    fetchNotifs();
  }, [user]);

  const renderView = () => {
    switch (currentView) {
      case "dashboard": return <Dashboard onNavigate={setCurrentView} />;
      case "tasks": return <TasksView />;
      case "categories": return <CategoriesView />;
      case "reminders": return <RemindersView />;
      case "analytics": return <AnalyticsView />;
      case "settings": return <SettingsView />;
      case "admin": return <AdminView />;
      default: return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed lg:relative z-50 h-full transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar currentView={currentView} onNavigate={(v) => { setCurrentView(v); setSidebarOpen(false); }} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 bg-card border-b border-border/50 flex items-center px-4 gap-3 flex-shrink-0">
          <Button variant="ghost" size="sm" className="lg:hidden rounded-xl" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <h1 className="text-base font-semibold text-foreground capitalize lg:hidden">
            {currentView}
          </h1>
          <div className="flex-1" />
          <div className="relative">
            <Button variant="ghost" size="sm" className="rounded-xl relative">
              <Bell className="w-4 h-4 text-muted-foreground" />
              {notifCount > 0 && (
                <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 text-xs flex items-center justify-center bg-primary text-primary-foreground rounded-full">
                  {notifCount}
                </Badge>
              )}
            </Button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar gradient-soft">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
