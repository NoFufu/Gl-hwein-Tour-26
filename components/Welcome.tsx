'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { criteria, stands, stopNumber } from '../lib/data';
import type { LandingLook } from '../lib/landing';

const CRITERIA_HINTS = ['Würzig, rund, nicht zu süß.', 'Heiß genug für kalte Finger.', 'Lichter, Musik, Gedränge am Stand.', 'Was der Becher wert ist.', 'Wie sehr er nach dem zweiten Becher ruft.'];

/** Einladungsseite für neue Leute: kurz erklären, worum es geht, Namen eintippen, fertig.
 *  `preview` zeigt sie der einladenden Person, ohne etwas zu speichern. */
export default function Welcome({ look, invited, preview, onJoin, onClose }: {
  look: LandingLook; invited: boolean; preview?: boolean;
  onJoin: (name: string) => void; onClose?: () => void;
}) {
  const [name, setName] = useState('');
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { root.current?.scrollTo({ top: 0 }); }, [look]);
  const submit = (e: React.FormEvent) => { e.preventDefault(); const n = name.trim(); if (n || preview) onJoin(n); };
  const next = invited ? 'Danach bist du direkt in der Gruppe.' : 'Danach trittst du mit dem Gruppencode bei oder gründest eine Gruppe.';

  return (
    <div ref={root} className={`wl wl-${look}`} role="dialog" aria-modal="true" aria-labelledby="wl-title">
      {look === 'lichterkette' && <Garland />}
      {look === 'frostklar' && <Snow />}
      {preview && <button type="button" className="wl-close" onClick={onClose} aria-label="Vorschau schließen"><X size={20} /></button>}
      <div className="wl-wrap">
        <header className="wl-hero">
          <div className="wl-copy">
            {look === 'lichterkette' && <span className="wl-eyebrow">Bielefelder Weihnachtsmarkt · 19.11.–30.12.</span>}
            {look === 'frostklar' && <span className="wl-mark">Glühwein Tour <b>26</b></span>}
            {look === 'stadtplan' && <span className="wl-coord">52,0206° N · 8,5323° O · Alter Markt</span>}
            <h1 id="wl-title">
              {look === 'lichterkette' && <>Sieben Buden, ein <em>bester</em> Glühwein.</>}
              {look === 'frostklar' && <>Glüh&shy;wein<br />Tour <b>26</b></>}
              {look === 'stadtplan' && <>Eine Route.<br /><b>Sieben</b> Becher.</>}
            </h1>
            <p className="wl-lede">{invited ? 'Du bist eingeladen. ' : ''}Die Gruppe zieht einmal durch die Bielefelder Altstadt. An jedem Stand bewertet ihr euren Becher, am Ende steht fest, wo es dieses Jahr am besten schmeckt.</p>
          </div>
          <form className="wl-join" onSubmit={submit}>
            {look === 'frostklar' && <>
              <span className="wl-k">Gruppenticket · Saison 19.11.–30.12.</span>
              <dl><div><dt>Stopps</dt><dd>{stands.length}</dd></div><div><dt>Kriterien</dt><dd>{criteria.length}</dd></div><div><dt>Sieger</dt><dd>1</dd></div></dl>
            </>}
            <label htmlFor="wl-name">Wie heißt du?</label>
            <input id="wl-name" value={name} onChange={e => setName(e.target.value)} maxLength={30} required={!preview} autoComplete="given-name" placeholder="Dein Vorname" enterKeyHint="go" />
            <button type="submit" className="wl-btn">{preview ? 'Vorschau schließen' : 'Dabei sein'} <ArrowRight size={18} /></button>
            <p className="wl-hint">So sieht die Gruppe, wer bewertet hat. {next}</p>
          </form>
          {look === 'stadtplan' && <RouteMap />}
        </header>

        <section className="wl-sec">
          <h2>{look === 'frostklar' ? `${stands.length} Stopps` : look === 'stadtplan' ? 'Die Stopps' : 'Die Route'}</h2>
          <ol className="wl-route">
            {stands.map(s => <li key={s.id}><span className="wl-n">{stopNumber(s.id)}</span><strong>{s.name}</strong><small>{s.place} · {s.wine}</small></li>)}
          </ol>
        </section>

        <section className="wl-sec">
          <h2>So wird bewertet</h2>
          <p className="wl-sub">Jede Person vergibt pro Stand 1 bis 5 Punkte in fünf Kategorien. Der Durchschnitt der Gruppe entscheidet.</p>
          <ul className="wl-crit">
            {criteria.map((c, i) => <li key={c} className={i === criteria.length - 1 ? 'hl' : ''}><strong>{c}</strong><small>{CRITERIA_HINTS[i] || ''}</small></li>)}
          </ul>
        </section>

        <footer className="wl-foot">
          <p>Ob rot, ob weiß, Hauptsache heiß.</p>
          <button type="button" className="wl-btn" onClick={() => { root.current?.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => document.getElementById('wl-name')?.focus(), 350); }}>Namen eintragen</button>
        </footer>
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
