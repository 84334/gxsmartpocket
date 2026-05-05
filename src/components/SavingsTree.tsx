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

  const isGolden = p >= 1;

  // Smooth growth interpolations
  const trunkH = 20 + p * 130;          // 20 → 150
  const trunkW = 4 + p * 16;             // 4 → 20
  const canopyR = 8 + p * 78;            // 8 → 86
  const canopyOpacity = Math.min(1, 0.25 + p * 1.4);
  const canopyY = 240 - trunkH - canopyR * 0.55;

  // Leaf vibrancy: slightly desaturated when small / regressing
  const greenA = isGolden ? "#facc15" : `hsl(${110 + p * 18}, ${45 + p * 25}%, ${28 + p * 10}%)`;
  const greenB = isGolden ? "#fde047" : `hsl(${95 + p * 20}, ${55 + p * 25}%, ${38 + p * 12}%)`;
  const greenC = isGolden ? "#fef08a" : `hsl(${80 + p * 25}, ${60 + p * 25}%, ${48 + p * 12}%)`;

  const trunkColor = isGolden ? "#a16207" : "#5b3a1e";
  const trunkColorLight = isGolden ? "#ca8a04" : "#7a4f29";

  // Branch reveal thresholds (smooth)
  const branchOpacity = Math.max(0, Math.min(1, (p - 0.35) / 0.25));
  const sideCanopyOpacity = Math.max(0, Math.min(1, (p - 0.5) / 0.3));

  return (
    <div className="relative w-full flex flex-col items-center select-none">
      <svg viewBox="0 0 240 260" className={`w-full max-w-[320px] h-auto ${isGolden ? "tree-golden" : ""}`}>
        <defs>
          <radialGradient id="ground" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b6f47" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#8b6f47" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="leaves" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor={greenC} />
            <stop offset="55%" stopColor={greenB} />
            <stop offset="100%" stopColor={greenA} />
          </radialGradient>
          <linearGradient id="trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={trunkColor} />
            <stop offset="50%" stopColor={trunkColorLight} />
            <stop offset="100%" stopColor={trunkColor} />
          </linearGradient>
          <radialGradient id="sky" cx="50%" cy="0%" r="100%">
            <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#dbeafe" stopOpacity="0" />
          </radialGradient>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
        </defs>

        {/* Sky wash */}
        <rect x="0" y="0" width="240" height="240" fill="url(#sky)" />
        {/* Ground */}
        <ellipse cx="120" cy="240" rx="90" ry="10" fill="url(#ground)" />
        <ellipse cx="120" cy="242" rx="55" ry="4" fill="#5b3a1e" opacity="0.35" />

        <g className="tree-sway">
          {/* Seed/germination dot — visible when very small */}
          {p < 0.05 && (
            <ellipse cx="120" cy="236" rx="6" ry="4" fill="#3f2a14" />
          )}

          {/* Trunk */}
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

          {/* Bark texture lines */}
          {p > 0.3 && (
            <g opacity={Math.min(0.5, p * 0.6)} stroke="#3a2412" strokeWidth="0.6" fill="none">
              <path d={`M 118 ${240 - trunkH * 0.2} Q 119 ${240 - trunkH * 0.5} 118 ${240 - trunkH * 0.8}`} />
              <path d={`M 122 ${240 - trunkH * 0.3} Q 121 ${240 - trunkH * 0.6} 122 ${240 - trunkH * 0.9}`} />
            </g>
          )}

          {/* Side branches */}
          {branchOpacity > 0 && (
            <g opacity={branchOpacity} stroke={trunkColor} strokeWidth={Math.max(1.5, trunkW * 0.35)} strokeLinecap="round" fill="none">
              <path d={`M 120 ${240 - trunkH * 0.65} Q ${120 - canopyR * 0.5} ${240 - trunkH * 0.85} ${120 - canopyR * 0.7} ${240 - trunkH * 0.95}`} />
              <path d={`M 120 ${240 - trunkH * 0.55} Q ${120 + canopyR * 0.5} ${240 - trunkH * 0.75} ${120 + canopyR * 0.7} ${240 - trunkH * 0.9}`} />
            </g>
          )}

          {/* Side canopy clusters for fullness */}
          {sideCanopyOpacity > 0 && (
            <g opacity={sideCanopyOpacity} filter="url(#soft)">
              <ellipse cx={120 - canopyR * 0.7} cy={240 - trunkH * 0.95} rx={canopyR * 0.55} ry={canopyR * 0.5} fill="url(#leaves)" />
              <ellipse cx={120 + canopyR * 0.7} cy={240 - trunkH * 0.9} rx={canopyR * 0.6} ry={canopyR * 0.55} fill="url(#leaves)" />
            </g>
          )}

          {/* Main canopy */}
          {p > 0.04 && (
            <g className="tree-canopy" style={{ transformBox: "fill-box", opacity: canopyOpacity }} filter="url(#soft)">
              <ellipse cx="120" cy={canopyY + 6} rx={canopyR} ry={canopyR * 0.85} fill="url(#leaves)" />
              <ellipse cx={120 - canopyR * 0.35} cy={canopyY} rx={canopyR * 0.6} ry={canopyR * 0.55} fill="url(#leaves)" opacity="0.9" />
              <ellipse cx={120 + canopyR * 0.35} cy={canopyY - 2} rx={canopyR * 0.65} ry={canopyR * 0.6} fill="url(#leaves)" opacity="0.9" />
              <ellipse cx="120" cy={canopyY - canopyR * 0.45} rx={canopyR * 0.7} ry={canopyR * 0.5} fill="url(#leaves)" opacity="0.85" />
            </g>
          )}

          {/* Tiny fluttering leaves at very early sprout */}
          {p > 0.02 && p < 0.2 && (
            <g style={{ animation: "leaf-flutter 3s ease-in-out infinite" }}>
              <ellipse cx="115" cy={240 - trunkH - 2} rx="4" ry="2.5" fill={greenB} transform="rotate(-25 115 232)" />
              <ellipse cx="125" cy={240 - trunkH - 4} rx="4" ry="2.5" fill={greenC} transform="rotate(20 125 230)" />
            </g>
          )}

          {/* Golden sparkles */}
          {isGolden && (
            <g>
              {[...Array(6)].map((_, i) => {
                const angle = (i / 6) * Math.PI * 2;
                const r = canopyR + 6;
                const cx = 120 + Math.cos(angle) * r;
                const cy = canopyY + Math.sin(angle) * r * 0.7;
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r="1.8"
                    fill="#fef9c3"
                    style={{ animation: `leaf-flutter ${2 + i * 0.3}s ease-in-out infinite` }}
                  />
                );
              })}
            </g>
          )}
        </g>
      </svg>

      <div className="text-center mt-2">
        <div className={`text-sm font-semibold ${isGolden ? "text-warning" : "text-foreground"}`}>{stage}</div>
        <div className="text-xs text-muted-foreground">
          {streak} / {goal} day streak · {Math.round(p * 100)}%
        </div>
      </div>
    </div>
  );
}