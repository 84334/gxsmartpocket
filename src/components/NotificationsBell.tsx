import { useEffect, useRef, useState } from "react";
import { Bell, Check, Loader2, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmtRM } from "@/lib/format";
import { toast } from "sonner";
// no router link needed

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: any;
  related_id: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationsBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    const next = (data as Notif[]) ?? [];
    // detect newly arrived split_paid notifications and surface success modal
    setItems(prev => {
      const prevIds = new Set(prev.map(p => p.id));
      next.forEach(n => {
        if (!prevIds.has(n.id) && n.type === "split_paid" && !n.read_at) {
          window.dispatchEvent(new CustomEvent("smartreceipt:payment-success", {
            detail: {
              direction: "received",
              amount: Number(n.data?.amount ?? 0),
              name: (n.title?.split(" paid ")[0]) || "Friend",
              item: n.body || undefined,
            },
          }));
        }
      });
      return next;
    });
  };

  useEffect(() => {
    let channel: any;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      userIdRef.current = u.user.id;
      await load();
      channel = supabase
        .channel(`notifs-${u.user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${u.user.id}` }, () => load())
        .on("postgres_changes", { event: "*", schema: "public", table: "split_requests" }, () => {
          window.dispatchEvent(new Event("smartreceipt:balance-updated"));
        })
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  const unread = items.filter(i => !i.read_at).length;

  const markAllRead = async () => {
    const ids = items.filter(i => !i.read_at).map(i => i.id);
    if (!ids.length) return;
    await (supabase as any).from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    load();
  };

  const pay = async (n: Notif) => {
    if (!n.related_id) return;
    setBusy(n.id);
    const { error } = await (supabase as any).rpc("pay_split_request", { _split_id: n.related_id });
    setBusy(null);
    if (error) return toast.error(error.message);
    window.dispatchEvent(new CustomEvent("smartreceipt:payment-success", {
      detail: {
        direction: "sent",
        amount: Number(n.data?.amount ?? 0),
        name: (n.title?.split(" requested ")[0]) || "Friend",
        item: n.data?.item || n.body || undefined,
      },
    }));
    await (supabase as any).from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    window.dispatchEvent(new Event("smartreceipt:balance-updated"));
    load();
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) markAllRead(); }}>
      <PopoverTrigger asChild>
        <button className="relative w-9 h-9 rounded-full hover:bg-sidebar-accent/60 flex items-center justify-center" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold text-sm">Notifications</div>
          <span className="text-[10px] text-muted-foreground">{items.length} recent</span>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {!items.length && (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground">
              <Inbox className="w-6 h-6 mx-auto mb-2 opacity-50" />
              You're all caught up
            </div>
          )}
          {items.map(n => {
            const amt = Number(n.data?.amount ?? 0);
            const isPayable = n.type === "split_request";
            return (
              <div key={n.id} className={`px-4 py-3 border-b last:border-b-0 text-sm ${!n.read_at ? "bg-primary/5" : ""}`}>
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                    n.type === "split_request" ? "bg-warning" :
                    n.type === "split_paid" ? "bg-success" :
                    "bg-muted-foreground"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground leading-tight">{n.title}</div>
                    {n.body && <div className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                    {isPayable && (
                      <Button size="sm" variant="hero" className="mt-2 h-7 text-xs" onClick={() => pay(n)} disabled={busy === n.id}>
                        {busy === n.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Pay {fmtRM(amt)}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}