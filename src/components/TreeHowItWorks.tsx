import { useState } from "react";
import { Info, ChevronRight, RotateCcw } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Stacked, swipe-style explainer for the savings-tree gamification.
 * Click the top card to advance. 5 cards, each with a small animation.
 */

type Slide = {
  title: string;
  body: string;
  bg: string;
  art: JSX.Element;
};

const SLIDES: Slide[] = [
  {
    title: "Meet your savings tree",
    body: "A living tree that reflects your saving streak. The more you save, the more it grows.",
    bg: "from-emerald-500/15 to-teal-500/5",
    art: (
      <div className="text-7xl animate-[breathe_3s_ease-in-out_infinite]">🌳</div>
    ),
  },
  {
    title: "Save daily, watch it grow",
    body: "Every day you stay under your daily limit, the leftover auto-saves and your tree levels up.",
    bg: "from-lime-500/15 to-emerald-500/5",
    art: (
      <div className="relative h-24 flex items-end justify-center gap-4">
        <div className="text-3xl animate-[grow1_2.4s_ease-in-out_infinite]">🌱</div>
        <div className="text-4xl animate-[grow2_2.4s_ease-in-out_infinite]">🌿</div>
        <div className="text-5xl animate-[grow3_2.4s_ease-in-out_infinite]">🌳</div>
      </div>
    ),
  },
  {
    title: "Hit all goals → friends visit",
    body: "When every goal is on track, sunshine breaks out and little animals come to play.",
    bg: "from-yellow-400/15 to-emerald-500/5",
    art: (
      <div className="relative h-24 w-48 mx-auto">
        <div className="absolute top-0 left-2 text-3xl animate-[spin_8s_linear_infinite]">☀️</div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-5xl">🌳</div>
        <div className="absolute bottom-1 left-2 text-2xl animate-[hop_1.2s_ease-in-out_infinite]">🐰</div>
        <div className="absolute top-4 right-2 text-2xl animate-[fly_3s_ease-in-out_infinite]">🦋</div>
      </div>
    ),
  },
  {
    title: "Miss a day → bad weather",
    body: "Skip your saving day or overspend, and clouds roll in. Your streak resets — but you can rebuild.",
    bg: "from-slate-500/15 to-blue-500/5",
    art: (
      <div className="relative h-24 w-48 mx-auto">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-4xl animate-[shake_0.8s_ease-in-out_infinite]">⛈️</div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-5xl opacity-80">🌳</div>
        <div className="absolute top-10 left-6 text-sm animate-[drop_1.2s_linear_infinite]">💧</div>
        <div className="absolute top-10 right-10 text-sm animate-[drop_1.4s_linear_infinite_0.3s]">💧</div>
      </div>
    ),
  },
  {
    title: "Tips to keep growing",
    body: "Set a realistic daily limit, scan receipts daily, and start with one small goal. Small wins beat one big push.",
    bg: "from-violet-500/15 to-fuchsia-500/5",
    art: (
      <div className="text-6xl animate-[breathe_3s_ease-in-out_infinite]">🌟</div>
    ),
  },
];

export function TreeHowItWorks() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  const next = () => setI((p) => (p + 1) % SLIDES.length);
  const reset = () => setI(0);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setI(0); }}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="How the savings tree works"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Info className="w-4 h-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Your savings tree</DialogTitle>
        </DialogHeader>

        {/* Stacked cards */}
        <div className="relative h-72 select-none" onClick={next}>
          {SLIDES.map((s, idx) => {
            const offset = (idx - i + SLIDES.length) % SLIDES.length;
            const isTop = offset === 0;
            const visible = offset < 3;
            if (!visible) return null;
            return (
              <div
                key={idx}
                className={`absolute inset-0 rounded-2xl border border-border/60 bg-gradient-to-br ${s.bg} p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ease-out shadow-soft`}
                style={{
                  transform: `translateY(${offset * 10}px) scale(${1 - offset * 0.04})`,
                  zIndex: SLIDES.length - offset,
                  opacity: isTop ? 1 : 0.6,
                  pointerEvents: isTop ? "auto" : "none",
                }}
              >
                <div className="flex-1 flex items-center justify-center w-full">{s.art}</div>
                <div className="font-semibold text-base mt-2">{s.title}</div>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-[20rem]">{s.body}</p>
              </div>
            );
          })}
        </div>

        {/* Dots + actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-1.5">
            {SLIDES.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${idx === i ? "w-5 bg-primary" : "w-1.5 bg-muted"}`}
              />
            ))}
          </div>
          {i === SLIDES.length - 1 ? (
            <button
              type="button"
              onClick={reset}
              className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3 h-3" /> Restart
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="text-xs inline-flex items-center gap-1 text-primary font-medium"
            >
              Next <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <style>{`
          @keyframes breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
          @keyframes hop { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
          @keyframes fly { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-10px,-6px); } }
          @keyframes shake { 0%,100% { transform: translateX(-50%) rotate(-3deg); } 50% { transform: translateX(-50%) rotate(3deg); } }
          @keyframes drop { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(30px); opacity: 0; } }
          @keyframes grow1 { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
          @keyframes grow2 { 0%,100% { transform: scale(1.05); } 50% { transform: scale(1.18); } }
          @keyframes grow3 { 0%,100% { transform: scale(1.1); } 50% { transform: scale(1.25); } }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
