import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fmtRM } from "@/lib/format";
import { ArrowDownLeft, ArrowUpRight, Check, Clock, Loader2, Trash2, Users, Receipt as ReceiptIcon } from "lucide-react";
import { toast } from "sonner";

type Split = {
  id: string;
  receipt_id: string | null;
  item_name: string;
  merchant: string | null;
  from_user: string;
  to_user_id: string | null;
  to_label: string | null;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
};

export function SplitsDialog({
  open,
  onOpenChange,
  onOpenReceipt,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onOpenReceipt?: (receiptId: string) => void;
}) {
  const [me, setMe] = useState<string | null>(null);
  const [splits, setSplits] = useState<Split[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"incoming" | "outgoing">("incoming");

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setMe(u.user.id);
    const { data } = await (supabase as any).from("split_requests").select("*").order("created_at", { ascending: false });
    const list = (data as Split[]) ?? [];
    setSplits(list);
    const ids = Array.from(new Set(list.flatMap(s => [s.from_user, s.to_user_id].filter(Boolean) as string[])));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p.display_name ?? "Someone"; });
      setProfilesById(map);
    }
  };

  useEffect(() => {
    if (!open) return;
    load();
    let channel: any;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      channel = supabase
        .channel(`splits-dialog-${u.user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "split_requests" }, () => load())
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [open]);

  const incoming = splits.filter(s => s.to_user_id === me);
  const outgoing = splits.filter(s => s.from_user === me);

  const pay = async (id: string) => {
    setBusy(id);
    const { error } = await (supabase as any).rpc("pay_split_request", { _split_id: id });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Paid!");
    window.dispatchEvent(new Event("smartreceipt:balance-updated"));
    load();
  };

  const cancel = async (id: string) => {
    const { error } = await (supabase as any).from("split_requests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    load();
  };

  const totalOwe = incoming.filter(s => s.status === "pending").reduce((s, x) => s + Number(x.amount), 0);
  const totalOwed = outgoing.filter(s => s.status === "pending" && s.to_user_id).reduce((s, x) => s + Number(x.amount), 0);

  const view = tab === "incoming" ? incoming : outgoing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5 text-primary" /> Splits
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <Card className="p-3 rounded-xl">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">You owe</div>
            <div className="text-lg font-bold mt-0.5 text-warning tabular-nums">{fmtRM(totalOwe)}</div>
          </Card>
          <Card className="p-3 rounded-xl">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Owed to you</div>
            <div className="text-lg font-bold mt-0.5 text-success tabular-nums">{fmtRM(totalOwed)}</div>
          </Card>
        </div>

        <div className="flex gap-1 border-b border-border mt-3">
          <button
            onClick={() => setTab("incoming")}
            className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 -mb-px transition ${tab === "incoming" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            I owe ({incoming.length})
          </button>
          <button
            onClick={() => setTab("outgoing")}
            className={`flex-1 px-2 py-2 text-xs font-medium border-b-2 -mb-px transition ${tab === "outgoing" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            Owed to me ({outgoing.length})
          </button>
        </div>

        <div className="space-y-2 mt-3">
          {!view.length && (
            <Card className="p-6 text-center text-xs text-muted-foreground rounded-xl">No splits here yet.</Card>
          )}
          {view.map(s => {
            const otherId = tab === "incoming" ? s.from_user : s.to_user_id;
            const otherName = otherId ? profilesById[otherId] ?? s.to_label ?? "Friend" : (s.to_label ?? "Untagged");
            return (
              <Card key={s.id} className="p-3 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    if (s.receipt_id && onOpenReceipt) {
                      onOpenReceipt(s.receipt_id);
                      onOpenChange(false);
                    }
                  }}
                  className="w-full flex items-center gap-2.5 text-left"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tab === "incoming" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`}>
                    {tab === "incoming" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{s.item_name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {tab === "incoming" ? `From ${otherName}` : `To ${otherName}`}
                      {s.merchant ? ` · ${s.merchant}` : ""}
                    </div>
                    <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                      {new Date(s.created_at).toLocaleDateString("en-MY")}
                      {s.receipt_id && (
                        <span className="inline-flex items-center gap-0.5 ml-1.5 text-primary">
                          <ReceiptIcon className="w-2.5 h-2.5" /> view
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold tabular-nums text-sm">{fmtRM(Number(s.amount))}</div>
                    <StatusPill status={s.status} />
                  </div>
                </button>
                {tab === "incoming" && s.status === "pending" && (
                  <Button size="sm" variant="hero" className="w-full h-8 text-xs mt-2" onClick={() => pay(s.id)} disabled={busy === s.id}>
                    {busy === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Pay {fmtRM(Number(s.amount))}
                  </Button>
                )}
                {tab === "outgoing" && s.status === "pending" && (
                  <Button size="sm" variant="ghost" className="w-full h-7 text-[11px] mt-2 text-destructive hover:text-destructive" onClick={() => cancel(s.id)}>
                    <Trash2 className="w-3 h-3" /> Cancel request
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    pending: { label: "Pending", cls: "bg-warning/15 text-warning", Icon: Clock },
    paid: { label: "Paid", cls: "bg-success/15 text-success", Icon: Check },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground", Icon: Clock };
  const Icon = m.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium mt-0.5 ${m.cls}`}>
      <Icon className="w-2.5 h-2.5" />{m.label}
    </span>
  );
}
