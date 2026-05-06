import { useMemo } from "react";

type Props = {
  streak: number;
  goal: number;
};

/**
 * Realistic, smoothly-growing SVG tree.
 * progress = streak / goal, clamped 0..1
 * Stages emerge naturally from continuous interpolation.
 */
export function SavingsTree({ streak, goal }: Props) {
  const safeGoal = Math.max(1, goal);
  const p = Math.max(0, Math.min(1, streak / safeGoal));

  const stage = useMemo(() => {
    if (p <= 0) return "Dormant seed";
    if (p < 0.05) return "Seed";
    if (p < 0.2) return "Sprout";
    if (p < 0.4) return "Seedling";
    if (p < 0.65) return "Sapling";
    if (p < 0.85) return "Young tree";
    if (p < 1) return "Mature tree";
    return "Golden tree";
  }, [p]);

  // Smooth growth
  const trunkH = 20 + p * 130;
  const trunkW = 4 + p * 16;
  const canopyR = 8 + p * 88;
  const canopyOpacity = Math.min(1, 0.3 + p * 1.4);
  const canopyY = 240 - trunkH - canopyR * 0.55;

  // Always golden coin tree (matches reference photo)
  const goldDeep = "#7a5a10";
  const goldMid = "#d4a017";
  const goldBright = "#fde047";
  const goldGlow = "#fef9c3";

  const trunkColor = "#3d2818";
  const trunkColorLight = "#5b3a24";

  const branchOpacity = Math.max(0, Math.min(1, (p - 0.35) / 0.25));
  const sideCanopyOpacity = Math.max(0, Math.min(1, (p - 0.5) / 0.3));

  // Falling coin positions (deterministic)
  const coins = useMemo(() => {
    const arr: { x: number; y: number; r: number; o: number; d: number }[] = [];
    const count = Math.floor(8 + p * 28);
    for (let i = 0; i < count; i++) {
      const seed = i * 9301 + 49297;
      const rx = ((seed % 233280) / 233280);
      const ry = (((seed * 7) % 233280) / 233280);
      arr.push({
        x: 20 + rx * 200,
        y: 30 + ry * 200,
        r: 1.2 + ((i % 3) * 0.6),
        o: 0.4 + ((i % 5) / 8),
        d: (i % 7) * 0.4,
      });
    }
    return arr;
  }, [p]);

  return (
    <div className="relative w-full flex flex-col items-center select-none">
      <svg viewBox="0 0 240 260" className="w-full max-w-[320px] h-auto">
        <defs>
          <radialGradient id="bg" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor="#1a1230" />
            <stop offset="100%" stopColor="#07050d" />
          </radialGradient>
          <radialGradient id="ground" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={goldBright} stopOpacity="0.45" />
            <stop offset="100%" stopColor={goldDeep} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="leaves" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor={goldGlow} />
            <stop offset="50%" stopColor={goldBright} />
            <stop offset="100%" stopColor={goldDeep} />
          </radialGradient>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={goldBright} stopOpacity="0.45" />
            <stop offset="100%" stopColor={goldBright} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={trunkColor} />
            <stop offset="50%" stopColor={trunkColorLight} />
            <stop offset="100%" stopColor={trunkColor} />
          </linearGradient>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.8" />
          </filter>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Transparent background */}
        {/* Halo behind canopy */}
        {p > 0.05 && (
          <ellipse cx="120" cy={canopyY + 6} rx={canopyR * 1.5} ry={canopyR * 1.2} fill="url(#halo)" />
        )}
        {/* Falling/scattered coins in background */}
        {coins.map((c, i) => (
          <circle key={`bg-${i}`} cx={c.x} cy={c.y} r={c.r} fill={goldBright} opacity={c.o}
            style={{ animation: `leaf-flutter ${2.5 + c.d}s ease-in-out infinite` }} />
        ))}
        {/* Ground glow + scattered coins on floor */}
        <ellipse cx="120" cy="240" rx="100" ry="12" fill="url(#ground)" />
        {[...Array(18)].map((_, i) => {
          const x = 30 + ((i * 37) % 180);
          const y = 236 + ((i * 13) % 8);
          return <circle key={`g-${i}`} cx={x} cy={y} r={1.4} fill={goldBright} opacity={0.7} />;
        })}

        <g className="tree-sway">
          {p < 0.05 && (
            <ellipse cx="120" cy="236" rx="6" ry="4" fill={goldMid} />
          )}

          {p > 0.02 && (
            <path
              className="tree-trunk"
              d={`M ${120 - trunkW / 2} 240
                  Q ${120 - trunkW / 2 - 2} ${240 - trunkH / 2} ${120 - trunkW / 3} ${240 - trunkH}
                  L ${120 + trunkW / 3} ${240 - trunkH}
                  Q ${120 + trunkW / 2 + 2} ${240 - trunkH / 2} ${120 + trunkW / 2} 240 Z`}
              fill="url(#trunk)"
            />
          )}

          {p > 0.3 && (
            <g opacity={Math.min(0.5, p * 0.6)} stroke="#1a1008" strokeWidth="0.6" fill="none">
              <path d={`M 118 ${240 - trunkH * 0.2} Q 119 ${240 - trunkH * 0.5} 118 ${240 - trunkH * 0.8}`} />
              <path d={`M 122 ${240 - trunkH * 0.3} Q 121 ${240 - trunkH * 0.6} 122 ${240 - trunkH * 0.9}`} />
            </g>
          )}

          {branchOpacity > 0 && (
            <g opacity={branchOpacity} stroke={trunkColor} strokeWidth={Math.max(1.5, trunkW * 0.35)} strokeLinecap="round" fill="none">
              <path d={`M 120 ${240 - trunkH * 0.65} Q ${120 - canopyR * 0.5} ${240 - trunkH * 0.85} ${120 - canopyR * 0.7} ${240 - trunkH * 0.95}`} />
              <path d={`M 120 ${240 - trunkH * 0.55} Q ${120 + canopyR * 0.5} ${240 - trunkH * 0.75} ${120 + canopyR * 0.7} ${240 - trunkH * 0.9}`} />
            </g>
          )}

          {sideCanopyOpacity > 0 && (
            <g opacity={sideCanopyOpacity} filter="url(#soft)">
              <ellipse cx={120 - canopyR * 0.7} cy={240 - trunkH * 0.95} rx={canopyR * 0.55} ry={canopyR * 0.5} fill="url(#leaves)" />
              <ellipse cx={120 + canopyR * 0.7} cy={240 - trunkH * 0.9} rx={canopyR * 0.6} ry={canopyR * 0.55} fill="url(#leaves)" />
            </g>
          )}

          {p > 0.04 && (
            <g className="tree-canopy" style={{ transformBox: "fill-box", opacity: canopyOpacity }} filter="url(#soft)">
              <ellipse cx="120" cy={canopyY + 6} rx={canopyR} ry={canopyR * 0.85} fill="url(#leaves)" />
              <ellipse cx={120 - canopyR * 0.35} cy={canopyY} rx={canopyR * 0.6} ry={canopyR * 0.55} fill="url(#leaves)" opacity="0.9" />
              <ellipse cx={120 + canopyR * 0.35} cy={canopyY - 2} rx={canopyR * 0.65} ry={canopyR * 0.6} fill="url(#leaves)" opacity="0.9" />
              <ellipse cx="120" cy={canopyY - canopyR * 0.45} rx={canopyR * 0.7} ry={canopyR * 0.5} fill="url(#leaves)" opacity="0.85" />
            </g>
          )}

          {/* Sparkling coin highlights on canopy */}
          {p > 0.1 && (
            <g>
              {[...Array(Math.floor(6 + p * 18))].map((_, i) => {
                const angle = (i / Math.max(1, Math.floor(6 + p * 18))) * Math.PI * 2;
                const rr = canopyR * (0.4 + ((i % 5) / 8));
                const cx = 120 + Math.cos(angle) * rr;
                const cy = canopyY + 6 + Math.sin(angle) * rr * 0.75;
                return (
                  <circle key={`s-${i}`} cx={cx} cy={cy} r={1.6} fill={goldGlow}
                    style={{ animation: `leaf-flutter ${2 + (i % 4) * 0.4}s ease-in-out infinite` }} />
                );
              })}
            </g>
          )}

          {p >= 1 && (
            <ellipse cx="120" cy={canopyY + 6} rx={canopyR * 1.1} ry={canopyR * 0.95} fill={goldBright} opacity="0.25" filter="url(#glow)" />
          )}
        </g>
      </svg>

      <div className="text-center mt-2">
        <div className="text-sm font-semibold text-warning">{stage}</div>
        <div className="text-xs text-muted-foreground">
          {streak} day{streak === 1 ? "" : "s"} streak
        </div>
      </div>
    </div>
  );
}