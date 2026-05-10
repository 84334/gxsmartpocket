import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fmtRM } from "@/lib/format";
import { Receipt, Upload, Trash2, Camera, Loader2, Pencil, Plus, Save, Users, Check, Clock, Loader2 as Spin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/receipts")({ component: Receipts });

const CATEGORIES = ["Food", "Transport", "Utilities", "Shopping", "Entertainment", "Others"] as const;

function ReceiptItemRow({ item }: { item: any }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setExpanded(v => !v)}
      className="text-left text-sm flex items-start justify-between gap-2 px-2 py-1 rounded-md bg-muted/50 min-w-0 w-full"
    >
      <span className="min-w-0 flex items-start gap-2 flex-1">
        <span className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${item.is_essential ? "bg-success" : "bg-warning"}`} />
        <span className="min-w-0 flex-1">
          <span className={expanded ? "break-words" : "truncate block"}>{item.name}</span>
          <span className="text-xs text-muted-foreground"> · {item.category}</span>
        </span>
      </span>
      <span className="shrink-0 tabular-nums">{fmtRM(Number(item.price) * Number(item.quantity))}</span>
    </button>
  );
}

function Receipts() {
  const navigate = useNavigate();
  const [list, setList] = useState<any[]>([]);
  const [splitsByReceipt, setSplitsByReceipt] = useState<Record<string, any[]>>({});
  const [splitOpenFor, setSplitOpenFor] = useState<any | null>(null);
  const [splitBusy, setSplitBusy] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editMerchant, setEditMerchant] = useState("");
  const [editPurchasedAt, setEditPurchasedAt] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editImageUrl, setEditImageUrl] = useState<string>("");

  const load = async () => {
    const { data } = await supabase.from("receipts").select("*, receipt_items(*)").order("purchased_at", { ascending: false });
    const rows = data ?? [];
    setList(rows);
    const ids = rows.map((r: any) => r.id);
    if (ids.length) {
      const { data: sp } = await (supabase as any)
        .from("split_requests")
        .select("*")
        .in("receipt_id", ids);
      const map: Record<string, any[]> = {};
      (sp ?? []).forEach((s: any) => {
        if (!s.receipt_id) return;
        (map[s.receipt_id] ||= []).push(s);
      });
      setSplitsByReceipt(map);
    } else {
      setSplitsByReceipt({});
    }
  };
  useEffect(() => { load(); }, []);

  const paySplitFromHistory = async (s: any) => {
    setSplitBusy(s.id);
    const { error } = await (supabase as any).rpc("pay_split_request", { _split_id: s.id });
    setSplitBusy(null);
    if (error) return toast.error(error.message);
    window.dispatchEvent(new CustomEvent("smartreceipt:payment-success", {
      detail: { direction: "sent", amount: Number(s.amount), name: s.to_label || "Friend", item: s.item_name },
    }));
    window.dispatchEvent(new Event("smartreceipt:balance-updated"));
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("receipts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const openEdit = async (r: any) => {
    setEditing(r);
    setEditMerchant(r.merchant ?? "");
    setEditPurchasedAt(new Date(r.purchased_at).toISOString().slice(0, 16));
    setEditItems((r.receipt_items ?? []).map((it: any) => ({
      id: it.id,
      name: it.name,
      price: Number(it.price),
      quantity: Number(it.quantity),
      category: it.category,
      is_essential: it.is_essential,
    })));
    setEditImageUrl("");
    if (r.image_url) {
      try {
        // Stored URL may be expired; extract storage path and re-sign.
        const m = r.image_url.match(/\/receipts\/([^?]+)/);
        const path = m?.[1];
        if (path) {
          const { data } = await supabase.storage.from("receipts").createSignedUrl(decodeURIComponent(path), 60 * 60);
          if (data?.signedUrl) setEditImageUrl(data.signedUrl);
          else setEditImageUrl(r.image_url);
        } else {
          setEditImageUrl(r.image_url);
        }
      } catch {
        setEditImageUrl(r.image_url);
      }
    }
  };

  const updateItem = (i: number, patch: any) =>
    setEditItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const removeItem = (i: number) => setEditItems(prev => prev.filter((_, idx) => idx !== i));
  const addItem = () => setEditItems(prev => [...prev, { name: "", price: 0, quantity: 1, category: "Others", is_essential: true }]);

  const editTotal = editItems.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0);

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error: rErr } = await supabase.from("receipts").update({
        merchant: editMerchant || "Unknown",
        total_amount: editTotal,
        purchased_at: new Date(editPurchasedAt).toISOString(),
      }).eq("id", editing.id);
      if (rErr) throw rErr;
      const { error: dErr } = await supabase.from("receipt_items").delete().eq("receipt_id", editing.id);
      if (dErr) throw dErr;
      if (editItems.length) {
        const rows = editItems.map(it => ({
          receipt_id: editing.id,
          user_id: u.user!.id,
          name: it.name || "Item",
          price: Number(it.price) || 0,
          quantity: Number(it.quantity) || 1,
          category: it.category as any,
          is_essential: !!it.is_essential,
        }));
        const { error: iErr } = await supabase.from("receipt_items").insert(rows);
        if (iErr) throw iErr;
      }
      toast.success("Updated");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update");
    } finally { setSavingEdit(false); }
  };

  const onPick = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const submitScan = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const path = `${u.user.id}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, file);
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("receipts").createSignedUrl(path, 60 * 60);
      if (!signed) throw new Error("Could not sign URL");
      const { data, error } = await supabase.functions.invoke("scan-receipt", { body: { imageUrl: signed.signedUrl } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      sessionStorage.setItem("pending_receipt", JSON.stringify({ parsed: (data as any).parsed, imageUrl: signed.signedUrl, previewUrl: preview }));
      toast.success("Review the details");
      navigate({ to: "/review" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to scan");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Receipts</h1>
          <p className="text-sm text-muted-foreground">Scan new receipts and browse your history</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Upload className="w-4 h-4" /> Scan</h2>
        <Card className="p-6 bg-gradient-card shadow-elegant max-w-2xl mx-auto">
            {preview ? (
              <label className="block">
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => onPick(e.target.files?.[0] ?? null)} />
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:bg-muted transition">
                  <img src={preview} alt="preview" className="mx-auto max-h-80 rounded-lg" />
                  <div className="text-xs text-muted-foreground mt-2">Tap to choose a different photo</div>
                </div>
              </label>
            ) : (
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => onPick(e.target.files?.[0] ?? null)}
                />
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-muted transition">
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-mint flex items-center justify-center shadow-glow">
                      <Camera className="w-6 h-6 text-primary" />
                    </div>
                    <div className="font-semibold">Add a receipt photo</div>
                    <div className="text-xs text-muted-foreground">Tap to take a photo or pick from library</div>
                  </div>
                </div>
              </label>
            )}
            <Button variant="hero" className="w-full mt-4" disabled={!file || busy} onClick={submitScan}>
              {busy ? <><Loader2 className="animate-spin" /> Reading receipt…</> : <><Upload /> Scan with AI</>}
            </Button>
          </Card>
      </section>

      <section className="space-y-3 max-w-2xl mx-auto w-full">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Receipt className="w-4 h-4" /> History ({list.length})</h2>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" /> Essential (groceries, transport, bills)</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning" /> Non-essential (snacks, treats, impulse buys)</span>
          </div>
          {!list.length && (
        <Card className="p-10 text-center bg-gradient-card shadow-elegant">
          <Receipt className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">No receipts yet.</p>
        </Card>
          )}
          <div className="grid gap-3">
        {list.map(r => (
          <Card key={r.id} className="p-4 bg-gradient-card shadow-elegant overflow-hidden min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{r.merchant ?? "Unknown"}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.purchased_at).toLocaleString("en-MY")}</div>
              </div>
              <div className="text-right">
                <div className="font-bold">{fmtRM(r.total_amount)}</div>
                <div className="flex justify-end">
                  {(splitsByReceipt[r.id]?.length ?? 0) > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setSplitOpenFor(r)} title="Split history" className="relative">
                      <Users className="w-4 h-4" />
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-1">
                        {splitsByReceipt[r.id].length}
                      </span>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
            <div className="mt-3 grid sm:grid-cols-2 gap-1.5 min-w-0">
              {r.receipt_items?.map((it: any) => (
                <ReceiptItemRow key={it.id} item={it} />
              ))}
            </div>
            {(splitsByReceipt[r.id]?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => setSplitOpenFor(r)}
                className="mt-3 w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15 hover:bg-primary/10 transition text-xs"
              >
                <Users className="w-3.5 h-3.5 text-primary" />
                <span className="flex-1">
                  Shared with {splitsByReceipt[r.id].length} {splitsByReceipt[r.id].length === 1 ? "person" : "people"}
                </span>
                <span className="text-muted-foreground">View</span>
              </button>
            )}
          </Card>
        ))}
          </div>
      </section>

      {/* Split history dialog */}
      <Dialog open={!!splitOpenFor} onOpenChange={(o) => !o && setSplitOpenFor(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Split history
            </DialogTitle>
          </DialogHeader>
          {splitOpenFor && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                {splitOpenFor.merchant ?? "Unknown"} · {new Date(splitOpenFor.purchased_at).toLocaleDateString("en-MY")}
              </div>
              {(splitsByReceipt[splitOpenFor.id] ?? []).map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${s.status === "paid" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                    {s.status === "paid" ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{s.item_name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {s.to_label ?? "Friend"} · {s.status === "paid" && s.paid_at ? `Paid ${new Date(s.paid_at).toLocaleDateString("en-MY")}` : "Pending"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold tabular-nums">{fmtRM(Number(s.amount))}</div>
                    {s.status === "pending" && s.from_user !== s.to_user_id && (
                      <span className="text-[10px] text-warning">awaiting</span>
                    )}
                  </div>
                </div>
              ))}
              {!(splitsByReceipt[splitOpenFor.id] ?? []).length && (
                <p className="text-sm text-muted-foreground text-center py-4">No splits.</p>
              )}
              <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">Total split</span>
                <span className="font-semibold">
                  {fmtRM((splitsByReceipt[splitOpenFor.id] ?? []).reduce((s: number, x: any) => s + Number(x.amount), 0))}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editImageUrl && (
              <div className="rounded-lg border border-border p-2 bg-muted/30">
                <img src={editImageUrl} alt="receipt" className="w-full h-auto rounded-md object-contain max-h-72 mx-auto" />
              </div>
            )}
            {editing && (splitsByReceipt[editing.id]?.length ?? 0) > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  Splits ({splitsByReceipt[editing.id].length})
                </div>
                {splitsByReceipt[editing.id].map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between text-xs gap-2">
                    <span className="truncate flex-1">
                      <span className="font-medium">{s.item_name}</span>
                      <span className="text-muted-foreground"> · {s.to_label ?? "Friend"}</span>
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${s.status === "paid" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                      {s.status}
                    </span>
                    <span className="font-semibold tabular-nums">{fmtRM(Number(s.amount))}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Merchant</Label>
                <Input value={editMerchant} onChange={e => setEditMerchant(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Date & time</Label>
                <Input type="datetime-local" value={editPurchasedAt} onChange={e => setEditPurchasedAt(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Items ({editItems.length})</h3>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-4 h-4" /> Add item</Button>
              </div>
              {editItems.map((it, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 sm:col-span-5 space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input value={it.name} onChange={e => updateItem(i, { name: e.target.value })} />
                    </div>
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label className="text-xs">Price</Label>
                      <Input type="number" step="0.01" value={it.price} onChange={e => updateItem(i, { price: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" step="1" min="1" value={it.quantity} onChange={e => updateItem(i, { quantity: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-4 sm:col-span-2 space-y-1">
                      <Label className="text-xs">Category</Label>
                      <Select value={it.category} onValueChange={v => updateItem(i, { category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-12 sm:col-span-1 flex justify-end">
                      <Button size="icon" variant="ghost" onClick={() => removeItem(i)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={it.is_essential} onCheckedChange={v => updateItem(i, { is_essential: v })} />
                    <span>{it.is_essential ? "Essential" : "Non-essential"}</span>
                  </label>
                </div>
              ))}
              {!editItems.length && <p className="text-sm text-muted-foreground text-center py-4">No items.</p>}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-bold">{fmtRM(editTotal)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={savingEdit}>Cancel</Button>
            <Button variant="hero" onClick={saveEdit} disabled={savingEdit}>
              <Save className="w-4 h-4" /> {savingEdit ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}