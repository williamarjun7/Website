import { useEffect, useRef, useState } from 'react';
import defaultLogo from '../../assets/logo.png';

const SplashScreen = ({ onFinish, onExitStart }: { onFinish: () => void; onExitStart?: () => void }) => {
  const [phase, setPhase] = useState<'enter' | 'exit' | 'gone'>('enter');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const skipSplash = typeof window !== 'undefined' && sessionStorage.getItem('ss_visited');
    if (skipSplash) {
      onExitStart?.();
      setPhase('gone');
      onFinish();
      return;
    }

    document.body.style.overflow = 'hidden';

    const timers = timersRef.current;
    const t = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      timers.push(id);
    };

    t(() => { setPhase('exit'); onExitStart?.(); }, 2200);
    t(() => {
      sessionStorage.setItem('ss_visited', '1');
      setPhase('gone');
      onFinish?.();
    }, 2800);

    return () => {
      timers.forEach(clearTimeout);
      document.body.style.overflow = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === 'gone') return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#070707',
        opacity: phase === 'exit' ? 0 : 1,
        transition: 'opacity 0.6s ease-in',
      }}
    >
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.5) 100%)',
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 300, height: 300, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle at center, rgba(212,168,83,0.15) 0%, rgba(212,168,83,0.04) 35%, transparent 65%)',
          opacity: 0.4,
        }} />
        <div style={{ position: 'relative', width: 128, height: 128, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 128 128" aria-hidden="true">
            <circle cx="64" cy="64" r="60" fill="none" stroke="rgba(212,168,83,0.45)" strokeWidth="4"
              filter="url(#blur)" strokeDasharray="377" strokeDashoffset="0" opacity="0.6" />
            <circle cx="64" cy="64" r="60" fill="none" stroke="#D4A853" strokeWidth="2.5"
              strokeDasharray="377" strokeDashoffset="0" />
          </svg>
          <img
            src={defaultLogo}
            alt=""
            style={{ position: 'relative', zIndex: 10, width: 112, height: 112, borderRadius: '50%', objectFit: 'cover' }}
          />
        </div>
        <p style={{
          marginTop: 28, fontFamily: 'Georgia,"Times New Roman",serif', fontSize: '1.1rem',
          fontWeight: 600, color: '#D4A853', letterSpacing: '0.04em', textAlign: 'center',
        }}>Highlands Cafe & Motel Inn</p>
        <p style={{
          marginTop: 10, fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase',
          color: 'rgba(212,168,83,0.8)', textAlign: 'center',
        }}>Premium Stays &bull; Great Coffee</p>
      </div>
    </div>
  );
};

export default SplashScreen;