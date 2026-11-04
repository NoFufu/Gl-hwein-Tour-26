/** Papier-Schwibbogen: die Startseiten-Szene als Schichten aus Karton (2.5D), vorne die Glühweintasse.
 *  Alles ist SVG-Text, damit die Szene gestochen scharf ist und ohne 3D-Rechnung auskommt.
 *  Jede Ebene trägt ihre Tiefe in `--d` (0 = hinten, 1.15 = Tasse ganz vorne); die Komponente verschiebt sie beim Kippen. */

export type CupVariant = 'classic' | 'tanne' | 'eisbaer' | 'zucker' | 'schneemann' | 'weihnachtsmann' | 'pinguin' | 'norweger';

type Scene = { glow: [number, string][]; frame: string; snow: string; moon: string; layers: [string, (c: string) => string][] };

const star = (x: number, y: number, r: number) => {
  let p = '';
  for (let i = 0; i < 10; i++) { const a = Math.PI / 5 * i - Math.PI / 2, q = i % 2 ? r * .45 : r; p += (i ? 'L' : 'M') + (x + Math.cos(a) * q).toFixed(1) + ' ' + (y + Math.sin(a) * q).toFixed(1); }
  return p + 'Z';
};
const tree = (x: number, y: number, s: number, c: string) =>
  `<path d="M${x} ${y - 40 * s} l${-12 * s} ${16 * s} h${5 * s} l${-9 * s} ${12 * s} h${5 * s} l${-8 * s} ${12 * s} h${38 * s} l${-8 * s} ${-12 * s} h${5 * s} l${-9 * s} ${-12 * s} h${5 * s}z M${x - 2.5 * s} ${y} h${5 * s} v${6 * s} h${-5 * s}z" fill="${c}"/>`;
const hills = (c: string) => `<path d="M0 170 Q30 140 60 150 T120 132 T200 140 V240 H0Z" fill="${c}"/>`;
/** Die Sparrenburg auf ihrem Hügel. */
const sparrenburg = (c: string) => `<path d="M40 160 Q70 112 104 108 T170 150 V240 H40Z" fill="${c}"/>
  <path d="M86 112 v-34 h5 v-4 h4 v4 h4 v-4 h4 v4 h5 v34z" fill="${c}"/><path d="M108 112 v-14 l7 -7 7 7 v14z" fill="${c}"/>`;
/** Marktbuden und Häuser mit erleuchteten Fenstern, in der Mitte ein Lichterbaum. */
const stalls = (win: string) => (c: string) => `<path d="M0 182 h200 v60 h-200z M8 182 l18 -18 18 18z M50 182 v-20 l14 -12 14 12 v20z M120 182 v-22 l16 -14 16 14 v22z M160 182 l20 -20 20 20z M88 182 l12 -40 12 40z" fill="${c}"/>
  <g fill="${win}"><rect x="58" y="166" width="5" height="7"/><rect x="66" y="166" width="5" height="7"/><rect x="128" y="164" width="6" height="8"/><rect x="138" y="164" width="6" height="8"/></g>
  <path d="M92 170 l8 -26 8 26" fill="none" stroke="${win}" stroke-width="1.4" stroke-dasharray="1 4" stroke-linecap="round"/>`;

