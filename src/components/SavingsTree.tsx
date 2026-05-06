import { useMemo } from "react";
import stage1 from "@/assets/tree-stage-1.png";
import stage2 from "@/assets/tree-stage-2.png";
import stage3 from "@/assets/tree-stage-3.png";
import stage4 from "@/assets/tree-stage-4.png";
import stage5 from "@/assets/tree-stage-5.png";
import stage6 from "@/assets/tree-stage-6.png";

type Props = {
  streak: number;
  goal: number;
};

const STAGES = [
  { label: "Dormant seed", min: 0, img: stage1 },
  { label: "Sprout", min: 0.05, img: stage2 },
  { label: "Seedling", min: 0.2, img: stage3 },
  { label: "Sapling", min: 0.4, img: stage4 },
  { label: "Young tree", min: 0.65, img: stage5 },
  { label: "Mature tree", min: 0.85, img: stage6 },
];

/**
 * Image-based golden savings tree with 6 stages mapped to streak progress.
 */
export function SavingsTree({ streak, goal }: Props) {
  const safeGoal = Math.max(1, goal);
  const p = Math.max(0, Math.min(1, streak / safeGoal));

  const stage = useMemo(() => {
    let s = STAGES[0];
    for (const st of STAGES) if (p >= st.min) s = st;
    return s;
  }, [p]);

  return (
    <div className="relative w-full flex flex-col items-center select-none">
      <div className="relative w-full max-w-[320px] aspect-square">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,rgba(253,224,71,0.25),transparent_60%)]" />
        <img
          src={stage.img}
          alt={stage.label}
          loading="lazy"
          className="relative z-10 w-full h-full object-contain drop-shadow-[0_0_30px_rgba(253,224,71,0.35)] tree-sway mix-blend-screen"
        />
        {/* Glimmering sparkles */}
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
          {SPARKLES.map((s, i) => (
            <span
              key={i}
              className="absolute block rounded-full"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                background: "radial-gradient(circle, #fef9c3 0%, #fde047 40%, transparent 70%)",
                boxShadow: "0 0 8px 2px rgba(253,224,71,0.7)",
                animation: `sparkle-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
                opacity: 0,
              }}
            />
          ))}
        </div>
      </div>
      <div className="text-center mt-2">
        <div className="text-sm font-semibold text-warning">{p >= 1 ? "Golden tree" : stage.label}</div>
        <div className="text-xs text-muted-foreground">
          {streak} day{streak === 1 ? "" : "s"} streak
        </div>
      </div>
      <style>{`
        @keyframes sparkle-twinkle {
          0%, 100% { opacity: 0; transform: scale(0.4); }
          50%      { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

const SPARKLES = [
  { x: 30, y: 35, size: 6, dur: 2.4, delay: 0 },
  { x: 65, y: 28, size: 5, dur: 2.8, delay: 0.6 },
  { x: 50, y: 50, size: 7, dur: 3.0, delay: 1.1 },
  { x: 22, y: 55, size: 4, dur: 2.2, delay: 0.3 },
  { x: 75, y: 60, size: 6, dur: 2.6, delay: 1.4 },
  { x: 42, y: 25, size: 5, dur: 3.2, delay: 0.9 },
  { x: 58, y: 70, size: 5, dur: 2.5, delay: 1.7 },
  { x: 80, y: 42, size: 4, dur: 2.9, delay: 0.5 },
  { x: 18, y: 38, size: 5, dur: 3.1, delay: 1.9 },
  { x: 38, y: 65, size: 4, dur: 2.3, delay: 1.2 },
  { x: 68, y: 48, size: 6, dur: 2.7, delay: 0.2 },
  { x: 50, y: 80, size: 5, dur: 3.3, delay: 1.5 },
];