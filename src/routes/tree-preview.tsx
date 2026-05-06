import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import stage1 from "@/assets/tree-stage-1.png";
import stage2 from "@/assets/tree-stage-2.png";
import stage3 from "@/assets/tree-stage-3.png";
import stage4 from "@/assets/tree-stage-4.png";
import stage5 from "@/assets/tree-stage-5.png";
import stage6 from "@/assets/tree-stage-6.png";

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
  { label: "Stage 1 — Dormant Seed", streak: 0, img: stage1 },
  { label: "Stage 2 — Sprout", streak: 5, img: stage2 },
  { label: "Stage 3 — Seedling", streak: 10, img: stage3 },
  { label: "Stage 4 — Sapling", streak: 17, img: stage4 },
  { label: "Stage 5 — Young Tree", streak: 23, img: stage5 },
  { label: "Stage 6 — Mature, Coin-Bearing Tree", streak: 30, img: stage6 },
];
const GOAL = 30;

function pickStage(streak: number) {
  if (streak >= 30) return STAGES[5];
  if (streak >= 23) return STAGES[4];
  if (streak >= 17) return STAGES[3];
  if (streak >= 10) return STAGES[2];
  if (streak >= 5) return STAGES[1];
  return STAGES[0];
}

function ImageTree({ streak }: { streak: number }) {
  const stage = pickStage(streak);
  return (
    <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-2xl overflow-hidden bg-gradient-to-b from-[#1a1230] to-[#07050d] flex items-end justify-center">
      {/* glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,rgba(253,224,71,0.25),transparent_60%)]" />
      <img
        src={stage.img}
        alt={stage.label}
        loading="lazy"
        width={1024}
        height={1024}
        className="relative z-10 w-[85%] h-[85%] object-contain drop-shadow-[0_0_30px_rgba(253,224,71,0.35)]"
      />
    </div>
  );
}

function TreePreview() {
  const [streak, setStreak] = useState(15);
  const [animalId, setAnimalId] = useState(ANIMALS[0].id);
  const animal = ANIMALS.find((a) => a.id === animalId)!;

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
          {STAGES.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/60 bg-card shadow-soft p-3">
              <ImageTree streak={s.streak} />
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
          <div className="relative">
            <ImageTree streak={streak} />
            {/* animal overlay */}
            <div className="pointer-events-none absolute inset-0 z-20">
              {animal.roamer ? (
                <div className="absolute left-0 right-0" style={{ bottom: "6%", height: 72 }}>
                  <div
                    className="absolute"
                    style={{ width: 72, height: 72, left: 0, animation: "preview-roam 10s linear infinite" }}
                  >
                    <DotLottieReact src={animal.src} loop autoplay backgroundColor="transparent" style={{ width: "100%", height: "100%" }} />
                  </div>
                </div>
              ) : (
                <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: "6%", width: 80, height: 80 }}>
                  <DotLottieReact src={animal.src} loop autoplay backgroundColor="transparent" style={{ width: "100%", height: "100%" }} />
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Streak</label>
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
            <div>
              <label className="text-sm font-medium block mb-2">Choose animal</label>
              <div className="flex flex-wrap gap-2">
                {ANIMALS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAnimalId(a.id)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition ${
                      animalId === a.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:bg-muted"
                    }`}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
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