const markt: Scene = {
  glow: [[0, '#ffc56e'], [.55, '#e0703a'], [1, '#5a1a2a']], frame: '#f4e6d4', snow: '#fbf4ea', moon: '#fff1d6',
  layers: [['#4a2233', hills], ['#6e2a3b', sparrenburg], ['#8d2f43', stalls('#ffd27a')]],
};
/** Pro Design eine eigene Szene. */
export const scenes: Record<string, Scene> = {
  clean: markt,
  marktnacht: markt,
  tannenwald: {
    glow: [[0, '#cfe3d0'], [.45, '#4f8a72'], [1, '#0f2a22']], frame: '#eef2e6', snow: '#f6f8f2', moon: '#fbf7e4',
    layers: [
      ['#1f4a3c', c => `<path d="M0 166 Q40 146 80 154 T200 146 V240 H0Z" fill="${c}"/>${[20, 48, 150, 178].map((x, i) => tree(x, 160, .9 + i % 2 * .2, c)).join('')}`],
      ['#17382e', c => `<path d="M0 186 Q60 170 120 178 T200 172 V240 H0Z" fill="${c}"/>${[36, 70, 132, 168].map((x, i) => tree(x, 182, 1.2 + i % 2 * .25, c)).join('')}`],
      ['#10291f', c => [14, 186].map(x => tree(x, 204, 1.6, c)).join('')],
    ],
  },
  mitternacht: {
    glow: [[0, '#1d3c5c'], [.6, '#10223a'], [1, '#081322']], frame: '#e8f1fb', snow: '#f4f9ff', moon: '#e8f1fb',
    layers: [
      ['#47d6a6', c => `<path d="M-10 92 C40 66 80 112 130 86 S190 72 220 64 L220 72 C190 82 160 100 128 98 S50 84 -10 102Z" fill="${c}" opacity=".7"/>`],
      ['#3a8fd8', c => `<path d="M-10 118 C50 96 90 132 140 110 S200 98 220 92 L220 98 C190 108 160 122 136 120 S60 110 -10 126Z" fill="${c}" opacity=".6"/>`],
      ['#c9dcf0', c => `<path d="M0 176 l30 -22 18 10 26 -24 30 26 22 -14 30 20 24 -10 20 14 V240 H0Z" fill="${c}"/>`],
    ],
  },
  zuckerstange: {
    glow: [[0, '#fff1ea'], [.5, '#f5a6b0'], [1, '#7a2234']], frame: '#fff6f2', snow: '#ffffff', moon: '#ffffff',
    layers: [['#e98a98', hills], ['#d4566c', sparrenburg], ['#a8233d', stalls('#ffe4b0')]],
  },
  schnee: {
    glow: [[0, '#ffffff'], [.6, '#dce9f6'], [1, '#a9c4e0']], frame: '#ffffff', snow: '#ffffff', moon: '#fff4d6',
    layers: [['#c7d9ec', hills], ['#9fbbd8', sparrenburg], ['#c94b5e', stalls('#fff4d6')]],
  },
};

