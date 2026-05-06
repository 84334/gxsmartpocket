import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { SavingsTree } from "@/components/SavingsTree";

export const Route = createFileRoute("/tree-preview")({
  component: TreePreview,
});

const ANIMALS = [
  { id: "cat", name: "Cat", roamer: false, src: "https://lottie.host/a18d0288-e456-43ee-82eb-530ce94f92d7/vwo2LRo1Vy.lottie" },
  { id: "rabbit", name: "Rabbit", roamer: true, src: "https://lottie.host/5e3ddc60-a850-4dcd-b3de-92d2717c46d0/0AKsO4nLMP.lottie" },
  { id: "bird", name: "Bird", roamer: false, src: "https://lottie.host/1949e66d-ac5a-47ad-95ba-3d2eaf21fd64/KDBMuHQAcz.lottie" },
  { id: "butterfly", name: "Butterfly", roamer: false, src: "https://lottie.host/e0411131-bee9-48ed-ad84-51088d058024/Lu3fpl1lF6.lottie" },
  { id: "fox", name: "Fox", roamer: true, src: "https://lottie.host/a089a439-4f68-48c0-9309-ae2de50ddc06/BJeo9SM9Iu.lottie" },
];

const STAGES = [
  { label: "Dormant seed", streak: 0 },
  { label: "Sprout", streak: 3 },
  { label: "Seedling", streak: 8 },
  { label: "Sapling", streak: 16 },
  { label: "Young tree", streak: 22 },
  { label: "Mature tree", streak: 27 },
  { label: "Golden tree", streak: 30 },
];
const GOAL = 30;

function TreePreview() {
  const [streak, setStreak] = useState(15);

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Tree & Animals Preview</h1>
        <p className="text-sm text-muted-foreground">Browse every animal animation and watch the tree grow.</p>
      </div>

      {/* Animals gallery */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Daily animals</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {ANIMALS.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border/60 bg-card shadow-soft p-3 flex flex-col items-center">
              <div className="relative w-full h-32 overflow-hidden rounded-xl bg-gradient-to-b from-emerald-500/10 to-transparent">
                {a.roamer ? (
                  <div className="absolute inset-0">
                    <div
                      className="absolute"
                      style={{ width: 80, height: 80, bottom: 4, left: 0, animation: "preview-roam 8s linear infinite" }}
                    >
                      <DotLottieReact src={a.src} loop autoplay backgroundColor="transparent" style={{ width: "100%", height: "100%" }} />
                    </div>
                  </div>
                ) : (
                  <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 4, width: 80, height: 80 }}>
                    <DotLottieReact src={a.src} loop autoplay backgroundColor="transparent" style={{ width: "100%", height: "100%" }} />
                  </div>
                )}
              </div>
              <div className="mt-2 text-sm font-medium">{a.name}</div>
              <div className="text-xs text-muted-foreground">{a.roamer ? "Roams left ↔ right" : "Stays under tree"}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Tree growth */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Tree growth stages</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {STAGES.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/60 bg-card shadow-soft p-3">
              <div className="rounded-xl bg-gradient-to-b from-violet-500/10 to-transparent p-2">
                <SavingsTree streak={s.streak} goal={GOAL} />
              </div>
              <div className="mt-2 text-center text-sm font-medium">{s.label}</div>
              <div className="text-center text-xs text-muted-foreground">{s.streak}/{GOAL} days</div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive slider */}
      <section className="rounded-2xl border border-border/60 bg-card shadow-soft p-4">
        <h2 className="text-lg font-semibold mb-3">Try it: drag the streak</h2>
        <div className="grid md:grid-cols-2 gap-4 items-center">
          <SavingsTree streak={streak} goal={GOAL} />
          <div>
            <input
              type="range"
              min={0}
              max={GOAL}
              value={streak}
              onChange={(e) => setStreak(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground mt-2">Streak: {streak} / {GOAL} days</div>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes preview-roam {
          0%   { left: 0;                 transform: scaleX(1); }
          49%  { left: calc(100% - 80px); transform: scaleX(1); }
          50%  { left: calc(100% - 80px); transform: scaleX(-1); }
          99%  { left: 0;                 transform: scaleX(-1); }
          100% { left: 0;                 transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}