import { useEffect, useRef, useState } from 'react';
import defaultLogo from '../../assets/logo.png';

const styleId = 'ss-styles';

const css = `
#ss-root {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #070707;
  transition: opacity 0.6s ease-in;
}
#ss-root.fade { opacity: 0; }
#ss-vignette {
  position: fixed; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.5) 100%);
}
#ss-inner {
  display: flex; flex-direction: column; align-items: center; position: relative;
}
#ss-ambient {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
  width: 300px; height: 300px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle at center, rgba(212,168,83,0.15) 0%, rgba(212,168,83,0.04) 35%, transparent 65%);
  opacity: 0.4;
  animation: ss-ab 5s ease-in-out 1.5s infinite;
}
@keyframes ss-ab {
  0%,100% { opacity: 0.4; }
  50% { opacity: 0.9; }
}
#ss-logo-area {
  position: relative; width: 128px; height: 128px;
  display: flex; align-items: center; justify-content: center;
}
#ss-ring-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.ss-ring-glow {
  fill: none; stroke: rgba(212,168,83,0.45); stroke-width: 4;
  filter: blur(4px);
  stroke-dasharray: 377; stroke-dashoffset: 377;
  opacity: 0.6;
  animation: ss-rd 1s ease-out 0.3s forwards, ss-gb 5s ease-in-out 1.3s infinite;
}
.ss-ring {
  fill: none; stroke: #D4A853; stroke-width: 2.5;
  stroke-dasharray: 377; stroke-dashoffset: 377;
  animation: ss-rd 1s ease-out 0.3s forwards;
}
@keyframes ss-rd { to { stroke-dashoffset: 0; } }
@keyframes ss-gb { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
#ss-particle-track {
  position: absolute; inset: 0;
  animation: ss-po 1.2s ease-out 0.3s both;
}
#ss-particle {
  position: absolute; top: 4px; left: 50%; width: 5px; height: 5px;
  margin-left: -2.5px; border-radius: 50%; pointer-events: none;
  background: rgba(212,168,83,0.8);
  box-shadow: 0 0 6px 3px rgba(212,168,83,0.45), 0 0 20px 10px rgba(212,168,83,0.1), -6px 0 4px 2px rgba(212,168,83,0.15), -14px 0 6px 2px rgba(212,168,83,0.08);
}
#ss-particle-trail {
  position: absolute; top: 4px; left: 50%; width: 24px; height: 2px;
  margin-left: -12px; border-radius: 50%; pointer-events: none;
  background: linear-gradient(to left, rgba(212,168,83,0.45) 0%, rgba(212,168,83,0.15) 40%, transparent 100%);
  filter: blur(3px); opacity: 0.6;
}
@keyframes ss-po { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
#ss-logo {
  position: relative; z-index: 10; width: 112px; height: 112px;
  border-radius: 50%; object-fit: cover;
  opacity: 0; transform: scale(0.92);
  animation: ss-lr 0.6s cubic-bezier(0.22,1,0.36,1) 0.5s both;
}
@keyframes ss-lr { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
#ss-brand {
  margin-top: 28px; font-family: Georgia,'Times New Roman',serif; font-size: 1.1rem;
  font-weight: 600; color: #D4A853; letter-spacing: 0.04em; text-align: center;
  opacity: 0; transform: translateY(8px);
  animation: ss-br 0.5s ease-out 0.8s both;
}
#ss-tagline {
  margin-top: 10px; font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase;
  color: rgba(212,168,83,0.8); text-align: center;
  opacity: 0; transform: translateY(6px);
  animation: ss-tr 0.5s ease-out 1.2s both;
}
@keyframes ss-br { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes ss-tr { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
`;

const SplashScreen = ({ onFinish, onExitStart }: { onFinish: () => void; onExitStart?: () => void }) => {
  const [phase, setPhase] = useState<'enter' | 'exit' | 'gone'>('enter');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      s.textContent = css;
      document.head.appendChild(s);
    }

    const timers = timersRef.current;
    const t = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      timers.push(id);
    };

    t(() => { setPhase('exit'); onExitStart?.(); }, 3200);
    t(() => { setPhase('gone'); onFinish?.(); }, 3800);

    return () => {
      timers.forEach(clearTimeout);
      document.body.style.overflow = '';
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === 'gone') return null;

  return (
    <div id="ss-root" className={phase === 'exit' ? 'fade' : ''}>
      <div id="ss-vignette" />
      <div id="ss-inner">
        <div id="ss-logo-area">
          <div id="ss-ambient" />
          <svg id="ss-ring-svg" viewBox="0 0 128 128" aria-hidden="true">
            <circle cx="64" cy="64" r="60" className="ss-ring-glow" />
            <circle cx="64" cy="64" r="60" className="ss-ring" />
          </svg>
          <div id="ss-particle-track">
            <div id="ss-particle-trail" />
            <div id="ss-particle" />
          </div>
          <img src={defaultLogo} alt="" id="ss-logo" />
        </div>
        <p id="ss-brand">Highlands Cafe & Motel Inn</p>
        <p id="ss-tagline">Premium Stays &bull; Great Coffee</p>
      </div>
    </div>
  );
};

export default SplashScreen;