type Mug = { body: string; handle?: string; rim: string; steam: string; motif: (clip: string) => string; top?: string };
const ink = '#1d2230';
export const mugs: Record<CupVariant, Mug> = {
  classic: { body: '#b8243f', rim: '#f4e6d4', steam: '#f4e6d4', motif: () => `<text x="27" y="54" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="800" font-size="26" fill="#f6c97a">26</text>` },
  tanne: { body: '#2f7a5c', handle: '#c08a52', rim: '#ffffff', steam: '#eef2e6', motif: () => `<path d="M27 26 l-10 14 h5 l-7 10 h24 l-7 -10 h5z M25 50 h4 v5 h-4z" fill="#eef2e6"/><path d="M4 20 q3 6 6 0 q3 7 7 0 q3 5 6 0 q3 7 7 0 q3 5 6 0 q3 6 7 0 q3 5 7 0" fill="#ffffff"/>` },
  eisbaer: { body: '#f4f9ff', rim: '#bcd3ea', steam: '#e8f1fb', motif: () => `<circle cx="8" cy="20" r="6" fill="#f4f9ff"/><circle cx="46" cy="20" r="6" fill="#f4f9ff"/><circle cx="8" cy="20" r="2.6" fill="#f2c4cf"/><circle cx="46" cy="20" r="2.6" fill="#f2c4cf"/><circle cx="20" cy="38" r="2.4" fill="${ink}"/><circle cx="34" cy="38" r="2.4" fill="${ink}"/><ellipse cx="27" cy="46" rx="6" ry="4.4" fill="#e3edf8"/><ellipse cx="27" cy="44.6" rx="2.6" ry="1.8" fill="${ink}"/>` },
  zucker: { body: '#fff6f2', handle: '#d63c55', rim: '#d63c55', steam: '#fff6f2', motif: clip => `<g clip-path="url(#${clip})" fill="#d63c55">${[-40, -20, 0, 20, 40, 60].map(x => `<path d="M${x} 72 l26 -56 h8 l-26 56z"/>`).join('')}</g>` },
  schneemann: { body: '#f7f9fc', rim: '#d6e0ea', steam: '#f7f9fc', motif: () => `<circle cx="19" cy="34" r="2.6" fill="${ink}"/><circle cx="35" cy="34" r="2.6" fill="${ink}"/><path d="M26 39 l12 3 -12 3z" fill="#f08a2c"/><g fill="${ink}"><circle cx="18" cy="49" r="1.4"/><circle cx="22.5" cy="51.5" r="1.4"/><circle cx="27" cy="52.3" r="1.4"/><circle cx="31.5" cy="51.5" r="1.4"/><circle cx="36" cy="49" r="1.4"/></g><path d="M0 58 H54 V65 H0z M34 58 h8 v16 h-8z" fill="#d63c55"/>` },
  weihnachtsmann: { body: '#c8283f', rim: '#ffffff', steam: '#ffffff', top: `<path d="M8 13 Q22 -14 50 0 L46 13z" fill="#c8283f"/><circle cx="51" cy="0" r="5" fill="#ffffff"/>`, motif: () => `<rect x="11" y="27" width="32" height="14" rx="7" fill="#f6c9b4"/><circle cx="21" cy="33" r="2" fill="${ink}"/><circle cx="33" cy="33" r="2" fill="${ink}"/><path d="M6 40 Q27 34 48 40 Q48 66 27 70 Q6 66 6 40Z" fill="#ffffff"/><ellipse cx="27" cy="40" rx="5" ry="3" fill="#ffffff"/>` },
  pinguin: { body: '#2c3446', rim: '#f4f6fa', steam: '#f4f6fa', motif: () => `<path d="M27 24 C12 24 9 40 10 54 C11 66 20 70 27 70 C34 70 43 66 44 54 C45 40 42 24 27 24Z" fill="#f4f6fa"/><circle cx="21" cy="36" r="2.4" fill="${ink}"/><circle cx="33" cy="36" r="2.4" fill="${ink}"/><path d="M22 41 h10 l-5 6z" fill="#f59e2e"/><circle cx="16" cy="44" r="3" fill="#f6b5c2" opacity=".8"/><circle cx="38" cy="44" r="3" fill="#f6b5c2" opacity=".8"/>` },
  norweger: { body: '#c8283f', rim: '#ffffff', steam: '#ffffff', motif: () => `<rect x="0" y="34" width="54" height="22" fill="#ffffff"/><path d="M0 34 l4.5 4 4.5 -4 4.5 4 4.5 -4 4.5 4 4.5 -4 4.5 4 4.5 -4 4.5 4 4.5 -4 4.5 4 4.5 -4 M0 56 l4.5 -4 4.5 4 4.5 -4 4.5 4 4.5 -4 4.5 4 4.5 -4 4.5 4 4.5 -4 4.5 4 4.5 -4 4.5 4" fill="none" stroke="#c8283f" stroke-width="1.6"/><g stroke="#c8283f" stroke-width="1.6" stroke-linecap="round">${[14, 40].map(x => `<path d="M${x} 39 v12 M${x - 5} 42 l10 6 M${x - 5} 48 l10 -6"/>`).join('')}</g><path d="M27 41 l3 4 -3 4 -3 -4z" fill="#c8283f"/><path d="M0 24 h54 M0 64 h54" stroke="#ffffff" stroke-width="2" stroke-dasharray="2 3"/>` },
};

const filters = (id: string) => `
<filter id="pg${id}" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="9" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .16 0" result="a"/><feComposite in="a" in2="SourceGraphic" operator="in" result="g"/><feBlend in="SourceGraphic" in2="g" mode="multiply" result="b"/><feDropShadow in="b" dx="0" dy="2.6" stdDeviation="2.6" flood-color="#000" flood-opacity=".5"/></filter>
<filter id="pf${id}" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="3" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .14 0" result="a"/><feComposite in="a" in2="SourceGraphic" operator="in" result="g"/><feBlend in="SourceGraphic" in2="g" mode="multiply" result="b"/><feDropShadow in="b" dx="1" dy="5" stdDeviation="4.5" flood-color="#000" flood-opacity=".6"/></filter>`;

