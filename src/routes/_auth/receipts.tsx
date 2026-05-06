import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtRM } from "@/lib/format";
import { Receipt, Upload, Trash2, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/receipts")({ component: Receipts });

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
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("receipts").select("*, receipt_items(*)").order("purchased_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    const { error } = await supabase.from("receipts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
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
            <label className="block">
              <input type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => onPick(e.target.files?.[0] ?? null)} />
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-muted transition">
                {preview ? (
                  <img src={preview} alt="preview" className="mx-auto max-h-80 rounded-lg" />
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-mint flex items-center justify-center shadow-glow">
                      <Camera className="w-6 h-6 text-primary" />
                    </div>
                    <div className="font-semibold">Tap to choose or take a photo</div>
                    <div className="text-xs text-muted-foreground">JPG, PNG, HEIC up to 10MB</div>
                  </div>
                )}
              </div>
            </label>
            <Button variant="hero" className="w-full mt-4" disabled={!file || busy} onClick={submitScan}>
              {busy ? <><Loader2 className="animate-spin" /> Reading receipt…</> : <><Upload /> Scan with AI</>}
            </Button>
          </Card>
      </section>

      <section className="space-y-3">
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
          <Card key={r.id} className="p-4 bg-gradient-card shadow-elegant">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{r.merchant ?? "Unknown"}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.purchased_at).toLocaleString("en-MY")}</div>
              </div>
              <div className="text-right">
                <div className="font-bold">{fmtRM(r.total_amount)}</div>
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="mt-3 grid sm:grid-cols-2 gap-1.5 min-w-0">
              {r.receipt_items?.map((it: any) => (
                <ReceiptItemRow key={it.id} item={it} />
              ))}
            </div>
          </Card>
        ))}
          </div>
      </section>
    </div>
  );
}