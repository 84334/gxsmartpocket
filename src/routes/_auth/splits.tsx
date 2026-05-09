import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtRM } from "@/lib/format";
import { ArrowDownLeft, ArrowUpRight, Check, Clock, Loader2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/splits")({ component: SplitsPage });

type Split = {
  id: string;
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

function SplitsPage() {
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
    load();
    let channel: any;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      channel = supabase
        .channel(`splits-page-${u.user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "split_requests" }, () => load())
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  const incoming = splits.filter(s => s.to_user_id === me); // I owe them
  const outgoing = splits.filter(s => s.from_user === me);  // They owe me

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
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Users className="w-6 h-6" /> Splits</h1>
        <p className="text-sm text-muted-foreground">Track shared receipts and settle up with friends.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 rounded-2xl">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">You owe</div>
          <div className="text-2xl font-bold mt-1 text-warning">{fmtRM(totalOwe)}</div>
        </Card>
        <Card className="p-4 rounded-2xl">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Owed to you</div>
          <div className="text-2xl font-bold mt-1 text-success">{fmtRM(totalOwed)}</div>
        </Card>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button onClick={() => setTab("incoming")} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab==="incoming"?"border-primary text-foreground":"border-transparent text-muted-foreground"}`}>
          You owe ({incoming.length})
        </button>
        <button onClick={() => setTab("outgoing")} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab==="outgoing"?"border-primary text-foreground":"border-transparent text-muted-foreground"}`}>
          Owed to you ({outgoing.length})
        </button>
      </div>

      <div className="space-y-2">
        {!view.length && (
          <Card className="p-8 text-center text-sm text-muted-foreground rounded-2xl">No splits here yet.</Card>
        )}
        {view.map(s => {
          const otherId = tab === "incoming" ? s.from_user : s.to_user_id;
          const otherName = otherId ? profilesById[otherId] ?? s.to_label ?? "Friend" : (s.to_label ?? "Untagged");
          return (
            <Card key={s.id} className="p-4 rounded-xl flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tab==="incoming"?"bg-warning/15 text-warning":"bg-success/15 text-success"}`}>
                {tab === "incoming" ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{s.item_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {tab === "incoming" ? `From ${otherName}` : `To ${otherName}`}
                  {s.merchant ? ` · ${s.merchant}` : ""}
                  {" · "}{new Date(s.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold tabular-nums">{fmtRM(Number(s.amount))}</div>
                <StatusPill status={s.status} />
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {tab === "incoming" && s.status === "pending" && (
                  <Button size="sm" variant="hero" className="h-8 text-xs" onClick={() => pay(s.id)} disabled={busy === s.id}>
                    {busy === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Pay
                  </Button>
                )}
                {tab === "outgoing" && s.status === "pending" && (
                  <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={() => cancel(s.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
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
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5 ${m.cls}`}>
      <Icon className="w-2.5 h-2.5" />{m.label}
    </span>
  );
}