/** Nur die Tasse (Körper, Henkel, Rand, Motiv, optional Dampf), in eigenen Koordinaten 0…73 × 0…72. */
export function mugMarkup(cup: CupVariant, id: string, steam = true) {
  const m = mugs[cup] ?? mugs.classic;
  const body = 'M0 16 H54 V60 Q54 72 42 72 H12 Q0 72 0 60Z';
  const handle = 'M52 26 h6 a15 15 0 0 1 0 30 h-6 v-8 h6 a7 7 0 0 0 0 -14 h-6z';
  return `<clipPath id="mb${id}"><path d="${body}"/></clipPath>
    ${steam ? `<g class="paper-steam" filter="url(#pg${id})" fill="none" stroke="${m.steam}" stroke-width="4.2" stroke-linecap="round"><path d="M18 8 c-7 -8 7 -12 0 -21 s7 -12 0 -20"/><path d="M34 6 c-6 -7 6 -10 0 -18 s6 -10 0 -17"/></g>` : ''}
    <g filter="url(#pf${id})"><path d="${handle}" fill="${m.handle ?? m.body}"/><path d="${body}" fill="${m.body}"/></g>
    <g filter="url(#pg${id})">${m.motif(`mb${id}`)}</g>
    <g filter="url(#pg${id})"><rect x="-3" y="11" width="60" height="9" rx="3" fill="${m.rim}"/></g>
    ${m.top ? `<g filter="url(#pg${id})">${m.top}</g>` : ''}`;
}

/** Kleine Tasse für die Auswahl. */
export function mugIcon(cup: CupVariant, id: string) {
  return `<svg viewBox="-8 -10 90 92" aria-hidden="true"><defs>${filters(id)}</defs>${mugMarkup(cup, id, false)}</svg>`;
}

/** Der ganze Schwibbogen mit Szene und Tasse. */
export function paperArch(theme: string, cup: CupVariant, id: string) {
  const s = scenes[theme] ?? markt;
  const layer = (d: number, body: string) => `<g class="pl" style="--d:${d}" filter="url(#pg${id})">${body}</g>`;
  const candle = (x: number, y: number) => `<rect x="${x - 3}" y="${y}" width="6" height="16" rx="1.5" fill="${s.frame}"/><path class="paper-flame" d="M${x} ${y - 11} c-3.5 5 -3.5 8 0 10 c3.5 -2 3.5 -5 0 -10z" fill="#ffd27a"/>`;
  return `<svg viewBox="-6 -18 212 252" aria-hidden="true"><defs>${filters(id)}
    <radialGradient id="sky${id}" cx=".5" cy=".7" r=".7">${s.glow.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>
    <clipPath id="arch${id}"><path d="M14 214 V112 A86 86 0 0 1 186 112 V214Z"/></clipPath></defs>
  <g clip-path="url(#arch${id})">
    <rect x="-10" y="0" width="220" height="240" fill="url(#sky${id})"/>
    <g class="pl" style="--d:0"><circle cx="146" cy="66" r="12" fill="${s.moon}" opacity=".95"/></g>
    ${s.layers.map(([c, f], i) => layer(.15 + i * .25, f(c))).join('')}
    ${layer(.9, `<path d="M-10 204 Q50 192 100 200 T210 196 V240 H-10Z" fill="${s.snow}"/>`)}
  </g>
  ${layer(1, `<path d="M6 216 V112 A94 94 0 0 1 194 112 V216 H186 V112 A86 86 0 0 0 14 112 V216Z" fill="${s.frame}"/>
     <rect x="0" y="212" width="200" height="12" rx="3" fill="${s.frame}"/>
     ${[[100, 8], [60, 20], [140, 20], [30, 48], [170, 48], [14, 84], [186, 84]].map(([x, y]) => candle(x, y)).join('')}
     <path d="${star(100, 50, 9)}" fill="${s.frame}"/>`)}
  <g class="pl paper-mug" style="--d:1.15"><g transform="translate(104 150) scale(1.05)">${mugMarkup(cup, id)}</g></g>
</svg>`;
}
