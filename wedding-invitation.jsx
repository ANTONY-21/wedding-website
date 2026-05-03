import { useState, useEffect, useRef, useCallback, useMemo, useContext, createContext, Component, Suspense } from "react";

// ─── PERSISTED STATE HOOK (localStorage) ────────────────────────────────────
function usePersistedState(key, initial) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

// ─── HASH ROUTING HOOK ──────────────────────────────────────────────────────
function useHashRoute(defaultRoute = "home") {
  const parse = () => {
    if (typeof window === "undefined") return defaultRoute;
    const h = window.location.hash.replace(/^#\/?/, "").trim();
    return h || defaultRoute;
  };
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onHash = () => setRoute(parse());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const navigate = useCallback((next) => {
    if (typeof window !== "undefined") {
      window.location.hash = `/${next}`;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);
  return [route, navigate];
}

// ─── SCROLL REVEAL HOOK ─────────────────────────────────────────────────────
function useScrollReveal(opts = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || !ref.current) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        obs.disconnect();
      }
    }, { threshold: opts.threshold ?? 0.15, rootMargin: opts.rootMargin ?? "0px 0px -60px 0px" });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

// ─── REVEAL WRAPPER ─────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, as = "div", style = {}, className = "" }) {
  const [ref, visible] = useScrollReveal();
  const Tag = as;
  return (
    <Tag ref={ref} className={className} style={{
      ...style,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(30px)",
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      willChange: "opacity, transform",
    }}>{children}</Tag>
  );
}

// ─── THEME / LANGUAGE CONTEXT ───────────────────────────────────────────────
const AppContext = createContext({ theme: "light", lang: "en", setTheme: () => {}, setLang: () => {} });

const TRANSLATIONS = {
  en: {
    rsvp: "RSVP", story: "Story", events: "Events", gallery: "Gallery", more: "More", home: "Home",
    rsvpNow: "RSVP Now", ourStory: "Our Story",
    addToCal: "Add to Calendar", share: "Share", directions: "Directions",
    countdown: "Counting Down", days: "Days", hours: "Hours", mins: "Mins", secs: "Secs",
    weddingDay: "Wedding Day", together: "Together in Faith & Love",
    confirmed: "You're Confirmed!", weCantWait: "We can't wait to celebrate with you,",
    leaveBlessing: "Leave a Blessing", saveDate: "Save the Date",
  },
  ta: {
    rsvp: "வருகை", story: "கதை", events: "நிகழ்வுகள்", gallery: "புகைப்படங்கள்", more: "மேலும்", home: "முகப்பு",
    rsvpNow: "வருகை உறுதி", ourStory: "எங்கள் கதை",
    addToCal: "காலெண்டரில் சேர்", share: "பகிர்", directions: "வழி",
    countdown: "எண்ணிக்கை", days: "நாட்கள்", hours: "மணி", mins: "நிமிடம்", secs: "வி",
    weddingDay: "திருமண நாள்", together: "விசுவாசம் மற்றும் அன்பில்",
    confirmed: "உறுதி செய்யப்பட்டது!", weCantWait: "உங்களுடன் கொண்டாட காத்திருக்கிறோம்,",
    leaveBlessing: "ஆசீர்வாதம்", saveDate: "தேதி பதிவு",
  },
};

function useT() {
  const { lang } = useContext(AppContext);
  return TRANSLATIONS[lang] || TRANSLATIONS.en;
}

// ─── ERROR BOUNDARY ─────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, err: null };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, err };
  }
  componentDidCatch(err, info) {
    if (typeof console !== "undefined") {
      console.error("ErrorBoundary:", err, info);
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          background: "#1A1209", color: "#E8D5A3", padding: 24, textAlign: "center",
          fontFamily: "Cormorant Garamond, serif",
        }}>
          <div>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✦</div>
            <h2 style={{ fontFamily: "Cinzel, serif", fontSize: 24, marginBottom: 12 }}>Something went sideways</h2>
            <p style={{ fontSize: 16, marginBottom: 24, opacity: 0.7, fontStyle: "italic" }}>
              {this.state.err?.message || "An unexpected error occurred"}
            </p>
            <button onClick={() => window.location.reload()}
              style={{ background: "#C9A96E", color: "#1A1209", border: "none", borderRadius: 50,
                padding: "12px 32px", fontFamily: "Cinzel, serif", letterSpacing: 2, cursor: "pointer", fontSize: 13 }}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── LOADING SPLASH ─────────────────────────────────────────────────────────
function LoadingSplash({ done }) {
  return (
    <div aria-hidden={done} style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "radial-gradient(ellipse at center, #2D1F0E 0%, #1A1209 70%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: done ? 0 : 1,
      pointerEvents: done ? "none" : "all",
      transition: "opacity 0.8s ease",
    }}>
      <div style={{ fontFamily: "Cinzel, serif", color: "#C9A96E", fontSize: 32, letterSpacing: 8, marginBottom: 24, animation: "pulse 1.6s ease-in-out infinite" }}>
        A ✦ M
      </div>
      <div style={{ width: 160, height: 2, background: "linear-gradient(90deg, transparent, #C9A96E, transparent)" }} />
      <div style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "rgba(232,213,163,0.6)", fontSize: 14, marginTop: 24, letterSpacing: 2 }}>
        preparing your invitation…
      </div>
    </div>
  );
}

