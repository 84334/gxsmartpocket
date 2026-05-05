import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtRM } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/expenses")({ component: Expenses });

function Expenses() {
  const [income, setIncome] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [list, setList] = useState<any[]>([]);

  const load = async () => {
    const { data: pr } = await supabase.from("profiles").select("monthly_income").maybeSingle();
    setIncome(pr?.monthly_income?.toString() ?? "");
    const { data: fx } = await supabase.from("fixed_expenses").select("*").order("created_at");
    setList(fx ?? []);
  };
  useEffect(() => { load(); }, []);

  const saveIncome = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("profiles").update({ monthly_income: Number(income) || 0 }).eq("id", u.user.id);
    if (error) toast.error(error.message); else toast.success("Income saved");
  };

  const add = async () => {
    if (!name || !amount) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("fixed_expenses").insert({ user_id: u.user.id, name, amount: Number(amount) });
    if (error) return toast.error(error.message);
    setName(""); setAmount(""); load();
  };

  const remove = async (id: string) => {
    await supabase.from("fixed_expenses").delete().eq("id", id);
    load();
  };

  const total = list.reduce((s, x) => s + Number(x.amount), 0);
  const remaining = (Number(income) || 0) - total;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Monthly budget</h1>
        <p className="text-sm text-muted-foreground">Income minus fixed costs = what you can spend.</p>
      </div>

      <Card className="p-5 bg-gradient-card shadow-elegant space-y-3">
        <Label>Monthly income (RM)</Label>
        <div className="flex gap-2">
          <Input type="number" inputMode="decimal" value={income} onChange={e => setIncome(e.target.value)} placeholder="2500" />
          <Button variant="navy" onClick={saveIncome}>Save</Button>
        </div>
      </Card>

      <Card className="p-5 bg-gradient-card shadow-elegant">
        <h3 className="font-semibold mb-3">Fixed monthly expenses</h3>
        <div className="grid sm:grid-cols-[1fr_140px_auto] gap-2 mb-4">
          <Input placeholder="e.g. Rent" value={name} onChange={e => setName(e.target.value)} />
          <Input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
          <Button variant="hero" onClick={add}><Plus /> Add</Button>
        </div>
        <div className="divide-y divide-border">
          {list.map(x => (
            <div key={x.id} className="flex items-center justify-between py-2">
              <span>{x.name}</span>
              <div className="flex items-center gap-3">
                <span className="font-medium">{fmtRM(x.amount)}</span>
                <Button size="icon" variant="ghost" onClick={() => remove(x.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
          {!list.length && <p className="text-sm text-muted-foreground py-3">No fixed expenses yet.</p>}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div><div className="text-xs text-muted-foreground">Income</div><div className="font-bold">{fmtRM(Number(income))}</div></div>
          <div><div className="text-xs text-muted-foreground">Fixed</div><div className="font-bold">{fmtRM(total)}</div></div>
          <div><div className="text-xs text-muted-foreground">Available</div><div className={`font-bold ${remaining < 0 ? "text-destructive" : "text-success"}`}>{fmtRM(remaining)}</div></div>
        </div>
      </Card>
    </div>
  );
}