import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtRM, startOfMonth } from "@/lib/format";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Sparkles, Upload, AlertCircle, TrendingUp, Wallet, RefreshCw, PiggyBank } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/dashboard")({ component: Dashboard });

const COLORS = ["oklch(0.22 0.06 255)","oklch(0.72 0.16 175)","oklch(0.78 0.16 75)","oklch(0.65 0.2 25)","oklch(0.55 0.18 290)","oklch(0.5 0.05 250)"];

function Dashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [income, setIncome] = useState(0);
  const [fixed, setFixed] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [score, setScore] = useState<{score: number; label: string} | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveGoalId, setSaveGoalId] = useState<string>("");
  const [saveAmount, setSaveAmount] = useState<string>("");

  const load = async () => {
    const since = startOfMonth();
    const [{ data: it }, { data: pr }, { data: fx }, { data: ins }, { data: gl }] = await Promise.all([
      supabase.from("receipt_items").select("*").gte("created_at", since),
      supabase.from("profiles").select("monthly_income").maybeSingle(),
      supabase.from("fixed_expenses").select("*"),
      supabase.from("insights").select("*").order("created_at", { ascending: false }),
      supabase.from("savings_goals").select("current_amount,target_amount,title"),
    ]);
    setItems(it ?? []);
    setIncome(Number(pr?.monthly_income ?? 0));
    setFixed(fx ?? []);
    setInsights(ins ?? []);
    setGoals(gl ?? []);
  };
  useEffect(() => { load(); }, []);

  const quickSave = async () => {
    const amt = Number(saveAmount);
    if (!saveGoalId || !amt || amt <= 0) return toast.error("Pick a goal and enter an amount");
    const goal = goals.find((g: any) => g.id === saveGoalId);
    if (!goal) return;
    const next = Number(goal.current_amount || 0) + amt;
    const { error } = await supabase.from("savings_goals").update({ current_amount: next }).eq("id", saveGoalId);
    if (error) return toast.error(error.message);
    toast.success(`Saved ${fmtRM(amt)} to ${goal.title}`);
    setSaveOpen(false); setSaveAmount(""); setSaveGoalId("");
    load();
  };

  const totalSpend = items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const fixedTotal = fixed.reduce((s, i) => s + Number(i.amount), 0);
  const wasteful = items.filter(i => !i.is_essential).reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const remaining = income - fixedTotal - totalSpend;
  const totalSavings = goals.reduce((s, g) => s + Number(g.current_amount || 0), 0);
  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount || 0), 0);

  const byCat = Object.entries(items.reduce<Record<string, number>>((acc, i) => {
    const k = i.category; acc[k] = (acc[k] ?? 0) + Number(i.price) * Number(i.quantity); return acc;
  }, {})).map(([name, value]) => ({ name, value }));

  const trend = (() => {
    const map: Record<string, number> = {};
    items.forEach(i => {
      const d = new Date(i.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
      map[d] = (map[d] ?? 0) + Number(i.price) * Number(i.quantity);
    });
    return Object.entries(map).slice(-10).map(([day, total]) => ({ day, total }));
  })();

  const generate = async () => {
    setGenLoading(true);
    const { data, error } = await supabase.functions.invoke("generate-insights");
    setGenLoading(false);
    if (error) return toast.error(error.message);
    if ((data as any)?.error) return toast.error((data as any).error);
    setScore({ score: (data as any).health_score, label: (data as any).health_label });
    toast.success("Insights refreshed");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">This month</h1>
          <p className="text-sm text-muted-foreground">Your real-time financial picture</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generate} disabled={genLoading}>
            <RefreshCw className={genLoading ? "animate-spin" : ""} /> AI Insights
          </Button>
          <Button variant="outline" onClick={() => setSaveOpen(true)} disabled={!goals.length}>
            <PiggyBank /> Quick save
          </Button>
          <Link to="/upload"><Button variant="hero"><Upload /> Scan receipt</Button></Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Total spent" value={fmtRM(totalSpend)} />
        <StatCard icon={TrendingUp} label="Money left" value={fmtRM(remaining)} accent={remaining < 0} />
        <StatCard icon={PiggyBank} label="Total savings" value={fmtRM(totalSavings)} />
        <StatCard icon={AlertCircle} label="Non-essential" value={fmtRM(wasteful)} />
      </div>

      <Card className="p-5 bg-gradient-card shadow-elegant">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h3 className="font-semibold flex items-center gap-2"><PiggyBank className="w-4 h-4 text-primary" /> Savings overview</h3>
          <div className="text-xs text-muted-foreground">
            {fmtRM(totalSavings)} saved of {fmtRM(totalTarget)} target · Health score: {score ? `${score.score} · ${score.label}` : "—"}
          </div>
        </div>
        {goals.length ? (
          <div className="grid sm:grid-cols-2 gap-2">
            {goals.map((g, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm px-3 py-2 rounded-md bg-muted/50">
                <span className="truncate">{g.title}</span>
                <span className="font-medium">{fmtRM(g.current_amount)} <span className="text-xs text-muted-foreground">/ {fmtRM(g.target_amount)}</span></span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No savings goals yet — create one in Goals to start tracking.</div>
        )}
      </Card>

      <Card className="p-5 bg-gradient-card shadow-elegant">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2"><AlertCircle className="w-4 h-4 text-warning" /> Non-essential purchases</h3>
          <span className="text-xs text-muted-foreground">{items.filter(i => !i.is_essential).length} items · {fmtRM(wasteful)}</span>
        </div>
        {items.filter(i => !i.is_essential).length ? (
          <div className="grid sm:grid-cols-2 gap-1.5">
            {items.filter(i => !i.is_essential).map(it => (
              <div key={it.id} className="text-sm flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-warning/10 border border-warning/20">
                <span className="truncate">
                  {it.name}
                  <span className="text-xs text-muted-foreground"> · {it.category}</span>
                </span>
                <span className="font-medium">{fmtRM(Number(it.price) * Number(it.quantity))}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No non-essential spending detected this month — great job!</div>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5 bg-gradient-card shadow-elegant">
          <h3 className="font-semibold mb-4">Spending by category</h3>
          {byCat.length ? (
            <div className="h-64"><ResponsiveContainer>
              <PieChart>
                <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmtRM(Number(v))} />
              </PieChart>
            </ResponsiveContainer></div>
          ) : <Empty msg="No spending yet — scan your first receipt." />}
          <div className="flex flex-wrap gap-2 mt-3">
            {byCat.map((c, i) => (
              <span key={c.name} className="inline-flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{c.name}: {fmtRM(c.value)}
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-5 bg-gradient-card shadow-elegant">
          <h3 className="font-semibold mb-4">Daily trend</h3>
          {trend.length ? (
            <div className="h-64"><ResponsiveContainer>
              <BarChart data={trend}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => fmtRM(Number(v))} />
                <Bar dataKey="total" fill="oklch(0.72 0.16 175)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer></div>
          ) : <Empty msg="Trends appear after a few receipts." />}
        </Card>
      </div>

      <Card className="p-5 bg-gradient-card shadow-elegant">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">AI insights</h3>
          {!insights.length && <span className="text-xs text-muted-foreground">Click "AI Insights" to generate</span>}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {insights.map(i => (
            <div key={i.id} className={`rounded-xl p-4 border ${
              i.severity === "warning" ? "bg-warning/10 border-warning/30" :
              i.severity === "success" ? "bg-success/10 border-success/30" :
              "bg-muted border-border"
            }`}>
              <div className="font-semibold text-sm">{i.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{i.body}</div>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Quick save to a goal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Goal</Label>
              <Select value={saveGoalId} onValueChange={setSaveGoalId}>
                <SelectTrigger><SelectValue placeholder="Choose a savings goal" /></SelectTrigger>
                <SelectContent>
                  {goals.map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>{g.title} — {fmtRM(g.current_amount)} / {fmtRM(g.target_amount)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Amount (RM)</Label>
              <Input type="number" inputMode="decimal" value={saveAmount} onChange={e => setSaveAmount(e.target.value)} placeholder="50" />
            </div>
            {remaining > 0 && (
              <div className="text-xs text-muted-foreground">
                You have {fmtRM(remaining)} left this month.
                <button type="button" className="ml-2 underline" onClick={() => setSaveAmount(String(Math.floor(remaining)))}>Save it all</button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={quickSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: any) {
  return (
    <Card className="p-4 bg-gradient-card shadow-elegant">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="w-3.5 h-3.5" /> {label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent ? "text-destructive" : ""}`}>{value}</div>
    </Card>
  );
}
function Empty({ msg }: { msg: string }) {
  return <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">{msg}</div>;
}