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
        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_70%,rgba(253,224,71,0.25),transparent_60%)]" />
        <img
          src={stage.img}
          alt={stage.label}
          loading="lazy"
          className="relative z-10 w-full h-full object-contain drop-shadow-[0_0_30px_rgba(253,224,71,0.35)] tree-sway"
        />
      </div>
      <div className="text-center mt-2">
        <div className="text-sm font-semibold text-warning">{p >= 1 ? "Golden tree" : stage.label}</div>
        <div className="text-xs text-muted-foreground">
          {streak} day{streak === 1 ? "" : "s"} streak
        </div>
      </div>
    </div>
  );
}