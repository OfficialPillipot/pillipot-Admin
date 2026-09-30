import { memo } from "react";
import type { PetMood } from "./types";

interface PetMascotProps {
  mood: PetMood;
  isPointingLeft?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const PetMascot = memo(function PetMascot({
  mood,
  isPointingLeft = false,
  size = "md",
  className = "",
}: PetMascotProps) {
  const pixelSizes = {
    sm: "w-14 h-14",
    md: "w-20 h-20",
    lg: "w-28 h-28",
  };

  return (
    <div
      className={`relative select-none transition-transform duration-300 ${pixelSizes[size]} ${className}`}
      aria-label="Sparky the Robotic Puppy"
    >
      <style>{`
        @keyframes puppyFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(1deg); }
        }
        @keyframes puppyBounceWalk {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50% { transform: translateY(-10px) rotate(3deg); }
        }
        @keyframes puppyJumpArc {
          0% { transform: translateY(0px) scale(1, 0.88); }
          35% { transform: translateY(-28px) scale(0.92, 1.14); }
          70% { transform: translateY(-4px) scale(1.04, 0.96); }
          100% { transform: translateY(0px) scale(1, 1); }
        }
        @keyframes tailWagFast {
          0%, 100% { transform: rotate(-18deg); }
          50% { transform: rotate(26deg); }
        }
        @keyframes tailWagGentle {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(14deg); }
        }
        @keyframes earFlopLeft {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-8deg); }
        }
        @keyframes earFlopRight {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes puppyEyeBlink {
          0%, 95%, 100% { transform: scaleY(1); }
          97.5% { transform: scaleY(0.1); }
        }
        @keyframes noseLedGlow {
          0%, 100% { fill: #06b6d4; filter: drop-shadow(0 0 4px #06b6d4); }
          50% { fill: #38bdf8; filter: drop-shadow(0 0 8px #38bdf8); }
        }
        @keyframes collarCharmGlow {
          0%, 100% { fill: #fbbf24; filter: drop-shadow(0 0 5px #fbbf24); }
          50% { fill: #f59e0b; filter: drop-shadow(0 0 10px #f59e0b); }
        }
        .anim-idle { animation: puppyFloat 3s ease-in-out infinite; }
        .anim-walk { animation: puppyBounceWalk 0.45s ease-in-out infinite; }
        .anim-jump { animation: puppyJumpArc 0.65s ease-in-out infinite; }
        .anim-tail-wag {
          animation: tailWagFast 0.3s ease-in-out infinite;
          transform-origin: 98px 90px;
        }
        .anim-tail-idle {
          animation: tailWagGentle 0.9s ease-in-out infinite;
          transform-origin: 98px 90px;
        }
        .anim-ear-left {
          animation: earFlopLeft 2.4s ease-in-out infinite;
          transform-origin: 32px 30px;
        }
        .anim-ear-right {
          animation: earFlopRight 2.4s ease-in-out infinite;
          transform-origin: 88px 30px;
        }
        .anim-eyes {
          animation: puppyEyeBlink 3.6s ease-in-out infinite;
          transform-origin: center;
        }
        .anim-nose { animation: noseLedGlow 2s ease-in-out infinite; }
        .anim-charm { animation: collarCharmGlow 1.8s ease-in-out infinite; }
      `}</style>

      <div
        className={`w-full h-full ${
          mood === "jumping"
            ? "anim-jump"
            : mood === "walking"
            ? "anim-walk"
            : "anim-idle"
        }`}
      >
        <svg
          viewBox="0 0 130 135"
          className="w-full h-full drop-shadow-[0_10px_18px_rgba(0,0,0,0.22)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Floor Shadow */}
          <ellipse cx="65" cy="126" rx="28" ry="5" fill="rgba(0,0,0,0.14)" />

          {/* WAGGLING ROBOTIC PUPPY TAIL */}
          <g className={mood === "happy" || mood === "walking" || mood === "pointing" ? "anim-tail-wag" : "anim-tail-idle"}>
            {/* Tail Segments */}
            <path
              d="M 98 90 C 114 86 122 72 120 54"
              stroke="#64748b"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Tail Joints */}
            <circle cx="109" cy="80" r="3.5" fill="#475569" />
            <circle cx="118" cy="66" r="3" fill="#475569" />
            {/* Glowing Tail Tip Light */}
            <circle cx="120" cy="54" r="5.5" fill="#06b6d4" className="anim-nose" />
            <circle cx="120" cy="54" r="2.5" fill="#ffffff" />
          </g>

          {/* Back Paws (Sitting/Standing Puppy Base) */}
          <g>
            <ellipse cx="34" cy="116" rx="9" ry="6" fill="#cbd5e1" stroke="#475569" strokeWidth="2.5" />
            <ellipse cx="96" cy="116" rx="9" ry="6" fill="#cbd5e1" stroke="#475569" strokeWidth="2.5" />
            {/* Back Paw Pads */}
            <circle cx="34" cy="116" r="3" fill="#0284c7" opacity="0.6" />
            <circle cx="96" cy="116" r="3" fill="#0284c7" opacity="0.6" />
          </g>

          {/* Robot Puppy Body */}
          <rect
            x="36"
            y="68"
            width="58"
            height="46"
            rx="20"
            fill="url(#pupBodyGrad)"
            stroke="#475569"
            strokeWidth="3"
          />

          {/* Cyber Belly Panel (Heart/Core Indicator) */}
          <rect
            x="48"
            y="76"
            width="34"
            height="26"
            rx="12"
            fill="#0f172a"
            stroke="#0ea5e9"
            strokeWidth="1.5"
          />
          {/* Cute Heartbeat / Paw Print inside Belly Display */}
          <path
            d="M 58 89 C 55 86 52 90 56 94 L 65 101 L 74 94 C 78 90 75 86 72 89 L 65 95 Z"
            fill="#38bdf8"
            opacity="0.85"
          />

          {/* Front Robot Legs & Paws */}
          {mood === "pointing" ? (
            isPointingLeft ? (
              // Left Paw Extended Pointing
              <g>
                {/* Right standing paw */}
                <rect x="74" y="96" width="14" height="24" rx="7" fill="#cbd5e1" stroke="#475569" strokeWidth="2.5" />
                <ellipse cx="81" cy="120" rx="7" ry="4" fill="#94a3b8" />
                {/* Left paw reaching & pointing left */}
                <path
                  d="M 46 88 C 28 84 14 74 4 68"
                  stroke="#64748b"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="4" cy="68" r="6" fill="#0284c7" />
                <circle cx="4" cy="68" r="2.5" fill="#38bdf8" />
              </g>
            ) : (
              // Right Paw Extended Pointing
              <g>
                {/* Left standing paw */}
                <rect x="42" y="96" width="14" height="24" rx="7" fill="#cbd5e1" stroke="#475569" strokeWidth="2.5" />
                <ellipse cx="49" cy="120" rx="7" ry="4" fill="#94a3b8" />
                {/* Right paw reaching & pointing right */}
                <path
                  d="M 84 88 C 102 84 116 74 126 68"
                  stroke="#64748b"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="126" cy="68" r="6" fill="#0284c7" />
                <circle cx="126" cy="68" r="2.5" fill="#38bdf8" />
              </g>
            )
          ) : (
            // Default Cute Standing Paws
            <g>
              <rect x="44" y="96" width="14" height="24" rx="7" fill="#cbd5e1" stroke="#475569" strokeWidth="2.5" />
              <ellipse cx="51" cy="120" rx="8" ry="4.5" fill="#94a3b8" />
              <rect x="72" y="96" width="14" height="24" rx="7" fill="#cbd5e1" stroke="#475569" strokeWidth="2.5" />
              <ellipse cx="79" cy="120" rx="8" ry="4.5" fill="#94a3b8" />
            </g>
          )}

          {/* CYBER PUPPY COLLAR */}
          <rect
            x="38"
            y="64"
            width="54"
            height="9"
            rx="4.5"
            fill="#0284c7"
            stroke="#0369a1"
            strokeWidth="1.5"
          />
          {/* Collar Charm (Golden Cyber Bone / Tag) */}
          <g className="anim-charm">
            <circle cx="65" cy="73" r="5" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
            <path
              d="M 62 72 H 68 M 62 74 H 68"
              stroke="#78350f"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </g>

          {/* ROBOTIC PUPPY EARS (Floppy Cybernetic Ears) */}
          {/* Left Ear */}
          <g className="anim-ear-left">
            <path
              d="M 32 30 C 14 32 8 50 14 66 C 18 76 28 78 30 68 C 32 58 36 44 32 30 Z"
              fill="url(#pupEarGrad)"
              stroke="#475569"
              strokeWidth="2.5"
            />
            {/* Inner Ear Neon Glow */}
            <path
              d="M 28 38 C 18 42 16 54 20 64 C 22 68 26 68 26 62 Z"
              fill="#0ea5e9"
              opacity="0.35"
            />
          </g>

          {/* Right Ear */}
          <g className="anim-ear-right">
            <path
              d="M 98 30 C 116 32 122 50 116 66 C 112 76 102 78 100 68 C 98 58 94 44 98 30 Z"
              fill="url(#pupEarGrad)"
              stroke="#475569"
              strokeWidth="2.5"
            />
            {/* Inner Ear Neon Glow */}
            <path
              d="M 102 38 C 112 42 114 54 110 64 C 108 68 104 68 104 62 Z"
              fill="#0ea5e9"
              opacity="0.35"
            />
          </g>

          {/* ROBOT PUPPY HEAD */}
          <rect
            x="24"
            y="16"
            width="82"
            height="52"
            rx="24"
            fill="url(#pupBodyGrad)"
            stroke="#475569"
            strokeWidth="3"
          />

          {/* Head Top Cyber Sensor / Antenna Cap */}
          <rect x="57" y="10" width="16" height="7" rx="3.5" fill="#64748b" stroke="#334155" strokeWidth="1.5" />
          <circle cx="65" cy="8" r="4.5" fill="#06b6d4" className="anim-nose" />

          {/* Digital Face Visor (Black Glossy Screen) */}
          <rect
            x="31"
            y="22"
            width="68"
            height="38"
            rx="16"
            fill="#090d16"
            stroke="#1e293b"
            strokeWidth="2"
          />

          {/* EXPRESSIVE DIGITAL PUPPY EYES */}
          {mood === "happy" ? (
            // Joyful Puppy Arches ^ ^
            <g stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" fill="none">
              <path d="M 43 40 Q 50 31 57 40" />
              <path d="M 73 40 Q 80 31 87 40" />
            </g>
          ) : mood === "pointing" ? (
            // Big Focused Puppy Eyes looking toward target
            <g className="anim-eyes">
              <ellipse cx={isPointingLeft ? "46" : "54"} cy="38" rx="7" ry="8.5" fill="#38bdf8" />
              <ellipse cx={isPointingLeft ? "76" : "84"} cy="38" rx="7" ry="8.5" fill="#38bdf8" />
              {/* Eye sparkle highlights */}
              <circle cx={isPointingLeft ? "44" : "52"} cy="35" r="2.8" fill="#ffffff" />
              <circle cx={isPointingLeft ? "74" : "82"} cy="35" r="2.8" fill="#ffffff" />
              <circle cx={isPointingLeft ? "48" : "56"} cy="42" r="1.3" fill="#ffffff" />
              <circle cx={isPointingLeft ? "78" : "86"} cy="42" r="1.3" fill="#ffffff" />
            </g>
          ) : mood === "thinking" ? (
            // Curious / Tilting Puppy Eyes
            <g>
              <ellipse cx="50" cy="38" rx="6.5" ry="7.5" fill="#f59e0b" />
              <ellipse cx="80" cy="38" rx="6.5" ry="7.5" fill="#f59e0b" />
              <circle cx="48" cy="36" r="2.5" fill="#ffffff" />
              <circle cx="78" cy="36" r="2.5" fill="#ffffff" />
            </g>
          ) : (
            // Default Big Cute Puppy Eyes with double highlights
            <g className="anim-eyes">
              <ellipse cx="50" cy="38" rx="7.5" ry="9" fill="#38bdf8" />
              <ellipse cx="80" cy="38" rx="7.5" ry="9" fill="#38bdf8" />
              {/* Primary highlight */}
              <circle cx="47.5" cy="34.5" r="3.2" fill="#ffffff" />
              <circle cx="77.5" cy="34.5" r="3.2" fill="#ffffff" />
              {/* Secondary puppy twinkle */}
              <circle cx="52.5" cy="42" r="1.5" fill="#ffffff" />
              <circle cx="82.5" cy="42" r="1.5" fill="#ffffff" />
            </g>
          )}

          {/* Cute Blushing Cheeks */}
          <ellipse cx="38" cy="49" rx="4.5" ry="2.5" fill="#f43f5e" opacity="0.65" />
          <ellipse cx="92" cy="49" rx="4.5" ry="2.5" fill="#f43f5e" opacity="0.65" />

          {/* ROBOT PUPPY SNOUT & NOSE */}
          {/* Muzzle Plate */}
          <ellipse cx="65" cy="51" rx="14" ry="9" fill="#1e293b" stroke="#334155" strokeWidth="1.2" />

          {/* Glowing Cyber Puppy Nose */}
          <path
            d="M 61 48 Q 65 46 69 48 Q 67 53 65 54 Q 63 53 61 48 Z"
            fill="#06b6d4"
            className="anim-nose"
          />
          <circle cx="64" cy="48.5" r="1" fill="#ffffff" />

          {/* Smiling Puppy Mouth (w shape) */}
          <path
            d="M 60 54 Q 62.5 57 65 54 Q 67.5 57 70 54"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Gradients */}
          <defs>
            <linearGradient id="pupBodyGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <linearGradient id="pupEarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
});
