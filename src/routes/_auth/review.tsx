import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtRM } from "@/lib/format";
import { Trash2, Plus, Save, Users } from "lucide-react";
import { toast } from "sonner";
import { applyRulebook, rulebookReason, type Rulebook } from "@/lib/rulebook";

export const Route = createFileRoute("/_auth/review")({ component: ReviewPage });

const CATEGORIES = ["Food", "Transport", "Utilities", "Shopping", "Entertainment", "Others"] as const;

type Item = {
  name: string;
  price: number;
  quantity: number;
  category: string;
  is_essential: boolean;
  split_count: number; // 1 = not shared
};

function ReviewPage() {
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState("");
  const [purchasedAt, setPurchasedAt] = useState("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [rulebook, setRulebook] = useState<Rulebook>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("primary_transport, non_negotiables")
        .maybeSingle();
      setRulebook({
        primaryTransport: data?.primary_transport ?? null,
        nonNegotiables: (data?.non_negotiables as string[] | null) ?? [],
      });
    })();
    const raw = sessionStorage.getItem("pending_receipt");
    if (!raw) {
      toast.error("No receipt to review");
      navigate({ to: "/upload" });
      return;
    }
    const { parsed, imageUrl, previewUrl } = JSON.parse(raw);
    setMerchant(parsed.merchant ?? "");
    setPurchasedAt((parsed.purchased_at ?? new Date().toISOString()).slice(0, 16));
    setImageUrl(imageUrl);
    setPreviewUrl(previewUrl ?? "");
    setItems((parsed.items ?? []).map((it: any) => ({
      name: it.name ?? "",
      price: Number(it.price) || 0,
      quantity: Number(it.quantity) || 1,
      category: it.category ?? "Others",
      is_essential: it.is_essential ?? true,
      split_count: 1,
    })));
  }, [navigate]);

  // Re-apply the rulebook whenever items or rulebook change.
  useEffect(() => {
    if (!rulebook.primaryTransport && !rulebook.nonNegotiables?.length) return;
    setItems(prev => prev.map(it => {
      const corrected = applyRulebook(it, rulebook);
      return corrected === it.is_essential ? it : { ...it, is_essential: corrected };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rulebook.primaryTransport, JSON.stringify(rulebook.nonNegotiables)]);

  const update = (i: number, patch: Partial<Item>) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const remove = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const add = () => setItems(prev => [...prev, { name: "", price: 0, quantity: 1, category: "Others", is_essential: true, split_count: 1 }]);

  const lineTotal = (it: Item) => (it.price * it.quantity) / Math.max(1, it.split_count);
  const total = items.reduce((s, it) => s + lineTotal(it), 0);

  const save = async () => {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data: receipt, error: rErr } = await supabase.from("receipts").insert({
        user_id: u.user.id,
        merchant: merchant || "Unknown",
        currency: "RM",
        total_amount: total,
        purchased_at: new Date(purchasedAt).toISOString(),
        image_url: imageUrl,
        status: "completed",
      }).select().single();
      if (rErr) throw rErr;

      if (items.length) {
        const rows = items.map(it => ({
          receipt_id: receipt.id,
          user_id: u.user!.id,
          name: it.name || "Item",
          price: Number((it.price / Math.max(1, it.split_count)).toFixed(2)),
          quantity: it.quantity,
          category: it.category as "Food" | "Transport" | "Utilities" | "Shopping" | "Entertainment" | "Others",
          is_essential: it.is_essential,
        }));
        const { error: iErr } = await supabase.from("receipt_items").insert(rows);
        if (iErr) throw iErr;
      }
      sessionStorage.removeItem("pending_receipt");
      toast.success("Saved to receipts");
      navigate({ to: "/receipts" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally { setBusy(false); }
  };

  const cancel = () => {
    sessionStorage.removeItem("pending_receipt");
    navigate({ to: "/upload" });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Review receipt</h1>
        <p className="text-sm text-muted-foreground">Confirm details before saving. Adjust amounts, categories, or split shared items.</p>
      </div>

      <div className="grid md:grid-cols-[1fr_220px] gap-6">
        <Card className="p-5 bg-gradient-card shadow-elegant space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Merchant</Label>
              <Input value={merchant} onChange={e => setMerchant(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date & time</Label>
              <Input type="datetime-local" value={purchasedAt} onChange={e => setPurchasedAt(e.target.value)} />
            </div>
          </div>
        </Card>
        {previewUrl && (
          <Card className="p-2 bg-gradient-card shadow-elegant overflow-hidden">
            <img src={previewUrl} alt="receipt" className="w-full h-auto rounded-md object-contain max-h-64" />
          </Card>
        )}
      </div>

      <Card className="p-5 bg-gradient-card shadow-elegant space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Items ({items.length})</h2>
          <Button size="sm" variant="outline" onClick={add}><Plus className="w-4 h-4" /> Add item</Button>
        </div>

        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-3">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-5 space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={it.name} onChange={e => update(i, { name: e.target.value })} />
                </div>
                <div className="col-span-4 sm:col-span-2 space-y-1">
                  <Label className="text-xs">Price</Label>
                  <Input type="number" step="0.01" value={it.price} onChange={e => update(i, { price: Number(e.target.value) })} />
                </div>
                <div className="col-span-4 sm:col-span-2 space-y-1">
                  <Label className="text-xs">Qty</Label>
                  <Input type="number" step="1" min="1" value={it.quantity} onChange={e => update(i, { quantity: Number(e.target.value) })} />
                </div>
                <div className="col-span-4 sm:col-span-2 space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={it.category} onValueChange={v => update(i, { category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-12 sm:col-span-1 flex justify-end">
                  <Button size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <Switch checked={it.is_essential} onCheckedChange={v => update(i, { is_essential: v })} />
                  <span>{it.is_essential ? "Essential" : "Non-essential"}</span>
                </label>
                {(() => {
                  const reason = rulebookReason(it, rulebook, it.is_essential);
                  return reason ? (
                    <span className="text-xs text-accent">· {reason}</span>
                  ) : null;
                })()}
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-xs">Split between</span>
                  <Input type="number" min="1" className="w-16 h-8" value={it.split_count}
                    onChange={e => update(i, { split_count: Math.max(1, Number(e.target.value) || 1) })} />
                  <span className="text-xs text-muted-foreground">person(s)</span>
                </div>
                <div className="ml-auto text-sm">
                  Your share: <span className="font-semibold">{fmtRM(lineTotal(it))}</span>
                </div>
              </div>
            </div>
          ))}
          {!items.length && <p className="text-sm text-muted-foreground text-center py-4">No items. Add one to continue.</p>}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm text-muted-foreground">Your total</span>
          <span className="text-xl font-bold">{fmtRM(total)}</span>
        </div>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={cancel} disabled={busy}>Cancel</Button>
        <Button variant="hero" onClick={save} disabled={busy || !items.length}>
          <Save className="w-4 h-4" /> {busy ? "Saving…" : "Confirm & save"}
        </Button>
      </div>
    </div>
  );
}