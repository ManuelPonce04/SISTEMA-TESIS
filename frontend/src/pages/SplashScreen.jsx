import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

/**
 * SplashScreen — se muestra UNA vez por sesión después de hacer login.
 * La bandera 'splash_shown' en sessionStorage evita que se repita.
 * Props:
 *  - duration: ms mínimos visibles (default 2000)
 *  - onReady: callback que el padre llama cuando el dashboard está listo
 */
const SplashScreen = ({ duration = 2200, onComplete }) => {
  const [phase, setPhase] = useState('enter');   // 'enter' | 'pulse' | 'exit'
  const [error, setError] = useState(false);
  const [dots, setDots] = useState('');
  const timerRef = useRef(null);
  const navigate  = useNavigate();
  const reduced   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Animación de puntos suspensivos */
  useEffect(() => {
    const id = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 480);
    return () => clearInterval(id);
  }, []);

  /* Flujo de fases */
  useEffect(() => {
    if (reduced) {
      // Sin animaciones: esperar y redirigir
      timerRef.current = setTimeout(() => finish(), duration);
      return () => clearTimeout(timerRef.current);
    }

    // Fase enter (fade+zoom)
    timerRef.current = setTimeout(() => {
      setPhase('pulse');
      // Fase pulse → exit
      timerRef.current = setTimeout(() => {
        setPhase('exit');
        // Tras fade-out → navegar
        timerRef.current = setTimeout(() => finish(), 500);
      }, duration - 700);
    }, 400);

    return () => clearTimeout(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    sessionStorage.setItem('splash_shown', '1');
    if (onComplete) onComplete();
    else navigate('/dashboard', { replace: true });
  };

  const handleRetry = () => {
    setError(false);
    setPhase('enter');
    finish();
  };

  /* ─── Estilos en-línea para no depender de clases externas ─── */
  const overlay = {
    position:       'fixed',
    inset:          0,
    zIndex:         9999,
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    background:     'linear-gradient(160deg, #f0faff 0%, #e8f8ff 40%, #ffffff 100%)',
    opacity:        phase === 'exit' ? 0 : 1,
    transition:     reduced ? 'none' : 'opacity 0.5s ease',
    overflow:       'hidden',
  };

  const bgCircle1 = {
    position:     'absolute',
    width:        500,
    height:       500,
    borderRadius: '50%',
    background:   'radial-gradient(circle, rgba(0,174,239,0.07) 0%, transparent 70%)',
    top:          -120,
    right:        -120,
    pointerEvents:'none',
  };
  const bgCircle2 = {
    position:     'absolute',
    width:        350,
    height:       350,
    borderRadius: '50%',
    background:   'radial-gradient(circle, rgba(255,214,0,0.08) 0%, transparent 70%)',
    bottom:       -80,
    left:         -80,
    pointerEvents:'none',
  };

  const logoWrap = {
    position:  'relative',
    marginBottom: '2rem',
    transform: !reduced && phase === 'enter' ? 'scale(0.85) translateY(12px)' : 'scale(1) translateY(0)',
    opacity:   !reduced && phase === 'enter' ? 0 : 1,
    transition: reduced ? 'none' : 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.5s ease',
  };

  const logoImg = {
    width:     120,
    height:    120,
    objectFit: 'contain',
    filter:    'drop-shadow(0 8px 24px rgba(0,174,239,0.25))',
    animation: !reduced && phase === 'pulse' ? 'splash-pulse 1.6s ease-in-out infinite' : 'none',
  };

  const ringStyle = {
    position:     'absolute',
    inset:        -10,
    borderRadius: '50%',
    border:       '2.5px solid transparent',
    borderTopColor: '#00AEEF',
    borderRightColor: '#FFD600',
    animation:    !reduced && phase === 'pulse' ? 'splash-spin 1.2s linear infinite' : 'none',
    opacity:      phase === 'pulse' ? 1 : 0,
    transition:   'opacity 0.4s ease',
  };

  return (
    <div style={overlay} role="status" aria-label="Cargando sistema">
      {/* Elementos decorativos de fondo */}
      <div style={bgCircle1} />
      <div style={bgCircle2} />

      {/* Logo con anillo giratorio */}
      <div style={logoWrap}>
        <div style={ringStyle} />
        <img src={logo} alt="Logo Unidad Educativa Juan León Mera" style={logoImg} />
      </div>

      {/* Textos */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <h1 style={{
          fontSize:    '1.15rem',
          fontWeight:  700,
          color:       '#0f172a',
          letterSpacing: '0.01em',
          marginBottom: '0.3rem',
          fontFamily:  "'Inter', sans-serif",
        }}>
          Unidad Educativa Juan León Mera
        </h1>
        <p style={{
          fontSize:    '0.88rem',
          color:       '#64748b',
          fontFamily:  "'Inter', sans-serif",
          minHeight:   '1.4em',
        }}>
          {error ? '' : `Cargando sistema${dots}`}
        </p>
      </div>

      {/* Barra de progreso */}
      {!error && (
        <div style={{
          marginTop:    '2rem',
          width:        220,
          height:       3,
          borderRadius: 999,
          background:   '#e2e8f0',
          overflow:     'hidden',
          zIndex:       1,
        }}>
          <div style={{
            height:     '100%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #00AEEF, #FFD600)',
            animation:  reduced ? 'none' : `splash-progress ${duration / 1000}s ease-in-out forwards`,
          }} />
        </div>
      )}

      {/* Estado de error */}
      {error && (
        <div style={{
          marginTop:    '1.5rem',
          textAlign:    'center',
          zIndex:       1,
        }}>
          <p style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '1rem', fontFamily: "'Inter', sans-serif" }}>
            Ocurrió un error al cargar el sistema.
          </p>
          <button
            onClick={handleRetry}
            style={{
              background:   'linear-gradient(135deg, #00AEEF, #0097d4)',
              color:        '#fff',
              border:       'none',
              borderRadius: '0.75rem',
              padding:      '0.6rem 1.5rem',
              fontSize:     '0.88rem',
              fontWeight:   600,
              cursor:       'pointer',
              fontFamily:   "'Inter', sans-serif",
              boxShadow:    '0 4px 16px rgba(0,174,239,0.3)',
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Keyframes inyectados */}
      <style>{`
        @keyframes splash-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes splash-pulse {
          0%, 100% { filter: drop-shadow(0 8px 24px rgba(0,174,239,0.25)); }
          50%       { filter: drop-shadow(0 8px 32px rgba(0,174,239,0.55)); }
        }
        @keyframes splash-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
