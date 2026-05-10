import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Check, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { fmtRM } from "@/lib/format";

type Detail = { direction: "sent" | "received"; amount: number; name: string; item?: string };

export function PaymentSuccessModal() {
  const [detail, setDetail] = useState<Detail | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<Detail>).detail;
      if (!d) return;
      setDetail(d);
      window.setTimeout(() => setDetail(null), 3500);
    };
    window.addEventListener("smartreceipt:payment-success", handler as EventListener);
    return () => window.removeEventListener("smartreceipt:payment-success", handler as EventListener);
  }, []);

  const open = !!detail;
  const sent = detail?.direction === "sent";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setDetail(null); }}>
      <DialogContent className="max-w-xs rounded-3xl border-0 p-0 overflow-hidden bg-gradient-to-br from-emerald-500/15 via-background to-violet-500/10">
        {detail && (
          <div className="flex flex-col items-center text-center px-6 py-8 gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-emerald-500/30 blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl animate-in zoom-in-50 duration-500">
                <Check className="w-10 h-10" strokeWidth={3} />
              </div>
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium mt-2">
              {sent ? "Payment sent" : "Payment received"}
            </div>
            <div className="text-4xl font-bold tracking-tight tabular-nums">{fmtRM(detail.amount)}</div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {sent ? <ArrowUpRight className="w-4 h-4 text-warning" /> : <ArrowDownLeft className="w-4 h-4 text-success" />}
              <span>{sent ? "to" : "from"} <span className="font-semibold text-foreground">{detail.name}</span></span>
            </div>
            {detail.item && <div className="text-xs text-muted-foreground truncate max-w-full">{detail.item}</div>}
            <div className="inline-flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 font-medium bg-emerald-500/10 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Completed
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}