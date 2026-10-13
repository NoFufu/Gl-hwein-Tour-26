'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { criteria, stands } from '../lib/data';
import type { LandingLook } from '../lib/landing';

/** Einladung als Overlay über der App: Name eintippen, fertig, man ist in Levis Gruppe.
 *  Eine Zahl statt Name gilt als Admin-Code. `preview` zeigt das Overlay der einladenden Person, ohne etwas zu speichern. */
export default function Welcome({ look, preview, onJoin, onClose }: {
  look: LandingLook; preview?: boolean;
  onJoin: (name: string) => Promise<string | void>; onClose?: () => void;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n && !preview) return;
    setBusy(true); setError('');
    const problem = await onJoin(n);
    setBusy(false);
    if (problem) setError(problem);
  };

  return (
    <div className={`wl wl-${look}`} role="dialog" aria-modal="true" aria-labelledby="wl-title">
      {look === 'frostklar' && <Snow />}
      <div className="wl-card">
        {look === 'lichterkette' && <Garland />}
        {look === 'stadtplan' && <RouteMap />}
        {preview && <button type="button" className="wl-close" onClick={onClose} aria-label="Vorschau schließen"><X size={20} /></button>}
        <div className="wl-body">
          {look === 'lichterkette' && <span className="wl-eyebrow">Bielefeld · 19.11.–30.12.</span>}
          {look === 'frostklar' && <span className="wl-k">Gruppenticket · {stands.length} Stopps · {criteria.length} Kriterien</span>}
          {look === 'stadtplan' && <span className="wl-coord">{stands.length} Stopps · Alter Markt bis Bahnhofstraße</span>}
          <h1 id="wl-title">
            {look === 'lichterkette' && <>Glühwein Tour <em>26</em></>}
            {look === 'frostklar' && <>Glühwein Tour <b>26</b></>}
            {look === 'stadtplan' && <>Eine Route. <b>Sieben</b> Becher.</>}
          </h1>
          <p className="wl-lede">Du bist eingeladen. An jedem Stand bewertet ihr euren Becher, am Ende steht fest, wo es am besten schmeckt.</p>
          <form className="wl-join" onSubmit={submit}>
            <label htmlFor="wl-name">Wie heißt du?</label>
            <input id="wl-name" value={name} onChange={e => setName(e.target.value)} maxLength={30} required={!preview} autoComplete="given-name" placeholder="Dein Vorname" enterKeyHint="go" autoFocus={!preview} />
            <button type="submit" className="wl-btn" disabled={busy}>{preview ? 'Vorschau schließen' : busy ? 'Einen Moment …' : 'Dabei sein'} {!busy && <ArrowRight size={18} />}</button>
            {error ? <p className="wl-error" role="alert">{error}</p> : <p className="wl-hint">So sieht die Gruppe, wer bewertet hat.</p>}
          </form>
        </div>
      </div>
    </div>
  );
}

/** Lichterkette: eine Kugel pro Stopp. */
function Garland() {
  const W = 1200, y0 = 34, sag = 64, x0 = -20, x1 = W + 20, n = stands.length;
  const yAt = (x: number) => { const t = (x - x0) / (x1 - x0); return y0 + sag * 4 * t * (1 - t); };
  let d = `M${x0} ${y0}`; for (let x = x0; x <= x1; x += 20) d += ` L${x} ${yAt(x).toFixed(1)}`;
  return (
    <svg className="wl-garland" viewBox="0 0 1200 150" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <defs><radialGradient id="wlHalo"><stop offset="0" stopColor="#f3b66a" stopOpacity=".55" /><stop offset="1" stopColor="#f3b66a" stopOpacity="0" /></radialGradient></defs>
      <path d={d} className="wire" />
      {stands.map((s, i) => {
        const x = 110 + i * ((W - 220) / Math.max(1, n - 1)), y = yAt(x);
        return <g key={s.id} className="b" style={{ animationDelay: `${(i * .7) % 5}s` }}>
          <line x1={x} y1={y} x2={x} y2={y + 14} className="wire" />
          <rect x={x - 6} y={y + 12} width={12} height={9} rx={2} className="cap" />
          <circle cx={x} cy={y + 36} r={34} fill="url(#wlHalo)" />
          <ellipse cx={x} cy={y + 34} rx={11} ry={14} className="bulb" />
        </g>;
      })}
    </svg>
  );
}

