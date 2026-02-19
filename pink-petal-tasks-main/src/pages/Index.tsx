import { useAuth } from "@/contexts/AuthContext";
import AuthPage from "./AuthPage";
import AppLayout from "@/components/AppLayout";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-pink animate-pulse-pink">
            <span className="text-2xl">✓</span>
          </div>
          <p className="text-muted-foreground font-medium">Loading TaskFlow...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;
  return <AppLayout />;
}
