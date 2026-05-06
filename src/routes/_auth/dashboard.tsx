import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtRM, startOfMonth, startOfToday } from "@/lib/format";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Upload, RefreshCw, ArrowUpRight, Wallet, Home, Zap, Wifi, Car, Phone, CreditCard, ShoppingBag, Heart, Tv, Dumbbell, BookOpen, Receipt, Lightbulb, Sprout, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/dashboard")({ component: Dashboard });

const COLORS = ["oklch(0.7 0.18 290)","oklch(0.72 0.16 175)","oklch(0.78 0.16 75)","oklch(0.65 0.2 25)","oklch(0.6 0.18 220)","oklch(0.7 0.14 340)"];

const EXPENSE_STYLES: { match: RegExp; icon: any; tint: string; fg: string }[] = [
  { match: /rent|home|house|mortgage|apartment/i, icon: Home, tint: "bg-violet-500/10", fg: "text-violet-500" },
  { match: /electric|power|energy|utility/i, icon: Zap, tint: "bg-amber-500/10", fg: "text-amber-500" },
  { match: /wifi|internet|broadband/i, icon: Wifi, tint: "bg-sky-500/10", fg: "text-sky-500" },
  { match: /car|fuel|petrol|transport|grab/i, icon: Car, tint: "bg-orange-500/10", fg: "text-orange-500" },
  { match: /phone|mobile|telco|celcom|maxis|digi/i, icon: Phone, tint: "bg-emerald-500/10", fg: "text-emerald-500" },
  { match: /loan|credit|debt|installment/i, icon: CreditCard, tint: "bg-rose-500/10", fg: "text-rose-500" },
  { match: /grocer|food|market/i, icon: ShoppingBag, tint: "bg-pink-500/10", fg: "text-pink-500" },
  { match: /insur|health|medical/i, icon: Heart, tint: "bg-red-500/10", fg: "text-red-500" },
  { match: /netflix|spotify|stream|subscription|tv/i, icon: Tv, tint: "bg-fuchsia-500/10", fg: "text-fuchsia-500" },
  { match: /gym|fitness|sport/i, icon: Dumbbell, tint: "bg-lime-500/10", fg: "text-lime-500" },
  { match: /school|education|tuition|book/i, icon: BookOpen, tint: "bg-teal-500/10", fg: "text-teal-500" },
];
const styleFor = (name: string, category?: string) => {
  const hay = `${name} ${category ?? ""}`;
  return EXPENSE_STYLES.find(s => s.match.test(hay)) ?? { icon: Receipt, tint: "bg-muted", fg: "text-muted-foreground" };
};

function Dashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [income, setIncome] = useState(0);
  const [fixed, setFixed] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [dailyLimit, setDailyLimit] = useState(0);
  const [todaySpend, setTodaySpend] = useState(0);
  const [genLoading, setGenLoading] = useState(false);
  const [spentView, setSpentView] = useState<"total" | "split">("total");
  const isActive = useRouterState({ select: s => s.location.pathname === "/dashboard" });

  const load = async () => {
    const since = startOfMonth();
    const today = startOfToday();
    const [{ data: it }, { data: pr }, { data: fx }, { data: ins }, { data: gl }, { data: tdy }] = await Promise.all([
      supabase.from("receipt_items").select("*").gte("created_at", since),
      supabase.from("profiles").select("monthly_income, daily_spending_limit").maybeSingle(),
      supabase.from("fixed_expenses").select("*"),
      supabase.from("insights").select("*").order("created_at", { ascending: false }).limit(4),
      supabase.from("savings_goals").select("current_amount,target_amount,title"),
      supabase.from("receipt_items").select("price,quantity").gte("created_at", today),
    ]);
    setItems(it ?? []);
    setIncome(Number(pr?.monthly_income ?? 0));
    setDailyLimit(Number(pr?.daily_spending_limit ?? 0));
    setFixed(fx ?? []);
    setInsights(ins ?? []);
    setGoals(gl ?? []);
    setTodaySpend((tdy ?? []).reduce((s: number, i: any) => s + Number(i.price) * Number(i.quantity), 0));
  };
  useEffect(() => {
    if (!isActive) return;
    load();
    const refresh = () => load();
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("smartreceipt:balance-updated", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("smartreceipt:balance-updated", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [isActive]);

  const totalSpend = items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const essentialSpend = items.filter(i => i.is_essential).reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const nonEssentialSpend = totalSpend - essentialSpend;
  const fixedTotal = fixed.reduce((s, i) => s + Number(i.amount), 0);
  const totalSavings = goals.reduce((s, g) => s + Number(g.current_amount || 0), 0);
  const remaining = income - fixedTotal - totalSpend - totalSavings;
  const remainingDaily = Math.max(0, dailyLimit - todaySpend);
  const dailyPct = dailyLimit > 0 ? Math.min(100, (todaySpend / dailyLimit) * 100) : 0;

  const byCat = Object.entries(items.reduce<Record<string, number>>((acc, i) => {
    const k = i.category; acc[k] = (acc[k] ?? 0) + Number(i.price) * Number(i.quantity); return acc;
  }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

  const trend = (() => {
    const map: Record<string, number> = {};
    items.forEach(i => {
      const d = new Date(i.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
      map[d] = (map[d] ?? 0) + Number(i.price) * Number(i.quantity);
    });
    return Object.entries(map).slice(-7).map(([day, total]) => ({ day, total }));
  })();

  const generate = async () => {
    setGenLoading(true);
    const { data, error } = await supabase.functions.invoke("generate-insights");
    setGenLoading(false);
    if (error) return toast.error(error.message);
    if ((data as any)?.error) return toast.error((data as any).error);
    toast.success("Insights refreshed");
    load();
  };

  return (
    <div className="space-y-5">
      {/* GX-style hero balance */}
      <Card className="p-7 bg-gradient-gx text-white border-0 shadow-gx overflow-hidden relative rounded-3xl">
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -left-10 -bottom-20 w-60 h-60 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-[11px] font-medium text-white/60 tracking-[0.18em] uppercase">Available balance</div>
            <div className="text-4xl md:text-5xl font-semibold mt-2 tracking-tight">{fmtRM(remaining)}</div>
            <div className="text-sm text-white/60 mt-1.5">Money left this month</div>
          </div>
          <Link to="/upload">
            <Button className="bg-white/10 hover:bg-white/15 text-white border border-white/15 backdrop-blur rounded-full px-5 font-medium">
              <Upload className="w-4 h-4" /> Scan receipt
            </Button>
          </Link>
        </div>
        <div className="relative grid grid-cols-4 gap-3 mt-7 pt-5 border-t border-white/10">
          <MiniStat label="Income" value={fmtRM(income)} />
          <MiniStat label="Fixed" value={fmtRM(fixedTotal)} />
          {spentView === "total" ? (
            <MiniStat label="Spent" value={fmtRM(totalSpend)} onClick={() => setSpentView("split")} />
          ) : (
            <button onClick={() => setSpentView("total")} className="text-left focus:outline-none">
              <div className="text-[10px] text-white/60 uppercase tracking-wide">Spent</div>
              <div className="mt-0.5 space-y-0.5">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-white/70">Ess</span>
                  <span className="font-semibold text-white tabular-nums">{fmtRM(essentialSpend)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-white/70">Non</span>
                  <span className="font-semibold text-white tabular-nums">{fmtRM(nonEssentialSpend)}</span>
                </div>
              </div>
            </button>
          )}
          <MiniStat label="Saved" value={fmtRM(totalSavings)} accent />
        </div>
      </Card>

      {/* Today snapshot */}
      <Card className="p-5 rounded-2xl border-border/60 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center"><Wallet className="w-4 h-4 text-gx-violet" /></div>
            <div>
              <div className="font-semibold text-sm">Today</div>
              <div className="text-xs text-muted-foreground">{fmtRM(todaySpend)} spent · {fmtRM(remainingDaily)} left</div>
            </div>
          </div>
          <Link to="/goals" className="text-xs text-gx-violet inline-flex items-center gap-1 hover:underline">Manage <ArrowUpRight className="w-3 h-3" /></Link>
        </div>
        <div className="h-2 rounded-full bg-white/10 ring-1 ring-white/10 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${dailyPct > 80 ? "bg-destructive" : "bg-gradient-gx-accent"}`} style={{ width: `${dailyPct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{Math.round(dailyPct)}% of daily limit</span>
          <span>{fmtRM(dailyLimit)} limit</span>
        </div>
      </Card>

      {/* Charts: simpler, side-by-side */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5 rounded-2xl border-border/60 shadow-soft">
          <h3 className="font-semibold text-sm mb-3">Top categories</h3>
          {byCat.length ? (
            <>
              <div className="h-48"><ResponsiveContainer>
                <PieChart>
                  <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmtRM(Number(v))} />
                </PieChart>
              </ResponsiveContainer></div>
              <div className="space-y-1.5 mt-2">
                {byCat.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {c.name}
                    </span>
                    <span className="font-medium">{fmtRM(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <Empty msg="No spending yet" />}
        </Card>

        <Card className="p-5 rounded-2xl border-border/60 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Fixed expenses</h3>
            <Link to="/expenses" className="text-xs text-gx-violet inline-flex items-center gap-1 hover:underline">
              More <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {fixed.length ? (
            <div className="h-48 flex flex-col">
              <div className="flex-1 overflow-y-auto pr-2 space-y-1.5 scrollbar-pretty">
                {fixed.map((f) => {
                  const s = styleFor(f.name, f.category);
                  const Icon = s.icon;
                  return (
                    <div key={f.id} className="flex items-center gap-2.5 py-1">
                      <div className={`w-8 h-8 rounded-lg ${s.tint} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${s.fg}`} />
                      </div>
                      <div className="font-medium text-sm truncate flex-1">{f.name}</div>
                      <span className="font-semibold text-sm tabular-nums">{fmtRM(Number(f.amount))}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/40 text-xs">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {fmtRM(fixed.reduce((s, f) => s + Number(f.amount), 0))}
                </span>
              </div>
            </div>
          ) : <Empty msg="No fixed expenses yet" />}
        </Card>
      </div>

      {/* Goals quick view */}
      {goals.length > 0 && (
        <Card className="p-5 rounded-2xl border-border/60 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Pockets</h3>
            <Link to="/goals" className="text-xs text-gx-violet inline-flex items-center gap-1 hover:underline">View all <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          <div className="space-y-2">
            {goals.slice(0, 3).map((g, i) => {
              const pct = Number(g.target_amount) > 0 ? Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100) : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{g.title}</span>
                    <span className="text-muted-foreground">{fmtRM(g.current_amount)} / {fmtRM(g.target_amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 ring-1 ring-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-gx-accent" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Insights */}
      <Card className="p-5 rounded-2xl border-border/60 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Smart tips</h3>
          <Button size="sm" variant="ghost" onClick={generate} disabled={genLoading}>
            <RefreshCw className={`w-3.5 h-3.5 ${genLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
        {insights.length ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {insights.map((i, idx) => {
              const palettes = [
                { bar: "bg-gx-violet", Icon: Lightbulb, tint: "bg-violet-500/10 border-violet-500/30", fg: "text-violet-400" },
                { bar: "bg-emerald-500", Icon: Sprout, tint: "bg-emerald-500/10 border-emerald-500/30", fg: "text-emerald-400" },
                { bar: "bg-amber-500", Icon: Zap, tint: "bg-amber-500/10 border-amber-500/30", fg: "text-amber-400" },
                { bar: "bg-sky-500", Icon: Sparkles, tint: "bg-sky-500/10 border-sky-500/30", fg: "text-sky-400" },
              ];
              const sev =
                i.severity === "warning" ? { bar: "bg-amber-500", Icon: AlertTriangle, tint: "bg-amber-500/10 border-amber-500/30", fg: "text-amber-400" } :
                i.severity === "success" ? { bar: "bg-emerald-500", Icon: CheckCircle2, tint: "bg-emerald-500/10 border-emerald-500/30", fg: "text-emerald-400" } :
                palettes[idx % palettes.length];
              const SevIcon = sev.Icon;
              return (
                <div key={i.id} className={`relative rounded-xl p-3.5 pl-4 text-sm border ${sev.tint} overflow-hidden`}>
                  <span className={`absolute left-0 top-0 bottom-0 w-1 ${sev.bar}`} />
                  <div className="flex items-start gap-2">
                    <SevIcon className={`w-4 h-4 mt-0.5 shrink-0 ${sev.fg}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-foreground">{i.title}</div>
                      <div className="text-xs text-muted-foreground mt-1.5">{i.body}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-4">Tap refresh to get personalised tips.</div>
        )}
      </Card>
    </div>
  );
}

function MiniStat({ label, value, accent, onClick }: { label: string; value: string; accent?: boolean; onClick?: () => void }) {
  if (onClick) {
    return (
      <button onClick={onClick} className="text-left focus:outline-none hover:opacity-80 transition-opacity">
        <div className="text-[10px] text-white/60 uppercase tracking-wide">{label}</div>
        <div className={`font-semibold mt-0.5 ${accent ? "text-white" : "text-white/90"}`}>{value}</div>
      </button>
    );
  }
  return (
    <div>
      <div className="text-[10px] text-white/60 uppercase tracking-wide">{label}</div>
      <div className={`font-semibold mt-0.5 ${accent ? "text-white" : "text-white/90"}`}>{value}</div>
    </div>
  );
}
function Empty({ msg }: { msg: string }) {
  return <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">{msg}</div>;
}
