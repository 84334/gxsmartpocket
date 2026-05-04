import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtRM } from "@/lib/format";
import { Receipt, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/receipts")({ component: Receipts });

function Receipts() {
  const [list, setList] = useState<any[]>([]);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Receipts</h1>
          <p className="text-sm text-muted-foreground">{list.length} scanned</p>
        </div>
        <Link to="/upload"><Button variant="hero"><Upload /> New</Button></Link>
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
            <div className="mt-3 grid sm:grid-cols-2 gap-1.5">
              {r.receipt_items?.map((it: any) => (
                <div key={it.id} className="text-sm flex items-center justify-between gap-2 px-2 py-1 rounded-md bg-muted/50">
                  <span className="truncate flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${it.is_essential ? "bg-success" : "bg-warning"}`} />
                    {it.name}
                    <span className="text-xs text-muted-foreground">· {it.category}</span>
                  </span>
                  <span>{fmtRM(Number(it.price) * Number(it.quantity))}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}