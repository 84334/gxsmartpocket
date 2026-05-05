import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, ArrowRight, ArrowLeft, Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { TRANSPORT_OPTIONS, NON_NEGOTIABLE_SUGGESTIONS } from "@/lib/rulebook";
import { fmtRM } from "@/lib/format";

export const Route = createFileRoute("/_auth/onboarding")({ component: Onboarding });

type FixedRow = { name: string; amount: string };

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // Step 1
  const [transport, setTransport] = useState<string>("");
  // Step 2
  const [nonNeg, setNonNeg] = useState<string[]>([]);
  const [customNeg, setCustomNeg] = useState("");
  // Step 3
  const [income, setIncome] = useState("");
  const [fixed, setFixed] = useState<FixedRow[]>([
    { name: "Rent", amount: "" },
    { name: "Bills (utilities, internet)", amount: "" },
    { name: "Subscriptions", amount: "" },
  ]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("onboarded_at").maybeSingle();
      if (data?.onboarded_at) navigate({ to: "/dashboard" });
    })();
  }, [navigate]);

  const toggleNeg = (v: string) =>
    setNonNeg(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const addCustomNeg = () => {
    const v = customNeg.trim();
    if (!v) return;
    if (!nonNeg.includes(v)) setNonNeg(prev => [...prev, v]);
    setCustomNeg("");
  };

  const updateFixed = (i: number, patch: Partial<FixedRow>) =>
    setFixed(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));

  const addFixed = () => setFixed(prev => [...prev, { name: "", amount: "" }]);
  const removeFixed = (i: number) => setFixed(prev => prev.filter((_, idx) => idx !== i));

  const totalFixed = fixed.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const monthlyIncome = Number(income) || 0;
  const available = monthlyIncome - totalFixed;

  const canNext =
    (step === 0 && !!transport) ||
    (step === 1 && nonNeg.length > 0) ||
    (step === 2);

  const finish = async () => {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      const { error: pErr } = await supabase.from("profiles").update({
        primary_transport: transport,
        non_negotiables: nonNeg,
        monthly_income: monthlyIncome,
        onboarded_at: new Date().toISOString(),
      }).eq("id", u.user.id);
      if (pErr) throw pErr;

      const rows = fixed
        .filter(r => r.name.trim() && Number(r.amount) > 0)
        .map(r => ({ user_id: u.user!.id, name: r.name.trim(), amount: Number(r.amount) }));
      if (rows.length) {
        const { error: fErr } = await supabase.from("fixed_expenses").insert(rows);
        if (fErr) throw fErr;
      }

      toast.success("Your spending DNA is ready!");
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally { setBusy(false); }
  };

  const totalSteps = 3;
  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-mint flex items-center justify-center shadow-glow">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Build your spending DNA</h1>
          <p className="text-sm text-muted-foreground">
            A 60-second quiz so the AI knows what's "essential" for you.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Progress value={progress} />
        <div className="text-xs text-muted-foreground">Step {step + 1} of {totalSteps}</div>
      </div>

      {step === 0 && (
        <Card className="p-6 bg-gradient-card shadow-elegant space-y-4">
          <div>
            <h2 className="font-semibold text-lg">How do you mainly get around?</h2>
            <p className="text-sm text-muted-foreground">
              Picking <span className="font-medium">LRT</span>? A RM30 Grab will be flagged as a luxury ride.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TRANSPORT_OPTIONS.map(opt => {
              const active = transport === opt;
              return (
                <button key={opt} type="button" onClick={() => setTransport(opt)}
                  className={`rounded-lg border px-3 py-3 text-sm font-medium transition text-left ${
                    active ? "border-accent bg-accent/10 text-accent-foreground" : "border-border hover:bg-muted"
                  }`}>
                  <div className="flex items-center justify-between">
                    <span>{opt}</span>
                    {active && <Check className="w-4 h-4 text-accent" />}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card className="p-6 bg-gradient-card shadow-elegant space-y-4">
          <div>
            <h2 className="font-semibold text-lg">What can't you live without?</h2>
            <p className="text-sm text-muted-foreground">
              We won't nag you about these. Pick at least one or add your own.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {NON_NEGOTIABLE_SUGGESTIONS.map(opt => {
              const active = nonNeg.includes(opt);
              return (
                <button key={opt} type="button" onClick={() => toggleNeg(opt)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    active ? "border-accent bg-accent/10 text-accent-foreground" : "border-border hover:bg-muted"
                  }`}>
                  {active && <Check className="w-3 h-3 inline mr-1" />}{opt}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Add your own (e.g. ramen)" value={customNeg}
              onChange={e => setCustomNeg(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomNeg())} />
            <Button variant="outline" onClick={addCustomNeg}><Plus className="w-4 h-4" /></Button>
          </div>
          {nonNeg.filter(n => !NON_NEGOTIABLE_SUGGESTIONS.includes(n as any)).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {nonNeg.filter(n => !NON_NEGOTIABLE_SUGGESTIONS.includes(n as any)).map(n => (
                <Badge key={n} variant="secondary" className="gap-1">
                  {n}
                  <button onClick={() => toggleNeg(n)}><X className="w-3 h-3" /></button>
                </Badge>
              ))}
            </div>
          )}
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6 bg-gradient-card shadow-elegant space-y-4">
          <div>
            <h2 className="font-semibold text-lg">Your monthly money</h2>
            <p className="text-sm text-muted-foreground">
              Income minus fixed costs = what's safe to spend.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Monthly income (RM)</Label>
            <Input type="number" inputMode="decimal" value={income}
              onChange={e => setIncome(e.target.value)} placeholder="2500" />
          </div>
          <div className="space-y-2">
            <Label>Fixed monthly expenses</Label>
            {fixed.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_auto] gap-2">
                <Input value={r.name} placeholder="Name" onChange={e => updateFixed(i, { name: e.target.value })} />
                <Input type="number" value={r.amount} placeholder="0.00"
                  onChange={e => updateFixed(i, { amount: e.target.value })} />
                <Button size="icon" variant="ghost" onClick={() => removeFixed(i)}><X className="w-4 h-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addFixed}><Plus className="w-4 h-4" /> Add expense</Button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center pt-2 border-t border-border">
            <div><div className="text-xs text-muted-foreground">Income</div><div className="font-bold">{fmtRM(monthlyIncome)}</div></div>
            <div><div className="text-xs text-muted-foreground">Fixed</div><div className="font-bold">{fmtRM(totalFixed)}</div></div>
            <div>
              <div className="text-xs text-muted-foreground">Available</div>
              <div className={`font-bold ${available < 0 ? "text-destructive" : "text-success"}`}>{fmtRM(available)}</div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 0 || busy}
          onClick={() => setStep(s => Math.max(0, s - 1))}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        {step < totalSteps - 1 ? (
          <Button variant="hero" disabled={!canNext} onClick={() => setStep(s => s + 1)}>
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="hero" disabled={busy} onClick={finish}>
            {busy ? "Saving…" : "Finish & start tracking"} <Check className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}