import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { fmtRM, startOfToday, todayDate } from "@/lib/format";
import { Plus, Trash2, AlertTriangle, Check, Flame } from "lucide-react";
import { toast } from "sonner";
import { SavingsTree } from "@/components/SavingsTree";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_auth/goals")({ component: Goals });

function Goals() {
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [dailyLimit, setDailyLimit] = useState<number>(20);
  const [todaySpend, setTodaySpend] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [longestStreak, setLongestStreak] = useState<number>(0);
  const [lastStreakDate, setLastStreakDate] = useState<string | null>(null);
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const cdRef = useRef<number | null>(null);
  const autoRan = useRef(false);

  const load = async () => {
    const since = startOfToday();
    const [{ data: gs }, { data: pr }, { data: it }] = await Promise.all([
      supabase.from("savings_goals").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("daily_spending_limit, streak_days, longest_streak, last_streak_date").maybeSingle(),
      supabase.from("receipt_items").select("price,quantity,created_at").gte("created_at", since),
    ]);
    setList(gs ?? []);
    setDailyLimit(Number(pr?.daily_spending_limit ?? 20));
    let curStreak = Number(pr?.streak_days ?? 0);
    const lastDate = (pr as any)?.last_streak_date ?? null;
    const today = todayDate();
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    const yStr = yest.toISOString().slice(0, 10);
    if (curStreak > 0 && lastDate !== today && lastDate !== yStr) {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) await supabase.from("profiles").update({ streak_days: 0 }).eq("id", u.user.id);
      curStreak = 0;
    }
    setStreak(curStreak);
    setLongestStreak(Number(pr?.longest_streak ?? 0));
    setLastStreakDate(lastDate);
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
    if (savedTotal > 0) {
      toast.success(`Saved ${fmtRM(savedTotal)} today`);
      await bumpStreakOnSave();
    }
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
    setTitle(""); setTarget(""); setDate(""); setOpenNew(false); load();
  };

  const updateCurrent = async (id: string, v: number) => {
    const prev = list.find(g => g.id === id);
    await supabase.from("savings_goals").update({ current_amount: v }).eq("id", id);
    if (prev && v > Number(prev.current_amount)) await bumpStreakOnSave();
    load();
  };

  const updateDaily = async (id: string, v: number) => {
    await supabase.from("savings_goals").update({ daily_save_amount: Math.max(0, v) }).eq("id", id);
    load();
  };

  const remove = async (id: string) => { await supabase.from("savings_goals").delete().eq("id", id); load(); };

  const bumpStreakOnSave = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const today = todayDate();
    if (lastStreakDate === today) return;
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    const yStr = yest.toISOString().slice(0, 10);
    const newStreak = lastStreakDate === yStr ? streak + 1 : 1;
    const newLongest = Math.max(longestStreak, newStreak);
    await supabase.from("profiles").update({
      streak_days: newStreak, longest_streak: newLongest, last_streak_date: today,
    }).eq("id", u.user.id);
    setStreak(newStreak); setLongestStreak(newLongest); setLastStreakDate(today);
    toast.success(`🌱 Day ${newStreak} streak!`);
  };

  const startWithdraw = (id: string) => {
    setWithdrawId(id); setWithdrawAmt(""); setCooldown(10);
    if (cdRef.current) window.clearInterval(cdRef.current);
    cdRef.current = window.setInterval(() => {
      setCooldown(c => { if (c <= 1) { if (cdRef.current) window.clearInterval(cdRef.current); return 0; } return c - 1; });
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
    toast.success(`Withdrew ${fmtRM(v)}`);
    setWithdrawId(null); load();
  };

  const totalSaved = list.reduce((s, g) => s + Number(g.current_amount || 0), 0);
  const totalTarget = list.reduce((s, g) => s + Number(g.target_amount || 0), 0);
  const overallPct = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
  const savedToday = lastStreakDate === todayDate();
  const withdrawGoal = list.find(g => g.id === withdrawId);

  return (
    <div className="space-y-5">
      {/* GX-branded hero */}
      <Card className="p-6 bg-gx-ink text-white border-0 shadow-gx overflow-hidden relative">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-gx-yellow opacity-20 blur-2xl" />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs font-medium text-gx-yellow tracking-wide uppercase">GX Save</div>
            <div className="text-3xl md:text-4xl font-bold mt-1">{fmtRM(totalSaved)}</div>
            <div className="text-sm text-white/70 mt-1">Total saved across {list.length} goal{list.length === 1 ? "" : "s"}</div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur">
            <Flame className="w-4 h-4 text-gx-yellow" />
            <span className="font-semibold">{streak}</span>
            <span className="text-white/70 text-sm">day streak</span>
          </div>
        </div>
        {totalTarget > 0 && (
          <div className="relative mt-5">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-gradient-gx transition-all" style={{ width: `${overallPct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-white/70 mt-2">
              <span>{overallPct}% of {fmtRM(totalTarget)}</span>
              <span>{savedToday ? "✓ Saved today" : "Pending today"}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Goals list */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your goals</h2>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gx-yellow text-gx-ink hover:opacity-90 font-semibold"><Plus className="w-4 h-4" /> New goal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create a new goal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">What for?</Label><Input placeholder="Trip to Korea" value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Target (RM)</Label><Input type="number" value={target} onChange={e => setTarget(e.target.value)} /></div>
                <div><Label className="text-xs">By date (optional)</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpenNew(false)}>Cancel</Button>
              <Button onClick={add} className="bg-gx-yellow text-gx-ink hover:opacity-90 font-semibold">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {list.length ? (
        <div className="grid md:grid-cols-2 gap-3">
          {list.map(g => {
            const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount || 1)) * 100));
            const remaining = Math.max(0, Number(g.target_amount) - Number(g.current_amount));
            const savedT = g.last_saved_on === todayDate();
            return (
              <Card key={g.id} className="p-4 hover:shadow-elegant transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{g.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{fmtRM(g.current_amount)} of {fmtRM(g.target_amount)}</div>
                  </div>
                  {savedT && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-1 rounded-full shrink-0">
                      <Check className="w-3 h-3" /> Today
                    </span>
                  )}
                </div>
                <Progress value={pct} className="mt-3" />
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{pct}% complete</span>
                  <span>{fmtRM(remaining)} to go</span>
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-[10px] text-muted-foreground">Auto-save / day</Label>
                    <Input type="number" className="h-8" defaultValue={Number(g.daily_save_amount || 0)}
                      onBlur={e => { const v = Number(e.target.value); if (v !== Number(g.daily_save_amount)) updateDaily(g.id, v); }} />
                  </div>
                  <div className="flex-1">
                    <Label className="text-[10px] text-muted-foreground">Add now (RM)</Label>
                    <Input type="number" className="h-8" placeholder="↵" onKeyDown={e => {
                      if (e.key === "Enter") {
                        const v = Number((e.target as HTMLInputElement).value);
                        if (v > 0) updateCurrent(g.id, Number(g.current_amount) + v);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }} />
                  </div>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => startWithdraw(g.id)} disabled={Number(g.current_amount) <= 0}>
                    Withdraw
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(g.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-10 text-center text-muted-foreground">
          No goals yet. Tap <strong>New goal</strong> to start saving.
        </Card>
      )}

      {/* Savings Tree */}
      <Card className="p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Your savings tree 🌳</h3>
            <p className="text-xs text-muted-foreground">Save every day to grow it. Skip a day, it resets.</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Best streak</div>
            <div className="font-semibold">{longestStreak} days</div>
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-b from-sky-50 to-emerald-50 dark:from-slate-800 dark:to-slate-900 p-4">
          <SavingsTree streak={streak} goal={Math.max(30, longestStreak || 30)} />
        </div>
      </Card>

      <AlertDialog open={!!withdrawId} onOpenChange={o => !o && setWithdrawId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" /> Withdraw from {withdrawGoal?.title}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will set your goal progress back. A 10-second cooldown applies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Amount (RM)</Label>
            <Input type="number" value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)}
              placeholder={`Max ${fmtRM(Number(withdrawGoal?.current_amount || 0))}`} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmWithdraw} disabled={cooldown > 0}>
              {cooldown > 0 ? `Wait ${cooldown}s` : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
