import { useMemo } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

type Mood = "happy" | "calm" | "rain" | "storm";

/**
 * Weather + critter overlay rendered behind the SavingsTree.
 * - happy: sunny + cute animals (bird, bunny, butterfly)
 * - calm: a few clouds drifting
 * - rain: rainy day
 * - storm: heavy rain + lightning flashes
 */
export function TreeWeather({ mood }: { mood: Mood }) {
  const drops = useMemo(() => {
    const count = mood === "storm" ? 50 : mood === "rain" ? 28 : 0;
    return Array.from({ length: count }, (_, i) => ({
      left: (i * 53) % 100,
      delay: ((i * 17) % 20) / 10,
      dur: 0.6 + ((i % 5) * 0.12),
    }));
  }, [mood]);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl">
      {/* Sky tint */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background:
            mood === "happy"
              ? "radial-gradient(circle at 80% 10%, oklch(0.85 0.12 90 / 0.35), transparent 55%)"
              : mood === "storm"
              ? "linear-gradient(180deg, oklch(0.18 0.04 280 / 0.55), transparent)"
              : mood === "rain"
              ? "linear-gradient(180deg, oklch(0.30 0.04 260 / 0.35), transparent)"
              : "transparent",
        }}
      />

      {/* Sun for happy */}
      {mood === "happy" && (
        <div
          className="absolute top-3 right-4 w-10 h-10 rounded-full"
          style={{
            background: "radial-gradient(circle, #fde68a, #f59e0b)",
            boxShadow: "0 0 30px #fbbf24aa",
            animation: "sun-pulse 4s ease-in-out infinite",
          }}
        />
      )}

      {/* Clouds for calm/rain/storm */}
      {mood !== "happy" && (
        <>
          <div
            className="absolute top-4 left-2 w-16 h-6 rounded-full bg-white/20 blur-md"
            style={{ animation: "cloud-drift 14s linear infinite" }}
          />
          <div
            className="absolute top-10 left-1/3 w-24 h-7 rounded-full bg-white/15 blur-md"
            style={{ animation: "cloud-drift 22s linear infinite", animationDelay: "-6s" }}
          />
          {(mood === "rain" || mood === "storm") && (
            <div
              className="absolute top-6 right-6 w-20 h-8 rounded-full blur-md"
              style={{ background: "oklch(0.35 0.02 260 / 0.6)", animation: "cloud-drift 18s linear infinite" }}
            />
          )}
        </>
      )}

      {/* Rain drops */}
      {drops.map((d, i) => (
        <div
          key={i}
          className="absolute top-0 w-px h-3 bg-blue-300/70 rounded-full"
          style={{
            left: `${d.left}%`,
            animation: `rain-fall ${d.dur}s linear ${d.delay}s infinite`,
          }}
        />
      ))}

      {/* Lightning flash for storm */}
      {mood === "storm" && (
        <div
          className="absolute inset-0 bg-white/0"
          style={{ animation: "lightning 6s ease-in-out infinite" }}
        />
      )}

      {/* Cute critters for happy */}
      {mood === "happy" && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: "2%", width: 80, height: 80 }}
        >
          <DotLottieReact
            src="https://lottie.host/14627f1a-7381-464d-9f06-88abddaf6844/BVHucobYXe.lottie"
            loop
            autoplay
            backgroundColor="transparent"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      )}

      <style>{`
        @keyframes rain-fall {
          0% { transform: translateY(-10px); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(280px); opacity: 0; }
        }
        @keyframes cloud-drift {
          0% { transform: translateX(-30px); }
          100% { transform: translateX(280px); }
        }
        @keyframes lightning {
          0%, 92%, 100% { background-color: rgba(255,255,255,0); }
          93%, 95% { background-color: rgba(255,255,255,0.55); }
          94% { background-color: rgba(255,255,255,0); }
        }
        @keyframes sun-pulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.08); filter: brightness(1.15); }
        }
        /* Orbits around the tree (elliptical, with depth via scale) */
        @keyframes bunny-orbit {
          0%   { transform: translate3d(90px, 0, 0) scale(1); z-index: 5; }
          25%  { transform: translate3d(0, 6px, 0) scale(1.15); z-index: 6; }
          50%  { transform: translate3d(-90px, 0, 0) scale(1); z-index: 5; }
          75%  { transform: translate3d(0, -6px, 0) scale(0.7); z-index: 1; }
          100% { transform: translate3d(90px, 0, 0) scale(1); z-index: 5; }
        }
        @keyframes bunny-hop {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-14px); }
        }
        @keyframes bird-orbit {
          0%   { transform: translate3d(110px, -10px, 0) scale(1); z-index: 6; }
          25%  { transform: translate3d(0, 10px, 0) scale(1.1); z-index: 6; }
          50%  { transform: translate3d(-110px, -10px, 0) scale(1); z-index: 6; }
          75%  { transform: translate3d(0, -25px, 0) scale(0.7); z-index: 1; }
          100% { transform: translate3d(110px, -10px, 0) scale(1); z-index: 6; }
        }
        @keyframes bird-bob {
          0%, 100% { transform: translateY(0) rotate(-4deg); }
          50%      { transform: translateY(-6px) rotate(4deg); }
        }
        @keyframes butterfly-orbit {
          0%   { transform: translate3d(70px, 0, 0) scale(1); z-index: 6; }
          25%  { transform: translate3d(0, 25px, 0) scale(1.2); z-index: 6; }
          50%  { transform: translate3d(-70px, 0, 0) scale(1); z-index: 6; }
          75%  { transform: translate3d(0, -25px, 0) scale(0.65); z-index: 1; }
          100% { transform: translate3d(70px, 0, 0) scale(1); z-index: 6; }
        }
        @keyframes butterfly-flap {
          0%, 100% { transform: scaleX(1) rotate(-6deg); }
          50%      { transform: scaleX(0.5) rotate(6deg); }
        }
        /* 3D-style Y-axis rotation so the sprite faces forward/away */
        @keyframes spin-y {
          0%   { filter: brightness(1); }
          25%  { filter: brightness(0.85); }
          50%  { filter: brightness(0.7); }
          75%  { filter: brightness(0.85); }
          100% { filter: brightness(1); }
        }
      `}</style>
    </div>
  );
}