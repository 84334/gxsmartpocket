import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, ScanLine, PieChart, Target, Brain } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-gradient-hero text-primary-foreground">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg">
          <div className="w-9 h-9 rounded-xl bg-gradient-mint flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          GX Smart Pocket
        </div>
        <div className="flex gap-2">
          <Link to="/login"><Button variant="ghost" className="text-primary-foreground hover:bg-white/10">Sign in</Button></Link>
          <Link to="/signup"><Button variant="hero">Get started</Button></Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-xs font-medium mb-6 backdrop-blur">
          Built for students & first-time earners
        </span>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
          Snap a receipt. <span className="text-accent">Master your money.</span>
        </h1>
        <p className="mt-6 text-lg text-primary-foreground/80 max-w-2xl mx-auto">
          GX Smart Pocket reads your receipts, spots wasteful spending, and coaches you toward filling your pockets — automatically.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-4 gap-4">
        {[
          { i: ScanLine, t: "AI Receipt Scan", d: "Photo in, itemised spending out — auto-categorised." },
          { i: PieChart, t: "Smart Dashboard", d: "Track every RM with charts and trends over time." },
          { i: Brain, t: "Habit Insights", d: "AI flags wasteful patterns like daily bubble tea." },
          { i: Target, t: "Pockets", d: "Plan a Korea trip — see exactly how to get there." },
        ].map((f, i) => (
          <div key={i} className="rounded-2xl bg-white/5 backdrop-blur p-5 border border-white/10">
            <f.i className="w-6 h-6 text-accent mb-3" />
            <div className="font-semibold">{f.t}</div>
            <div className="text-sm text-primary-foreground/70 mt-1">{f.d}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
