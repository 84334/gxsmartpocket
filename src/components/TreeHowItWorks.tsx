import { useState } from "react";
import { Info, Sparkles, CloudRain, CloudLightning, Sun } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Friendly explainer for the savings-tree gamification.
 * Uses cards + small animations to teach how the streak/weather works.
 */
export function TreeHowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="How the savings tree works"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Info className="w-4 h-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Your savings tree
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Every day you spend less than your daily limit, the leftover gets
          auto‑saved into your goals — and your tree grows. Skip a day and
          your streak resets back to zero.
        </p>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="rounded-xl border border-border/60 p-3 bg-card/40 hover:scale-[1.02] transition-transform">
            <div className="text-2xl mb-1 animate-[hop_2s_ease-in-out_infinite]">🌱</div>
            <div className="text-sm font-semibold">Save daily</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Stay under your limit → leftover money is auto‑saved.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 p-3 bg-card/40 hover:scale-[1.02] transition-transform">
            <div className="text-2xl mb-1 animate-[hop_2.4s_ease-in-out_infinite]">🌳</div>
            <div className="text-sm font-semibold">Tree grows</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Each saved day = one streak day. The longer the streak, the bigger the tree.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-400/30 p-3 bg-emerald-500/5">
            <div className="flex items-center gap-1 text-2xl mb-1">
              <Sun className="w-5 h-5 text-yellow-400 animate-pulse" />
              <span>🐰🦋</span>
            </div>
            <div className="text-sm font-semibold text-emerald-400">All goals on track</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sunshine + cute animals appear to celebrate.
            </p>
          </div>

          <div className="rounded-xl border border-blue-400/30 p-3 bg-blue-500/5">
            <div className="flex items-center gap-1 text-2xl mb-1">
              <CloudRain className="w-5 h-5 text-blue-300 animate-bounce" />
            </div>
            <div className="text-sm font-semibold text-blue-300">Missed a save</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              A rainy day rolls in — get back on track tomorrow.
            </p>
          </div>

          <div className="col-span-2 rounded-xl border border-destructive/30 p-3 bg-destructive/5">
            <div className="flex items-center gap-2 text-2xl mb-1">
              <CloudLightning className="w-5 h-5 text-destructive animate-pulse" />
              <span className="text-base">⛈️</span>
            </div>
            <div className="text-sm font-semibold text-destructive">Over your daily limit</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              A storm appears and nothing gets auto‑saved today. Tighten spending tomorrow to clear the skies.
            </p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center pt-1">
          Tip: small daily wins beat one big push 🌟
        </div>

        <style>{`
          @keyframes hop {
            0%,100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}