/** Leiser Schneefall für Frostklar. */
function Snow() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current, ctx = cv?.getContext('2d');
    if (!cv || !ctx || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let w = 0, h = 0, raf = 0;
    let flakes: { x: number; y: number; r: number; v: number; s: number }[] = [];
    const size = () => {
      w = cv.clientWidth; h = cv.clientHeight; const dpr = devicePixelRatio || 1;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      flakes = Array.from({ length: Math.round(w * h / 18000) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: .8 + Math.random() * 2.2, v: .2 + Math.random() * .5, s: Math.random() * 6 }));
    };
    const tick = () => {
      ctx.clearRect(0, 0, w, h); ctx.fillStyle = 'rgba(120,140,160,.35)';
      for (const f of flakes) { f.y += f.v; f.s += .01; if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; } ctx.beginPath(); ctx.arc(f.x + Math.sin(f.s) * 6, f.y, f.r, 0, 7); ctx.fill(); }
      raf = requestAnimationFrame(tick);
    };
    size(); tick(); addEventListener('resize', size);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); };
  }, []);
  return <canvas ref={ref} className="wl-snow" aria-hidden="true" />;
}

/** Schematische Karte aus den echten Koordinaten der Stände. */
function RouteMap() {
  const W = 420, H = 470, m = 60, side = 150;
  const k = Math.cos(52.02 * Math.PI / 180);
  const xs = stands.map(s => s.coords[0] * k), ys = stands.map(s => s.coords[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const sc = Math.min((W - 2 * side) / (maxX - minX || 1), (H - 2 * m) / (maxY - minY || 1));
  const ox = side + ((W - 2 * side) - (maxX - minX) * sc) / 2;
  const pts = stands.map((s, i) => [ox + (xs[i] - minX) * sc, H - m - (ys[i] - minY) * sc] as const);
  const short = (t: string) => t.length > 20 ? t.slice(0, 18) + '…' : t;
  return (
    <figure className="wl-map">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Schematische Karte der Route">
        <path d={`M20 ${H - 70} Q 140 ${H - 120} 260 ${H - 40} T ${W - 10} ${H - 90}`} className="street thin" />
        <path d={`M${W - 40} 10 L ${W - 70} ${H - 10}`} className="street thin" />
        <path d={'M' + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')} className="route" />
        {pts.map(([x, y], i) => {
          // Beschriftung nach außen, damit nah beieinander liegende Stopps lesbar bleiben
          const left = x < W / 2 - 20, dy = pts.some(([px, py], j) => j !== i && Math.abs(px - x) < 40 && Math.abs(py - y) < 30) ? (pts.findIndex(([px, py], j) => j !== i && Math.abs(px - x) < 40 && Math.abs(py - y) < 30) < i ? -12 : 14) : 0;
          const tx = left ? x - 18 : x + 18, anchor = left ? 'end' : 'start';
          return <g key={i}>
            <circle cx={x} cy={y} r={18} className="pt-halo" />
            <circle cx={x} cy={y} r={11} className="pt" />
            <text x={x} y={y} className="pt-n">{String(i + 1).padStart(2, '0')}</text>
            <text x={tx} y={y - 3 + dy} textAnchor={anchor} className="lbl">{stands[i].place}</text>
            <text x={tx} y={y + 11 + dy} textAnchor={anchor} className="lbl dim">{short(stands[i].name)}</text>
          </g>;
        })}
      </svg>
      <figcaption>schematisch, nicht maßstäblich</figcaption>
    </figure>
  );
}
