import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtRM } from "@/lib/format";
import { Plus, Trash2, Wallet, Receipt, PiggyBank, Home, Zap, Wifi, Car, Phone, CreditCard, ShoppingBag, Heart, Tv, Dumbbell, BookOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/expenses")({ component: Expenses });

const STYLES: { match: RegExp; icon: any; tint: string; fg: string }[] = [
  { match: /rent|home|house|mortgage|apartment/i, icon: Home, tint: "bg-violet-500/15", fg: "text-violet-400" },
  { match: /electric|power|energy|utility/i, icon: Zap, tint: "bg-amber-500/15", fg: "text-amber-400" },
  { match: /wifi|internet|broadband/i, icon: Wifi, tint: "bg-sky-500/15", fg: "text-sky-400" },
  { match: /car|fuel|petrol|transport|grab/i, icon: Car, tint: "bg-orange-500/15", fg: "text-orange-400" },
  { match: /phone|mobile|telco|celcom|maxis|digi/i, icon: Phone, tint: "bg-emerald-500/15", fg: "text-emerald-400" },
  { match: /loan|credit|debt|installment/i, icon: CreditCard, tint: "bg-rose-500/15", fg: "text-rose-400" },
  { match: /grocer|food|market/i, icon: ShoppingBag, tint: "bg-pink-500/15", fg: "text-pink-400" },
  { match: /insur|health|medical/i, icon: Heart, tint: "bg-red-500/15", fg: "text-red-400" },
  { match: /netflix|spotify|stream|subscription|tv/i, icon: Tv, tint: "bg-fuchsia-500/15", fg: "text-fuchsia-400" },
  { match: /gym|fitness|sport/i, icon: Dumbbell, tint: "bg-lime-500/15", fg: "text-lime-400" },
  { match: /school|education|tuition|book/i, icon: BookOpen, tint: "bg-teal-500/15", fg: "text-teal-400" },
];
const styleFor = (name: string) =>
  STYLES.find(s => s.match.test(name)) ?? { icon: Receipt, tint: "bg-muted", fg: "text-muted-foreground" };

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
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Monthly budget</h1>
        <p className="text-sm text-muted-foreground">Income minus fixed costs = what you can spend.</p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryTile icon={Wallet} label="Income" value={fmtRM(Number(income) || 0)} tint="bg-emerald-500/15" fg="text-emerald-400" />
        <SummaryTile icon={Receipt} label="Fixed" value={fmtRM(total)} tint="bg-rose-500/15" fg="text-rose-400" />
        <SummaryTile icon={PiggyBank} label="Available" value={fmtRM(remaining)} tint="bg-violet-500/15" fg={remaining < 0 ? "text-destructive" : "text-violet-300"} />
      </div>

      {/* Income */}
      <Card className="p-5 rounded-2xl border-border/60 shadow-soft">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <Label className="text-sm font-semibold">Monthly income</Label>
            <p className="text-xs text-muted-foreground">Your take-home pay each month</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Input type="number" inputMode="decimal" value={income} onChange={e => setIncome(e.target.value)} placeholder="2500" />
          <Button onClick={saveIncome}>Save</Button>
        </div>
      </Card>

      {/* Fixed expenses */}
      <Card className="p-5 rounded-2xl border-border/60 shadow-soft">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Fixed monthly expenses</h3>
            <p className="text-xs text-muted-foreground">Rent, bills, subscriptions…</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-[1fr_140px_auto] gap-2 mb-4">
          <Input placeholder="e.g. Rent" value={name} onChange={e => setName(e.target.value)} />
          <Input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
          <Button onClick={add}><Plus className="w-4 h-4" /> Add</Button>
        </div>

        {list.length ? (
          <div className="space-y-1.5">
            {list.map(x => {
              const s = styleFor(x.name);
              const Icon = s.icon;
              return (
                <div key={x.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                  <div className={`w-9 h-9 rounded-lg ${s.tint} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${s.fg}`} />
                  </div>
                  <span className="flex-1 text-sm font-medium truncate">{x.name}</span>
                  <span className="font-semibold text-sm tabular-nums">{fmtRM(x.amount)}</span>
                  <Button size="icon" variant="ghost" onClick={() => remove(x.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No fixed expenses yet.
          </div>
        )}
      </Card>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, tint, fg }: { icon: any; label: string; value: string; tint: string; fg: string }) {
  return (
    <Card className="p-3 sm:p-4 rounded-2xl border-border/60 shadow-soft min-w-0">
      <div className={`w-8 h-8 rounded-lg ${tint} flex items-center justify-center mb-2`}>
        <Icon className={`w-4 h-4 ${fg}`} />
      </div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-bold text-sm sm:text-base mt-0.5 tabular-nums truncate ${fg}`}>{value}</div>
    </Card>
  );
}