// ─── GOOGLE MAPS EMBED ──────────────────────────────────────────────────────
function GoogleMapsEmbed({ query, height = 280 }) {
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  return (
    <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(201,169,110,0.3)", boxShadow: "0 8px 30px rgba(0,0,0,0.1)" }}>
      <iframe
        title={`Map of ${query}`}
        src={src}
        width="100%"
        height={height}
        style={{ border: 0, display: "block" }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

// ─── SAVE THE DATE IMAGE GENERATOR ──────────────────────────────────────────
function SaveTheDateButton({ couple }) {
  const generate = useCallback(() => {
    const W = 1080, H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#1A1209");
    grad.addColorStop(0.5, "#2D1F0E");
    grad.addColorStop(1, "#1A1209");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(201,169,110,0.6)";
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, W - 120, H - 120);
    ctx.strokeStyle = "rgba(201,169,110,0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(80, 80, W - 160, H - 160);

    ctx.fillStyle = "#C9A96E";
    ctx.font = "italic 28px 'Cormorant Garamond', Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("Save the Date", W / 2, 220);

    ctx.beginPath();
    ctx.moveTo(W / 2 - 80, 250);
    ctx.lineTo(W / 2 + 80, 250);
    ctx.strokeStyle = "#C9A96E";
    ctx.stroke();
    ctx.fillStyle = "#C9A96E";
    ctx.font = "32px serif";
    ctx.fillText("✦", W / 2, 290);

    ctx.fillStyle = "#E8D5A3";
    ctx.font = "300 90px 'Cormorant Garamond', Georgia, serif";
    ctx.fillText(couple.groom, W / 2, 480);

    ctx.fillStyle = "#C4847A";
    ctx.font = "italic 60px 'Cormorant Garamond', Georgia, serif";
    ctx.fillText("&", W / 2, 580);

    ctx.fillStyle = "#E8D5A3";
    ctx.font = "300 78px 'Cormorant Garamond', Georgia, serif";
    ctx.fillText(couple.bride, W / 2, 700);

    ctx.fillStyle = "rgba(201,169,110,0.7)";
    ctx.font = "20px serif";
    ctx.fillText("✦  ✦  ✦", W / 2, 780);

    ctx.fillStyle = "#C9A96E";
    ctx.font = "600 56px 'Cinzel', Georgia, serif";
    ctx.fillText("SUN · 21 JUNE 2026 · 9:30 AM", W / 2, 880);

    ctx.fillStyle = "rgba(232,213,163,0.7)";
    ctx.font = "italic 26px 'Cormorant Garamond', Georgia, serif";
    ctx.fillText("Our Lady of Presentation Church", W / 2, 940);
    ctx.font = "italic 22px 'Cormorant Garamond', Georgia, serif";
    ctx.fillText("Neyveli Township, Tamil Nadu", W / 2, 975);

    ctx.fillStyle = "rgba(232,213,163,0.5)";
    ctx.font = "italic 24px 'Cormorant Garamond', Georgia, serif";
    ctx.fillText('"Two are better than one"', W / 2, 1080);
    ctx.font = "16px 'Cinzel', Georgia, serif";
    ctx.fillStyle = "rgba(201,169,110,0.5)";
    ctx.fillText("ECCLESIASTES 4:9", W / 2, 1110);

    ctx.fillStyle = "#C4847A";
    ctx.font = "600 22px 'Cinzel', Georgia, serif";
    ctx.fillText(couple.hashtag, W / 2, 1240);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "save-the-date-antony-maria.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png", 0.95);
  }, [couple]);

  return (
    <button onClick={generate} className="btn-outline" style={{ fontSize: 11, padding: "9px 22px", borderColor: "rgba(201,169,110,0.4)", color: "rgba(232,213,163,0.75)" }}>
      💾 Save the Date
    </button>
  );
}


// ─── GOOGLE FONTS ────────────────────────────────────────────────────────────
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Cinzel:wght@400;600;700&family=Lato:wght@300;400&display=swap');

    :root {
      --gold: #C9A96E;
      --gold-light: #E8D5A3;
      --gold-dark: #8B6914;
      --cream: #FDF8F0;
      --ivory: #FAF3E4;
      --deep: #1A1209;
      --brown: #3D2B1F;
      --rose: #C4847A;
      --sage: #7A9E7E;
      --navy: #1E2D4E;
      --blush: #F0D9D0;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Lato', sans-serif;
      background: var(--cream);
      color: var(--deep);
      overflow-x: hidden;
    }

    /* ── BUTTERFLY ── */
    @keyframes flyAway {
      0% { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; }
      30% { transform: translate(-40px,-60px) rotate(-20deg) scale(1.1); }
      60% { transform: translate(80px,-120px) rotate(15deg) scale(0.9); }
      100% { transform: translate(-200px,-300px) rotate(-30deg) scale(0.3); opacity: 0; }
    }
    @keyframes flutterWings {
      0%,100% { transform: scaleX(1); }
      50% { transform: scaleX(0.3); }
    }
    @keyframes floatButterfly {
      0% { transform: translate(0,0) rotate(5deg); }
      25% { transform: translate(15px,-10px) rotate(-3deg); }
      50% { transform: translate(5px,-20px) rotate(8deg); }
      75% { transform: translate(-10px,-10px) rotate(-5deg); }
      100% { transform: translate(0,0) rotate(5deg); }
    }
    .butterfly-container {
      position: fixed;
      z-index: 100;
      pointer-events: none;
      animation: floatButterfly 6s ease-in-out infinite;
    }
    .butterfly-container.fly {
      pointer-events: none;
      animation: flyAway 2.5s ease-in forwards;
    }
    .wing {
      display: inline-block;
      animation: flutterWings 0.4s ease-in-out infinite;
      transform-origin: center right;
    }
    .wing-r { transform-origin: center left; animation-delay: 0.2s; }

    /* ── ENVELOPE ── */
    @keyframes envelopeOpen {
      0% { transform: rotateX(0deg); }
      100% { transform: rotateX(-180deg); }
    }
    @keyframes letterRise {
      0% { transform: translateY(0) scaleY(0.2); opacity: 0; }
      100% { transform: translateY(-60px) scaleY(1); opacity: 1; }
    }
    @keyframes envelope3D {
      0% { transform: perspective(800px) rotateY(0deg); }
      100% { transform: perspective(800px) rotateY(360deg); }
    }

    /* ── SCRATCH CARD ── */
    .scratch-canvas { cursor: crosshair; touch-action: none; }

    /* ── GENERAL ANIMATIONS ── */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.85); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes bounceIn {
      0%   { opacity: 0; transform: scale(0.3); }
      50%  { opacity: 1; transform: scale(1.05); }
      70%  { transform: scale(0.9); }
      100% { transform: scale(1); }
    }
    @keyframes shimmer {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes pulse {
      0%,100% { opacity: 1; }
      50%      { opacity: 0.6; }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes countDown {
      from { transform: scale(1.2); opacity: 0.5; }
      to   { transform: scale(1); opacity: 1; }
    }
    @keyframes heartBeat {
      0%,100% { transform: scale(1); }
      14%     { transform: scale(1.3); }
      28%     { transform: scale(1); }
      42%     { transform: scale(1.3); }
      70%     { transform: scale(1); }
    }

    @keyframes fadeOut {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
    .animate-fadeInUp { animation: fadeInUp 0.8s ease both; }
    .animate-scaleIn  { animation: scaleIn 0.6s ease both; }
    .animate-bounceIn { animation: bounceIn 0.9s ease both; }
    .animate-fadeIn   { animation: fadeIn 1s ease both; }

    /* ── NAV ── */
    .nav {
      position: fixed; top: 0; left: 0; right: 0;
      z-index: 200;
      background: rgba(26,18,9,0.92);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(201,169,110,0.3);
      padding: 0 24px;
      display: flex; align-items: center; justify-content: space-between;
      height: 60px;
    }
    .nav-logo {
      font-family: 'Cinzel', serif;
      color: var(--gold);
      font-size: 18px;
      letter-spacing: 2px;
    }
    .nav-links { display: flex; gap: 4px; flex-wrap: wrap; }
    .nav-btn {
      background: none; border: none; cursor: pointer;
      color: rgba(232,213,163,0.7);
      font-family: 'Lato', sans-serif;
      font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase;
      padding: 6px 10px; border-radius: 4px;
      transition: all 0.2s;
    }
    .nav-btn:hover, .nav-btn.active {
      color: var(--gold);
      background: rgba(201,169,110,0.1);
    }

    /* ── PAGE ── */
    .page {
      min-height: 100vh;
      padding-top: 60px;
    }

    /* ── HERO ── */
    .hero {
      min-height: 100vh;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      text-align: center;
      background: linear-gradient(135deg, #1A1209 0%, #2D1F0E 40%, #1A1209 100%);
      position: relative; overflow: hidden;
      padding: 80px 24px 40px;
    }
    .hero::before {
      content: '';
      position: absolute; inset: 0;
      background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(201,169,110,0.08) 0%, transparent 70%);
    }
    .hero-ornament {
      font-size: 60px; color: var(--gold); opacity: 0.15;
      position: absolute; animation: pulse 3s ease-in-out infinite;
    }
    .hero-ornament.top-left  { top: 80px; left: 5%; font-size: 80px; }
    .hero-ornament.top-right { top: 80px; right: 5%; font-size: 80px; }
    .hero-ornament.bot-left  { bottom: 40px; left: 5%; font-size: 50px; }
    .hero-ornament.bot-right { bottom: 40px; right: 5%; font-size: 50px; }

    .hero-tag {
      font-family: 'Lato', sans-serif;
      font-size: 11px; letter-spacing: 4px; text-transform: uppercase;
      color: var(--gold); opacity: 0.8;
      margin-bottom: 24px;
      animation: fadeInUp 1s 0.2s both;
    }
    .hero-names {
      font-family: 'Cormorant Garamond', serif;
      font-size: clamp(56px, 12vw, 96px);
      font-weight: 300; line-height: 1;
      color: var(--gold-light);
      animation: fadeInUp 1s 0.4s both;
    }
    .hero-amp {
      font-family: 'Cormorant Garamond', serif;
      font-size: clamp(40px, 8vw, 72px);
      font-style: italic; font-weight: 300;
      color: var(--rose);
      display: block; margin: 8px 0;
      animation: fadeInUp 1s 0.6s both;
    }
    .hero-date {
      font-family: 'Cinzel', serif;
      font-size: 16px; letter-spacing: 4px;
      color: var(--gold); margin: 32px 0 16px;
      animation: fadeInUp 1s 0.8s both;
    }
    .hero-verse {
      font-family: 'Cormorant Garamond', serif;
      font-style: italic; font-size: 18px;
      color: rgba(232,213,163,0.6);
      max-width: 500px;
      animation: fadeInUp 1s 1s both;
      line-height: 1.6;
    }
    .hero-divider {
      width: 120px; height: 1px;
      background: linear-gradient(90deg, transparent, var(--gold), transparent);
      margin: 24px auto;
      animation: fadeInUp 1s 0.7s both;
    }

    /* ── CARDS ── */
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(201,169,110,0.2);
      border-radius: 16px;
      padding: 32px;
      transition: all 0.3s ease;
      position: relative; overflow: hidden;
    }
    .card::before {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(201,169,110,0.05) 0%, transparent 60%);
      opacity: 0; transition: opacity 0.3s;
    }
    .card:hover { transform: translateY(-4px); border-color: rgba(201,169,110,0.4); box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .card:hover::before { opacity: 1; }

    .card-light {
      background: white;
      border: 1px solid rgba(201,169,110,0.15);
      border-radius: 16px;
      padding: 32px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }
    .card-light:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.12); border-color: var(--gold); }

    /* ── BUTTONS ── */
    .btn-primary {
      background: linear-gradient(135deg, var(--gold-dark), var(--gold), var(--gold-dark));
      background-size: 200% auto;
      color: var(--deep);
      border: none; border-radius: 50px;
      padding: 14px 36px;
      font-family: 'Cinzel', serif;
      font-size: 13px; letter-spacing: 2px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 20px rgba(201,169,110,0.3);
    }
    .btn-primary:hover {
      background-position: right center;
      box-shadow: 0 8px 30px rgba(201,169,110,0.5);
      transform: translateY(-2px);
    }
    .btn-primary:active { transform: translateY(0); }

    .btn-outline {
      background: transparent;
      color: var(--gold);
      border: 1px solid var(--gold);
      border-radius: 50px;
      padding: 12px 32px;
      font-family: 'Cinzel', serif;
      font-size: 13px; letter-spacing: 2px;
      cursor: pointer;
      transition: all 0.3s;
    }
    .btn-outline:hover {
      background: var(--gold);
      color: var(--deep);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(201,169,110,0.3);
    }

    /* ── SECTION ── */
    .section {
      padding: 80px 24px;
      max-width: 1100px;
      margin: 0 auto;
    }
    .section-title {
      font-family: 'Cinzel', serif;
      font-size: clamp(28px, 5vw, 42px);
      color: var(--deep);
      text-align: center;
      margin-bottom: 8px;
    }
    .section-title-light {
      font-family: 'Cinzel', serif;
      font-size: clamp(28px, 5vw, 42px);
      color: var(--gold-light);
      text-align: center;
      margin-bottom: 8px;
    }
    .section-sub {
      font-family: 'Cormorant Garamond', serif;
      font-style: italic;
      font-size: 18px; color: rgba(61,43,31,0.6);
      text-align: center; margin-bottom: 48px;
    }
    .section-sub-light {
      font-family: 'Cormorant Garamond', serif;
      font-style: italic;
      font-size: 18px; color: rgba(232,213,163,0.6);
      text-align: center; margin-bottom: 48px;
    }
    .gold-divider {
      width: 80px; height: 2px;
      background: linear-gradient(90deg, transparent, var(--gold), transparent);
      margin: 16px auto 48px;
    }

    /* ── GRID ── */
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
    .grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }

    /* ── TIMER ── */
    .timer-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; max-width: 500px; margin: 0 auto; }
    .timer-cell {
      background: rgba(201,169,110,0.1);
      border: 1px solid rgba(201,169,110,0.3);
      border-radius: 12px; padding: 20px 10px;
      text-align: center; animation: countDown 1s ease;
    }
    .timer-num {
      font-family: 'Cinzel', serif;
      font-size: clamp(32px,6vw,48px);
      color: var(--gold);
      display: block; line-height: 1;
    }
    .timer-label {
      font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
      color: rgba(232,213,163,0.5); margin-top: 6px; display: block;
    }

    /* ── TIMELINE ── */
    .timeline { position: relative; padding: 20px 0; }
    .timeline::before {
      content: ''; position: absolute; left: 50%; top: 0; bottom: 0;
      width: 1px; background: linear-gradient(180deg, transparent, var(--gold), transparent);
      transform: translateX(-50%);
    }
    .timeline-item {
      display: flex; gap: 40px; margin-bottom: 48px;
      animation: fadeInUp 0.6s ease both;
    }
    .timeline-item:nth-child(odd)  { flex-direction: row; }
    .timeline-item:nth-child(even) { flex-direction: row-reverse; }
    .timeline-content {
      flex: 1; max-width: calc(50% - 40px);
    }
    .timeline-dot {
      width: 48px; height: 48px; flex-shrink: 0;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--gold-dark), var(--gold));
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; color: white;
      box-shadow: 0 0 0 6px rgba(201,169,110,0.15);
      z-index: 1;
    }

    /* ── GALLERY ── */
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px,1fr));
      gap: 12px;
    }
    .gallery-item {
      aspect-ratio: 1;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      cursor: pointer;
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .gallery-item:hover { transform: scale(1.04); box-shadow: 0 12px 40px rgba(0,0,0,0.2); }
    .gallery-img {
      width: 100%; height: 100%;
      object-fit: cover;
      transition: transform 0.4s;
    }
    .gallery-item:hover .gallery-img { transform: scale(1.08); }
    .gallery-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(201,169,110,0.6), rgba(26,18,9,0.4));
      opacity: 0; transition: opacity 0.3s;
      display: flex; align-items: center; justify-content: center;
      font-size: 32px;
    }
    .gallery-item:hover .gallery-overlay { opacity: 1; }

    /* ── RSVP FORM ── */
    .form-group { margin-bottom: 20px; }
    .form-label {
      display: block;
      font-family: 'Cinzel', serif;
      font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
      color: var(--gold-dark); margin-bottom: 8px;
    }
    .form-input, .form-select, .form-textarea {
      width: 100%;
      background: rgba(255,255,255,0.7);
      border: 1px solid rgba(201,169,110,0.3);
      border-radius: 10px;
      padding: 14px 18px;
      font-family: 'Lato', sans-serif;
      font-size: 15px; color: var(--deep);
      transition: all 0.2s;
      outline: none;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      border-color: var(--gold);
      box-shadow: 0 0 0 3px rgba(201,169,110,0.15);
      background: white;
    }
    .form-textarea { min-height: 120px; resize: vertical; }

    /* ── ENVELOPE ── */
    .envelope-wrapper {
      perspective: 1000px;
      width: 320px; height: 220px;
      margin: 0 auto;
      cursor: pointer;
    }
    .envelope-3d {
      width: 100%; height: 100%;
      position: relative;
      transform-style: preserve-3d;
      transition: transform 1s ease;
    }
    .envelope-3d.rotating { animation: envelope3D 3s linear; }
    .envelope-body {
      width: 100%; height: 100%;
      background: linear-gradient(135deg, #FAF3E4, #F5E6C8);
      border-radius: 12px;
      border: 2px solid var(--gold);
      position: relative; overflow: visible;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }
    .envelope-flap {
      position: absolute; top: -1px; left: 0; right: 0;
      height: 50%;
      background: linear-gradient(135deg, #E8D5A3, #D4B97A);
      border-radius: 12px 12px 0 0;
      border: 1px solid var(--gold);
      transform-origin: top center;
      transition: transform 1s ease;
      clip-path: polygon(0 0, 50% 100%, 100% 0);
      z-index: 10;
    }
    .envelope-flap.open { transform: rotateX(-180deg); }
    .envelope-letter {
      position: absolute;
      left: 10%; right: 10%;
      bottom: 10%;
      background: white;
      border-radius: 8px;
      padding: 20px;
      border: 1px solid rgba(201,169,110,0.3);
      transform: translateY(0) scaleY(0);
      transition: transform 1s ease 0.5s;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .envelope-letter.open { transform: translateY(-70px) scaleY(1); }

    /* ── SCRATCH CARD ── */
    .scratch-wrapper {
      position: relative; width: 320px; height: 240px; margin: 0 auto;
      border-radius: 16px; overflow: hidden;
      box-shadow: 0 12px 40px rgba(0,0,0,0.2);
    }
    .scratch-reveal {
      position: absolute; inset: 0;
      background: linear-gradient(135deg, var(--gold-dark), var(--gold), var(--gold-dark));
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      font-family: 'Cormorant Garamond', serif;
      color: white;
      line-height: 1.5; text-align: center; padding: 22px 24px;
    }
    .scratch-progress-bar {
      height: 4px; border-radius: 2px;
      background: rgba(201,169,110,0.2);
      margin-top: 12px; overflow: hidden;
    }
    .scratch-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--gold-dark), var(--gold));
      transition: width 0.3s ease;
    }

    /* ── EVENTS ── */
    .event-card {
      border-radius: 20px; padding: 40px; position: relative; overflow: hidden;
      animation: fadeInUp 0.6s ease both;
    }
    .event-card-1 { background: linear-gradient(135deg, #1E2D4E, #2A3F6E); color: white; }
    .event-card-2 { background: linear-gradient(135deg, #3D1A1A, #6B2D2D); color: white; }
    .event-card-3 { background: linear-gradient(135deg, #1A3D2B, #2D6B4E); color: white; }

    /* ── SCRIPTURE ── */
    .scripture {
      background: linear-gradient(135deg, rgba(201,169,110,0.1), rgba(196,132,122,0.1));
      border-left: 3px solid var(--gold);
      border-radius: 0 12px 12px 0;
      padding: 24px 32px;
      font-family: 'Cormorant Garamond', serif;
      font-style: italic; font-size: 18px;
      color: var(--brown); line-height: 1.7;
    }
    .scripture-ref {
      font-style: normal; font-size: 13px; letter-spacing: 1px;
      color: var(--gold-dark); margin-top: 12px; display: block;
      font-family: 'Cinzel', serif;
    }

    /* ── GUEST BOOK ── */
    .message-bubble {
      background: white;
      border-radius: 16px 16px 16px 4px;
      padding: 20px 24px;
      border: 1px solid rgba(201,169,110,0.15);
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      margin-bottom: 16px;
      animation: fadeInUp 0.5s ease both;
    }

    /* ── QR ── */
    .qr-box {
      background: white;
      border-radius: 16px; padding: 24px;
      display: inline-block;
      box-shadow: 0 8px 30px rgba(0,0,0,0.1);
      border: 2px solid rgba(201,169,110,0.2);
    }

    /* ── RESPONSIVE ── */
    @media (max-width: 768px) {
      .timeline::before { left: 24px; }
      .timeline-item { flex-direction: column !important; padding-left: 60px; position: relative; }
      .timeline-dot { position: absolute; left: 0; top: 0; }
      .timeline-content { max-width: 100%; }
      .nav-links { display: none; }
      .nav-links.open { display: flex; flex-direction: column; position: fixed; top: 60px; left: 0; right: 0; background: rgba(26,18,9,0.98); padding: 20px; }
      .timer-grid { gap: 8px; }
    }
  `}</style>
);

// ─── BUTTERFLY SVG SHAPE ────────────────────────────────────────────────────
function ButterflyShape({ wingAngle, color1, color2, color3, size, opacity = 1, glowing = false }) {
  const w = 54 * size;
  const h = 48 * size;
  const lx = Math.cos((wingAngle * Math.PI) / 180);
  const rx = Math.cos(((wingAngle + 180) * Math.PI) / 180);
  return (
    <svg width={w * 2 + 8} height={h + 8} viewBox="-4 -4 108 88" fill="none"
      style={{ filter: glowing ? `drop-shadow(0 0 8px ${color1}) drop-shadow(0 2px 6px rgba(0,0,0,0.3))` : "drop-shadow(0 2px 6px rgba(0,0,0,0.25))", overflow: "visible" }}>
      {/* LEFT WINGS */}
      <g transform={`translate(50,42) scale(${lx},1) translate(-50,-42)`}>
        <path d="M50,40 C47,18 22,4 8,12 C-2,18 -2,34 8,42 C20,52 38,50 50,44 Z" fill={color1} opacity="0.93" />
        <path d="M50,44 C36,52 16,60 10,74 C6,82 14,88 26,82 C40,74 50,58 50,46 Z" fill={color2} opacity="0.88" />
        {/* Wing veins */}
        <path d="M50,41 C40,22 24,10 12,16" stroke={color3} strokeWidth="0.7" opacity="0.45" fill="none" />
        <path d="M50,41 C38,30 28,28 18,32" stroke={color3} strokeWidth="0.5" opacity="0.3" fill="none" />
        <path d="M50,44 C38,52 24,58 16,68" stroke={color3} strokeWidth="0.6" opacity="0.35" fill="none" />
        {/* Eyespots */}
        <circle cx="18" cy="22" r="4" fill="rgba(255,255,255,0.18)" />
        <circle cx="18" cy="22" r="2" fill={color3} opacity="0.4" />
        <circle cx="22" cy="66" r="3" fill="rgba(255,255,255,0.15)" />
        <circle cx="22" cy="66" r="1.5" fill={color3} opacity="0.35" />
      </g>
      {/* RIGHT WINGS */}
      <g transform={`translate(50,42) scale(${-rx},1) translate(-50,-42)`}>
        <path d="M50,40 C47,18 22,4 8,12 C-2,18 -2,34 8,42 C20,52 38,50 50,44 Z" fill={color1} opacity="0.93" />
        <path d="M50,44 C36,52 16,60 10,74 C6,82 14,88 26,82 C40,74 50,58 50,46 Z" fill={color2} opacity="0.88" />
        <path d="M50,41 C40,22 24,10 12,16" stroke={color3} strokeWidth="0.7" opacity="0.45" fill="none" />
        <path d="M50,41 C38,30 28,28 18,32" stroke={color3} strokeWidth="0.5" opacity="0.3" fill="none" />
        <path d="M50,44 C38,52 24,58 16,68" stroke={color3} strokeWidth="0.6" opacity="0.35" fill="none" />
        <circle cx="18" cy="22" r="4" fill="rgba(255,255,255,0.18)" />
        <circle cx="18" cy="22" r="2" fill={color3} opacity="0.4" />
        <circle cx="22" cy="66" r="3" fill="rgba(255,255,255,0.15)" />
        <circle cx="22" cy="66" r="1.5" fill={color3} opacity="0.35" />
      </g>
      {/* BODY */}
      <ellipse cx="50" cy="43" rx="3.2" ry="15" fill={color3} />
      {/* HEAD */}
      <ellipse cx="50" cy="29" rx="3.5" ry="3.5" fill={color3} />
      {/* ANTENNAE */}
      <path d="M48.5,27 Q42,17 37,12" stroke={color3} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M51.5,27 Q58,17 63,12" stroke={color3} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <circle cx="37" cy="12" r="2.2" fill={color3} />
      <circle cx="63" cy="12" r="2.2" fill={color3} />
    </svg>
  );
}

// ─── DUST TRAIL PARTICLES ────────────────────────────────────────────────────
function DustTrail({ particles }) {
  return (
    <>
      {particles.map(p => (
        <div key={p.id} style={{
          position: "fixed",
          left: p.x, top: p.y,
          width: p.size, height: p.size,
          borderRadius: "50%",
          background: p.color,
          opacity: p.opacity,
          pointerEvents: "none",
          zIndex: 298,
          transform: "translate(-50%,-50%)",
          transition: "none",
        }} />
      ))}
    </>
  );
}

// ─── SINGLE BUTTERFLY INSTANCE ───────────────────────────────────────────────
// States: "roaming" | "targeting" | "perching" | "resting" | "scared" | "mating" | "exiting"
const BUTTERFLY_PALETTES = [
  { c1: "#C9A96E", c2: "#E8C97A", c3: "#7A5C10" },  // gold
  { c1: "#C4847A", c2: "#E8A89E", c3: "#7A3C34" },  // rose
  { c1: "#7A9E7E", c2: "#A8C8AC", c3: "#3A5E3E" },  // sage
  { c1: "#9B8EC4", c2: "#C4B8E8", c3: "#4A3A7A" },  // lavender
  { c1: "#E8A46E", c2: "#F5C89A", c3: "#8B4A14" },  // amber
  { c1: "#6EA8C9", c2: "#9AC8E8", c3: "#14547A" },  // sky
];

// Perch targets — positions on notable page elements (% of viewport)
const PERCH_TARGETS = [
  { xPct: 0.5,  yPct: 0.18, label: "hero-name" },
  { xPct: 0.35, yPct: 0.25, label: "hero-amp" },
  { xPct: 0.65, yPct: 0.22, label: "hero-tag" },
  { xPct: 0.5,  yPct: 0.35, label: "hero-verse" },
  { xPct: 0.2,  yPct: 0.5,  label: "mid-left" },
  { xPct: 0.8,  yPct: 0.45, label: "mid-right" },
  { xPct: 0.5,  yPct: 0.6,  label: "center" },
  { xPct: 0.15, yPct: 0.75, label: "bottom-left" },
  { xPct: 0.85, yPct: 0.7,  label: "bottom-right" },
  { xPct: 0.5,  yPct: 0.82, label: "bottom-center" },
];

function SingleButterfly({ id, palette, size, phaseOffset, onDustParticle, mousePos }) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
  const vh = typeof window !== "undefined" ? window.innerHeight : 600;

  const stateRef = useRef("roaming");
  const posRef   = useRef({ x: Math.random() * vw, y: Math.random() * vh * 0.8 + 80 });
  const velRef   = useRef({ x: (Math.random() - 0.5) * 2.5, y: (Math.random() - 0.5) * 1.5 });
  const targetRef = useRef(null);
  const restTimerRef = useRef(0);
  const restDurRef = useRef(0);
  const scaredTimerRef = useRef(0);
  const frameRef = useRef(null);
  const tsRef    = useRef(0);
  const perchIdxRef = useRef(Math.floor(Math.random() * PERCH_TARGETS.length));

  const [renderState, setRenderState] = useState({
    x: posRef.current.x, y: posRef.current.y,
    wingAngle: 0, bodyRot: 0, scaleX: 1, opacity: 1,
    state: "roaming", glowing: false,
  });

  // Pick new random roam target
  const pickRoamTarget = useCallback(() => {
    const margin = 80;
    targetRef.current = {
      x: margin + Math.random() * (vw - margin * 2),
      y: margin + Math.random() * (vh - margin * 2),
    };
  }, [vw, vh]);

  // Pick perch target
  const pickPerchTarget = useCallback(() => {
    perchIdxRef.current = (perchIdxRef.current + 1 + Math.floor(Math.random() * 3)) % PERCH_TARGETS.length;
    const t = PERCH_TARGETS[perchIdxRef.current];
    targetRef.current = { x: t.xPct * vw + (Math.random() - 0.5) * 40, y: t.yPct * vh + (Math.random() - 0.5) * 20 };
  }, [vw, vh]);

  useEffect(() => {
    pickRoamTarget();
    // Stagger start
    let lastDust = 0;
    let nextStateChange = 3 + phaseOffset + Math.random() * 4;

    const animate = (ts) => {
      const dt = Math.min((ts - tsRef.current) / 1000, 0.05);
      tsRef.current = ts;
      const t = ts / 1000;
      const pos = posRef.current;
      const vel = velRef.current;
      let { x, y } = pos;
      let vx = vel.x, vy = vel.y;
      let state = stateRef.current;
      let wingAngle = 0, bodyRot = 0, scaleX = 1, opacity = 1, glowing = false;

      // ── SCARE from mouse ──
      const mdx = x - mousePos.current.x;
      const mdy = y - mousePos.current.y;
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mdist < 90 && state !== "exiting") {
        stateRef.current = "scared";
        scaredTimerRef.current = ts + 2200;
        // flee direction
        const ang = Math.atan2(mdy, mdx);
        vx = Math.cos(ang) * 7;
        vy = Math.sin(ang) * 5;
        vel.x = vx; vel.y = vy;
      }

      // ── STATE MACHINE ──
      if (state === "scared") {
        wingAngle = Math.sin(t * 18) * 70;
        bodyRot = Math.sin(t * 5) * 20;
        const spd = 6;
        x += vx * dt * 60; y += vy * dt * 60;
        vx *= 0.97; vy *= 0.97;
        if (ts > scaredTimerRef.current) {
          stateRef.current = "roaming";
          pickRoamTarget();
        }

      } else if (state === "roaming") {
        wingAngle = Math.sin(t * 7 + phaseOffset) * 52;
        const tgt = targetRef.current;
        if (tgt) {
          const dx = tgt.x - x, dy = tgt.y - y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 18) {
            // Arrived — decide next state
            const roll = Math.random();
            if (roll < 0.35) {
              stateRef.current = "perching";
              pickPerchTarget();
            } else {
              pickRoamTarget();
            }
          } else {
            const spd = 1.8 + Math.sin(t * 1.2) * 0.6;
            vx += (dx / dist) * spd * dt * 3;
            vy += (dy / dist) * spd * dt * 3;
            // Wander turbulence
            vx += (Math.random() - 0.5) * 1.2;
            vy += (Math.random() - 0.5) * 0.8;
            // Speed limit
            const speed = Math.sqrt(vx*vx + vy*vy);
            const maxSpd = 3.5;
            if (speed > maxSpd) { vx = (vx/speed)*maxSpd; vy = (vy/speed)*maxSpd; }
            x += vx * dt * 55; y += vy * dt * 55;
            bodyRot = Math.atan2(vy, vx) * 45;
          }
        }
        // Periodic perching
        if (t > nextStateChange) {
          nextStateChange = t + 5 + Math.random() * 7;
          stateRef.current = "targeting";
          pickPerchTarget();
        }

      } else if (state === "targeting") {
        // Fast glide to perch point
        wingAngle = Math.sin(t * 5 + phaseOffset) * 40;
        const tgt = targetRef.current;
        if (tgt) {
          const dx = tgt.x - x, dy = tgt.y - y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 12) {
            stateRef.current = "perching";
            restTimerRef.current = ts + 300;
          } else {
            const spd = 3.8;
            vx += (dx / dist) * spd * dt * 6;
            vy += (dy / dist) * spd * dt * 6;
            const speed = Math.sqrt(vx*vx + vy*vy);
            const maxSpd = 5.5;
            if (speed > maxSpd) { vx = (vx/speed)*maxSpd; vy = (vy/speed)*maxSpd; }
            x += vx * dt * 55; y += vy * dt * 55;
            bodyRot = Math.atan2(vy, vx) * 40;
          }
        }

      } else if (state === "perching") {
        // Settling animation — slow flutter, slight bob
        const settle = Math.min((ts - restTimerRef.current) / 400, 1);
        wingAngle = Math.sin(t * (8 - settle * 5)) * (55 - settle * 30);
        y += Math.sin(t * 4) * 0.4; // gentle bob
        bodyRot = Math.sin(t * 2) * 3;
        glowing = true;
        if (settle >= 1) {
          stateRef.current = "resting";
          restDurRef.current = ts + 2500 + Math.random() * 4000;
        }

      } else if (state === "resting") {
        // Very slow wing fan — "basking" pose
        wingAngle = Math.sin(t * 1.2 + phaseOffset) * 18 + 20; // wings half-open, slow fan
        y += Math.sin(t * 2.5) * 0.3;
        bodyRot = Math.sin(t * 0.8) * 2.5;
        glowing = true;
        opacity = 0.95;
        if (ts > restDurRef.current) {
          stateRef.current = "roaming";
          pickRoamTarget();
          glowing = false;
        }

      } else if (state === "exiting") {
        // Fly off screen gracefully
        wingAngle = Math.sin(t * 14) * 70;
        x += vx * dt * 70; y += vy * dt * 70;
        opacity = Math.max(0, 1 - (ts - scaredTimerRef.current) / 1500);
        if (opacity <= 0) return; // stop animating
      }

      // Boundary bounce
      if (x < 30) { x = 30; vx = Math.abs(vx) * 0.8; }
      if (x > vw - 80) { x = vw - 80; vx = -Math.abs(vx) * 0.8; }
      if (y < 70) { y = 70; vy = Math.abs(vy) * 0.8; }
      if (y > vh - 80) { y = vh - 80; vy = -Math.abs(vy) * 0.8; }

      posRef.current = { x, y };
      velRef.current = { x: vx, y: vy };

      // Dust trail
      if (state === "scared" || state === "targeting") {
        if (ts - lastDust > 60) {
          lastDust = ts;
          onDustParticle({
            id: ts + Math.random(),
            x, y: y + 20,
            size: 3 + Math.random() * 3,
            color: palette.c1,
            opacity: 0.5,
          });
        }
      }

      setRenderState({ x, y, wingAngle, bodyRot, scaleX, opacity, state, glowing });
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const { x, y, wingAngle, bodyRot, opacity, glowing } = renderState;
  const w = 54 * size;

  // Direction: face the direction of travel
  const facingLeft = velRef.current.x < -0.3;

  return (
    <div
      style={{
        position: "fixed",
        left: x, top: y,
        zIndex: 299,
        pointerEvents: "none",
        opacity,
        transform: `rotate(${bodyRot}deg) scaleX(${facingLeft ? -1 : 1})`,
        transformOrigin: "center center",
        willChange: "transform, left, top",
      }}
    >
      <ButterflyShape
        wingAngle={wingAngle}
        color1={palette.c1}
        color2={palette.c2}
        color3={palette.c3}
        size={size}
        glowing={glowing}
      />
      {/* Resting glow ring */}
      {glowing && (
        <div style={{
          position: "absolute",
          left: w * 0.3, top: w * 0.35,
          width: w * 1.4, height: w * 1,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${palette.c1}30 0%, transparent 70%)`,
          pointerEvents: "none",
          animation: "pulse 2s ease-in-out infinite",
        }} />
      )}
    </div>
  );
}

