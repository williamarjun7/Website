import { useEffect, useState } from 'react';
import logo from '../../assets/logo.png';

interface SplashScreenProps {
  ready: boolean;
  onFinish: () => void;
}

const MIN_DISPLAY_MS = 3500;
const EXIT_DURATION_MS = 700;

export default function SplashScreen({ ready, onFinish }: SplashScreenProps) {
  const [mountTime] = useState(() => Date.now());
  const [exiting, setExiting] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
    }, []);

  useEffect(() => {
    if (!ready || exiting) return;

    const elapsed = Date.now() - mountTime;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setHidden(true);
        onFinish();
      }, EXIT_DURATION_MS);
    }, remaining);

    return () => clearTimeout(timer);
  }, [ready, exiting, onFinish, mountTime]);

  if (hidden) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#0c0806' }}
      role="status"
      aria-label="Loading"
    >
      {/* Vignette — base layer, sits BEHIND all content to avoid dimming logo/text */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/35 pointer-events-none" />

      {/* Ambient glow — ignites from a tiny ember, expands into warm luminance */}
      <div
        className={`absolute h-[600px] w-[600px] rounded-full bg-gradient-to-br from-amber-500/22 via-amber-400/8 to-transparent blur-[100px] ${
          reducedMotion ? 'opacity-80' : exiting ? 'splash-ambient-exit' : 'splash-ambient-glow'
        }`}
      />

      {/* Secondary center glow — adds depth and focal warmth */}
      <div
        className={`absolute h-72 w-72 rounded-full bg-gradient-to-br from-amber-400/12 to-transparent blur-[60px] ${
          reducedMotion ? 'opacity-40' : exiting ? 'splash-center-glow-exit' : 'splash-center-glow'
        }`}
      />

      {/* Golden ring — subtle framing accent */}
      <svg
        className={`absolute h-32 w-32 ${
          reducedMotion ? 'opacity-30' : exiting ? 'splash-ring-svg-exit' : ''
        }`}
        viewBox="0 0 160 160"
      >
        <circle
          cx="80" cy="80" r="78"
          fill="none"
          stroke="rgba(251,191,36,0.03)"
          strokeWidth="1"
        />
        <circle
          cx="80" cy="80" r="78"
          fill="none"
          stroke="rgba(251,191,36,0.28)"
          strokeWidth="1"
          strokeDasharray="490"
          strokeDashoffset="490"
          className={reducedMotion ? 'opacity-30' : 'splash-ring-stroke'}
        />
      </svg>

      {/* Logo group */}
      <div
        className={`relative z-10 ${
          reducedMotion ? '' : exiting ? 'splash-logo-group-exit' : ''
        }`}
      >
        <div
          className={`absolute -inset-3 rounded-full ${
            reducedMotion
              ? 'opacity-40 shadow-lg shadow-amber-900/10'
              : 'splash-logo-aura'
          }`}
        />
        <img
          src={logo}
          alt=""
          className={`h-28 w-28 rounded-full object-cover ${
            reducedMotion ? 'opacity-100' : 'splash-logo-img'
          }`}
        />
        {!reducedMotion && !exiting && (
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="splash-shimmer-sweep" />
          </div>
        )}
      </div>

      {/* Brand text */}
      <p
        className={`z-10 mt-7 text-xs uppercase font-light text-amber-500/65 whitespace-nowrap ${
          reducedMotion ? 'opacity-100 tracking-[0.3em]' : exiting ? 'splash-text-exit' : 'splash-text'
        }`}
      >
        Highlands Cafe & Motel Inn
      </p>

      {/* Loading indicator */}
      <div
        className={`absolute bottom-16 left-1/2 -translate-x-1/2 z-10 ${
          reducedMotion ? 'opacity-20' : exiting ? 'opacity-0 transition-opacity duration-300 ease-in' : 'splash-loader'
        }`}
      >
        <div className="splash-loader-bar" />
      </div>

      <style>{`
        /* ── Ambient glow: ignites like a match, grows into warm flame, then breathes ── */
        @keyframes ambientIgnite {
          0%   { opacity: 0; transform: scale(0.15); }
          25%  { opacity: 0.25; transform: scale(0.3); }
          55%  { opacity: 0.7; transform: scale(0.75); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ambientBreathe {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.65; transform: scale(1.04); }
        }
        @keyframes ambientDim {
          0%   { opacity: 1; transform: scale(1); }
          40%  { opacity: 0.3; transform: scale(0.5); }
          100% { opacity: 0; transform: scale(0.15); }
        }
        .splash-ambient-glow {
          will-change: transform, opacity;
          animation: ambientIgnite 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards, ambientBreathe 5s ease-in-out 1s infinite;
        }
        .splash-ambient-exit {
          animation: ambientDim 0.7s ease-in 0.25s forwards !important;
        }

        /* ── Center glow: secondary warm focal layer ── */
        @keyframes centerGlowRise {
          0%   { opacity: 0; transform: scale(0.3); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes centerGlowBreathe {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%      { opacity: 1; transform: scale(1.06); }
        }
        @keyframes centerGlowDim {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.2); }
        }
        .splash-center-glow {
          will-change: transform, opacity;
          animation: centerGlowRise 0.9s ease-out 0.1s both, centerGlowBreathe 4s ease-in-out 1s infinite;
        }
        .splash-center-glow-exit {
          animation: centerGlowDim 0.6s ease-in 0.15s forwards !important;
        }

        /* ── Golden ring: stroke draws itself as a subtle frame ── */
        @keyframes ringStrokeDraw {
          0%   { stroke-dashoffset: 490; opacity: 0; }
          35%  { opacity: 0.2; }
          100% { stroke-dashoffset: 0; opacity: 0.55; }
        }
        @keyframes ringStrokeBreathe {
          0%, 100% { opacity: 0.2; }
          50%      { opacity: 0.4; }
        }
        @keyframes ringSVGDim {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.35); }
        }
        .splash-ring-stroke {
          animation: ringStrokeDraw 1.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.8s both, ringStrokeBreathe 5s ease-in-out 2.4s infinite;
        }
        .splash-ring-svg-exit {
          animation: ringSVGDim 0.5s ease-in 0.15s forwards !important;
        }

        /* ── Logo: emerges from light, not from offscreen ── */
        @keyframes logoReveal {
          0%   { opacity: 0; filter: brightness(0.2) blur(8px); transform: scale(0.92); }
          35%  { opacity: 0.5; filter: brightness(0.5) blur(5px); transform: scale(0.96); }
          65%  { opacity: 0.92; filter: brightness(1.08) blur(1px); transform: scale(1.01); }
          100% { opacity: 1; filter: brightness(1) blur(0); transform: scale(1); }
        }
        @keyframes logoBreath {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.012); }
        }
        @keyframes logoGroupDim {
          0%   { opacity: 1; transform: scale(1); filter: blur(0); }
          100% { opacity: 0; transform: scale(0.85); filter: blur(4px); }
        }
        .splash-logo-img {
          will-change: transform, opacity, filter;
          animation: logoReveal 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s both, logoBreath 5s ease-in-out 1.3s infinite;
        }
        .splash-logo-group-exit {
          animation: logoGroupDim 0.6s ease-in 0.1s forwards !important;
        }

        /* ── Logo aura: warm halo that grows with the light ── */
        @keyframes auraReveal {
          0%   { box-shadow: 0 0 0px rgba(251,191,36,0); opacity: 0; }
          40%  { box-shadow: 0 0 50px rgba(251,191,36,0.1); opacity: 0.8; }
          100% { box-shadow: 0 0 60px rgba(251,191,36,0.08); opacity: 1; }
        }
        @keyframes auraBreathe {
          0%, 100% { box-shadow: 0 0 40px rgba(251,191,36,0.05); opacity: 0.65; }
          50%      { box-shadow: 0 0 65px rgba(251,191,36,0.1); opacity: 0.9; }
        }
        .splash-logo-aura {
          will-change: box-shadow, opacity;
          animation: auraReveal 1.2s ease-out 0.3s both, auraBreathe 6s ease-in-out 1.5s infinite;
        }

        /* ── Shimmer: soft light that sweeps across the logo ── */
        @keyframes shimmerSweep {
          0%   { transform: translateX(-100%) translateY(-100%); opacity: 0; }
          10%  { opacity: 0.5; }
          35%  { transform: translateX(0) translateY(0); opacity: 0.2; }
          65%  { transform: translateX(100%) translateY(100%); opacity: 0.04; }
          100% { transform: translateX(100%) translateY(100%); opacity: 0; }
        }
        .splash-shimmer-sweep {
          position: absolute;
          inset: -50%;
          background: radial-gradient(ellipse at 50% 50%, rgba(251,191,36,0.2) 0%, rgba(251,191,36,0.06) 30%, transparent 60%);
          animation: shimmerSweep 2s ease-in-out 1.3s forwards;
          pointer-events: none;
        }

        /* ── Text: tracking compression reveals the brand name ── */
        @keyframes textReveal {
          0%   { opacity: 0; transform: translateY(4px); letter-spacing: 0.35em; }
          100% { opacity: 1; transform: translateY(0); letter-spacing: 0.3em; }
        }
        @keyframes textFade {
          0%   { opacity: 1; letter-spacing: 0.3em; }
          100% { opacity: 0; letter-spacing: 0.15em; }
        }
        .splash-text {
          will-change: opacity, letter-spacing;
          animation: textReveal 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) 1.2s both;
        }
        .splash-text-exit {
          animation: textFade 0.3s ease-in forwards !important;
        }

        /* ── Loader: subtle traveling light ── */
        @keyframes loaderFadeIn {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes loaderTravel {
          0%   { background-position: -6rem 0; opacity: 0.15; }
          50%  { background-position: 6rem 0; opacity: 0.5; }
          100% { background-position: -6rem 0; opacity: 0.15; }
        }
        .splash-loader {
          will-change: opacity;
          animation: loaderFadeIn 0.8s ease-out 1.8s forwards;
        }
        .splash-loader-bar {
          width: 6rem;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.4) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: loaderTravel 3s ease-in-out 2.6s infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .splash-ambient-glow,
          .splash-center-glow,
          .splash-ring-stroke,
          .splash-logo-img,
          .splash-logo-aura,
          .splash-shimmer-sweep,
          .splash-text,
          .splash-loader,
          .splash-loader-bar {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
