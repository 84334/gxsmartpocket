import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { fmtRM } from "@/lib/format";
import { Plus, Trash2, Target } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/goals")({ component: Goals });

function Goals() {
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");

  const load = async () => {
    const { data } = await supabase.from("savings_goals").select("*").order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

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
  const remove = async (id: string) => { await supabase.from("savings_goals").delete().eq("id", id); load(); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Savings goals</h1>
        <p className="text-sm text-muted-foreground">Plan a trip, a gadget, or an emergency fund.</p>
      </div>

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
          const monthsLeft = g.target_date ? Math.max(1, Math.ceil((new Date(g.target_date).getTime() - Date.now()) / (1000*60*60*24*30))) : null;
          const perMonth = monthsLeft ? Math.max(0, remaining / monthsLeft) : null;
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
              {perMonth !== null && (
                <div className="text-xs mt-2 px-3 py-2 rounded-lg bg-accent/15 text-accent-foreground">
                  💡 Save <strong>{fmtRM(perMonth)}</strong>/month for {monthsLeft} months to hit your target.
                </div>
              )}
              <div className="mt-3 flex gap-2 items-center">
                <Input type="number" placeholder="Add to savings" onKeyDown={e => {
                  if (e.key === "Enter") {
                    const v = Number((e.target as HTMLInputElement).value);
                    updateCurrent(g.id, Number(g.current_amount) + v);
                    (e.target as HTMLInputElement).value = "";
                  }
                }} />
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
    </div>
  );
}