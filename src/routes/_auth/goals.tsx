import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { fmtRM, startOfToday, todayDate } from "@/lib/format";
import { Plus, Trash2, AlertTriangle, Check, Flame, Info, History, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SavingsTree } from "@/components/SavingsTree";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { TreeWeather } from "@/components/TreeWeather";
import { TreeHowItWorks } from "@/components/TreeHowItWorks";

export const Route = createFileRoute("/_auth/goals")({ component: Goals });

function Goals() {
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [dailyLimit, setDailyLimit] = useState<number>(20);
  const [limitDraft, setLimitDraft] = useState<string>("20");
  const [todaySpend, setTodaySpend] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [longestStreak, setLongestStreak] = useState<number>(0);
  const [lastStreakDate, setLastStreakDate] = useState<string | null>(null);
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [celebrateGoal, setCelebrateGoal] = useState<any | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string>("balance");
  const cdRef = useRef<number | null>(null);
  const autoRan = useRef(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [txList, setTxList] = useState<any[]>([]);
  const [todayPlan, setTodayPlan] = useState<{ limit: number; spend: number; remaining: number; required: number; allocations: Array<{ id: string; title: string; amount: number; need: number }>; status: "success" | "partial" | "skipped" } | null>(null);
  const [suggestedDaily, setSuggestedDaily] = useState<string>("");

  const load = async () => {
    const since = startOfToday();
    const [{ data: gs }, { data: pr }, { data: it }, { data: tx }] = await Promise.all([
      supabase.from("savings_goals").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("daily_spending_limit, streak_days, longest_streak, last_streak_date").maybeSingle(),
      supabase.from("receipt_items").select("price,quantity,created_at").gte("created_at", since),
      supabase.from("savings_transactions").select("*, savings_goals(title)").order("created_at", { ascending: false }).limit(80),
    ]);
    setList(gs ?? []);
    setTxList(tx ?? []);
    setDailyLimit(Number(pr?.daily_spending_limit ?? 20));
    setLimitDraft(String(Number(pr?.daily_spending_limit ?? 20)));
    let curStreak = Number(pr?.streak_days ?? 0);
    const lastDate = (pr as any)?.last_streak_date ?? null;
    const today = todayDate();
    // Streak no longer auto-resets to 0 here. Missing a day just stops the
    // counter from advancing — it's preserved until the user saves again,
    // at which point bumpStreakOnSave() decides whether to continue or restart.
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
    const pending = goals.filter(g =>
      Number(g.daily_save_amount) > 0 &&
      g.last_saved_on !== today &&
      !g.completed_at &&
      Number(g.current_amount) < Number(g.target_amount)
    );
    if (!pending.length) return;
    // Priority: nearest deadline first, then larger daily requirement
    pending.sort((a, b) => {
      const da = a.target_date ? new Date(a.target_date).getTime() : Infinity;
      const db = b.target_date ? new Date(b.target_date).getTime() : Infinity;
      if (da !== db) return da - db;
      return Number(b.daily_save_amount) - Number(a.daily_save_amount);
    });
    const remaining = Math.max(0, limit - spend);
    const totalRequired = pending.reduce((s, g) => s + Number(g.daily_save_amount), 0);
    const { data: u } = await supabase.auth.getUser();
    if (remaining <= 0) {
      // Even with nothing to allocate, log the skipped run and update the plan view.
      if (u.user) {
        await supabase.from("savings_transactions").insert({
          user_id: u.user.id, kind: "auto_save", amount: 0, daily_limit: limit,
          daily_spend: spend, remaining_budget: 0, total_required: totalRequired,
          status: "skipped", note: "No budget left after spending",
        });
      }
      setTodayPlan({ limit, spend, remaining: 0, required: totalRequired, allocations: pending.map(g => ({ id: g.id, title: g.title, amount: 0, need: Number(g.daily_save_amount) })), status: "skipped" });
      return;
    }
    const allocations = new Map<string, number>();
    if (remaining >= totalRequired) {
      pending.forEach(g => allocations.set(g.id, Number(g.daily_save_amount)));
    } else if (remaining <= 1) {
      // Too small to split — give entirely to highest-priority goal
      allocations.set(pending[0].id, remaining);
    } else {
      // Proportional split based on each goal's required daily savings, capped at need
      const weights = pending.map(g => Math.min(Number(g.daily_save_amount), remaining));
      const wSum = weights.reduce((s, w) => s + w, 0) || 1;
      let leftover = remaining;
      pending.forEach((g, i) => {
        const ideal = (weights[i] / wSum) * remaining;
        const cap = Number(g.daily_save_amount);
        const alloc = Math.min(cap, Math.round(ideal * 100) / 100);
        allocations.set(g.id, alloc);
        leftover -= alloc;
      });
      // Assign rounding remainder to highest-priority goal (cap at its requirement)
      if (leftover > 0.001) {
        const top = pending[0];
        const cur = allocations.get(top.id) || 0;
        allocations.set(top.id, Math.min(Number(top.daily_save_amount), cur + leftover));
      }
    }
    let savedTotal = 0;
    const allocList: Array<{ id: string; title: string; amount: number; need: number }> = [];
    for (const g of pending) {
      const apply = Number(allocations.get(g.id) || 0);
      allocList.push({ id: g.id, title: g.title, amount: apply, need: Number(g.daily_save_amount) });
      if (apply <= 0) continue;
      await supabase.from("savings_goals").update({
        current_amount: Number(g.current_amount) + apply,
        last_saved_on: today,
      }).eq("id", g.id);
      savedTotal += apply;
      if (u.user) {
        await supabase.from("savings_transactions").insert({
          user_id: u.user.id, pocket_id: g.id, kind: "auto_save",
          amount: apply, daily_limit: limit, daily_spend: spend,
          remaining_budget: remaining, total_required: totalRequired,
          status: apply >= Number(g.daily_save_amount) ? "success" : "partial",
        });
      }
    }
    const status: "success" | "partial" | "skipped" = savedTotal <= 0 ? "skipped" : (savedTotal >= totalRequired ? "success" : "partial");
    setTodayPlan({ limit, spend, remaining, required: totalRequired, allocations: allocList, status });
    if (savedTotal > 0) {
      toast.success(`Saved ${fmtRM(savedTotal)} today`);
      await bumpStreakOnSave();
    }
    load();
  };

  const suggestForCreate = () => {
    const tgt = Number(target);
    if (!tgt || tgt <= 0) { setSuggestedDaily(""); return; }
    let days = 30;
    if (date) {
      const dt = new Date(date).getTime();
      const today = new Date(); today.setHours(0,0,0,0);
      days = Math.max(1, Math.ceil((dt - today.getTime()) / 86400000));
    }
    const perDay = Math.max(0.5, Math.ceil((tgt / days) * 100) / 100);
    setSuggestedDaily(perDay.toFixed(2));
  };

  useEffect(() => { suggestForCreate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [target, date]);

  const add = async () => {
    if (!title || !target) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const dailyVal = Number(suggestedDaily) || 0;
    const { error } = await supabase.from("savings_goals").insert({
      user_id: u.user.id, title, target_amount: Number(target),
      target_date: date || null, daily_save_amount: dailyVal,
    });
    if (error) return toast.error(error.message);
    setTitle(""); setTarget(""); setDate(""); setSuggestedDaily(""); setOpenNew(false); load();
  };

  const updateCurrent = async (id: string, v: number) => {
    const prev = list.find(g => g.id === id);
    if (!prev) return;
    const target = Number(prev.target_amount);
    const justCompleted = !prev.completed_at && v >= target && target > 0;
    const patch: any = { current_amount: v };
    if (justCompleted) {
      patch.completed_at = new Date().toISOString();
      patch.daily_save_amount = 0;
    }
    await supabase.from("savings_goals").update(patch).eq("id", id);
    if (v > Number(prev.current_amount)) {
      const delta = v - Number(prev.current_amount);
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase.from("savings_transactions").insert({
          user_id: u.user.id, pocket_id: id, kind: "manual_save", amount: delta, status: "success",
        });
      }
      await bumpStreakOnSave();
    }
    if (justCompleted) setCelebrateGoal({ ...prev, ...patch });
    load();
  };

  const updateDaily = async (id: string, v: number) => {
    const newVal = Math.max(0, v);
    const goal = list.find(g => g.id === id);
    if (goal?.completed_at) {
      toast.error("This pocket is completed — auto-save is off.");
      return;
    }
    const othersTotal = list
      .filter(g => g.id !== id)
      .reduce((s, g) => s + Number(g.daily_save_amount || 0), 0);
    if (othersTotal + newVal > dailyLimit) {
      const remaining = Math.max(0, dailyLimit - othersTotal);
      toast.error(
        `Total auto-save (${fmtRM(othersTotal + newVal)}) exceeds your daily limit of ${fmtRM(dailyLimit)}. Max for this pocket: ${fmtRM(remaining)}.`
      );
      load();
      return;
    }
    await supabase.from("savings_goals").update({ daily_save_amount: newVal }).eq("id", id);
    load();
  };

  const requestRemove = (g: any) => {
    setDeleteGoal(g);
    setDeleteTarget("balance");
  };

  const confirmRemove = async () => {
    if (!deleteGoal) return;
    const amt = Number(deleteGoal.current_amount || 0);
    if (amt > 0 && deleteTarget !== "balance" && deleteTarget !== "discard") {
      // Transfer to another existing goal
      const target = list.find(g => g.id === deleteTarget);
      if (target) {
        await supabase.from("savings_goals").update({
          current_amount: Number(target.current_amount) + amt,
        }).eq("id", target.id);
      }
    }
    await supabase.from("savings_goals").delete().eq("id", deleteGoal.id);
    if (amt > 0) {
      if (deleteTarget === "balance") toast.success(`${fmtRM(amt)} returned to your available balance`);
      else if (deleteTarget === "discard") toast.success("Pocket deleted");
      else toast.success(`${fmtRM(amt)} moved to another pocket`);
    } else {
      toast.success("Pocket deleted");
    }
    setDeleteGoal(null);
    window.dispatchEvent(new Event("smartreceipt:balance-updated"));
    load();
  };

  const keepInTotalSaved = async () => {
    if (!celebrateGoal) return;
    const { error } = await supabase.from("savings_goals").update({ in_wallet: false }).eq("id", celebrateGoal.id);
    if (error) return toast.error(error.message);
    toast.success(`${fmtRM(celebrateGoal.current_amount)} kept in Total Saved`);
    setCelebrateGoal(null);
    window.dispatchEvent(new Event("smartreceipt:balance-updated"));
    await load();
  };

  const releaseToBalance = async () => {
    if (!celebrateGoal) return;
    const amt = Number(celebrateGoal.current_amount || 0);
    const { error } = await supabase.from("savings_goals").update({ current_amount: 0, in_wallet: true }).eq("id", celebrateGoal.id);
    if (error) return toast.error(error.message);
    toast.success(`${fmtRM(amt)} returned to your available balance`);
    setCelebrateGoal(null);
    window.dispatchEvent(new Event("smartreceipt:balance-updated"));
    await load();
  };

  const saveDailyLimit = async () => {
    const v = Number(limitDraft);
    if (!v || v <= 0) return toast.error("Enter a valid amount");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("profiles").update({ daily_spending_limit: v }).eq("id", u.user.id);
    if (error) return toast.error(error.message);
    setDailyLimit(v);
    toast.success(`Daily spend limit set to ${fmtRM(v)}`);
  };

  const bumpStreakOnSave = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const today = todayDate();
    // Always read fresh from DB — React state may be stale when called
    // immediately after load() (e.g. from autoSaveToday).
    const { data: pr } = await supabase
      .from("profiles")
      .select("streak_days, longest_streak, last_streak_date")
      .eq("id", u.user.id)
      .maybeSingle();
    const curLastDate = (pr as any)?.last_streak_date ?? null;
    const curStreak = Number(pr?.streak_days ?? 0);
    const curLongest = Number(pr?.longest_streak ?? 0);
    if (curLastDate === today) return;
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    const yStr = yest.toISOString().slice(0, 10);
    const newStreak = curLastDate === yStr ? curStreak + 1 : 1;
    const newLongest = Math.max(curLongest, newStreak);
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
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      await supabase.from("savings_transactions").insert({
        user_id: u.user.id, pocket_id: g.id, kind: "withdraw", amount: -v, status: "success",
      });
    }
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
      <Card className="p-7 bg-gradient-gx text-white border-0 shadow-gx overflow-hidden relative rounded-3xl">
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -left-10 -bottom-20 w-60 h-60 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-[11px] font-medium text-white/60 tracking-[0.18em] uppercase">Total saved in pocket</div>
            <div className="text-4xl md:text-5xl font-semibold mt-2 tracking-tight">{fmtRM(totalSaved)}</div>
            <div className="text-sm text-white/60 mt-1.5">Across {list.length} pocket{list.length === 1 ? "" : "s"}</div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/10">
            <Flame className="w-4 h-4 text-white/90" />
            <span className="font-semibold">{streak}</span>
            <span className="text-white/60 text-sm">day streak</span>
          </div>
        </div>
        {totalTarget > 0 && (
          <div className="relative mt-5">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-white/80 transition-all" style={{ width: `${overallPct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-white/60 mt-2">
              <span>{overallPct}% of {fmtRM(totalTarget)}</span>
              <span>{savedToday ? "✓ Saved today" : "Pending today"}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Daily spending limit */}
      <Card className="p-5 rounded-2xl border-border/60 shadow-soft">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Daily spending limit</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" aria-label="How it works" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 text-xs">
                  <p className="font-medium mb-1">How it works</p>
                  <p className="text-muted-foreground">
                    Set a daily spending cap. If you spend less than this today, the leftover money is saved into your pockets automatically.
                  </p>
                  <div className="mt-2 pt-2 border-t border-border/60 text-muted-foreground space-y-1">
                    <p>• Auto-save runs at <span className="text-foreground font-medium">11:59 PM</span> daily.</p>
                    <p>• Spending counter resets at <span className="text-foreground font-medium">12:00 AM</span>.</p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              You spent <span className="text-foreground font-medium">{fmtRM(todaySpend)}</span> of <span className="text-foreground font-medium">{fmtRM(dailyLimit)}</span> today.
            </p>
            <Progress value={Math.min(100, (todaySpend / Math.max(1, dailyLimit)) * 100)} className="mt-3 w-64 max-w-full" />
          </div>
          <div className="flex items-end gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Limit (RM/day)</Label>
              <Input type="number" className="h-9 w-32 bg-background border-border/80 placeholder:text-muted-foreground/60" placeholder="e.g. 30" value={limitDraft} onChange={e => setLimitDraft(e.target.value)} />
            </div>
            <Button size="sm" onClick={saveDailyLimit} className="h-9 bg-primary text-primary-foreground hover:opacity-90 rounded-full px-4">
              Save
            </Button>
          </div>
        </div>
      </Card>

      {/* Pockets list */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your pockets</h2>
        <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="rounded-full px-3" onClick={() => setHistoryOpen(true)}>
          <History className="w-4 h-4" /> History
        </Button>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gx-ink text-white hover:opacity-90 rounded-full px-4"><Plus className="w-4 h-4" /> New pocket</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create a new pocket</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">What for?</Label><Input placeholder="Trip to Korea" className="bg-background border-border/80 placeholder:text-muted-foreground/60" value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Target (RM)</Label><Input type="number" placeholder="e.g. 1000" className="bg-background border-border/80 placeholder:text-muted-foreground/60" value={target} onChange={e => setTarget(e.target.value)} /></div>
                <div><Label className="text-xs">By date (optional)</Label><Input type="date" className="bg-background border-border/80" value={date} onChange={e => setDate(e.target.value)} /></div>
              </div>
              {Number(target) > 0 && (
                <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-emerald-500/10 border border-violet-500/20 p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-gx-violet" />
                    AI suggestion
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Save about <span className="font-semibold text-foreground">RM{suggestedDaily || "0.00"}/day</span>{date ? " to hit it on time." : " to reach it in 30 days."} You can adjust below.
                  </p>
                  <div>
                    <Label className="text-xs">Daily auto-save (RM)</Label>
                    <Input type="number" step="0.01" value={suggestedDaily} onChange={e => setSuggestedDaily(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpenNew(false)}>Cancel</Button>
              <Button onClick={add} className="bg-gx-ink text-white hover:opacity-90">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {list.length ? (
        <div className="grid md:grid-cols-2 gap-3">
          {list.map(g => {
            const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount || 1)) * 100));
            const remaining = Math.max(0, Number(g.target_amount) - Number(g.current_amount));
            const savedT = g.last_saved_on === todayDate();
            const completed = !!g.completed_at;
            return (
              <Card key={g.id} className={`p-5 rounded-2xl border-border/60 shadow-soft hover:shadow-elegant transition-shadow ${completed ? "bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{g.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{fmtRM(g.current_amount)} of {fmtRM(g.target_amount)}</div>
                  </div>
                  {completed ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/15 px-2 py-1 rounded-full shrink-0">
                      🎉 Completed
                    </span>
                  ) : savedT && (
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
                {completed ? (
                  <div className="mt-3 flex items-center gap-2">
                    {!g.in_wallet && (
                      <Button size="sm" variant="outline" className="h-8" onClick={() => setCelebrateGoal(g)}>
                        Choose what's next
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto" onClick={() => requestRemove(g)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ) : (
                <div className="mt-3 flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-[10px] text-muted-foreground">Auto-save / day</Label>
                    <Input
                      id={`auto-${g.id}`}
                      key={`ds-${g.id}-${g.daily_save_amount}`}
                      type="number"
                      className="h-8"
                      defaultValue={Number(g.daily_save_amount || 0)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-[10px] text-muted-foreground">Save Extra (RM)</Label>
                    <Input id={`save-${g.id}`} type="number" className="h-8 bg-background border-border/80 placeholder:text-muted-foreground/60" placeholder="0.00" />
                  </div>
                  <Button
                    size="sm"
                    className="h-8 bg-primary text-primary-foreground hover:opacity-90 rounded-md px-3"
                    onClick={async () => {
                      const autoEl = document.getElementById(`auto-${g.id}`) as HTMLInputElement | null;
                      const saveEl = document.getElementById(`save-${g.id}`) as HTMLInputElement | null;
                      const autoVal = Number(autoEl?.value || 0);
                      const extraVal = Number(saveEl?.value || 0);
                      let changed = false;
                      if (autoVal !== Number(g.daily_save_amount)) {
                        await updateDaily(g.id, autoVal);
                        changed = true;
                      }
                      if (extraVal > 0) {
                        await updateCurrent(g.id, Number(g.current_amount) + extraVal);
                        if (saveEl) saveEl.value = "";
                        changed = true;
                      }
                      if (!changed) toast.error("Nothing to save");
                    }}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => startWithdraw(g.id)} disabled={Number(g.current_amount) <= 0}>
                    Withdraw
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => requestRemove(g)}><Trash2 className="w-4 h-4" /></Button>
                </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-10 text-center text-muted-foreground">
          No pockets yet. Tap <strong>New pocket</strong> to start saving.
        </Card>
      )}

      {/* Savings Tree */}
      <Card className="p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Your savings tree 🌳</h3>
              <TreeHowItWorks />
            </div>
            <p className="text-xs text-muted-foreground">Save every day to grow it. Skip a day, it resets.</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Best streak</div>
            <div className="font-semibold">{longestStreak} days</div>
          </div>
        </div>
        <div className="rounded-2xl p-4 relative overflow-hidden">
          <TreeWeather
            mood={
              list.length === 0
                ? "calm"
                : (() => {
                    const active = list.filter(g => !g.completed_at && Number(g.daily_save_amount) > 0);
                    if (todaySpend > dailyLimit) return "storm";
                    if (active.length === 0) return "calm";
                    const fullySaved = active.every(g => g.last_saved_on === todayDate());
                    if (fullySaved) return "happy";
                    // Anyone partially saved or nothing saved → rainy (not broken)
                    return "rain";
                  })()
            }
          />
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
              This will set your pocket progress back. A 10-second cooldown applies.
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

      <Dialog open={!!celebrateGoal} onOpenChange={o => !o && setCelebrateGoal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">🎉 Pocket filled!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4 space-y-2">
            <div className="text-5xl">🏆</div>
            <div className="font-semibold text-lg">{celebrateGoal?.title}</div>
            <div className="text-sm text-muted-foreground">
              You saved <span className="text-foreground font-semibold">{fmtRM(celebrateGoal?.current_amount || 0)}</span>. Auto-save for this pocket has stopped.
            </div>
            <div className="text-sm text-muted-foreground pt-2">What would you like to do next?</div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={releaseToBalance} className="bg-primary text-primary-foreground hover:opacity-90 w-full">
              💰 Transfer back to Available Balance
            </Button>
            <Button onClick={keepInTotalSaved} variant="outline" className="w-full">
              🏦 Keep in Total Saved
            </Button>
            <Button variant="ghost" onClick={() => setCelebrateGoal(null)} className="w-full">
              Decide later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteGoal} onOpenChange={o => !o && setDeleteGoal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" /> Delete {deleteGoal?.title}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {Number(deleteGoal?.current_amount || 0) > 0
                ? `This pocket has ${fmtRM(deleteGoal?.current_amount || 0)} saved. Where should it go?`
                : "This pocket has no savings. It will be permanently deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {Number(deleteGoal?.current_amount || 0) > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Move funds to</Label>
              <Select value={deleteTarget} onValueChange={setDeleteTarget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="balance">💰 Available balance</SelectItem>
                  {list.filter(g => g.id !== deleteGoal?.id && !g.completed_at).map(g => (
                    <SelectItem key={g.id} value={g.id}>🎯 {g.title}</SelectItem>
                  ))}
                  <SelectItem value="discard">🗑️ Discard funds</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>Delete pocket</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
