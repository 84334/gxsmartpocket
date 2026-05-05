import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { fmtRM, startOfToday, todayDate } from "@/lib/format";
import { Plus, Trash2, Target, Lock, AlertTriangle, PiggyBank } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_auth/goals")({ component: Goals });

function Goals() {
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [dailyLimit, setDailyLimit] = useState<number>(20);
  const [todaySpend, setTodaySpend] = useState<number>(0);
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const cdRef = useRef<number | null>(null);
  const autoRan = useRef(false);

  const load = async () => {
    const since = startOfToday();
    const [{ data: gs }, { data: pr }, { data: it }] = await Promise.all([
      supabase.from("savings_goals").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("daily_spending_limit").maybeSingle(),
      supabase.from("receipt_items").select("price,quantity,created_at").gte("created_at", since),
    ]);
    setList(gs ?? []);
    setDailyLimit(Number(pr?.daily_spending_limit ?? 20));
    setTodaySpend((it ?? []).reduce((s, i: any) => s + Number(i.price) * Number(i.quantity), 0));
    return { goals: gs ?? [], limit: Number(pr?.daily_spending_limit ?? 20), spend: (it ?? []).reduce((s, i: any) => s + Number(i.price) * Number(i.quantity), 0) };
  };

  useEffect(() => {
    (async () => {
      const ctx = await load();
      if (autoRan.current) return;
      autoRan.current = true;
      await autoSaveToday(ctx.goals, ctx.limit, ctx.spend);
    })();
    return () => { if (cdRef.current) window.clearInterval(cdRef.current); };
  }, []);

  // Auto-save: deduct planned daily savings from remaining daily limit
  const autoSaveToday = async (goals: any[], limit: number, spend: number) => {
    const today = todayDate();
    const pending = goals.filter(g => Number(g.daily_save_amount) > 0 && g.last_saved_on !== today);
    if (!pending.length) return;
    let remaining = Math.max(0, limit - spend);
    let savedTotal = 0;
    for (const g of pending) {
      const planned = Number(g.daily_save_amount);
      const apply = Math.min(planned, remaining);
      remaining -= apply;
      await supabase.from("savings_goals").update({
        current_amount: Number(g.current_amount) + apply,
        last_saved_on: today,
      }).eq("id", g.id);
      savedTotal += apply;
    }
    if (savedTotal > 0) toast.success(`Saved ${fmtRM(savedTotal)} toward your goals today`);
    else toast(`No room to save today — daily limit already used`);
    load();
  };

  const add = async () => {
    if (!title || !target) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("savings_goals").insert({
      user_id: u.user.id, title, target_amount: Number(target), target_date: date || null,
    });
    if (error) return toast.error(error.message);
    setTitle(""); setTarget(""); setDate(""); load();
  };

  const updateCurrent = async (id: string, v: number) => {
    await supabase.from("savings_goals").update({ current_amount: v }).eq("id", id);
    load();
  };

  const updateDaily = async (id: string, v: number) => {
    await supabase.from("savings_goals").update({ daily_save_amount: Math.max(0, v) }).eq("id", id);
    load();
  };

  const saveLimit = async (v: number) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("profiles").update({ daily_spending_limit: Math.max(0, v) }).eq("id", u.user.id);
    setDailyLimit(Math.max(0, v));
    toast.success("Daily limit updated");
  };

  const remove = async (id: string) => { await supabase.from("savings_goals").delete().eq("id", id); load(); };

  const startWithdraw = (id: string) => {
    setWithdrawId(id); setWithdrawAmt(""); setCooldown(10);
    if (cdRef.current) window.clearInterval(cdRef.current);
    cdRef.current = window.setInterval(() => {
      setCooldown(c => {
        if (c <= 1) { if (cdRef.current) window.clearInterval(cdRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const confirmWithdraw = async () => {
    if (!withdrawId) return;
    const g = list.find(x => x.id === withdrawId);
    if (!g) return;
    const v = Number(withdrawAmt);
    if (!v || v <= 0) return toast.error("Enter an amount");
    if (v > Number(g.current_amount)) return toast.error("Exceeds saved amount");
    await supabase.from("savings_goals").update({ current_amount: Number(g.current_amount) - v }).eq("id", g.id);
    toast.success(`Withdrew ${fmtRM(v)} from ${g.title}`);
    setWithdrawId(null); load();
  };

  const totalSaved = list.reduce((s, g) => s + Number(g.current_amount || 0), 0);
  const totalTarget = list.reduce((s, g) => s + Number(g.target_amount || 0), 0);
  const plannedDailySavings = list.reduce((s, g) => s + Number(g.daily_save_amount || 0), 0);
  const remainingDaily = Math.max(0, dailyLimit - todaySpend);
  const availableSpend = Math.max(0, remainingDaily - plannedDailySavings);
  const withdrawGoal = list.find(g => g.id === withdrawId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Savings goals</h1>
        <p className="text-sm text-muted-foreground">Plan a trip, a gadget, or an emergency fund.</p>
      </div>

      <Card className="p-5 bg-gradient-card shadow-elegant">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h3 className="font-semibold flex items-center gap-2"><PiggyBank className="w-4 h-4 text-primary" /> Today's budget</h3>
          <div className="flex items-center gap-2 text-sm">
            <Label className="text-xs">Daily limit (RM)</Label>
            <Input type="number" className="w-24" defaultValue={dailyLimit}
              onBlur={e => { const v = Number(e.target.value); if (v !== dailyLimit) saveLimit(v); }} />
          </div>
        </div>
        <div className="grid sm:grid-cols-4 gap-3 text-sm">
          <Stat label="Daily limit" value={fmtRM(dailyLimit)} />
          <Stat label="Spent today" value={fmtRM(todaySpend)} />
          <Stat label="Planned savings" value={fmtRM(plannedDailySavings)} accent />
          <Stat label="Available to spend" value={fmtRM(availableSpend)} />
        </div>
        {plannedDailySavings > remainingDaily && (
          <div className="text-xs mt-3 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30 text-warning-foreground">
            ⚠️ You've used most of today's limit — savings may be reduced or skipped today.
          </div>
        )}
      </Card>

      {list.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="p-4 bg-gradient-card shadow-elegant">
            <div className="text-xs text-muted-foreground">Total saved</div>
            <div className="text-2xl font-bold mt-1 text-primary">{fmtRM(totalSaved)}</div>
          </Card>
          <Card className="p-4 bg-gradient-card shadow-elegant">
            <div className="text-xs text-muted-foreground">Total target</div>
            <div className="text-2xl font-bold mt-1">{fmtRM(totalTarget)}</div>
          </Card>
          <Card className="p-4 bg-gradient-card shadow-elegant">
            <div className="text-xs text-muted-foreground">Remaining to save</div>
            <div className="text-2xl font-bold mt-1">{fmtRM(Math.max(0, totalTarget - totalSaved))}</div>
          </Card>
        </div>
      )}

      <Card className="p-5 bg-gradient-card shadow-elegant">
        <h3 className="font-semibold mb-3">New goal</h3>
        <div className="grid sm:grid-cols-[1fr_140px_160px_auto] gap-2">
          <div><Label className="text-xs">Title</Label><Input placeholder="Trip to Korea" value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div><Label className="text-xs">Target (RM)</Label><Input type="number" value={target} onChange={e => setTarget(e.target.value)} /></div>
          <div><Label className="text-xs">By date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="flex items-end"><Button variant="hero" onClick={add}><Plus /> Add</Button></div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {list.map(g => {
          const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount || 1)) * 100));
          const remaining = Number(g.target_amount) - Number(g.current_amount);
          const daysLeft = g.target_date ? Math.max(1, Math.ceil((new Date(g.target_date).getTime() - Date.now()) / (1000*60*60*24))) : null;
          const suggestedDaily = daysLeft ? Math.max(0, remaining / daysLeft) : null;
          const savedToday = g.last_saved_on === todayDate();
          return (
            <Card key={g.id} className="p-5 bg-gradient-card shadow-elegant">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-mint flex items-center justify-center"><Target className="w-4 h-4 text-primary" /></div>
                  <div>
                    <div className="font-semibold">{g.title}</div>
                    <div className="text-xs text-muted-foreground">{fmtRM(g.current_amount)} of {fmtRM(g.target_amount)}</div>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(g.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
              <Progress value={pct} className="mt-4" />
              <div className="text-xs text-muted-foreground mt-1">{pct}% complete · {fmtRM(remaining)} to go</div>
              {suggestedDaily !== null && (
                <div className="text-xs mt-2 px-3 py-2 rounded-lg bg-accent/15 text-accent-foreground">
                  💡 Suggested: save <strong>{fmtRM(suggestedDaily)}</strong>/day for {daysLeft} days.
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Daily save (RM)</Label>
                  <Input type="number" defaultValue={Number(g.daily_save_amount || 0)}
                    onBlur={e => { const v = Number(e.target.value); if (v !== Number(g.daily_save_amount)) updateDaily(g.id, v); }} />
                </div>
                <div>
                  <Label className="text-xs">Add manually</Label>
                  <Input type="number" placeholder="Press Enter" onKeyDown={e => {
                    if (e.key === "Enter") {
                      const v = Number((e.target as HTMLInputElement).value);
                      if (v > 0) updateCurrent(g.id, Number(g.current_amount) + v);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className={`flex items-center gap-1 ${savedToday ? "text-primary" : "text-muted-foreground"}`}>
                  <Lock className="w-3 h-3" /> {savedToday ? "Today's save applied" : "Pending today"}
                </span>
                <Button size="sm" variant="outline" onClick={() => startWithdraw(g.id)} disabled={Number(g.current_amount) <= 0}>
                  Withdraw
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {!list.length && (
        <Card className="p-10 text-center bg-gradient-card shadow-elegant text-muted-foreground">
          No goals yet. Create your first one above.
        </Card>
      )}

      <AlertDialog open={!!withdrawId} onOpenChange={o => !o && setWithdrawId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" /> Withdraw locked savings?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Money saved toward <strong>{withdrawGoal?.title}</strong> is locked to protect your goal.
              Withdrawing will set your progress back. A 10-second cooldown applies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Amount to withdraw (RM)</Label>
            <Input type="number" value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)}
              placeholder={`Max ${fmtRM(Number(withdrawGoal?.current_amount || 0))}`} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmWithdraw} disabled={cooldown > 0}>
              {cooldown > 0 ? `Wait ${cooldown}s` : "Confirm withdraw"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`font-semibold ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}