// ─── BUTTERFLY SWARM MANAGER ─────────────────────────────────────────────────
function ButterflySwarm() {
  const mousePos = useRef({ x: -999, y: -999 });
  const [dustParticles, setDustParticles] = useState([]);
  const dustRef = useRef([]);

  // Track mouse
  useEffect(() => {
    const onMove = (e) => { mousePos.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Dust particle lifetime manager
  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now();
      dustRef.current = dustRef.current
        .map(p => ({ ...p, opacity: p.opacity - 0.04, size: p.size * 0.93 }))
        .filter(p => p.opacity > 0.02);
      setDustParticles([...dustRef.current]);
    }, 40);
    return () => clearInterval(tick);
  }, []);

  const onDustParticle = useCallback((p) => {
    dustRef.current = [...dustRef.current.slice(-60), p];
  }, []);

  // Click anywhere to spawn a butterfly
  const [extra, setExtra] = useState([]);
  useEffect(() => {
    const onClick = (e) => {
      if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
      const pal = BUTTERFLY_PALETTES[Math.floor(Math.random() * BUTTERFLY_PALETTES.length)];
      const newId = Date.now() + Math.random();
      setExtra(prev => [...prev.slice(-4), { id: newId, x: e.clientX, y: e.clientY, pal, size: 0.6 + Math.random() * 0.5 }]);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  // 6 permanent butterflies with varied palettes/sizes
  const swarm = [
    { id: 1, pal: BUTTERFLY_PALETTES[0], size: 1.1, offset: 0.0 },
    { id: 2, pal: BUTTERFLY_PALETTES[1], size: 0.85, offset: 1.4 },
    { id: 3, pal: BUTTERFLY_PALETTES[2], size: 1.0,  offset: 2.7 },
    { id: 4, pal: BUTTERFLY_PALETTES[3], size: 0.75, offset: 0.9 },
    { id: 5, pal: BUTTERFLY_PALETTES[4], size: 0.95, offset: 3.5 },
    { id: 6, pal: BUTTERFLY_PALETTES[5], size: 0.8,  offset: 4.8 },
  ];

  return (
    <>
      <DustTrail particles={dustParticles} />
      {swarm.map(b => (
        <SingleButterfly key={b.id} id={b.id} palette={b.pal} size={b.size} phaseOffset={b.offset} onDustParticle={onDustParticle} mousePos={mousePos} />
      ))}
      {extra.map(b => (
        <SingleButterfly key={b.id} id={b.id} palette={b.pal} size={b.size} phaseOffset={Math.random() * 6} onDustParticle={onDustParticle} mousePos={mousePos} />
      ))}
    </>
  );
}

// ─── ENVELOPE ────────────────────────────────────────────────────────────────
function Envelope({ message }) {
  const [phase, setPhase] = useState("closed"); // closed → opening → open
  const [spin3D, setSpin3D] = useState(false);

  const handleOpen = () => {
    if (phase === "closed") {
      setPhase("opening");
      setTimeout(() => setPhase("open"), 900);
    } else if (phase === "open") {
      setPhase("closed");
    }
  };

  return (
    <div style={{ textAlign: "center", userSelect: "none" }}>
      {/* 3D CONTAINER */}
      <div
        onClick={handleOpen}
        style={{
          width: 320, height: 200,
          margin: "0 auto",
          cursor: "pointer",
          position: "relative",
          perspective: "900px",
          animation: spin3D ? "spinEnvelope 1.2s ease-in-out" : "none",
        }}
      >
        <style>{`
          @keyframes spinEnvelope {
            0%   { transform: rotateY(0deg); }
            50%  { transform: rotateY(180deg); }
            100% { transform: rotateY(360deg); }
          }
          @keyframes flapOpen {
            0%   { transform: rotateX(0deg); }
            100% { transform: rotateX(-180deg); }
          }
          @keyframes letterFloat {
            0%   { transform: translateY(0px); opacity: 0; }
            30%  { opacity: 1; }
            100% { transform: translateY(-80px); opacity: 1; }
          }
        `}</style>

        {/* ENVELOPE BODY */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(160deg, #FDF0D5 0%, #F5DFA0 50%, #EDD080 100%)",
          borderRadius: 14,
          border: "2px solid #C9A96E",
          boxShadow: "0 16px 50px rgba(139,105,20,0.35), 0 4px 12px rgba(0,0,0,0.15)",
          overflow: "hidden",
          transformStyle: "preserve-3d",
        }}>
          {/* Bottom-left and bottom-right crease lines */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.4 }} viewBox="0 0 320 200">
            <line x1="0" y1="200" x2="160" y2="100" stroke="#C9A96E" strokeWidth="1" />
            <line x1="320" y1="200" x2="160" y2="100" stroke="#C9A96E" strokeWidth="1" />
            <line x1="0" y1="200" x2="0" y2="0" stroke="#C9A96E" strokeWidth="0.5" />
            <line x1="320" y1="200" x2="320" y2="0" stroke="#C9A96E" strokeWidth="0.5" />
          </svg>

          {/* WAX SEAL */}
          {phase === "closed" && (
            <div style={{
              position: "absolute", left: "50%", top: "50%",
              transform: "translate(-50%, -50%)",
              width: 52, height: 52,
              background: "radial-gradient(circle, #C4847A, #8B3A30)",
              borderRadius: "50%",
              border: "3px solid rgba(232,213,163,0.6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22,
              boxShadow: "0 4px 16px rgba(139,58,48,0.5)",
              zIndex: 5,
              transition: "opacity 0.3s",
            }}>✝</div>
          )}
        </div>

        {/* FLAP — separate element so perspective works correctly */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: "50%",
          transformOrigin: "top center",
          transformStyle: "preserve-3d",
          perspective: "900px",
          transform: phase === "open" ? "rotateX(-180deg)" : phase === "opening" ? "rotateX(-90deg)" : "rotateX(0deg)",
          transition: "transform 0.85s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 10,
        }}>
          {/* Front face of flap */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(135deg, #E8C96E, #D4A830, #C9A030)",
            clipPath: "polygon(0% 0%, 50% 100%, 100% 0%)",
            borderTop: "2px solid #C9A96E",
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            backfaceVisibility: "hidden",
          }} />
          {/* Back face of flap (shows when fully open) */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(135deg, #F5E090, #EBD070)",
            clipPath: "polygon(0% 0%, 50% 100%, 100% 0%)",
            backfaceVisibility: "hidden",
            transform: "rotateX(180deg)",
          }} />
        </div>

        {/* LETTER — rises up when open */}
        {(phase === "open" || phase === "opening") && (
          <div style={{
            position: "absolute", left: "12%", right: "12%",
            bottom: 12,
            background: "white",
            borderRadius: 10,
            padding: "16px 20px",
            border: "1px solid rgba(201,169,110,0.35)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            zIndex: 15,
            animation: "letterFloat 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 18, marginBottom: 8, color: "#C4847A" }}>✝</div>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 13, color: "#3D2B1F", lineHeight: 1.6 }}>
              {message}
            </p>
            <div style={{ marginTop: 10, fontSize: 11, fontFamily: "Cinzel, serif", letterSpacing: 2, color: "#C9A96E" }}>
              Antony & Maria
            </div>
          </div>
        )}
      </div>

      {/* BUTTONS */}
      <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn-primary" style={{ fontSize: 11, padding: "9px 22px" }} onClick={handleOpen}>
          {phase === "open" ? "✦ Close Letter" : "✦ Open Letter"}
        </button>
        <button className="btn-outline" style={{ fontSize: 11, padding: "9px 22px" }}
          onClick={() => { setSpin3D(true); setTimeout(() => setSpin3D(false), 1300); }}>
          ↻ 3D Spin
        </button>
      </div>
    </div>
  );
}

// ─── SCRATCH CARD ─────────────────────────────────────────────────────────────
function ScratchCard({ revealText, revealContent }) {
  const canvasRef = useRef(null);
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#8B6914";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // gold gradient overlay
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, "#C9A96E");
    g.addColorStop(0.5, "#E8D5A3");
    g.addColorStop(1, "#C9A96E");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.font = "bold 14px 'Cinzel', serif";
    ctx.textAlign = "center";
    ctx.fillText("✦ SCRATCH TO REVEAL ✦", canvas.width / 2, canvas.height / 2 - 6);
    ctx.fillText("Your Special Message", canvas.width / 2, canvas.height / 2 + 14);
  }, []);

  const scratch = useCallback((e) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    // calc %
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 128) transparent++;
    const p = Math.round((transparent / (canvas.width * canvas.height)) * 100);
    setPct(p);
    if (p > 60 && !done) { setDone(true); ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }, [done]);

  return (
    <div style={{ textAlign: "center" }}>
      <div className="scratch-wrapper">
        <div className="scratch-reveal">
          {revealContent ? revealContent : (
            <>
              <span style={{ fontSize: 28, marginBottom: 8 }}>💍</span>
              <span style={{ fontSize: 22, fontStyle: "italic" }}>{revealText}</span>
            </>
          )}
        </div>
        <canvas
          ref={canvasRef} width={320} height={240}
          className="scratch-canvas"
          style={{ position: "absolute", inset: 0, borderRadius: 16, opacity: done ? 0 : 1, transition: "opacity 0.5s" }}
          onMouseDown={() => drawing.current = true}
          onMouseUp={() => drawing.current = false}
          onMouseLeave={() => drawing.current = false}
          onMouseMove={scratch}
          onTouchStart={() => drawing.current = true}
          onTouchEnd={() => drawing.current = false}
          onTouchMove={scratch}
        />
      </div>
      <div className="scratch-progress-bar" style={{ maxWidth: 300, margin: "12px auto 0" }}>
        <div className="scratch-progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <p style={{ fontSize: 12, color: "rgba(61,43,31,0.5)", marginTop: 6, fontFamily: "Lato" }}>
        {done ? "✨ Revealed!" : `${pct}% scratched`}
      </p>
    </div>
  );
}

