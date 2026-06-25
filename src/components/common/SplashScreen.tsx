import { useEffect, useState, useRef, useCallback } from 'react';
import logo from '../../assets/logo.png';

interface SplashScreenProps {
  ready: boolean;
  onFinish: () => void;
  onNavbarReady: () => void;
  isRepeat: boolean;
}

const FIRST_VISIT_ENTER_MS = 2200;
const FIRST_VISIT_EXIT_CONTENT_MS = 400;
const FIRST_VISIT_EXIT_LOGO_MS = 550;
const FIRST_VISIT_EXIT_OVERLAY_MS = 400;

export default function SplashScreen({ ready, onFinish, onNavbarReady, isRepeat }: SplashScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'display' | 'exit-content' | 'exit-logo' | 'exit-overlay'>('enter');
  const [hidden, setHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [logoTransform, setLogoTransform] = useState('');
  const [showSplashLogo, setShowSplashLogo] = useState(true);
  const logoRef = useRef<HTMLDivElement>(null);
  const ranExit = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const computeLogoTransform = useCallback(() => {
    const splashEl = logoRef.current;
    const targetEl = document.querySelector<HTMLElement>('[data-splash-target="logo"]');
    if (!splashEl || !targetEl) return null;

    const s = splashEl.getBoundingClientRect();
    const t = targetEl.getBoundingClientRect();

    const dx = t.left + t.width / 2 - (s.left + s.width / 2);
    const dy = t.top + t.height / 2 - (s.top + s.height / 2);
    const scale = t.width / s.width;

    return `translate(${dx}px, ${dy}px) scale(${scale})`;
  }, []);

  useEffect(() => {
    if (!ready || reducedMotion) {
      if (reducedMotion && ready) {
        onNavbarReady();
        const t = setTimeout(onFinish, 100);
        return () => clearTimeout(t);
      }
      return;
    }

    if (isRepeat) {
      const t1 = setTimeout(() => setPhase('exit-content'), 200);
      return () => clearTimeout(t1);
    }

    const t1 = setTimeout(() => setPhase('display'), FIRST_VISIT_ENTER_MS);
    return () => clearTimeout(t1);
  }, [ready, reducedMotion, isRepeat, onFinish, onNavbarReady]);

  useEffect(() => {
    if (reducedMotion) return;
    if (ranExit.current) return;

    if (phase === 'exit-content') {
      if (isRepeat) {
        const t = setTimeout(() => setPhase('exit-logo'), 200);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase('exit-logo'), FIRST_VISIT_EXIT_CONTENT_MS);
      return () => clearTimeout(t);
    }

    if (phase === 'exit-logo') {
      ranExit.current = true;

      const xform = computeLogoTransform();
      if (!xform) {
        const t = setTimeout(() => {
          onNavbarReady();
          setPhase('exit-overlay');
        }, 0);
        return () => clearTimeout(t);
      }

      requestAnimationFrame(() => {
        setLogoTransform(xform);
      });

      const logoDuration = isRepeat ? 300 : FIRST_VISIT_EXIT_LOGO_MS;
      const t = setTimeout(() => {
        onNavbarReady();
        setShowSplashLogo(false);
        setPhase('exit-overlay');
      }, logoDuration + 50);
      return () => clearTimeout(t);
    }

    if (phase === 'exit-overlay') {
      const overlayDuration = isRepeat ? 200 : FIRST_VISIT_EXIT_OVERLAY_MS;
      const t = setTimeout(() => {
        setHidden(true);
        onFinish();
      }, overlayDuration + 50);
      return () => clearTimeout(t);
    }
  }, [phase, reducedMotion, isRepeat, onFinish, onNavbarReady, computeLogoTransform]);

  if (hidden) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden ${
        phase === 'exit-overlay' ? 'splash-overlay-fade' : ''
      }`}
      style={{
        backgroundColor: '#0c0806',
        animationDuration: phase === 'exit-overlay' ? (isRepeat ? '200ms' : '400ms') : undefined,
      }}
      role="status"
      aria-label="Loading"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/35 pointer-events-none" />

      {/* Ambient glow */}
      <div
        className={`absolute h-[500px] w-[500px] rounded-full bg-gradient-to-br from-amber-500/18 via-amber-400/6 to-transparent blur-[80px] ${
          reducedMotion ? 'opacity-60' : phase === 'exit-content' || phase === 'exit-logo' || phase === 'exit-overlay'
            ? 'splash-ambient-exit' : 'splash-ambient-glow'
        }`}
      />

      {/* Center glow */}
      <div
        className={`absolute h-60 w-60 rounded-full bg-gradient-to-br from-amber-400/10 to-transparent blur-[50px] ${
          reducedMotion ? 'opacity-30' : phase === 'exit-content' || phase === 'exit-logo' || phase === 'exit-overlay'
            ? 'splash-center-glow-exit' : 'splash-center-glow'
        }`}
      />

      {/* Logo + Ring */}
      <div className="relative h-32 w-32 flex items-center justify-center">
        <svg
          className={`absolute inset-0 h-full w-full ${
            reducedMotion ? 'opacity-15' : phase === 'exit-content' || phase === 'exit-logo' || phase === 'exit-overlay'
              ? 'splash-ring-svg-exit' : ''
          }`}
          viewBox="0 0 160 160"
          style={{ transformOrigin: 'center' }}
        >
          <circle
            cx="80" cy="80" r="78"
            fill="none"
            stroke="rgba(251,191,36,0.01)"
            strokeWidth="0.5"
          />
          <circle
            cx="80" cy="80" r="78"
            fill="none"
            stroke="rgba(251,191,36,0.08)"
            strokeWidth="0.5"
            strokeDasharray="490"
            strokeDashoffset="490"
            className={reducedMotion ? 'opacity-15' : 'splash-ring-stroke'}
          />
        </svg>

        {/* Logo group */}
        <div
          ref={logoRef}
          className={`relative z-10 ${showSplashLogo ? '' : 'opacity-0'}`}
          style={{
            transform: logoTransform || undefined,
            transition: logoTransform ? `transform ${isRepeat ? 300 : FIRST_VISIT_EXIT_LOGO_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)` : 'none',
          }}
        >
          <div
            className={`absolute -inset-3 rounded-full ${
              reducedMotion
                ? 'opacity-30 shadow-lg shadow-amber-900/10'
                : phase === 'exit-content' || phase === 'exit-logo' || phase === 'exit-overlay'
                  ? 'opacity-0 transition-opacity duration-200'
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
        </div>
      </div>

      {/* Brand text */}
      <p
        className={`z-10 mt-7 text-xs uppercase font-light whitespace-nowrap ${
          reducedMotion ? 'opacity-100 tracking-[0.3em] text-amber-500/65' : phase === 'exit-content' || phase === 'exit-logo' || phase === 'exit-overlay'
            ? 'splash-text-exit' : 'splash-text text-amber-500/65'
        }`}
      >
        Highlands Cafe & Motel Inn
      </p>

      {/* Tagline */}
      <p
        className={`z-10 mt-2 text-[11px] font-light tracking-[0.25em] ${
          reducedMotion ? 'opacity-100 text-amber-400/40' : phase === 'exit-content' || phase === 'exit-logo' || phase === 'exit-overlay'
            ? 'splash-tagline-exit' : 'splash-tagline text-amber-400/50'
        }`}
      >
        Stay &bull; Dine &bull; Relax
      </p>

      <style>{`
        @keyframes ambientIgnite {
          0%   { opacity: 0; transform: scale(0.15); }
          25%  { opacity: 0.2; transform: scale(0.3); }
          55%  { opacity: 0.6; transform: scale(0.75); }
          100% { opacity: 0.75; transform: scale(1); }
        }
        @keyframes ambientBreathe {
          0%, 100% { opacity: 0.75; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(1.03); }
        }
        @keyframes ambientDim {
          0%   { opacity: 0.75; transform: scale(1); }
          40%  { opacity: 0.2; transform: scale(0.5); }
          100% { opacity: 0; transform: scale(0.15); }
        }
        .splash-ambient-glow {
          will-change: transform, opacity;
          animation: ambientIgnite 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards,
                     ambientBreathe 5s ease-in-out 1s infinite;
        }
        .splash-ambient-exit {
          animation: ambientDim 0.4s ease-in 0.1s forwards !important;
        }

        @keyframes centerGlowRise {
          0%   { opacity: 0; transform: scale(0.3); }
          100% { opacity: 0.8; transform: scale(1); }
        }
        @keyframes centerGlowBreathe {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%      { opacity: 0.9; transform: scale(1.05); }
        }
        @keyframes centerGlowDim {
          0%   { opacity: 0.8; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.2); }
        }
        .splash-center-glow {
          will-change: transform, opacity;
          animation: centerGlowRise 0.9s ease-out 0.1s both,
                     centerGlowBreathe 4s ease-in-out 1s infinite;
        }
        .splash-center-glow-exit {
          animation: centerGlowDim 0.35s ease-in 0.05s forwards !important;
        }

        @keyframes ringStrokeDraw {
          0%   { stroke-dashoffset: 490; opacity: 0; }
          35%  { opacity: 0.12; }
          100% { stroke-dashoffset: 0; opacity: 0.2; }
        }
        @keyframes ringStrokeBreathe {
          0%, 100% { opacity: 0.15; }
          50%      { opacity: 0.25; }
        }
        @keyframes ringSVGDim {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.35); }
        }
        .splash-ring-stroke {
          animation: ringStrokeDraw 1.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.8s both,
                     ringStrokeBreathe 5s ease-in-out 2.4s infinite;
        }
        .splash-ring-svg-exit {
          animation: ringSVGDim 0.35s ease-in 0.05s forwards !important;
        }

        @keyframes logoReveal {
          0%   { opacity: 0; filter: brightness(0.2) blur(6px); transform: scale(0.92); }
          35%  { opacity: 0.5; filter: brightness(0.5) blur(4px); transform: scale(0.96); }
          65%  { opacity: 0.92; filter: brightness(1.06) blur(0.5px); transform: scale(1.01); }
          100% { opacity: 1; filter: brightness(1) blur(0); transform: scale(1); }
        }
        .splash-logo-img {
          will-change: transform, opacity, filter;
          animation: logoReveal 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s both;
        }

        @keyframes auraReveal {
          0%   { box-shadow: 0 0 0px rgba(251,191,36,0); opacity: 0; }
          40%  { box-shadow: 0 0 40px rgba(251,191,36,0.08); opacity: 0.7; }
          100% { box-shadow: 0 0 50px rgba(251,191,36,0.06); opacity: 0.85; }
        }
        @keyframes auraBreathe {
          0%, 100% { box-shadow: 0 0 30px rgba(251,191,36,0.04); opacity: 0.6; }
          50%      { box-shadow: 0 0 55px rgba(251,191,36,0.08); opacity: 0.85; }
        }
        .splash-logo-aura {
          will-change: box-shadow, opacity;
          animation: auraReveal 1.2s ease-out 0.3s both,
                     auraBreathe 6s ease-in-out 1.5s infinite;
        }

        @keyframes textReveal {
          0%   { opacity: 0; transform: translateY(3px); letter-spacing: 0.35em; }
          100% { opacity: 1; transform: translateY(0); letter-spacing: 0.3em; }
        }
        @keyframes textFade {
          0%   { opacity: 1; letter-spacing: 0.3em; }
          100% { opacity: 0; letter-spacing: 0.15em; transform: translateY(-3px); }
        }
        .splash-text {
          will-change: opacity, letter-spacing;
          animation: textReveal 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) 1.2s both;
        }
        .splash-text-exit {
          animation: textFade 0.25s ease-in forwards !important;
        }

        @keyframes taglineFadeIn {
          0%   { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes taglineFadeOut {
          0%   { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-3px); }
        }
        .splash-tagline {
          will-change: opacity, transform;
          animation: taglineFadeIn 0.7s ease-out 1.8s both;
        }
        .splash-tagline-exit {
          animation: taglineFadeOut 0.2s ease-in forwards !important;
        }

        .splash-overlay-fade {
          animation: overlayFade 0.4s ease-in forwards;
        }
        @keyframes overlayFade {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .splash-ambient-glow,
          .splash-center-glow,
          .splash-ring-stroke,
          .splash-logo-img,
          .splash-logo-aura,
          .splash-text,
          .splash-tagline {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
