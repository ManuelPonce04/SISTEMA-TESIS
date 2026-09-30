import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { loginUser } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

/* ─── Íconos SVG inline (Lucide-style, 1.75px stroke) ──────── */
const IconMail = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const IconLock = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconEye = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconEyeOff = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const IconAlertCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const IconShield = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconArrowRight = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

/* Íconos educativos para el fondo */
const IconBook = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const IconGradCap = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
  </svg>
);
const IconGlobe = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const IconPencil = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
  </svg>
);
const IconCalc = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2"/>
    <line x1="8" y1="6" x2="16" y2="6"/>
    <line x1="8" y1="14" x2="8" y2="14"/>
    <line x1="12" y1="14" x2="12" y2="14"/>
    <line x1="16" y1="14" x2="16" y2="14"/>
    <line x1="8" y1="18" x2="8" y2="18"/>
    <line x1="12" y1="18" x2="12" y2="18"/>
    <line x1="16" y1="18" x2="16" y2="18"/>
  </svg>
);
const IconCoin = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v2m0 8v2M9.5 9a2.5 2.5 0 0 1 5 0c0 2-5 3-5 5a2.5 2.5 0 0 0 5 0"/>
  </svg>
);

/* ─── Componente Splash inline ─────────────────────────────── */
const SplashOverlay = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('enter');
  const [dots, setDots]   = useState('');
  const [progress, setProgress] = useState(0);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const d = setInterval(() => setDots(p => p.length >= 3 ? '' : p + '.'), 450);
    return () => clearInterval(d);
  }, []);

  useEffect(() => {
    const start = performance.now();
    const dur   = 1800; // ms
    const raf = (ts) => {
      const pct = Math.min(((ts - start) / dur) * 100, 100);
      setProgress(pct);
      if (pct < 100) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(() => {
        sessionStorage.setItem('splash_shown', '1');
        navigate('/dashboard', { replace: true });
      }, 1600);
      return () => clearTimeout(t);
    }
    const t1 = setTimeout(() => setPhase('pulse'), 350);
    const t2 = setTimeout(() => setPhase('exit'),  1900);
    const t3 = setTimeout(() => {
      sessionStorage.setItem('splash_shown', '1');
      navigate('/dashboard', { replace: true });
    }, 2350);
    return () => [t1, t2, t3].forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoSize = phase === 'pulse' ? 'scale(1.35)' : 'scale(1)';
  const opacity  = phase === 'exit'  ? 0 : 1;

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999, overflow:'hidden',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg,#FFFFFF 0%,#EAF7FE 55%,#FFFBEA 100%)',
      opacity, transition: reduced ? 'none' : 'opacity 0.45s ease',
    }}>
      {/* Franja */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:4,
        background:'linear-gradient(90deg,#00A8E8,#FFC400)',zIndex:1}}/>

      {/* Blobs */}
      <div style={{position:'absolute',width:520,height:520,borderRadius:'50%',
        background:'rgba(0,168,232,0.18)',filter:'blur(80px)',top:-160,right:-80,pointerEvents:'none'}}/>
      <div style={{position:'absolute',width:460,height:460,borderRadius:'50%',
        background:'rgba(255,196,0,0.15)',filter:'blur(80px)',bottom:-140,left:-100,pointerEvents:'none'}}/>

      {/* Logo con anillo de progreso SVG */}
      <div style={{
        position:'relative', width:160, height:160, marginBottom:'1.5rem',
        transform: reduced ? 'none' : logoSize,
        transition: reduced ? 'none' : 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Anillo SVG */}
        <svg style={{position:'absolute',inset:0,width:'100%',height:'100%'}}
          viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="72" fill="none" stroke="#E2E8F0" strokeWidth="3"/>
          <circle cx="80" cy="80" r="72" fill="none"
            stroke="url(#splashGrad)" strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 72}`}
            strokeDashoffset={`${2 * Math.PI * 72 * (1 - progress / 100)}`}
            transform="rotate(-90 80 80)"
            style={{transition:'stroke-dashoffset 0.08s linear'}}
          />
          <defs>
            <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00A8E8"/>
              <stop offset="100%" stopColor="#FFC400"/>
            </linearGradient>
          </defs>
        </svg>
        <img src={logo} alt="Logo UE Juan León Mera"
          style={{
            position:'absolute', top:'50%', left:'50%',
            width:96, height:96, objectFit:'contain',
            transform:'translate(-50%,-50%)',
            filter:'drop-shadow(0 8px 18px rgba(0,168,232,0.3))',
            mixBlendMode:'multiply',
          }}
        />
      </div>

      {/* Textos */}
      <h1 style={{
        fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",
        fontSize:'1.2rem', fontWeight:700, color:'#0B2545',
        letterSpacing:'0.01em', marginBottom:'0.3rem',
      }}>
        Unidad Educativa Juan León Mera
      </h1>
      <p style={{
        fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",
        fontSize:'0.85rem', color:'#64748B', minHeight:'1.3em',
      }}>
        Cargando sistema{dots}
      </p>

      {/* Barra de progreso */}
      <div style={{
        marginTop:'1.75rem', width:220, height:4, borderRadius:999,
        background:'#E2E8F0', overflow:'hidden',
      }}>
        <div style={{
          height:'100%', borderRadius:999,
          background:'linear-gradient(90deg,#00A8E8,#FFC400)',
          width:`${progress}%`,
          transition:'width 0.08s linear',
        }}/>
      </div>

      {/* Tres puntos rebotando */}
      <div style={{marginTop:'1rem',display:'flex',gap:'0.4rem',alignItems:'center'}}>
        {[0,1,2].map(i => (
          <span key={i} style={{
            width:6, height:6, borderRadius:'50%',
            background:'#00A8E8', display:'inline-block',
            animation: reduced ? 'none' : `splash-bounce 0.9s ${i * 0.18}s ease-in-out infinite`,
          }}/>
        ))}
      </div>
      <style>{`
        @keyframes splash-bounce {
          0%,100% { transform: translateY(0); opacity:.5; }
          50%      { transform: translateY(-6px); opacity:1; }
        }
      `}</style>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL: Login
   ══════════════════════════════════════════════════════════════ */
const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock,     setCapsLock]     = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [isSuccess,    setIsSuccess]    = useState(false);
  const [showSplash,   setShowSplash]   = useState(false);
  const [authError,    setAuthError]    = useState('');
  const [shakeKey,     setShakeKey]     = useState(0);

  const cardRef    = useRef(null);
  const correoRef  = useRef(null);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  /* ── Autofocus al montar ──────────────────────────────────── */
  useEffect(() => { correoRef.current?.focus(); }, []);

  /* ── Detectar Bloq Mayús ─────────────────────────────────── */
  const handleKeyUp = useCallback((e) => {
    if (e.key === 'CapsLock') {
      setCapsLock(e.getModifierState?.('CapsLock') ?? false);
    }
  }, []);
  const handleKeyDown = useCallback((e) => {
    const caps = e.getModifierState?.('CapsLock') ?? false;
    setCapsLock(caps);
  }, []);

  /* ── Spotlight: el brillo sigue al cursor ────────────────── */
  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width)  * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    cardRef.current.style.setProperty('--mx', `${x}%`);
    cardRef.current.style.setProperty('--my', `${y}%`);
  }, []);

  /* ── react-hook-form ──────────────────────────────────────── */
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm({ mode: 'onBlur' });

  /* ── Submit ───────────────────────────────────────────────── */
  const onSubmit = async (data) => {
    setIsLoading(true);
    setAuthError('');
    try {
      const response = await loginUser(data.correo, data.password, data.recordarme);
      if (response.success) {
        login(response.token, response.usuario, data.recordarme);
        setIsSuccess(true);
        // Botón verde → splash tras breve pausa
        setTimeout(() => setShowSplash(true), 750);
      }
    } catch (error) {
      const msg =
        error?.response?.status === 429
          ? 'Demasiados intentos. Espera un momento antes de reintentar.'
          : error?.response?.status === 403
          ? 'Tu cuenta está inactiva. Contacta al administrador.'
          : 'Correo o contraseña incorrectos.';
      setAuthError(msg);
      setShakeKey(k => k + 1); // re-activa la animación shake
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Si hay splash, renderizarlo ─────────────────────────── */
  if (showSplash) return <SplashOverlay />;

  /* ─── Renderizado del login ─────────────────────────────── */
  return (
    <div className="lg3-root" role="main">

      {/* ── Manchas mesh ── */}
      <div className="lg3-mesh" aria-hidden="true">
        <div className="lg3-blob lg3-blob-1" />
        <div className="lg3-blob lg3-blob-2" />
        <div className="lg3-blob lg3-blob-3" />
      </div>

      {/* ── Íconos educativos flotantes ── */}
      <div className="lg3-icons" aria-hidden="true">
        <span className="lg3-icon lg3-icon-1"><IconBook /></span>
        <span className="lg3-icon lg3-icon-2"><IconGradCap /></span>
        <span className="lg3-icon lg3-icon-3"><IconGlobe /></span>
        <span className="lg3-icon lg3-icon-4"><IconPencil /></span>
        <span className="lg3-icon lg3-icon-5"><IconCalc /></span>
        <span className="lg3-icon lg3-icon-6"><IconCoin /></span>
      </div>

      {/* ── Tarjeta ── */}
      <div
        ref={cardRef}
        className="lg3-card"
        onMouseMove={handleMouseMove}
        key={shakeKey > 0 ? `card-${shakeKey}` : 'card'}
        style={{ animationName: shakeKey > 0 ? 'lg3-shake' : 'lg3-enter' }}
      >
        {/* Spotlight (sigue al cursor) */}
        <div className="lg3-spotlight" aria-hidden="true" />

        {/* ── Header ── */}
        <header className="lg3-header">
          {/* Logo + halo */}
          <div className="lg3-logo-halo" aria-hidden="true">
            <div className="lg3-logo-ring" />
            <img
              src={logo}
              alt="Escudo institucional de la Unidad Educativa Juan León Mera"
              className="lg3-logo-img"
            />
          </div>

          <p className="lg3-label-ue">Unidad Educativa</p>

          <h1 className="lg3-name">
            Juan León Mera
            {/* Subrayado SVG animado bajo "Mera" */}
            <svg className="lg3-underline" viewBox="0 0 52 5" aria-hidden="true">
              <path d="M2 3 Q13 1 26 3 Q39 5 50 3" />
            </svg>
          </h1>

          <div className="lg3-sep" aria-hidden="true" />

          <p className="lg3-subtitle">Sistema de Cobranzas y Control Financiero</p>
        </header>

        {/* ── Formulario ── */}
        <form
          id="form-login"
          onSubmit={handleSubmit(onSubmit)}
          className="lg3-form"
          noValidate
          aria-label="Formulario de inicio de sesión"
        >
          {/* Alerta de error de credenciales */}
          {authError && (
            <div
              className="lg3-alert"
              role="alert"
              aria-live="polite"
              key={`alert-${shakeKey}`}
            >
              <IconAlertCircle />
              <span>{authError}</span>
            </div>
          )}

          {/* Campo: correo */}
          <div className="lg3-group">
            <label htmlFor="correo" className="lg3-label">
              Correo electrónico
            </label>
            <div className="lg3-input-wrap">
              <span className="lg3-icon-l" aria-hidden="true"><IconMail /></span>
              <input
                id="correo"
                type="email"
                placeholder="usuario@juanleonmera.edu.ec"
                autoComplete="email"
                inputMode="email"
                className={`lg3-input${errors.correo ? ' lg3-err' : ''}`}
                aria-describedby={errors.correo ? 'error-correo' : undefined}
                aria-invalid={!!errors.correo}
                {...register('correo', {
                  required: 'El correo es requerido',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Ingresa un correo válido',
                  },
                })}
              />
            </div>
            {errors.correo && (
              <span id="error-correo" className="lg3-field-err" role="alert">
                <IconAlertCircle /> {errors.correo.message}
              </span>
            )}
          </div>

          {/* Campo: contraseña */}
          <div className="lg3-group">
            <label htmlFor="password" className="lg3-label">
              Contraseña
            </label>
            <div className="lg3-input-wrap">
              <span className="lg3-icon-l" aria-hidden="true"><IconLock /></span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`lg3-input lg3-has-r${errors.password ? ' lg3-err' : ''}`}
                onKeyUp={handleKeyUp}
                onKeyDown={handleKeyDown}
                aria-describedby={[
                  errors.password ? 'error-password' : '',
                  capsLock         ? 'caps-warn'      : '',
                ].filter(Boolean).join(' ') || undefined}
                aria-invalid={!!errors.password}
                {...register('password', {
                  required: 'La contraseña es requerida',
                  minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                })}
              />
              <button
                type="button"
                className="lg3-icon-r"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
            {errors.password && (
              <span id="error-password" className="lg3-field-err" role="alert">
                <IconAlertCircle /> {errors.password.message}
              </span>
            )}
            {capsLock && (
              <span id="caps-warn" className="lg3-caps" aria-live="polite">
                ⚠ Bloq Mayús activado
              </span>
            )}
          </div>

          {/* Recordarme */}
          <div className="lg3-row-bottom">
            <label className="lg3-check-label">
              <span className="lg3-checkbox">
                <input
                  id="recordarme"
                  type="checkbox"
                  {...register('recordarme')}
                />
                <span className="lg3-checkbox-box" aria-hidden="true">
                  {/* Check SVG animado */}
                  <svg className="lg3-check-svg" viewBox="0 0 10 10"
                    fill="none" stroke="#0B2545" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1.5,5 4,7.5 8.5,2.5"/>
                  </svg>
                </span>
              </span>
              <span className="lg3-check-text">Recordarme en este dispositivo</span>
            </label>
          </div>

          {/* Botón Iniciar sesión */}
          <button
            id="btn-login"
            type="submit"
            disabled={isLoading || isSuccess}
            className={`lg3-btn${isSuccess ? ' lg3-btn-ok' : ''}`}
            aria-label="Iniciar sesión"
          >
            <span className="lg3-btn-inner">
              {isLoading ? (
                <>
                  <span className="lg3-spinner" aria-hidden="true" />
                  Ingresando...
                </>
              ) : isSuccess ? (
                <>
                  {/* Check animado éxito */}
                  <svg className="lg3-check-ok" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Acceso concedido
                </>
              ) : (
                <>
                  Iniciar sesión
                  <IconArrowRight className="lg3-arrow" />
                </>
              )}
            </span>
          </button>
        </form>

        {/* ── Pie de la tarjeta ── */}
        <footer className="lg3-footer-card">
          <p className="lg3-footer-copy">
            © {new Date().getFullYear()} Unidad Educativa Juan León Mera<br />
            Todos los derechos reservados
          </p>
          <span className="lg3-secure" aria-label="Conexión segura">
            <IconShield />
            Conexión segura
          </span>
        </footer>
      </div>
    </div>
  );
};

export default Login;
