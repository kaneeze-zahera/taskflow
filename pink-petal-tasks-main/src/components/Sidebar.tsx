import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard, CheckSquare, FolderOpen, Bell, BarChart2,
  Settings, Shield, LogOut, Sun, Moon, Star, Search, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AppView = "dashboard" | "tasks" | "categories" | "reminders" | "analytics" | "settings" | "admin";

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

const navItems = [
  { id: "dashboard" as AppView, label: "Dashboard", icon: LayoutDashboard },
  { id: "tasks" as AppView, label: "My Tasks", icon: CheckSquare },
  { id: "categories" as AppView, label: "Categories", icon: FolderOpen },
  { id: "reminders" as AppView, label: "Reminders", icon: Bell },
  { id: "analytics" as AppView, label: "Analytics", icon: BarChart2 },
  { id: "settings" as AppView, label: "Settings", icon: Settings },
];

export default function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <aside className="w-72 h-full gradient-sidebar flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-sidebar-foreground/20 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-sidebar-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">TaskFlow</h1>
            <p className="text-xs text-sidebar-foreground/60">Smart To-Do Manager</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 bg-sidebar-foreground/10 rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-sidebar-foreground/60" />
          <span className="text-sm text-sidebar-foreground/60">Quick search...</span>
          <span className="ml-auto text-xs text-sidebar-foreground/40 bg-sidebar-foreground/10 px-1.5 py-0.5 rounded">⌘K</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        <p className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-2">Main</p>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
              currentView === id
                ? "bg-sidebar-foreground/20 text-sidebar-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id === "tasks" && (
              <span className="ml-auto bg-sidebar-foreground/20 text-sidebar-foreground text-xs px-2 py-0.5 rounded-full">
                ✓
              </span>
            )}
          </button>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4">
              <p className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-2">Admin</p>
              <button
                onClick={() => onNavigate("admin")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  currentView === "admin"
                    ? "bg-sidebar-foreground/20 text-sidebar-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
                )}
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </button>
            </div>
          </>
        )}
      </nav>

      {/* Bottom user area */}
      <div className="p-4 border-t border-sidebar-border/30 space-y-3">
        <div className="flex items-center gap-3 bg-sidebar-foreground/10 rounded-xl p-3">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-sidebar-foreground/20 text-sidebar-foreground text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">{displayName}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
          </div>
          {isAdmin && <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300 flex-shrink-0" />}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="flex-1 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10 rounded-xl"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="flex-1 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10 rounded-xl"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
