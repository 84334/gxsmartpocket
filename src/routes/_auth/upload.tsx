import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Camera } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/upload")({ component: UploadPage });

function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onPick = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async () => {
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Scan a receipt</h1>
        <p className="text-sm text-muted-foreground">Upload a photo — AI extracts items, prices and categories.</p>
      </div>
      <Card className="p-6 bg-gradient-card shadow-elegant">
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
        <Button variant="hero" className="w-full mt-4" disabled={!file || busy} onClick={submit}>
          {busy ? <><Loader2 className="animate-spin" /> Reading receipt…</> : <><Upload /> Scan with AI</>}
        </Button>
      </Card>
    </div>
  );
}