// ─── COUNTDOWN TIMER ──────────────────────────────────────────────────────────
function CountdownTimer({ targetDate }) {
  const calc = () => {
    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, over: true };
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
      over: false,
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (time.over) return (
    <div style={{ textAlign: "center", fontFamily: "Cinzel, serif", color: "#C9A96E", fontSize: 22, letterSpacing: 3 }}>
      ✦ The Day Has Come! ✦
    </div>
  );

  return (
    <div className="timer-grid">
      {[["Days", time.d], ["Hours", time.h], ["Mins", time.m], ["Secs", time.s]].map(([label, val]) => (
        <div key={label} className="timer-cell">
          <span className="timer-num">{String(val).padStart(2, "0")}</span>
          <span className="timer-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── QR CODE (SVG-based pattern) ─────────────────────────────────────────────
function QRCode({ value, size = 120 }) {
  // Simplified visual QR placeholder
  const blocks = [];
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
    const edge = (r < 3 && c < 3) || (r < 3 && c > 6) || (r > 6 && c < 3);
    const fill = edge ? "#1A1209" : Math.random() > 0.45 ? "#1A1209" : "transparent";
    blocks.push({ r, c, fill: edge ? "#1A1209" : (((r * 13 + c * 7 + value.charCodeAt(r % value.length || 0)) % 2) === 0 ? "#1A1209" : "transparent") });
  }
  const cell = size / 11;
  return (
    <div className="qr-box">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {blocks.map(({ r, c, fill }, i) => <rect key={i} x={c * cell + cell / 2} y={r * cell + cell / 2} width={cell * 0.85} height={cell * 0.85} rx={1} fill={fill} />)}
      </svg>
      <div style={{ textAlign: "center", marginTop: 8, fontSize: 10, fontFamily: "Cinzel", letterSpacing: 2, color: "#8B6914" }}>SCAN ME</div>
    </div>
  );
}

// ─── CONFETTI BURST ──────────────────────────────────────────────────────────
function Confetti({ active }) {
  const [pieces, setPieces] = useState([]);
  useEffect(() => {
    if (!active) return;
    const colors = ["#C9A96E", "#E8D5A3", "#C4847A", "#7A9E7E", "#9B8EC4", "#E8A46E"];
    const arr = Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2.5 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      rotate: Math.random() * 360,
      drift: (Math.random() - 0.5) * 200,
      shape: Math.random() > 0.5 ? "circle" : "square",
    }));
    setPieces(arr);
    const t = setTimeout(() => setPieces([]), 5000);
    return () => clearTimeout(t);
  }, [active]);

  if (!pieces.length) return null;
  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0% { transform: translate(0, -20px) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--drift), 100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
        {pieces.map(p => (
          <div key={p.id} style={{
            position: "absolute",
            left: `${p.left}%`, top: 0,
            width: p.size, height: p.size,
            background: p.color,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            ["--drift"]: `${p.drift}px`,
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
            transform: `rotate(${p.rotate}deg)`,
            boxShadow: `0 0 6px ${p.color}80`,
          }} />
        ))}
      </div>
    </>
  );
}

// ─── BACKGROUND MUSIC TOGGLE ─────────────────────────────────────────────────
function MusicToggle() {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio("https://cdn.pixabay.com/audio/2022/10/30/audio_347111d654.mp3");
    audioRef.current.loop = true;
    audioRef.current.volume = 0.35;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  return (
    <button onClick={toggle} title={playing ? "Pause music" : "Play music"} style={{
      background: "none", border: "1px solid rgba(201,169,110,0.4)",
      color: "#C9A96E", cursor: "pointer",
      width: 36, height: 36, borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 14, marginRight: 6,
      transition: "all 0.2s",
    }}>
      {playing ? "🔊" : "🔇"}
    </button>
  );
}

// ─── FAQ ACCORDION ───────────────────────────────────────────────────────────
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: "rgba(201,169,110,0.06)",
      border: "1px solid rgba(201,169,110,0.2)",
      borderRadius: 10,
      padding: "14px 18px",
      marginBottom: 10,
      cursor: "pointer",
    }} onClick={() => setOpen(!open)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontFamily: "Cinzel, serif", fontSize: 13, color: "#3D2B1F", letterSpacing: 1 }}>{q}</p>
        <span style={{ color: "#C9A96E", fontSize: 18, transition: "transform 0.3s", transform: open ? "rotate(45deg)" : "rotate(0)" }}>+</span>
      </div>
      {open && (
        <p style={{ marginTop: 10, fontFamily: "Lato", fontSize: 14, color: "#6B5040", lineHeight: 1.6, animation: "fadeIn 0.3s" }}>
          {a}
        </p>
      )}
    </div>
  );
}

// ─── PAGES ────────────────────────────────────────────────────────────────────

const COUPLE = {
  groom: "Antony Paul",
  bride: "Dr. Maria Loraine Lydia",
  groomFull: "Mr. S.A. Antony Paul, B.Tech",
  groomBio: "Senior Associate, Cyber Security & AI, Cognizant (CTS), Chennai",
  brideFull: "Dr. Maria Loraine Lydia, MBBS, MS (Ophthalmology)",
  brideBio: "Senior Resident, Justice K.S. Hegde Charitable Hospital, Mangaluru",
  date: "2026-06-21T09:30:00",
  dateLabel: "21 June · 2026",
  dayLabel: "Sunday",
  ceremonyTime: "9:30 AM",
  receptionTime: "12:00 PM – 2:00 PM",
  venue: "Our Lady of Presentation Church",
  venueAddress: "Our Lady of Presentation Church, Neyveli Township, Neyveli, Tamil Nadu, India",
  city: "Neyveli, Tamil Nadu",
  hashtag: "#AntonyMariaForever",
  initials: "A ✦ M",
  rsvpDeadline: "May 21, 2026",
  receptionVenue: "Thirumana Mandapam, Community Hall Block 24, Neyveli Township",
  receptionAddress: "Thirumana Mandapam, Community Hall Block 24, Neyveli Township, Neyveli, Tamil Nadu",
  brideParents: { father: "Mr. B. Arokianathan David", mother: "Mrs. A. Anna Shantha Mary" },
  groomParents: { father: "Mr. S. Arokyadoss", mother: "Mrs. G. Savariamma" },
  contacts: [
    { name: "Mr. David (Bride's Father)",  phone: "+91 94484 54842" },
    { name: "Mrs. Anna Shantha (Bride's Mother)", phone: "+91 63602 32488" },
    { name: "Ms. Maria Lisbel (Bride's Sister)",  phone: "+91 70195 79609" },
  ],
  priests: [
    "Rev. Fr. Albert Thambidurai",
    "Rev. Fr. John Kumar S.J",
    "Rev. Fr. P. Simon Antonyraj",
    "Rev. Fr. Lourdusamy SDB",
    "Rev. Fr. Arul Dass",
    "Rev. Fr. Lourdusamy Samy OSM",
  ],
  brideSiblings: [
    { name: "Ms. A. Maria Lisbel", role: "Sister of the Bride", bio: "BBM, MBA, IRS · Senior Business Analyst, Bangalore" },
  ],
  groomSiblings: [
    { name: "Mrs. S.A. Jenifer", role: "Sister of the Groom", bio: "B.Com, MBA · Senior Tax Analyst, USA · with husband Mr. T. Philip Pridheevraj (Engineering Manager, ARI, USA) and Master Michael Etrian" },
    { name: "Mrs. A. Antony Ruby Alexia", role: "Sister of the Groom", bio: "B.Com, MBA · Software Engineer, Dubai · with husband Mr. J. Inspen Christo (Engineer, AES, Dubai)" },
  ],
};

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(COUPLE.venueAddress)}`;
const SHARE_TEXT = `You're invited to the wedding of ${COUPLE.groom} & ${COUPLE.bride} on ${COUPLE.dateLabel.replace(" · ", " ")}! ${COUPLE.hashtag}`;
const SITE_URL = typeof window !== "undefined" ? window.location.href : "https://antony-maria.wedding";

function downloadICS() {
  const dt = new Date(COUPLE.date);
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const end = new Date(dt.getTime() + 4 * 60 * 60 * 1000);
  const ics = [
    "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Wedding//EN","BEGIN:VEVENT",
    `UID:${Date.now()}@antony-maria-wedding`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(dt)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:Wedding of ${COUPLE.groom} & ${COUPLE.bride}`,
    `DESCRIPTION:Join us as we celebrate our wedding! ${COUPLE.hashtag}`,
    `LOCATION:${COUPLE.venueAddress}`,
    "END:VEVENT","END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "antony-maria-wedding.ics";
  a.click();
  URL.revokeObjectURL(url);
}

function shareWedding() {
  if (navigator.share) {
    navigator.share({ title: `${COUPLE.groom} & ${COUPLE.bride}`, text: SHARE_TEXT, url: SITE_URL }).catch(() => {});
  } else {
    const wa = `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT + " " + SITE_URL)}`;
    window.open(wa, "_blank");
  }
}

function HomePage({ setPage }) {
  return (
    <div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-ornament top-left">✦</div>
        <div className="hero-ornament top-right">✦</div>
        <div className="hero-ornament bot-left">✦</div>
        <div className="hero-ornament bot-right">✦</div>

        <p className="hero-tag">Together in Faith & Love</p>
        <h1 className="hero-names">
          {COUPLE.groom}
          <span className="hero-amp">&amp;</span>
          {COUPLE.bride}
        </h1>
        <div className="hero-divider" />
        <p className="hero-date">{COUPLE.dayLabel} · {COUPLE.dateLabel} · Neyveli</p>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: 3, color: "var(--rose)", marginTop: -8, marginBottom: 16, animation: "fadeInUp 1s 0.85s both" }}>
          {COUPLE.hashtag}
        </p>
        <p className="hero-verse">
          "He hath made everything beautiful in its time."
          <span style={{ display: "block", marginTop: 6, fontSize: 14, color: "rgba(201,169,110,0.6)", fontStyle: "normal", fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>Ecclesiastes 3:11</span>
        </p>

        <div style={{ marginTop: 48, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", position: "relative", zIndex: 1 }}>
          <button className="btn-primary" onClick={() => setPage("rsvp")}>RSVP Now</button>
          <button className="btn-outline" style={{ borderColor: "rgba(201,169,110,0.5)", color: "rgba(232,213,163,0.8)" }} onClick={() => setPage("story")}>Our Story</button>
        </div>

        <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", position: "relative", zIndex: 1 }}>
          <button className="btn-outline" style={{ borderColor: "rgba(201,169,110,0.4)", color: "rgba(232,213,163,0.75)", fontSize: 11, padding: "9px 22px" }} onClick={downloadICS}>📅 Add to Calendar</button>
          <button className="btn-outline" style={{ borderColor: "rgba(201,169,110,0.4)", color: "rgba(232,213,163,0.75)", fontSize: 11, padding: "9px 22px" }} onClick={shareWedding}>🔗 Share</button>
          <a className="btn-outline" href={MAPS_URL} target="_blank" rel="noreferrer" style={{ borderColor: "rgba(201,169,110,0.4)", color: "rgba(232,213,163,0.75)", fontSize: 11, padding: "9px 22px", textDecoration: "none", display: "inline-block" }}>📍 Directions</a>
          <SaveTheDateButton couple={COUPLE} />
        </div>

        <div style={{ marginTop: 64, width: "100%", maxWidth: 600, position: "relative", zIndex: 1 }}>
          <p style={{ fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: "rgba(201,169,110,0.5)", fontFamily: "Cinzel", marginBottom: 20 }}>Counting Down</p>
          <CountdownTimer targetDate={COUPLE.date} />
        </div>
      </section>

      {/* QUICK INFO CARDS */}
      <section style={{ background: "#FDF8F0", padding: "64px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 className="section-title">Wedding Day</h2>
          <div className="gold-divider" />
          <div className="grid-3">
            {[
              { icon: "⛪", title: "Holy Mass", sub: "Our Lady of Presentation Church, Neyveli Township", time: "9:30 AM" },
              { icon: "🎊", title: "Reception", sub: "Thirumana Mandapam, Community Hall Block 24, Neyveli", time: "12:00 PM – 2:00 PM" },
              { icon: "🙏", title: "Blessing", sub: "Solemnized by 6 priests", time: "Sunday, 21 June 2026" },
            ].map((c) => (
              <div key={c.title} className="card-light" style={{ textAlign: "center", animationDelay: "0.1s" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>{c.icon}</div>
                <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 18, color: "#3D2B1F", marginBottom: 8 }}>{c.title}</h3>
                <p style={{ color: "#8B6914", fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: 16 }}>{c.sub}</p>
                <p style={{ marginTop: 8, fontSize: 13, letterSpacing: 2, color: "#C9A96E", fontFamily: "Cinzel, serif" }}>{c.time}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ENVELOPE + SCRATCH */}
      <section style={{ background: "linear-gradient(135deg, #1A1209, #2D1F0E)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 className="section-title-light">A Letter & A Surprise</h2>
          <div className="gold-divider" />
          <div className="grid-2" style={{ alignItems: "start" }}>
            <div>
              <p style={{ color: "rgba(232,213,163,0.6)", fontFamily: "Lato", marginBottom: 24 }}>Open our letter to you</p>
              <Envelope message="You are invited to witness the miracle of two souls becoming one. Come celebrate with us as we begin this blessed journey together in love and faith." />
            </div>
            <div>
              <p style={{ color: "rgba(232,213,163,0.6)", fontFamily: "Lato", marginBottom: 24 }}>Scratch for a blessing from us</p>
              <ScratchCard revealContent={
                <>
                  <span style={{ fontSize: 22, marginBottom: 6, opacity: 0.85 }}>✦</span>
                  <span style={{ fontSize: 17, fontStyle: "italic", lineHeight: 1.4, marginBottom: 4 }}>
                    "He hath made everything<br/>beautiful in its time."
                  </span>
                  <span style={{ fontSize: 11, letterSpacing: 2, fontFamily: "Cinzel, serif", opacity: 0.85, marginBottom: 12 }}>
                    ECCLESIASTES 3:11
                  </span>
                  <span style={{ width: 40, height: 1, background: "rgba(255,255,255,0.4)", margin: "4px 0 12px" }} />
                  <span style={{ fontSize: 15, fontStyle: "italic", lineHeight: 1.4, marginBottom: 8 }}>
                    Thank you for being part<br/>of our forever ✦
                  </span>
                  <span style={{ fontSize: 11, letterSpacing: 2, fontFamily: "Cinzel, serif", opacity: 0.9 }}>
                    — ANTONY & MARIA
                  </span>
                </>
              } />
            </div>
          </div>
        </div>
      </section>

      {/* SCRIPTURE */}
      <section style={{ padding: "80px 24px", background: "#FDF8F0" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div className="scripture">
            Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It always protects, always trusts, always hopes, always perseveres.
            <span className="scripture-ref">1 Corinthians 13:4,7</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function StoryPage() {
  const milestones = [
    { year: "Dec 2025", icon: "🙏", title: "A Beginning Guided by Faith",
      desc: "Through the love and guidance of our families, and with God's blessings, our journey began as an arranged match — one that already felt special from the very start." },
    { year: "Dec 17, 2025", icon: "📞", title: "First Conversation",
      desc: "A missed call, a busy day — and then, a conversation that lasted for hours. In that moment, we found comfort, laughter, and a connection that felt effortless and real." },
    { year: "Late Dec 2025", icon: "💞", title: "Love Takes Shape",
      desc: "With every call, we grew closer. He admired her warmth and joyful spirit, while she found peace in his kindness and care. What began as a conversation slowly turned into something beautiful — love." },
    { year: "Dec 30, 2025", icon: "👫", title: "First Meeting",
      desc: "Seeing each other for the first time felt natural and familiar, as if our hearts had already known each other." },
    { year: "Early 2026", icon: "🤝", title: "Families & Blessings",
      desc: "With happiness on both sides, our families came together, and everything fell into place so smoothly — just as it was meant to be." },
    { year: "Apr 26, 2026", icon: "💍", title: "Engagement",
      desc: "A promise made with love, marking the beginning of our forever." },
    { year: "Jun 21, 2026", icon: "💒", title: "Wedding Day",
      desc: "With God's grace and our families beside us, we begin our new journey — together as one." },
  ];
  return (
    <div style={{ background: "#FAF3E4", minHeight: "100vh" }}>
      <section className="section">
        <h2 className="section-title">Our Love Story</h2>
        <p className="section-sub">Written by God, authored in love</p>
        <div className="gold-divider" />

        {/* Opening quote */}
        <div style={{ maxWidth: 720, margin: "0 auto 56px", textAlign: "center" }}>
          <p style={{
            fontFamily: "Cormorant Garamond, serif", fontStyle: "italic",
            fontSize: "clamp(20px, 3.5vw, 28px)", color: "#3D2B1F", lineHeight: 1.5,
            position: "relative", padding: "0 24px",
          }}>
            <span style={{ color: "#C9A96E", fontSize: 48, position: "absolute", left: -8, top: -16, lineHeight: 1, fontFamily: "Georgia, serif" }}>&ldquo;</span>
            When it's meant to be, everything falls into place with love, faith, and blessings.
            <span style={{ color: "#C9A96E", fontSize: 48, position: "absolute", right: -8, bottom: -32, lineHeight: 1, fontFamily: "Georgia, serif" }}>&rdquo;</span>
          </p>
          <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <span style={{ width: 40, height: 1, background: "#C9A96E" }} />
            <span style={{ color: "#C9A96E" }}>✦</span>
            <span style={{ width: 40, height: 1, background: "#C9A96E" }} />
          </div>
        </div>

        <div className="timeline">
          {milestones.map((m, i) => (
            <div key={m.year} className="timeline-item" style={{ animationDelay: `${i * 0.15}s` }}>
              <div className="timeline-content" style={i % 2 === 0 ? { textAlign: "right" } : {}}>
                <div className="card-light">
                  <p style={{ fontFamily: "Cinzel, serif", fontSize: 12, letterSpacing: 3, color: "#C9A96E", marginBottom: 6 }}>{m.year}</p>
                  <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 18, color: "#3D2B1F", marginBottom: 10 }}>{m.title}</h3>
                  <p style={{ fontFamily: "Lato", color: "#6B5040", lineHeight: 1.6 }}>{m.desc}</p>
                </div>
              </div>
              <div className="timeline-dot">{m.icon}</div>
              <div className="timeline-content" />
            </div>
          ))}
        </div>
      </section>
      {/* Scripture quotes */}
      <section style={{ background: "linear-gradient(135deg, #1A1209, #2D1F0E)", padding: "64px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2 className="section-title-light" style={{ marginBottom: 40 }}>Scriptures That Guided Us</h2>
          {[
            ["Ruth 1:16", "Where you go I will go, and where you stay I will stay. Your people will be my people and your God my God."],
            ["Proverbs 18:22", "He who finds a wife finds what is good and receives favor from the LORD."],
            ["Genesis 2:24", "That is why a man leaves his father and mother and is united to his wife, and they become one flesh."],
          ].map(([ref, verse]) => (
            <div key={ref} style={{ marginBottom: 24 }}>
              <div className="scripture" style={{ background: "rgba(201,169,110,0.08)", borderColor: "rgba(201,169,110,0.4)", color: "rgba(232,213,163,0.85)" }}>
                {verse}
                <span className="scripture-ref" style={{ color: "rgba(201,169,110,0.7)" }}>{ref}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function EventsPage() {
  const events = [
    {
      cls: "event-card-2",
      emoji: "⛪", title: "Holy Nuptial Mass",
      date: "Sunday, June 21, 2026", time: "9:30 AM – 11:00 AM",
      venue: "Our Lady of Presentation Church, Neyveli Township",
      desc: "A sacred Catholic wedding ceremony solemnized by Rev. Fr. Albert Thambidurai with five concelebrating priests, celebrating the holy union of Antony Paul and Dr. Maria Loraine Lydia before God and loved ones.",
      color: "#EF9A9A"
    },
    {
      cls: "event-card-3",
      emoji: "🎊", title: "Wedding Reception",
      date: "Sunday, June 21, 2026", time: "12:00 PM – 2:00 PM",
      venue: "Thirumana Mandapam, Community Hall Block 24, Neyveli Township",
      desc: "A joyful celebration luncheon with family and friends — a heartfelt welcome with food, music, and blessings to mark the beginning of our forever.",
      color: "#A5D6A7"
    },
  ];
  return (
    <div style={{ background: "#FAF3E4", minHeight: "100vh" }}>
      <section className="section">
        <h2 className="section-title">Events & Schedule</h2>
        <p className="section-sub">Three days of love, faith, and celebration</p>
        <div className="gold-divider" />
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {events.map((e, i) => (
            <div key={e.title} className={`event-card ${e.cls}`} style={{ animationDelay: `${i * 0.2}s` }}>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ fontSize: 48 }}>{e.emoji}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 22, marginBottom: 8, color: e.color }}>{e.title}</h3>
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 12 }}>
                    <span style={{ fontSize: 13, opacity: 0.7 }}>📅 {e.date}</span>
                    <span style={{ fontSize: 13, opacity: 0.7 }}>🕐 {e.time}</span>
                    <span style={{ fontSize: 13, opacity: 0.7 }}>📍 {e.venue}</span>
                  </div>
                  <p style={{ fontFamily: "Lato", opacity: 0.8, lineHeight: 1.7 }}>{e.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// Curated wedding-themed Unsplash photos (loaded with lazy attr)
const GALLERY_PHOTOS = [
  { id: "1519225421980-715cb0215aed", caption: "The First Dance", color: "#C9A96E" },
  { id: "1606800052052-a08af7148866", caption: "Vows Exchanged", color: "#C4847A" },
  { id: "1519741497674-611481863552", caption: "Sacred Union", color: "#7A9E7E" },
  { id: "1465495976277-4387d4b0b4c6", caption: "Forever Begins", color: "#8B6914" },
  { id: "1511285560929-80b456fea0bc", caption: "Hand in Hand", color: "#1E2D4E" },
  { id: "1583939003579-730e3918a45a", caption: "Sealed with a Kiss", color: "#3D1A1A" },
  { id: "1525772764200-be829a350797", caption: "Love's Embrace", color: "#E8D5A3" },
  { id: "1532712938310-34cb3982ef74", caption: "Rings of Promise", color: "#6B5040" },
  { id: "1519671482749-fd09be7ccebf", caption: "Garden Stroll", color: "#2D1F0E" },
  { id: "1583939411023-14783179e581", caption: "Joyful Moment", color: "#D4B97A" },
  { id: "1502635385003-ee1e6a1a742d", caption: "Candlelit Promise", color: "#F5E6C8" },
  { id: "1591604466107-ec97de577aff", caption: "Together Always", color: "#C9A96E" },
];

function GalleryImage({ photo, idx, onSelect }) {
  const [loaded, setLoaded] = useState(false);
  const src = `https://images.unsplash.com/photo-${photo.id}?w=600&q=75&auto=format&fit=crop`;
  return (
    <button
      type="button"
      className="gallery-item"
      aria-label={`View ${photo.caption}`}
      onClick={() => onSelect(idx)}
      style={{ border: "none", padding: 0, cursor: "pointer", background: photo.color }}
    >
      <img
        src={src}
        alt={photo.caption}
        loading="lazy"
        decoding="async"
        className="gallery-img"
        onLoad={() => setLoaded(true)}
        style={{
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.6s ease",
          background: `linear-gradient(135deg, ${photo.color}, ${photo.color}80)`,
        }}
      />
      <div className="gallery-overlay" aria-hidden="true">
        <div style={{ textAlign: "center", color: "white", padding: 12 }}>
          <div style={{ fontSize: 24 }}>✦</div>
          <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: 14, marginTop: 6 }}>{photo.caption}</p>
        </div>
      </div>
    </button>
  );
}

