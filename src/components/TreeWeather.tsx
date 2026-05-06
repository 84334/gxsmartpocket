import { useMemo } from "react";
import bunnyImg from "@/assets/bunny.png";
import butterflyImg from "@/assets/butterfly.png";
import birdImg from "@/assets/bird.png";

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
        <>
          <img
            src={bunnyImg}
            alt=""
            className="absolute w-12 h-12 object-contain"
            style={{ bottom: "8%", left: "6%", animation: "hop 2.4s ease-in-out infinite" }}
          />
          <img
            src={butterflyImg}
            alt=""
            className="absolute w-8 h-8 object-contain"
            style={{ top: "30%", left: "10%", animation: "fly 6s linear infinite" }}
          />
          <img
            src={birdImg}
            alt=""
            className="absolute w-10 h-10 object-contain"
            style={{ top: "14%", right: "16%", animation: "fly-r 7s linear infinite" }}
          />
        </>
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
        @keyframes hop {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fly {
          0% { transform: translate(0,0) rotate(-5deg); }
          50% { transform: translate(120px,-20px) rotate(5deg); }
          100% { transform: translate(0,0) rotate(-5deg); }
        }
        @keyframes fly-r {
          0% { transform: translate(0,0); }
          50% { transform: translate(-100px,15px); }
          100% { transform: translate(0,0); }
        }
      `}</style>
    </div>
  );
}