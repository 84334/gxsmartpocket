import { Link, useNavigate, useRouterState, Outlet } from "@tanstack/react-router";
import { Receipt, LayoutDashboard, Target, Wallet, LogOut, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/receipts", label: "Receipts", icon: Receipt },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/goals", label: "Pockets", icon: Target },
];

export function AppShell() {
  const navigate = useNavigate();
  const path = useRouterState({ select: s => s.location.pathname });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-4 gap-1 z-30">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-4 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-mint flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-bold tracking-tight">GX Smart Pocket</div>
            <div className="text-xs text-sidebar-foreground/60">AI Finance Coach</div>
          </div>
        </Link>
        {nav.map(n => {
          const active = path.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to}
              className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                active ? "bg-sidebar-accent text-sidebar-primary" : "hover:bg-sidebar-accent/60")}>
              <n.icon className="w-4 h-4" />{n.label}
            </Link>
          );
        })}
        <div className="mt-auto">
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent" onClick={signOut}>
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        <header className="md:hidden bg-sidebar text-sidebar-foreground px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold">
            <Sparkles className="w-5 h-5 text-accent" /> GX Smart Pocket
          </Link>
          <Button size="sm" variant="ghost" className="text-sidebar-foreground" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto"><Outlet /></main>
        <nav className="md:hidden sticky bottom-0 bg-sidebar text-sidebar-foreground border-t border-sidebar-border grid grid-cols-4">
          {nav.map(n => {
            const active = path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={cn("flex flex-col items-center gap-1 py-2 text-[10px]",
                active ? "text-accent" : "text-sidebar-foreground/70")}>
                <n.icon className="w-5 h-5" />{n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}