function GalleryPage() {
  const [selected, setSelected] = useState(null);
  const close = useCallback(() => setSelected(null), []);
  const next = useCallback(() => setSelected(s => (s + 1) % GALLERY_PHOTOS.length), []);
  const prev = useCallback(() => setSelected(s => (s - 1 + GALLERY_PHOTOS.length) % GALLERY_PHOTOS.length), []);

  useEffect(() => {
    if (selected === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [selected, close, next, prev]);

  return (
    <div style={{ background: "#FAF3E4", minHeight: "100vh" }}>
      <section className="section">
        <h2 className="section-title">Our Gallery</h2>
        <p className="section-sub">Moments captured in love</p>
        <div className="gold-divider" />
        <div className="gallery-grid" role="list">
          {GALLERY_PHOTOS.map((p, i) => (
            <div key={p.id} role="listitem">
              <GalleryImage photo={p} idx={i} onSelect={setSelected} />
            </div>
          ))}
        </div>
      </section>

      {selected !== null && (
        <div role="dialog" aria-modal="true" aria-label="Photo lightbox"
          onClick={close}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: 24, animation: "fadeIn 0.3s" }}>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous photo"
            style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
              background: "rgba(201,169,110,0.2)", color: "#E8D5A3", border: "1px solid rgba(201,169,110,0.4)",
              width: 48, height: 48, borderRadius: "50%", fontSize: 22, cursor: "pointer", zIndex: 10 }}>‹</button>
          <button onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next photo"
            style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
              background: "rgba(201,169,110,0.2)", color: "#E8D5A3", border: "1px solid rgba(201,169,110,0.4)",
              width: 48, height: 48, borderRadius: "50%", fontSize: 22, cursor: "pointer", zIndex: 10 }}>›</button>
          <button onClick={close} aria-label="Close"
            style={{ position: "absolute", top: 24, right: 24,
              background: "rgba(201,169,110,0.2)", color: "#E8D5A3", border: "1px solid rgba(201,169,110,0.4)",
              width: 40, height: 40, borderRadius: "50%", fontSize: 18, cursor: "pointer", zIndex: 10 }}>✕</button>

          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900, width: "100%", textAlign: "center" }}>
            <img src={`https://images.unsplash.com/photo-${GALLERY_PHOTOS[selected].id}?w=1400&q=85&auto=format&fit=crop`}
              alt={GALLERY_PHOTOS[selected].caption}
              style={{ maxWidth: "100%", maxHeight: "75vh", borderRadius: 16, boxShadow: "0 40px 100px rgba(0,0,0,0.5)", border: "2px solid rgba(201,169,110,0.4)", animation: "scaleIn 0.4s ease" }} />
            <p style={{ marginTop: 20, fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#E8D5A3", fontSize: 20, letterSpacing: 1 }}>
              {GALLERY_PHOTOS[selected].caption}
            </p>
            <p style={{ marginTop: 8, color: "rgba(232,213,163,0.5)", fontSize: 12, fontFamily: "Cinzel, serif", letterSpacing: 2 }}>
              {selected + 1} / {GALLERY_PHOTOS.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RSVP HELPERS ───────────────────────────────────────────────────────────
const RSVP_EVENTS = [
  { id: "ceremony",  label: "Holy Nuptial Mass",   date: "Sun · 21 Jun · 9:30 AM",       venue: "Our Lady of Presentation Church, Neyveli Township", required: true },
  { id: "reception", label: "Wedding Reception",   date: "Sun · 21 Jun · 12:00 – 2:00 PM", venue: "Thirumana Mandapam, Community Hall Block 24, Neyveli Township" },
];

const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+1",  flag: "🇺🇸", name: "USA / Canada" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "+60", flag: "🇲🇾", name: "Malaysia" },
];

const DIETS = [
  { v: "", label: "No restriction" },
  { v: "veg", label: "Vegetarian" },
  { v: "vegan", label: "Vegan" },
  { v: "jain", label: "Jain" },
  { v: "halal", label: "Halal" },
  { v: "gluten-free", label: "Gluten-free" },
];

function genReservationCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "AM-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function emptyGuest() { return { name: "", ageGroup: "adult", diet: "", allergies: "" }; }

const RELATIONSHIPS = [
  { v: "",                   label: "— Please select —" },
  { v: "family-bride",       label: "👰  Family of the Bride" },
  { v: "family-groom",       label: "🤵  Family of the Groom" },
  { v: "friend-bride",       label: "💝  Friend of the Bride" },
  { v: "friend-groom",       label: "💙  Friend of the Groom" },
  { v: "friend-both",        label: "💞  Friend of Both" },
  { v: "colleague-bride",    label: "💼  Colleague of the Bride" },
  { v: "colleague-groom",    label: "💼  Colleague of the Groom" },
  { v: "neighbor",           label: "🏡  Neighbor / Community" },
  { v: "other",              label: "✦  Other" },
];

function relationshipLabel(v) {
  return (RELATIONSHIPS.find(r => r.v === v) || RELATIONSHIPS[0]).label;
}

function emptyRSVP() {
  return {
    name: "", email: "", phone: "", countryCode: "+91",
    relationship: "",
    attending: "",
    events: ["ceremony", "reception"],
    guests: 1,
    guestList: [],
    needsHotel: false, needsShuttle: false,
    arrivalDate: "", departureDate: "",
    songRequest: "", message: "", specialRequests: "",
    reservationCode: "",
    ts: 0,
  };
}

// ─── STEP INDICATOR ─────────────────────────────────────────────────────────
function StepIndicator({ steps, current, onJump }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 32, flexWrap: "wrap" }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center" }}>
          <button
            onClick={() => i < current && onJump(i)}
            disabled={i > current}
            aria-label={`Step ${i + 1}: ${s}`}
            aria-current={i === current ? "step" : undefined}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              border: i <= current ? "none" : "1px solid rgba(201,169,110,0.4)",
              background: i < current ? "#7A9E7E" : i === current ? "linear-gradient(135deg, #C9A96E, #8B6914)" : "transparent",
              color: i <= current ? "white" : "#8B6914",
              fontFamily: "Cinzel, serif", fontSize: 12, fontWeight: 600,
              cursor: i < current ? "pointer" : "default",
              boxShadow: i === current ? "0 0 0 4px rgba(201,169,110,0.2)" : "none",
              transition: "all 0.3s",
            }}>
            {i < current ? "✓" : i + 1}
          </button>
          {i < steps.length - 1 && (
            <div style={{ width: 32, height: 2, background: i < current ? "#7A9E7E" : "rgba(201,169,110,0.2)", transition: "background 0.3s" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── CONFIRMATION TICKET (downloadable PNG) ─────────────────────────────────
function downloadTicket(rsvp) {
  const W = 1080, H = 1500;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FDF8F0";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#1A1209";
  ctx.fillRect(0, 0, W, 220);

  ctx.fillStyle = "#C9A96E";
  ctx.font = "italic 28px 'Cormorant Garamond', Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("❖  ADMIT ONE  ❖", W / 2, 80);
  ctx.font = "600 60px 'Cinzel', Georgia, serif";
  ctx.fillStyle = "#E8D5A3";
  ctx.fillText("WEDDING TICKET", W / 2, 150);
  ctx.font = "italic 22px 'Cormorant Garamond', Georgia, serif";
  ctx.fillStyle = "rgba(232,213,163,0.7)";
  ctx.fillText(COUPLE.hashtag, W / 2, 190);

  ctx.fillStyle = "#3D2B1F";
  ctx.font = "italic 28px 'Cormorant Garamond', Georgia, serif";
  ctx.fillText(rsvp.name, W / 2, 290);

  ctx.font = "600 80px 'Cormorant Garamond', Georgia, serif";
  ctx.fillStyle = "#1A1209";
  ctx.fillText(`${COUPLE.groom}`, W / 2, 400);
  ctx.fillStyle = "#C4847A";
  ctx.font = "italic 50px 'Cormorant Garamond', Georgia, serif";
  ctx.fillText("&", W / 2, 470);
  ctx.fillStyle = "#1A1209";
  ctx.font = "600 70px 'Cormorant Garamond', Georgia, serif";
  ctx.fillText(`${COUPLE.bride}`, W / 2, 560);

  ctx.strokeStyle = "rgba(201,169,110,0.3)";
  ctx.beginPath();
  for (let i = 0; i < W; i += 12) {
    ctx.moveTo(i, 640); ctx.lineTo(i + 6, 640);
  }
  ctx.stroke();

  ctx.fillStyle = "#C9A96E";
  ctx.font = "600 22px 'Cinzel', Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText("DATE", 100, 720);
  ctx.fillStyle = "#1A1209";
  ctx.font = "32px 'Cormorant Garamond', Georgia, serif";
  ctx.fillText("21 June 2026", 100, 760);

  ctx.fillStyle = "#C9A96E";
  ctx.font = "600 22px 'Cinzel', Georgia, serif";
  ctx.fillText("VENUE", 100, 830);
  ctx.fillStyle = "#1A1209";
  ctx.font = "28px 'Cormorant Garamond', Georgia, serif";
  ctx.fillText(COUPLE.venue, 100, 870);
  ctx.font = "italic 22px 'Cormorant Garamond', Georgia, serif";
  ctx.fillStyle = "#6B5040";
  ctx.fillText("Chennai, India", 100, 905);

  ctx.fillStyle = "#C9A96E";
  ctx.font = "600 22px 'Cinzel', Georgia, serif";
  ctx.fillText("GUESTS", 100, 980);
  ctx.fillStyle = "#1A1209";
  ctx.font = "32px 'Cormorant Garamond', Georgia, serif";
  ctx.fillText(`${rsvp.guests} ${rsvp.guests === 1 ? "Guest" : "Guests"}`, 100, 1020);

  ctx.fillStyle = "#C9A96E";
  ctx.font = "600 22px 'Cinzel', Georgia, serif";
  ctx.fillText("EVENTS", 100, 1090);
  ctx.fillStyle = "#1A1209";
  ctx.font = "italic 22px 'Cormorant Garamond', Georgia, serif";
  const eventNames = rsvp.events.map(eId => RSVP_EVENTS.find(e => e.id === eId)?.label).filter(Boolean).join(" · ");
  ctx.fillText(eventNames || "—", 100, 1125);

  // QR-like grid
  ctx.fillStyle = "#1A1209";
  const gridX = 720, gridY = 700, cell = 8;
  ctx.fillRect(gridX - 12, gridY - 12, 24 + 18 * cell, 24 + 18 * cell);
  ctx.fillStyle = "#FDF8F0";
  ctx.fillRect(gridX - 8, gridY - 8, 16 + 18 * cell, 16 + 18 * cell);
  ctx.fillStyle = "#1A1209";
  for (let r = 0; r < 18; r++) {
    for (let c = 0; c < 18; c++) {
      const seed = (r * 31 + c * 17 + rsvp.reservationCode.charCodeAt((r + c) % rsvp.reservationCode.length)) % 100;
      const corner = (r < 4 && c < 4) || (r < 4 && c > 13) || (r > 13 && c < 4);
      if (corner || seed < 50) {
        ctx.fillRect(gridX + c * cell, gridY + r * cell, cell - 1, cell - 1);
      }
    }
  }

  ctx.fillStyle = "#C9A96E";
  ctx.font = "600 22px 'Cinzel', Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("RESERVATION CODE", W / 2, 1280);
  ctx.fillStyle = "#1A1209";
  ctx.font = "600 56px 'Cinzel', Georgia, monospace";
  ctx.fillText(rsvp.reservationCode, W / 2, 1340);

  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.font = "italic 18px 'Cormorant Garamond', Georgia, serif";
  ctx.fillText("Please present this ticket at the entrance", W / 2, 1430);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wedding-ticket-${rsvp.reservationCode}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png", 0.95);
}

function CardChoice({ active, onClick, icon, title, sub, color = "#C9A96E" }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      style={{
        flex: "1 1 180px",
        background: active ? `linear-gradient(135deg, ${color}20, ${color}10)` : "white",
        border: `2px solid ${active ? color : "rgba(201,169,110,0.2)"}`,
        borderRadius: 14, padding: "20px 16px",
        cursor: "pointer", textAlign: "left",
        transition: "all 0.25s ease",
        transform: active ? "translateY(-2px)" : "none",
        boxShadow: active ? `0 8px 24px ${color}33` : "0 2px 8px rgba(0,0,0,0.04)",
      }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
      <p style={{ fontFamily: "Cinzel, serif", fontSize: 13, color: "#3D2B1F", letterSpacing: 1, marginBottom: 4 }}>{title}</p>
      {sub && <p style={{ fontFamily: "Lato", fontSize: 12, color: "#8B6914" }}>{sub}</p>}
    </button>
  );
}

// ─── ADVANCED RSVP WIZARD ───────────────────────────────────────────────────
const WIZARD_STEPS = ["You", "Attending", "Details", "Personal", "Confirm"];

function RSVPPage() {
  const [savedRSVP, setSavedRSVP] = usePersistedState("am_rsvp", null);
  const [allRSVPs, setAllRSVPs] = usePersistedState("am_all_rsvps", []);
  const [step, setStep] = useState(savedRSVP ? 5 : 0);
  const [form, setForm] = useState(() => savedRSVP ? { ...emptyRSVP(), ...savedRSVP } : emptyRSVP());
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupErr, setLookupErr] = useState("");

  const totalAttending = useMemo(
    () => allRSVPs.reduce((s, r) => s + (r.attending === "yes" ? Number(r.guests) || 1 : 0), 0),
    [allRSVPs]
  );

  const update = (patch) => setForm(f => ({ ...f, ...patch }));

  const setGuestCount = (n) => {
    const list = Array.from({ length: Math.max(0, n - 1) }, (_, i) => form.guestList[i] || emptyGuest());
    setForm(f => ({ ...f, guests: n, guestList: list }));
  };

  const setGuest = (idx, patch) => {
    setForm(f => {
      const list = [...f.guestList];
      list[idx] = { ...list[idx], ...patch };
      return { ...f, guestList: list };
    });
  };

  const toggleEvent = (id) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(id) ? f.events.filter(e => e !== id) : [...f.events, id]
    }));
  };

  const validateStep = () => {
    const e = {};
    if (step === 0) {
      if (!form.name.trim()) e.name = "Please enter your name";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Please enter a valid email";
      if (form.phone && !/^[0-9 ()-]{6,15}$/.test(form.phone)) e.phone = "Please enter a valid phone number";
      if (!form.relationship) e.relationship = "Please tell us how you know us";
    } else if (step === 1) {
      if (!form.attending) e.attending = "Please tell us if you'll be joining";
    } else if (step === 2 && form.attending === "yes") {
      if (form.events.length === 0) e.events = "Please select at least one event";
      if (!form.guests || form.guests < 1) e.guests = "At least 1 guest";
      form.guestList.forEach((g, i) => {
        if (!g.name.trim()) e[`guest_${i}_name`] = "Required";
      });
    }
    return e;
  };

  const next = () => {
    const e = validateStep();
    setErrors(e);
    if (Object.keys(e).length) return;
    if (step === 1 && form.attending === "no") {
      setStep(3);
    } else {
      setStep(s => Math.min(s + 1, 4));
    }
  };

  const back = () => {
    setErrors({});
    if (step === 3 && form.attending === "no") setStep(1);
    else setStep(s => Math.max(s - 1, 0));
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const code = form.reservationCode || genReservationCode();
      const final = { ...form, reservationCode: code, ts: Date.now() };
      // Production: POST to your endpoint
      // await fetch(import.meta.env.VITE_RSVP_ENDPOINT, { method: "POST", body: JSON.stringify(final) });
      await new Promise(r => setTimeout(r, 800));
      setForm(final);
      setSavedRSVP(final);
      setAllRSVPs(prev => [...prev.filter(r => r.email !== final.email), final]);
      setStep(5);
    } catch {
      setErrors({ submit: "Submission failed. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const lookupRSVP = () => {
    const found = allRSVPs.find(r => r.email.toLowerCase() === lookupEmail.toLowerCase().trim());
    if (found) {
      setForm({ ...emptyRSVP(), ...found });
      setSavedRSVP(found);
      setStep(5);
      setLookupErr("");
    } else {
      setLookupErr("No RSVP found for that email.");
    }
  };

  const editRSVP = () => {
    setStep(0);
    setSavedRSVP(null);
  };

  // ─── CONFIRMATION (step 5) ─────────────────────────────────────────────
  if (step === 5) {
    return (
      <div style={{ background: "#FAF3E4", minHeight: "100vh", padding: "40px 20px" }}>
        <Confetti active={true} />
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div className="card-light" style={{ textAlign: "center", animation: "bounceIn 0.9s ease", overflow: "hidden", position: "relative" }}>
            {/* Decorative ribbon */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: "linear-gradient(90deg, #C9A96E, #E8D5A3, #C9A96E)" }} />

            <div style={{ fontSize: 64, animation: "heartBeat 2s infinite", display: "inline-block", marginTop: 20 }}>
              {form.attending === "yes" ? "💌" : "💝"}
            </div>
            <h2 style={{ fontFamily: "Cinzel, serif", fontSize: 28, color: "#3D2B1F", marginTop: 20 }}>
              {form.attending === "yes" ? "You're Confirmed!" : "Thank You"}
            </h2>
            <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: 18, color: "#8B6914", marginTop: 8 }}>
              {form.attending === "yes"
                ? `We can't wait to celebrate with you, ${form.name}!`
                : `We'll miss you, ${form.name}. Thank you for letting us know.`}
            </p>

            {form.attending === "yes" && (
              <>
                <div style={{ marginTop: 28, padding: 20, background: "linear-gradient(135deg, #1A1209, #2D1F0E)", borderRadius: 12, color: "#E8D5A3", textAlign: "left" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <p style={{ fontFamily: "Cinzel, serif", fontSize: 11, letterSpacing: 2, color: "#C9A96E" }}>RESERVATION CODE</p>
                    <p style={{ fontFamily: "Cinzel, serif", fontSize: 11, letterSpacing: 2, color: "#C4847A" }}>WEDDING TICKET</p>
                  </div>
                  <p style={{ fontFamily: "Courier New, monospace", fontSize: 32, color: "white", letterSpacing: 4, fontWeight: 700, textAlign: "center", marginBottom: 16 }}>
                    {form.reservationCode}
                  </p>
                  <div style={{ height: 1, background: "rgba(201,169,110,0.3)", margin: "16px 0" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, fontSize: 13 }}>
                    <div>
                      <p style={{ fontSize: 10, color: "#C9A96E", letterSpacing: 1.5, fontFamily: "Cinzel, serif" }}>NAME</p>
                      <p style={{ marginTop: 4 }}>{form.name}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: "#C9A96E", letterSpacing: 1.5, fontFamily: "Cinzel, serif" }}>GUESTS</p>
                      <p style={{ marginTop: 4 }}>{form.guests}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: "#C9A96E", letterSpacing: 1.5, fontFamily: "Cinzel, serif" }}>DATE</p>
                      <p style={{ marginTop: 4 }}>21 Jun 2026</p>
                    </div>
                  </div>
                  {form.relationship && (
                    <div style={{ marginTop: 14 }}>
                      <p style={{ fontSize: 10, color: "#C9A96E", letterSpacing: 1.5, fontFamily: "Cinzel, serif" }}>RELATIONSHIP</p>
                      <p style={{ marginTop: 4, fontSize: 13 }}>{relationshipLabel(form.relationship)}</p>
                    </div>
                  )}
                  <div style={{ marginTop: 14 }}>
                    <p style={{ fontSize: 10, color: "#C9A96E", letterSpacing: 1.5, fontFamily: "Cinzel, serif" }}>EVENTS ATTENDING</p>
                    <p style={{ marginTop: 4, fontSize: 13 }}>
                      {form.events.map(eId => RSVP_EVENTS.find(e => e.id === eId)?.label).filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </div>

                <p style={{ marginTop: 16, color: "#6B5040", fontSize: 13 }}>
                  A confirmation has been sent to <strong>{form.email}</strong>
                </p>

                <div style={{ marginTop: 16, padding: 14, background: "rgba(201,169,110,0.1)", borderRadius: 10, fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#8B6914" }}>
                  <strong style={{ color: "#3D2B1F", fontFamily: "Cinzel, serif", fontStyle: "normal", fontSize: 14, letterSpacing: 1 }}>{totalAttending}</strong>
                  {" "}{totalAttending === 1 ? "guest" : "guests"} confirmed so far ✦
                </div>
              </>
            )}

            <div style={{ marginTop: 24, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {form.attending === "yes" && (
                <>
                  <button className="btn-primary" style={{ fontSize: 11, padding: "10px 20px" }} onClick={() => downloadTicket(form)}>🎟 Download Ticket</button>
                  <button className="btn-outline" style={{ fontSize: 11, padding: "10px 20px" }} onClick={downloadICS}>📅 Add to Calendar</button>
                </>
              )}
              <button className="btn-outline" style={{ fontSize: 11, padding: "10px 20px" }} onClick={shareWedding}>🔗 Share</button>
              <button className="btn-outline" style={{ fontSize: 11, padding: "10px 20px", color: "#C4847A", borderColor: "#C4847A" }} onClick={editRSVP}>✎ Edit RSVP</button>
            </div>
          </div>

          {/* Live RSVP feed */}
          {allRSVPs.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <p style={{ fontFamily: "Cinzel, serif", fontSize: 12, color: "#8B6914", textAlign: "center", letterSpacing: 2, marginBottom: 16 }}>
                ✦ RECENTLY JOINED ✦
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {allRSVPs.slice(-8).reverse().map((r, i) => (
                  <div key={r.email + i} style={{
                    padding: "8px 14px",
                    background: "white",
                    border: "1px solid rgba(201,169,110,0.2)",
                    borderRadius: 20,
                    fontSize: 12,
                    color: "#6B5040",
                    fontFamily: "Cormorant Garamond, serif",
                    fontStyle: "italic",
                  }}>
                    <span style={{ color: "#7A9E7E" }}>✓</span> {r.name.split(" ")[0]} {r.attending === "yes" && `+${(r.guests || 1) - 1 > 0 ? (r.guests || 1) - 1 : 0}`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#FAF3E4", minHeight: "100vh" }}>
      <section className="section" style={{ maxWidth: 760 }}>
        <h2 className="section-title">RSVP</h2>
        <p className="section-sub">Kindly respond by {COUPLE.rsvpDeadline}</p>
        <div className="gold-divider" />

        {/* LIVE COUNTER */}
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "Cinzel, serif", fontSize: 28, color: "#C9A96E" }}>{totalAttending}</p>
            <p style={{ fontSize: 10, letterSpacing: 2, color: "#8B6914", fontFamily: "Cinzel, serif" }}>GUESTS CONFIRMED</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "Cinzel, serif", fontSize: 28, color: "#C4847A" }}>
              {Math.max(0, Math.ceil((new Date(COUPLE.date).getTime() - Date.now()) / 86400000))}
            </p>
            <p style={{ fontSize: 10, letterSpacing: 2, color: "#8B6914", fontFamily: "Cinzel, serif" }}>DAYS TO GO</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "Cinzel, serif", fontSize: 28, color: "#7A9E7E" }}>{allRSVPs.length}</p>
            <p style={{ fontSize: 10, letterSpacing: 2, color: "#8B6914", fontFamily: "Cinzel, serif" }}>RESPONSES</p>
          </div>
        </div>

        <StepIndicator steps={WIZARD_STEPS} current={step} onJump={setStep} />

        <div className="card-light" style={{ minHeight: 360 }}>
          {/* STEP 0 — ABOUT YOU */}
          {step === 0 && (
            <div style={{ animation: "fadeInUp 0.4s ease" }}>
              <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 18, color: "#3D2B1F", marginBottom: 6 }}>About You</h3>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#8B6914", marginBottom: 24 }}>
                Let's start with a few details
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="r-name">Full Name *</label>
                <input id="r-name" className="form-input" autoFocus placeholder="Your full name" value={form.name} onChange={e => update({ name: e.target.value })} />
                {errors.name && <p role="alert" style={{ color: "#C4847A", fontSize: 12, marginTop: 4 }}>{errors.name}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="r-email">Email Address *</label>
                <input id="r-email" className="form-input" type="email" placeholder="your@email.com" value={form.email} onChange={e => update({ email: e.target.value })} />
                {errors.email && <p role="alert" style={{ color: "#C4847A", fontSize: 12, marginTop: 4 }}>{errors.email}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="r-phone">Phone (optional)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="form-select" style={{ width: 120 }} value={form.countryCode} onChange={e => update({ countryCode: e.target.value })} aria-label="Country code">
                    {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                  </select>
                  <input id="r-phone" className="form-input" type="tel" placeholder="98765 43210" value={form.phone} onChange={e => update({ phone: e.target.value })} />
                </div>
                {errors.phone && <p role="alert" style={{ color: "#C4847A", fontSize: 12, marginTop: 4 }}>{errors.phone}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="r-relationship">How do you know us? *</label>
                <select id="r-relationship" className="form-select" value={form.relationship} onChange={e => update({ relationship: e.target.value })}>
                  {RELATIONSHIPS.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}
                </select>
                <p style={{ fontSize: 11, color: "rgba(61,43,31,0.5)", marginTop: 6, fontFamily: "Cormorant Garamond, serif", fontStyle: "italic" }}>
                  Helps us with seating and a personal welcome
                </p>
                {errors.relationship && <p role="alert" style={{ color: "#C4847A", fontSize: 12, marginTop: 4 }}>{errors.relationship}</p>}
              </div>

              {/* Lookup existing */}
              <details style={{ marginTop: 24, padding: 14, background: "rgba(201,169,110,0.06)", borderRadius: 10 }}>
                <summary style={{ cursor: "pointer", fontFamily: "Cinzel, serif", fontSize: 12, color: "#8B6914", letterSpacing: 1 }}>
                  Already RSVP'd? Look up your reservation
                </summary>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input className="form-input" placeholder="Enter your email" value={lookupEmail} onChange={e => setLookupEmail(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
                  <button className="btn-outline" style={{ fontSize: 11, padding: "8px 18px" }} onClick={lookupRSVP}>Look Up</button>
                </div>
                {lookupErr && <p style={{ color: "#C4847A", fontSize: 12, marginTop: 6 }}>{lookupErr}</p>}
              </details>
            </div>
          )}

          {/* STEP 1 — ATTENDING */}
          {step === 1 && (
            <div style={{ animation: "fadeInUp 0.4s ease" }}>
              <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 18, color: "#3D2B1F", marginBottom: 6 }}>Will you join us?</h3>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#8B6914", marginBottom: 24 }}>
                We'd love to celebrate with you
              </p>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <CardChoice active={form.attending === "yes"} onClick={() => update({ attending: "yes" })}
                  icon="🎉" title="Joyfully Accepting" sub="Count me in for the celebration!" color="#7A9E7E" />
                <CardChoice active={form.attending === "no"} onClick={() => update({ attending: "no" })}
                  icon="💔" title="Sadly Declining" sub="Will be there in spirit" color="#C4847A" />
              </div>
              {errors.attending && <p role="alert" style={{ color: "#C4847A", fontSize: 12, marginTop: 12, textAlign: "center" }}>{errors.attending}</p>}
            </div>
          )}

          {/* STEP 2 — DETAILS (events + group) */}
          {step === 2 && form.attending === "yes" && (
            <div style={{ animation: "fadeInUp 0.4s ease" }}>
              <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 18, color: "#3D2B1F", marginBottom: 6 }}>Your Details</h3>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#8B6914", marginBottom: 24 }}>
                Which events and how many in your party
              </p>

              <p className="form-label">Events you'll attend</p>
              <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
                {RSVP_EVENTS.map(ev => (
                  <label key={ev.id} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: 14,
                    border: `2px solid ${form.events.includes(ev.id) ? "#C9A96E" : "rgba(201,169,110,0.2)"}`,
                    background: form.events.includes(ev.id) ? "rgba(201,169,110,0.08)" : "white",
                    borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
                  }}>
                    <input type="checkbox" checked={form.events.includes(ev.id)} onChange={() => toggleEvent(ev.id)}
                      style={{ width: 18, height: 18, accentColor: "#C9A96E" }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: "Cinzel, serif", fontSize: 13, color: "#3D2B1F" }}>{ev.label}{ev.required && <span style={{ color: "#C4847A", marginLeft: 6 }}>★</span>}</p>
                      <p style={{ fontSize: 12, color: "#8B6914", fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", marginTop: 2 }}>
                        {ev.date} · {ev.venue}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.events && <p role="alert" style={{ color: "#C4847A", fontSize: 12, marginTop: -16, marginBottom: 16 }}>{errors.events}</p>}

              <div className="form-group">
                <label className="form-label" htmlFor="r-guests">Number of Guests (including yourself)</label>
                <select id="r-guests" className="form-select" value={form.guests} onChange={e => setGuestCount(Number(e.target.value))}>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {n === 1 ? "Guest" : "Guests"}</option>)}
                </select>
              </div>

              {form.guestList.length > 0 && (
                <div style={{ marginTop: 16, padding: 16, background: "rgba(201,169,110,0.06)", borderRadius: 10 }}>
                  <p style={{ fontFamily: "Cinzel, serif", fontSize: 12, color: "#8B6914", letterSpacing: 1.5, marginBottom: 12 }}>ADDITIONAL GUESTS</p>
                  {form.guestList.map((g, i) => (
                    <div key={i} style={{ marginBottom: 14, padding: 12, background: "white", borderRadius: 8, border: "1px solid rgba(201,169,110,0.15)" }}>
                      <p style={{ fontSize: 11, color: "#8B6914", fontFamily: "Cinzel, serif", letterSpacing: 1, marginBottom: 8 }}>GUEST {i + 2}</p>
                      <input className="form-input" placeholder="Guest name" value={g.name} onChange={e => setGuest(i, { name: e.target.value })} style={{ marginBottom: 8 }} />
                      {errors[`guest_${i}_name`] && <p style={{ color: "#C4847A", fontSize: 11, marginTop: -4, marginBottom: 8 }}>{errors[`guest_${i}_name`]}</p>}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <select className="form-select" value={g.ageGroup} onChange={e => setGuest(i, { ageGroup: e.target.value })}>
                          <option value="adult">Adult</option>
                          <option value="child">Child (under 12)</option>
                        </select>
                        <select className="form-select" value={g.diet} onChange={e => setGuest(i, { diet: e.target.value })}>
                          {DIETS.map(d => <option key={d.v} value={d.v}>{d.label}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — PERSONAL */}
          {step === 3 && (
            <div style={{ animation: "fadeInUp 0.4s ease" }}>
              <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 18, color: "#3D2B1F", marginBottom: 6 }}>Personal Touch</h3>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#8B6914", marginBottom: 24 }}>
                {form.attending === "yes" ? "Help us make this perfect" : "Leave a message we'll cherish"}
              </p>

              {form.attending === "yes" && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="r-song">🎵 Song Request</label>
                    <input id="r-song" className="form-input" placeholder="A song to dance to..." value={form.songRequest} onChange={e => update({ songRequest: e.target.value })} maxLength={120} />
                  </div>

                  <div style={{ marginTop: 8, marginBottom: 16 }}>
                    <p className="form-label">Travel & Stay</p>
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                      <CardChoice active={form.needsHotel} onClick={() => update({ needsHotel: !form.needsHotel })}
                        icon="🏨" title="Need Hotel" sub="Help with accommodation" color="#9B8EC4" />
                      <CardChoice active={form.needsShuttle} onClick={() => update({ needsShuttle: !form.needsShuttle })}
                        icon="🚐" title="Need Shuttle" sub="From hotel to venue" color="#6EA8C9" />
                    </div>
                  </div>

                  {(form.needsHotel || form.needsShuttle) && (
                    <div className="grid-2" style={{ marginBottom: 16 }}>
                      <div className="form-group">
                        <label className="form-label" htmlFor="r-arrive">Arrival Date</label>
                        <input id="r-arrive" type="date" className="form-input" value={form.arrivalDate} onChange={e => update({ arrivalDate: e.target.value })} min="2026-06-19" max="2026-06-21" />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="r-depart">Departure Date</label>
                        <input id="r-depart" type="date" className="form-input" value={form.departureDate} onChange={e => update({ departureDate: e.target.value })} min="2026-06-21" max="2026-06-23" />
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label" htmlFor="r-special">Allergies / Special Requests</label>
                    <input id="r-special" className="form-input" placeholder="Any allergies or accessibility needs..." value={form.specialRequests} onChange={e => update({ specialRequests: e.target.value })} maxLength={200} />
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="r-msg">Message to the Couple</label>
                <textarea id="r-msg" className="form-textarea" placeholder="Share your blessings and wishes..." value={form.message} onChange={e => update({ message: e.target.value })} maxLength={500} />
                <p style={{ fontSize: 11, color: "rgba(61,43,31,0.5)", marginTop: 4, textAlign: "right" }}>{form.message.length}/500</p>
              </div>
            </div>
          )}

          {/* STEP 4 — REVIEW */}
          {step === 4 && (
            <div style={{ animation: "fadeInUp 0.4s ease" }}>
              <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 18, color: "#3D2B1F", marginBottom: 6 }}>Review & Confirm</h3>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#8B6914", marginBottom: 24 }}>
                One last look before we send it
              </p>

              <div style={{ background: "rgba(201,169,110,0.06)", borderRadius: 10, padding: 20 }}>
                <ReviewRow label="Name" value={form.name} onEdit={() => setStep(0)} />
                <ReviewRow label="Email" value={form.email} onEdit={() => setStep(0)} />
                {form.phone && <ReviewRow label="Phone" value={`${form.countryCode} ${form.phone}`} onEdit={() => setStep(0)} />}
                {form.relationship && <ReviewRow label="Relationship" value={relationshipLabel(form.relationship)} onEdit={() => setStep(0)} />}
                <ReviewRow label="Attending" value={form.attending === "yes" ? "✓ Joyfully accepting" : "Sadly declining"} onEdit={() => setStep(1)} />
                {form.attending === "yes" && (
                  <>
                    <ReviewRow label="Events"
                      value={form.events.map(eId => RSVP_EVENTS.find(e => e.id === eId)?.label).filter(Boolean).join(", ") || "—"}
                      onEdit={() => setStep(2)} />
                    <ReviewRow label="Guests" value={`${form.guests} ${form.guests === 1 ? "guest" : "guests"}`} onEdit={() => setStep(2)} />
                    {form.guestList.length > 0 && (
                      <ReviewRow label="Guest list"
                        value={form.guestList.map(g => g.name + (g.ageGroup === "child" ? " (child)" : "")).join(", ")}
                        onEdit={() => setStep(2)} />
                    )}
                    {form.songRequest && <ReviewRow label="Song" value={form.songRequest} onEdit={() => setStep(3)} />}
                    {(form.needsHotel || form.needsShuttle) && (
                      <ReviewRow label="Travel"
                        value={[form.needsHotel && "Hotel", form.needsShuttle && "Shuttle"].filter(Boolean).join(" + ")}
                        onEdit={() => setStep(3)} />
                    )}
                    {form.specialRequests && <ReviewRow label="Special" value={form.specialRequests} onEdit={() => setStep(3)} />}
                  </>
                )}
                {form.message && <ReviewRow label="Message" value={form.message} onEdit={() => setStep(3)} />}
              </div>

              {errors.submit && <p role="alert" style={{ color: "#C4847A", textAlign: "center", marginTop: 12 }}>{errors.submit}</p>}
            </div>
          )}

          {/* NAV BUTTONS */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, gap: 12, flexWrap: "wrap" }}>
            <button className="btn-outline" style={{ fontSize: 11, padding: "10px 24px", visibility: step === 0 ? "hidden" : "visible" }}
              onClick={back}>← Back</button>

            <p style={{ fontFamily: "Cinzel, serif", fontSize: 11, color: "#8B6914", letterSpacing: 2 }}>
              STEP {step + 1} OF {WIZARD_STEPS.length}
            </p>

            {step < 4 ? (
              <button className="btn-primary" style={{ fontSize: 11, padding: "10px 24px" }} onClick={next}>
                Continue →
              </button>
            ) : (
              <button className="btn-primary" style={{ fontSize: 11, padding: "10px 24px" }} onClick={submit} disabled={submitting} aria-busy={submitting}>
                {submitting ? "Sending…" : "Confirm ✦"}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ReviewRow({ label, value, onEdit }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid rgba(201,169,110,0.15)", gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, color: "#8B6914", letterSpacing: 1.5, fontFamily: "Cinzel, serif", textTransform: "uppercase" }}>{label}</p>
        <p style={{ fontSize: 14, color: "#3D2B1F", fontFamily: "Lato", marginTop: 2, wordBreak: "break-word" }}>{value || "—"}</p>
      </div>
      {onEdit && (
        <button onClick={onEdit} aria-label={`Edit ${label}`}
          style={{ background: "none", border: "none", color: "#C9A96E", cursor: "pointer", fontSize: 12, fontFamily: "Cinzel, serif", letterSpacing: 1 }}>
          EDIT
        </button>
      )}
    </div>
  );
}

function MorePage({ setPage }) {
  const [guestMessages, setGuestMessages] = usePersistedState("am_guestbook_v2", [
    { name: "Dr. Maria Loraine Lydia & Antony Paul", msg: "Dearest family and friends — thank you for being a part of our journey. Your love, prayers, and blessings mean everything to us as we begin this new chapter together. ✦", ts: Date.now(), pinned: true },
    { name: "Sarah & Tom", msg: "Wishing you a lifetime of joy and love! 🙏", ts: Date.now() - 86400000 * 7 },
    { name: "The Mathews Family", msg: "God's richest blessings on your marriage!", ts: Date.now() - 86400000 * 3 },
  ]);
  const [newName, setNewName] = useState("");
  const [newMsg, setNewMsg] = useState("");
  const addMessage = () => {
    const name = newName.trim();
    const msg = newMsg.trim();
    if (!name || !msg) return;
    if (msg.length > 500) return;
    setGuestMessages([{ name, msg, ts: Date.now() }, ...guestMessages]);
    setNewName(""); setNewMsg("");
  };
  return (
    <div style={{ background: "#FAF3E4", minHeight: "100vh" }}>
      <section className="section">
        <h2 className="section-title">More</h2>
        <p className="section-sub">Additional information for our guests</p>
        <div className="gold-divider" />
        <div className="grid-2">
          {/* QR CODES — Scan to locate */}
          <div className="card-light" style={{ gridColumn: "1 / -1" }}>
            <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 22, color: "#3D2B1F", textAlign: "center", marginBottom: 8 }}>📍 Scan to Locate</h3>
            <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#8B6914", textAlign: "center", marginBottom: 24, fontSize: 16 }}>
              Open your phone camera and scan for directions
            </p>
            <div className="grid-2" style={{ alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "inline-block", padding: 16, background: "white", borderRadius: 14, border: "2px solid rgba(201,169,110,0.25)", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}>
                  <img src={`${import.meta.env.BASE_URL}qr-church.png`}
                    alt="QR code to Our Lady of Presentation Church"
                    width={200} height={200}
                    loading="lazy"
                    style={{ display: "block", maxWidth: "100%", height: "auto" }} />
                </div>
                <p style={{ marginTop: 14, fontFamily: "Cinzel, serif", fontSize: 13, letterSpacing: 2, color: "#3D2B1F" }}>⛪ WEDDING CEREMONY</p>
                <p style={{ marginTop: 4, fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#8B6914", fontSize: 14 }}>
                  Our Lady of Presentation Church
                </p>
                <p style={{ fontSize: 12, color: "#8B6914", marginTop: 2 }}>Sunday · 9:30 AM</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "inline-block", padding: 16, background: "white", borderRadius: 14, border: "2px solid rgba(201,169,110,0.25)", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}>
                  <img src={`${import.meta.env.BASE_URL}qr-reception.png`}
                    alt="QR code to Reception Hall"
                    width={200} height={200}
                    loading="lazy"
                    style={{ display: "block", maxWidth: "100%", height: "auto" }} />
                </div>
                <p style={{ marginTop: 14, fontFamily: "Cinzel, serif", fontSize: 13, letterSpacing: 2, color: "#3D2B1F" }}>🎊 RECEPTION</p>
                <p style={{ marginTop: 4, fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#8B6914", fontSize: 14 }}>
                  Thirumana Mandapam, Community Hall Block 24
                </p>
                <p style={{ fontSize: 12, color: "#8B6914", marginTop: 2 }}>Sunday · 12:00 PM – 2:00 PM</p>
              </div>
            </div>
          </div>

          {/* VENUE MAP */}
          <div className="card-light" style={{ gridColumn: "1 / -1" }}>
            <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 18, marginBottom: 16, color: "#3D2B1F" }}>📍 Venue Location</h3>
            <GoogleMapsEmbed query={COUPLE.venueAddress} height={320} />
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
              <a className="btn-primary" style={{ fontSize: 11, padding: "9px 22px", textDecoration: "none", display: "inline-block" }}
                href={MAPS_URL} target="_blank" rel="noreferrer">Open in Maps →</a>
              <a className="btn-outline" style={{ fontSize: 11, padding: "9px 22px", textDecoration: "none", display: "inline-block" }}
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(COUPLE.venueAddress)}`} target="_blank" rel="noreferrer">Get Directions</a>
            </div>
          </div>

          {/* GUEST BOOK */}
          <div className="card-light">
            <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 18, marginBottom: 16, color: "#3D2B1F" }}>📖 Guest Book</h3>
            <div style={{ marginBottom: 16 }}>
              <input className="form-input" placeholder="Your name" value={newName} onChange={e => setNewName(e.target.value)} style={{ marginBottom: 8 }} maxLength={50} aria-label="Your name" />
              <textarea className="form-textarea" placeholder="Leave your blessing..." value={newMsg} onChange={e => setNewMsg(e.target.value)} style={{ minHeight: 70 }} maxLength={500} aria-label="Your blessing message" />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span style={{ fontSize: 11, color: "rgba(61,43,31,0.5)" }}>{newMsg.length}/500</span>
                <button className="btn-primary" style={{ fontSize: 12, padding: "10px 24px" }} onClick={addMessage} disabled={!newName.trim() || !newMsg.trim()}>Leave a Blessing ✦</button>
              </div>
            </div>
            <p style={{ fontSize: 11, color: "rgba(61,43,31,0.6)", marginBottom: 8, fontFamily: "Cinzel, serif", letterSpacing: 1 }}>
              {guestMessages.length} {guestMessages.length === 1 ? "BLESSING" : "BLESSINGS"} RECEIVED
            </p>
            <div style={{ maxHeight: 240, overflowY: "auto", paddingRight: 4 }}>
              {guestMessages.map((m, i) => (
                <div key={m.ts || i} className="message-bubble" style={m.pinned ? {
                  background: "linear-gradient(135deg, rgba(201,169,110,0.12), rgba(196,132,122,0.08))",
                  border: "1px solid rgba(201,169,110,0.4)",
                  borderRadius: "16px",
                } : undefined}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <p style={{ fontFamily: "Cinzel, serif", fontSize: 12, color: m.pinned ? "#8B6914" : "#C9A96E", fontWeight: m.pinned ? 600 : 400 }}>
                      {m.pinned && <span style={{ marginRight: 6 }}>✦</span>}
                      {m.name}
                    </p>
                    {m.pinned ? (
                      <span style={{ fontSize: 9, letterSpacing: 1.5, color: "#C4847A", fontFamily: "Cinzel, serif", padding: "2px 8px", background: "rgba(196,132,122,0.12)", borderRadius: 4 }}>FROM THE COUPLE</span>
                    ) : m.ts && <p style={{ fontSize: 10, color: "rgba(61,43,31,0.4)" }}>{new Date(m.ts).toLocaleDateString()}</p>}
                  </div>
                  <p style={{ fontFamily: m.pinned ? "Cormorant Garamond, serif" : "Lato", fontStyle: m.pinned ? "italic" : "normal", fontSize: m.pinned ? 16 : 14, color: "#3D2B1F", lineHeight: 1.6 }}>{m.msg}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PROPOSAL STORY */}
        <div style={{ marginTop: 40 }}>
          <div className="card-light" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💍</div>
            <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 22, color: "#3D2B1F", marginBottom: 16 }}>The Engagement</h3>
            <div className="scripture">
              Surrounded by the love of our families and the blessings of God, we exchanged rings — a promise made with love, marking the beginning of our forever. What began as an arranged match through our families had blossomed into something beautiful, and on this day we said yes to a lifetime together.
              <span className="scripture-ref">April 26, 2026 · Chennai</span>
            </div>
          </div>
        </div>

        {/* OUR FAMILIES */}
        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 24, color: "#3D2B1F", textAlign: "center", marginBottom: 8 }}>With the Blessings of Our Families</h3>
          <p className="section-sub" style={{ marginBottom: 32 }}>The hearts that brought us together</p>
          <div className="grid-2">
            <div className="card-light" style={{ textAlign: "center", padding: 28 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>👰</div>
              <p style={{ fontFamily: "Cinzel, serif", fontSize: 11, letterSpacing: 3, color: "#C9A96E", marginBottom: 12 }}>BRIDE'S PARENTS</p>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 22, color: "#3D2B1F", lineHeight: 1.4 }}>{COUPLE.brideParents.father}</p>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#8B6914", fontSize: 14, marginTop: 4 }}>B.Sc, DBM, CAIIB</p>
              <div style={{ margin: "16px 0", height: 1, background: "rgba(201,169,110,0.25)" }} />
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 22, color: "#3D2B1F", lineHeight: 1.4 }}>{COUPLE.brideParents.mother}</p>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#8B6914", fontSize: 14, marginTop: 4 }}>M.A, Dip in Radiography, Dip in Counseling</p>
            </div>
            <div className="card-light" style={{ textAlign: "center", padding: 28 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🤵</div>
              <p style={{ fontFamily: "Cinzel, serif", fontSize: 11, letterSpacing: 3, color: "#C9A96E", marginBottom: 12 }}>GROOM'S PARENTS</p>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 22, color: "#3D2B1F", lineHeight: 1.4 }}>{COUPLE.groomParents.father}</p>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#8B6914", fontSize: 14, marginTop: 4 }}>Rtd. Sr. Foreman, FM Yard, Mine I, NLC India Ltd</p>
              <div style={{ margin: "16px 0", height: 1, background: "rgba(201,169,110,0.25)" }} />
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 22, color: "#3D2B1F", lineHeight: 1.4 }}>{COUPLE.groomParents.mother}</p>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#8B6914", fontSize: 14, marginTop: 4 }}>Block 24, Neyveli Township</p>
            </div>
          </div>
        </div>

        {/* SIBLINGS */}
        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 22, color: "#3D2B1F", textAlign: "center", marginBottom: 8 }}>Beloved Siblings</h3>
          <p className="section-sub" style={{ marginBottom: 24 }}>Standing with us in love and joy</p>
          <div className="grid-2">
            {[...COUPLE.brideSiblings, ...COUPLE.groomSiblings].map((s, i) => (
              <div key={i} className="card-light">
                <p style={{ fontFamily: "Cinzel, serif", fontSize: 11, letterSpacing: 2, color: "#C9A96E", marginBottom: 6 }}>{s.role.toUpperCase()}</p>
                <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 20, color: "#3D2B1F", marginBottom: 4 }}>{s.name}</p>
                <p style={{ fontFamily: "Lato", fontSize: 13, color: "#6B5040", lineHeight: 1.6 }}>{s.bio}</p>
              </div>
            ))}
          </div>
        </div>

        {/* OFFICIATING CLERGY */}
        <div style={{ marginTop: 40 }}>
          <div className="card-light">
            <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 22, color: "#3D2B1F", textAlign: "center", marginBottom: 8 }}>✝ Solemnized By</h3>
            <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#8B6914", textAlign: "center", marginBottom: 24, fontSize: 16 }}>
              Our Lady of Presentation Church, Neyveli Township
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              {COUPLE.priests.map((p, i) => (
                <div key={i} style={{
                  padding: "12px 16px",
                  background: "rgba(201,169,110,0.06)",
                  border: "1px solid rgba(201,169,110,0.2)",
                  borderRadius: 10,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ color: "#C9A96E", fontSize: 16 }}>✦</span>
                  <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 15, color: "#3D2B1F" }}>{p}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CONTACT FOR RSVP */}
        <div style={{ marginTop: 40 }}>
          <div className="card-light" style={{ background: "linear-gradient(135deg, rgba(201,169,110,0.08), rgba(196,132,122,0.06))" }}>
            <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 22, color: "#3D2B1F", textAlign: "center", marginBottom: 8 }}>📞 Contact for Queries</h3>
            <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#8B6914", textAlign: "center", marginBottom: 24, fontSize: 16 }}>
              Reach out to family for any questions
            </p>
            <div className="grid-3">
              {COUPLE.contacts.map(c => (
                <a key={c.phone} href={`tel:${c.phone.replace(/\s/g, "")}`}
                  style={{
                    textDecoration: "none",
                    padding: 16,
                    background: "white",
                    border: "1px solid rgba(201,169,110,0.25)",
                    borderRadius: 12,
                    textAlign: "center",
                    transition: "all 0.2s",
                    display: "block",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(201,169,110,0.2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                  <p style={{ fontFamily: "Cinzel, serif", fontSize: 11, letterSpacing: 1.5, color: "#C9A96E", marginBottom: 8 }}>{c.name.toUpperCase()}</p>
                  <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 18, color: "#3D2B1F", fontWeight: 600 }}>{c.phone}</p>
                  <p style={{ fontSize: 11, color: "#8B6914", marginTop: 4, letterSpacing: 1 }}>TAP TO CALL</p>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* DRESS CODE */}
        <div style={{ marginTop: 40 }}>
          <div className="card-light">
            <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 22, color: "#3D2B1F", textAlign: "center", marginBottom: 8 }}>👗 Dress Code</h3>
            <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", color: "#8B6914", textAlign: "center", marginBottom: 24, fontSize: 16 }}>
              Formal · Garden Elegance
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
              {[
                { color: "#C9A96E", name: "Champagne Gold" },
                { color: "#7A9E7E", name: "Sage Green" },
                { color: "#C4847A", name: "Dusty Rose" },
                { color: "#1E2D4E", name: "Midnight Navy" },
                { color: "#FAF3E4", name: "Ivory" },
              ].map(c => (
                <div key={c.name} style={{ textAlign: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: c.color, border: "3px solid white", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", margin: "0 auto 8px" }} />
                  <p style={{ fontSize: 11, color: "#6B5040", fontFamily: "Cinzel, serif", letterSpacing: 1 }}>{c.name}</p>
                </div>
              ))}
            </div>
            <p style={{ textAlign: "center", fontFamily: "Lato", fontSize: 13, color: "#6B5040", lineHeight: 1.6 }}>
              Gentlemen: Suit or sherwani in earthy tones. Ladies: Floor-length gown, saree or modest formal dress in our palette colors.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 24, color: "#3D2B1F", textAlign: "center", marginBottom: 8 }}>Frequently Asked</h3>
          <p className="section-sub" style={{ marginBottom: 24 }}>Everything you might want to know</p>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            {[
              { q: "What time should I arrive?", a: "Please arrive 30 minutes before the ceremony at 4:00 PM. Seating begins at 3:30 PM at St. Michael's Cathedral." },
              { q: "Is there parking available?", a: "Yes, there is ample valet parking at both the cathedral and the reception venue. Look for our gold-and-white signs to guide you." },
              { q: "Are children welcome?", a: "We love your little ones! Children are welcome at the ceremony. There will be a quiet kids' corner at the reception with light entertainment." },
              { q: "Will the ceremony be live-streamed?", a: "Yes! For our family and friends who can't make it, we'll be streaming the ceremony live. The link will be shared via email closer to the date." },
              { q: "Can I bring a plus-one?", a: "Plus-ones are listed on your invitation. If you'd like to bring an additional guest, please reach out to us directly so we can accommodate." },
              { q: "What's the gift policy?", a: "Your presence and prayers are our greatest gift. There is no formal registry — your blessings on our new journey mean the world to us." },
            ].map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
          </div>
        </div>

        {/* RSVP CTA */}
        <div style={{ marginTop: 48, textAlign: "center" }}>
          <div className="card-light" style={{ background: "linear-gradient(135deg, rgba(201,169,110,0.1), rgba(196,132,122,0.08))" }}>
            <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: 22, color: "#3D2B1F", marginBottom: 16 }}>
              Haven't responded yet?
            </p>
            <button className="btn-primary" onClick={() => setPage("rsvp")}>RSVP Now ✦</button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
const PAGES = [
  { id: "home",   label: "Home"    },
  { id: "story",  label: "Story"   },
  { id: "events", label: "Events"  },
  { id: "gallery",label: "Gallery" },
  { id: "rsvp",   label: "RSVP"   },
  { id: "more",   label: "More"    },
];

function ScrollProgressBar() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div aria-hidden="true" style={{
      position: "fixed", top: 60, left: 0, height: 2, width: `${pct}%`,
      background: "linear-gradient(90deg, #C9A96E, #E8D5A3)",
      boxShadow: "0 0 8px rgba(201,169,110,0.6)",
      zIndex: 199, transition: "width 0.05s linear",
    }} />
  );
}

function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 350,
        width: 44, height: 44, borderRadius: "50%",
        background: "linear-gradient(135deg, #C9A96E, #8B6914)",
        color: "#1A1209", border: "none", cursor: "pointer",
        boxShadow: "0 8px 24px rgba(201,169,110,0.4)",
        fontSize: 18, fontWeight: 700,
        animation: "fadeInUp 0.3s ease",
      }}>↑</button>
  );
}

function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [dismissed, setDismissed] = usePersistedState("am_pwa_dismissed", false);
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  if (!deferred || dismissed) return null;
  return (
    <div role="dialog" aria-label="Install app" style={{
      position: "fixed", bottom: 24, left: 24, zIndex: 350,
      background: "rgba(26,18,9,0.95)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(201,169,110,0.3)", borderRadius: 14,
      padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
      maxWidth: 320, boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
    }}>
      <span style={{ fontSize: 24 }}>📱</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: "#E8D5A3", fontFamily: "Cinzel, serif", fontSize: 12, letterSpacing: 1 }}>Install our invitation</p>
        <p style={{ color: "rgba(232,213,163,0.6)", fontSize: 11, fontFamily: "Lato" }}>Add to home screen for offline access</p>
      </div>
      <button onClick={async () => {
        const r = await deferred.prompt();
        await deferred.userChoice;
        setDeferred(null);
      }} style={{ background: "#C9A96E", border: "none", color: "#1A1209", padding: "6px 14px", borderRadius: 16, fontSize: 11, fontFamily: "Cinzel, serif", letterSpacing: 1, cursor: "pointer" }}>Install</button>
      <button onClick={() => setDismissed(true)} aria-label="Dismiss" style={{ background: "none", border: "none", color: "rgba(232,213,163,0.5)", cursor: "pointer", fontSize: 16 }}>✕</button>
    </div>
  );
}

function ToggleButton({ active, onClick, children, label }) {
  return (
    <button onClick={onClick} aria-label={label} aria-pressed={active}
      style={{
        background: active ? "rgba(201,169,110,0.2)" : "none",
        border: "1px solid rgba(201,169,110,0.4)",
        color: "#C9A96E", cursor: "pointer",
        height: 36, padding: "0 12px", borderRadius: 18,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontFamily: "Cinzel, serif", letterSpacing: 1,
        marginRight: 6,
      }}>{children}</button>
  );
}

const PAGE_LABELS = {
  en: { home: "Home", story: "Story", events: "Events", gallery: "Gallery", rsvp: "RSVP", more: "More" },
  ta: { home: "முகப்பு", story: "கதை", events: "நிகழ்வுகள்", gallery: "படங்கள்", rsvp: "வருகை", more: "மேலும்" },
};

function NavBar({ page, navigate, menuOpen, setMenuOpen, lang, setLang }) {
  const labels = PAGE_LABELS[lang] || PAGE_LABELS.en;
  const ids = ["home", "story", "events", "gallery", "rsvp", "more"];
  return (
    <nav className="nav" role="navigation" aria-label="Main">
      <a href="#/home" onClick={(e) => { e.preventDefault(); navigate("home"); }}
        className="nav-logo" style={{ textDecoration: "none" }} aria-label="Home">
        {COUPLE.initials}
      </a>
      <div className={`nav-links${menuOpen ? " open" : ""}`} role="menu">
        {ids.map(id => (
          <button key={id} role="menuitem"
            className={`nav-btn${page === id ? " active" : ""}`}
            aria-current={page === id ? "page" : undefined}
            onClick={() => { navigate(id); setMenuOpen(false); }}>
            {labels[id]}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <ToggleButton active={lang === "ta"} onClick={() => setLang(lang === "en" ? "ta" : "en")} label="Toggle language">
          {lang === "en" ? "EN" : "த"}
        </ToggleButton>
        <MusicToggle />
        <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" aria-expanded={menuOpen}
          style={{ background: "none", border: "none", color: "#C9A96E", fontSize: 20, cursor: "pointer", marginLeft: 4 }}>
          ☰
        </button>
      </div>
    </nav>
  );
}

function WeddingShell() {
  const [route, navigate] = useHashRoute("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHint, setShowHint] = usePersistedState("am_hint_seen", false);
  const [lang, setLang] = usePersistedState("am_lang", "en");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (showHint) return;
    const t = setTimeout(() => setShowHint(true), 6000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    document.title = `${PAGE_LABELS[lang][route] || "Home"} · ${COUPLE.groom} & ${COUPLE.bride}`;
  }, [route, lang]);

  const renderPage = () => {
    switch (route) {
      case "home":    return <HomePage setPage={navigate} />;
      case "story":   return <StoryPage />;
      case "events":  return <EventsPage />;
      case "gallery": return <GalleryPage />;
      case "rsvp":    return <RSVPPage />;
      case "more":    return <MorePage setPage={navigate} />;
      default:        return <HomePage setPage={navigate} />;
    }
  };

  return (
    <AppContext.Provider value={{ lang, setLang, theme: "light", setTheme: () => {} }}>
      <FontLoader />
      <style>{`
        @keyframes heartBeat {
          0%,100% { transform: scale(1); }
          14%     { transform: scale(1.3); }
          28%     { transform: scale(1); }
          42%     { transform: scale(1.3); }
          70%     { transform: scale(1); }
        }
        .section { --bg: #FAF3E4; }
        /* Print styles */
        @media print {
          .nav, .butterfly-container, [aria-label*="butterfl"], [aria-label="Back to top"], [aria-label="Toggle menu"], button, .scratch-wrapper, audio { display: none !important; }
          body { background: white !important; color: black !important; }
          .hero { min-height: auto !important; padding: 24px !important; background: white !important; color: black !important; page-break-after: always; }
          .hero-names, .hero-amp { color: #1A1209 !important; }
          .card-light, .card { box-shadow: none !important; border: 1px solid #ccc !important; page-break-inside: avoid; }
          .scripture { background: #fafafa !important; color: #333 !important; }
          .gallery-grid, .timer-grid { display: none !important; }
        }
        /* Better mobile */
        @media (max-width: 480px) {
          .hero-names { font-size: clamp(36px, 11vw, 64px) !important; }
          .nav { padding: 0 12px !important; }
          .section { padding: 60px 16px !important; }
          .timer-cell { padding: 14px 6px !important; }
        }
        /* Skip link */
        .skip-link {
          position: absolute; top: -100px; left: 8px;
          background: #C9A96E; color: #1A1209; padding: 8px 16px;
          border-radius: 4px; z-index: 9999;
          font-family: Cinzel, serif; font-size: 12px; letter-spacing: 1px;
        }
        .skip-link:focus { top: 8px; }
        /* Focus visible */
        button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
          outline: 2px solid #C9A96E !important;
          outline-offset: 2px !important;
        }
      `}</style>

      <a href="#main" className="skip-link">Skip to main content</a>

      <LoadingSplash done={!loading} />

      <NavBar page={route} navigate={navigate} menuOpen={menuOpen} setMenuOpen={setMenuOpen} lang={lang} setLang={setLang} />

      <ScrollProgressBar />

      <ButterflySwarm />

      {!showHint && !loading && (
        <div role="status" style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "rgba(26,18,9,0.85)", backdropFilter: "blur(8px)",
          color: "#E8D5A3", padding: "10px 22px", borderRadius: 50,
          fontSize: 12, letterSpacing: 1.5, fontFamily: "Cinzel, serif",
          border: "1px solid rgba(201,169,110,0.3)",
          zIndex: 400, pointerEvents: "none",
          animation: "fadeIn 0.5s ease, fadeOut 1s ease 4s forwards",
        }}>
          🦋 Click anywhere to summon butterflies · Move mouse to scare them
        </div>
      )}

      <main id="main" key={route} className="page animate-fadeIn">
        {renderPage()}
      </main>

      <BackToTop />
      <PWAInstallPrompt />

      <footer style={{ background: "#1A1209", color: "rgba(232,213,163,0.6)", padding: "40px 24px", textAlign: "center", borderTop: "1px solid rgba(201,169,110,0.2)" }}>
        <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: 18 }}>
          {COUPLE.groom} <span style={{ color: "#C4847A" }}>&amp;</span> {COUPLE.bride}
        </p>
        <p style={{ fontFamily: "Cinzel, serif", fontSize: 11, letterSpacing: 3, marginTop: 8 }}>
          {COUPLE.dayLabel.toUpperCase()} · {COUPLE.dateLabel} · NEYVELI
        </p>
        <p style={{ marginTop: 16, fontSize: 11, color: "rgba(201,169,110,0.5)" }}>
          {COUPLE.hashtag} · Made with ✦ for our wedding day
        </p>
      </footer>
    </AppContext.Provider>
  );
}

export default function WeddingApp() {
  return (
    <ErrorBoundary>
      <WeddingShell />
    </ErrorBoundary>
  );
}
