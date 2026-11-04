/** Farbwelten mit gleichem Aufbau. Die CSS-Variablen steuern die Oberfläche, `scene` den Three.js-Hintergrund. */
import type { SceneBg, SceneParticles } from '../components/BackgroundScene';
import type { CupVariant } from '../components/WinterCup';
type Vec3 = [number, number, number];
export type Theme = {
  id: string; name: string; hint: string; light?: boolean; cup: CupVariant;
  vars: Record<string, string>;
  scene: { bg: SceneBg; particles: SceneParticles; density: number; particleAlpha: number; additive: boolean; night: Vec3; plum: Vec3; glow: Vec3; glow2: Vec3; warm1: Vec3; warm2: Vec3; glowStrength: number };
};

const dark = (o: { bg: string; bgRgb: string; ink: string; inkRgb: string; muted: string; accent: string; accentRgb: string; accentInk: string; berry: string; berryRgb: string; pine: string; pineRgb: string; pineDeep: string; panelRgb: string; panelSolid: string; sceneGlow: string }) => ({
  '--bg': o.bg, '--bg-rgb': o.bgRgb, '--ink': o.ink, '--ink-rgb': o.inkRgb, '--muted': o.muted,
  '--amber': o.accent, '--accent-rgb': o.accentRgb, '--amber-ink': o.accentInk,
  '--cranberry': o.berry, '--berry-rgb': o.berryRgb, '--pine': o.pine, '--pine-rgb': o.pineRgb, '--pine-deep': o.pineDeep,
  '--panel-rgb': o.panelRgb, '--panel-solid': o.panelSolid, '--scene-glow': o.sceneGlow,
  '--map-filter': 'invert(.92) hue-rotate(180deg) saturate(.45) brightness(.9) sepia(.15)', 'color-scheme': 'dark',
});

export const themes: Theme[] = [
  {
    // Ruhig und seriös, als Dark Mode: neutrales Anthrazit, eine Schrift (Inter), ein gedämpftes Rot als einziger Akzent, keine Partikel
    id: 'clean', cup: 'classic', name: 'Clean', hint: 'Dark Mode, klar & seriös',
    vars: dark({ bg: '#0e0f12', bgRgb: '14, 15, 18', ink: '#ededef', inkRgb: '237, 237, 239', muted: '#a0a4ac', accent: '#e8636f', accentRgb: '232, 99, 111', accentInk: '#1a0709', berry: '#e8636f', berryRgb: '232, 99, 111', pine: '#6fbf9b', pineRgb: '111, 191, 155', pineDeep: '#2c5a47', panelRgb: '23, 24, 28', panelSolid: '#17181c', sceneGlow: '#15161a' }),
    scene: { bg: 'clean', particles: 'snow', density: 0, particleAlpha: 0, additive: false, night: [.055, .059, .07], plum: [.078, .082, .095], glow: [1, 1, 1], glow2: [1, 1, 1], warm1: [1, 1, 1], warm2: [1, 1, 1], glowStrength: 0 },
  },
  {
    id: 'marktnacht', cup: 'classic', name: 'Marktnacht', hint: 'Laternennebel & Bokeh',
    vars: dark({ bg: '#120e16', bgRgb: '18, 14, 22', ink: '#f7efe7', inkRgb: '255, 244, 236', muted: '#d2c6cc', accent: '#f3b66a', accentRgb: '243, 182, 106', accentInk: '#2a1708', berry: '#e05770', berryRgb: '224, 87, 112', pine: '#7cc3a5', pineRgb: '124, 195, 165', pineDeep: '#2d5a49', panelRgb: '24, 18, 28', panelSolid: '#1a141e', sceneGlow: '#3a1527' }),
    scene: { bg: 'fog', particles: 'bokeh', density: .42, particleAlpha: 1, additive: true, night: [.075, .055, .09], plum: [.24, .08, .16], glow: [.95, .62, .30], glow2: [.95, .62, .30], warm1: [1, .72, .42], warm2: [1, .45, .48], glowStrength: 1 },
  },
  {
    id: 'tannenwald', cup: 'tanne', name: 'Tannenwald', hint: 'Mondnacht & Schneefall',
    vars: dark({ bg: '#0b130f', bgRgb: '11, 19, 15', ink: '#eef4ec', inkRgb: '238, 246, 236', muted: '#c3cfc5', accent: '#e6c46e', accentRgb: '230, 196, 110', accentInk: '#231a05', berry: '#e0665c', berryRgb: '224, 102, 92', pine: '#8fd1a0', pineRgb: '143, 209, 160', pineDeep: '#2f6a45', panelRgb: '15, 26, 20', panelSolid: '#13201a', sceneGlow: '#173a28' }),
    scene: { bg: 'forest', particles: 'snow', density: .7, particleAlpha: .5, additive: true, night: [.03, .055, .045], plum: [.09, .2, .15], glow: [1, .9, .62], glow2: [1, .9, .62], warm1: [1, 1, 1], warm2: [.85, .95, 1], glowStrength: 1 },
  },
  {
    id: 'mitternacht', cup: 'eisbaer', name: 'Polarlicht', hint: 'Nordlichter & Sterne',
    vars: dark({ bg: '#0a0e1b', bgRgb: '10, 14, 27', ink: '#ecf1fa', inkRgb: '236, 242, 252', muted: '#bfc8da', accent: '#8cbfff', accentRgb: '140, 191, 255', accentInk: '#071430', berry: '#f07096', berryRgb: '240, 112, 150', pine: '#7adcc8', pineRgb: '122, 220, 200', pineDeep: '#1f5a55', panelRgb: '16, 22, 40', panelSolid: '#121a30', sceneGlow: '#1b2c5a' }),
    scene: { bg: 'aurora', particles: 'stars', density: .6, particleAlpha: .9, additive: true, night: [.02, .03, .08], plum: [.06, .1, .24], glow: [.25, .95, .65], glow2: [.5, .45, 1], warm1: [.85, .9, 1], warm2: [1, .9, .75], glowStrength: 1 },
  },
  {
    id: 'zuckerstange', cup: 'zucker', name: 'Zuckerstange', hint: 'Pfefferminz & sanfte Streifen',
    vars: dark({ bg: '#170b0e', bgRgb: '23, 11, 14', ink: '#fff0ee', inkRgb: '255, 240, 238', muted: '#e4c8ca', accent: '#f2737a', accentRgb: '242, 115, 122', accentInk: '#2a0306', berry: '#ffc06e', berryRgb: '255, 192, 110', pine: '#8fd6aa', pineRgb: '143, 214, 170', pineDeep: '#2f6a45', panelRgb: '33, 17, 21', panelSolid: '#241418', sceneGlow: '#3a171d' }),
    scene: { bg: 'candy', particles: 'sparkle', density: .1, particleAlpha: .45, additive: true, night: [.09, .04, .05], plum: [.2, .07, .09], glow: [1, .85, .8], glow2: [1, .85, .8], warm1: [1, 1, 1], warm2: [1, .85, .55], glowStrength: 1 },
  },
  {
    // Lichterkette: fast schwarze Nacht, eine bunte Glühbirnen-Kette als Bordüre, jede Stopp-Nummer leuchtet in ihrer Farbe
    id: 'lichterkette', cup: 'weihnachtsmann', name: 'Lichterkette', hint: 'Bunte Birnen in der Nacht',
    vars: dark({ bg: '#0c0a0f', bgRgb: '12, 10, 15', ink: '#f7f2ea', inkRgb: '247, 242, 234', muted: '#bcb4aa', accent: '#ffc845', accentRgb: '255, 200, 69', accentInk: '#241800', berry: '#ff5a5f', berryRgb: '255, 90, 95', pine: '#3ddc84', pineRgb: '61, 220, 132', pineDeep: '#1d6b41', panelRgb: '23, 20, 27', panelSolid: '#17141b', sceneGlow: '#1a1520' }),
    scene: { bg: 'lights', particles: 'bokeh', density: .3, particleAlpha: .8, additive: true, night: [.035, .03, .045], plum: [.06, .05, .075], glow: [1, .35, .37], glow2: [.3, .64, 1], warm1: [1, .78, .27], warm2: [.24, .86, .52], glowStrength: 1 },
  },
  {
    // Frost: eisiges Hellblau, weiße Karten wie Eisplatten, Marineblau als Schrift und Leiste, breite geometrische Überschriften
    id: 'frost', cup: 'eisbaer', name: 'Frost', hint: 'Eisig hell & klar', light: true,
    vars: {
      '--bg': '#e4eef6', '--bg-rgb': '228, 238, 246', '--ink': '#0e2236', '--ink-rgb': '14, 34, 54', '--muted': '#3d5670',
      '--amber': '#1d4fd8', '--accent-rgb': '29, 79, 216', '--amber-ink': '#ffffff',
      '--cranberry': '#c62845', '--berry-rgb': '198, 40, 69', '--pine': '#0f7a5c', '--pine-rgb': '15, 122, 92', '--pine-deep': '#0f7a5c',
      '--panel-rgb': '255, 255, 255', '--panel-solid': '#ffffff', '--scene-glow': '#f4f9fd', '--map-filter': 'saturate(.4) hue-rotate(-10deg) brightness(1.05)', 'color-scheme': 'light',
    },
    scene: { bg: 'globe', particles: 'snow', density: .55, particleAlpha: .9, additive: false, night: [.93, .96, .985], plum: [.8, .88, .95], glow: [.55, .75, 1], glow2: [.55, .75, 1], warm1: [.62, .76, .9], warm2: [.75, .85, .95], glowStrength: .5 },
  },
  {
    // Marktblatt: Zeitungspapier, schwarze Linien statt Karten, Schlagzeilen-Serife, Fotos in Schwarz-Weiß, Rot nur für Aktion
    id: 'marktblatt', cup: 'classic', name: 'Marktblatt', hint: 'Wie eine Zeitung', light: true,
    vars: {
      '--bg': '#efebe2', '--bg-rgb': '239, 235, 226', '--ink': '#141210', '--ink-rgb': '20, 18, 16', '--muted': '#4c4840',
      '--amber': '#c8102e', '--accent-rgb': '200, 16, 46', '--amber-ink': '#ffffff',
      '--cranberry': '#c8102e', '--berry-rgb': '200, 16, 46', '--pine': '#1f5c3a', '--pine-rgb': '31, 92, 58', '--pine-deep': '#1f5c3a',
      '--panel-rgb': '239, 235, 226', '--panel-solid': '#efebe2', '--scene-glow': '#efebe2', '--map-filter': 'grayscale(1) contrast(1.05)', 'color-scheme': 'light',
    },
    scene: { bg: 'clean', particles: 'snow', density: 0, particleAlpha: 0, additive: false, night: [.937, .922, .886], plum: [.937, .922, .886], glow: [1, 1, 1], glow2: [1, 1, 1], warm1: [1, 1, 1], warm2: [1, 1, 1], glowStrength: 0 },
  },
  {
    id: 'schnee', cup: 'schneemann', name: 'Schneekugel', hint: 'Hell, Wolken & Flocken', light: true,
    vars: {
      '--bg': '#f4efe8', '--bg-rgb': '244, 239, 232', '--ink': '#231c1f', '--ink-rgb': '35, 28, 31', '--muted': '#564c4f',
      '--amber': '#b8432f', '--accent-rgb': '184, 67, 47', '--amber-ink': '#ffffff',
      '--cranberry': '#b8284f', '--berry-rgb': '184, 40, 79', '--pine': '#2b7a57', '--pine-rgb': '43, 122, 87', '--pine-deep': '#2b7a57',
      '--panel-rgb': '255, 252, 248', '--panel-solid': '#fffcf8', '--scene-glow': '#f3dcc6', '--map-filter': 'none', 'color-scheme': 'light',
    },
    scene: { bg: 'globe', particles: 'snow', density: .7, particleAlpha: .85, additive: false, night: [.93, .94, .96], plum: [.86, .89, .94], glow: [.95, .6, .4], glow2: [.95, .6, .4], warm1: [.6, .68, .8], warm2: [.72, .78, .88], glowStrength: .6 },
  },
];

export const THEME_KEY = 'glueh26-theme';
/** Standard für alle, die noch kein Design gewählt haben. */
export const DEFAULT_THEME = 'clean';
export const themeById = (id: string | null | undefined) => themes.find(t => t.id === id) || themes.find(t => t.id === DEFAULT_THEME)!;
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.vars)) root.style.setProperty(k, v);
  root.dataset.theme = theme.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.vars['--bg']);
}
/** Läuft vor dem ersten Zeichnen (im <head>), damit kein falsches Farbschema aufblitzt. */
export const themeBootScript = `try{var i=localStorage.getItem('${THEME_KEY}')||'${DEFAULT_THEME}',t=${JSON.stringify(Object.fromEntries(themes.map(t => [t.id, t.vars])))}[i];if(t){for(var k in t)document.documentElement.style.setProperty(k,t[k]);document.documentElement.dataset.theme=i}}catch(e){}`;

/** Tassen zur freien Wahl. `auto` heißt: die Tasse wechselt mit dem Design. */
export type CupChoice = CupVariant | 'auto';
export const CUP_KEY = 'glueh26-cup';
export const cups: { id: CupVariant; name: string }[] = [
  { id: 'classic', name: 'Klassik' },
  { id: 'tanne', name: 'Tanne' },
  { id: 'eisbaer', name: 'Eisbär' },
  { id: 'zucker', name: 'Zuckerstange' },
  { id: 'schneemann', name: 'Schneemann' },
  { id: 'weihnachtsmann', name: 'Weihnachtsmann' },
  { id: 'pinguin', name: 'Pinguin' },
  { id: 'norweger', name: 'Norweger' },
];
export const isCupChoice = (v: unknown): v is CupChoice => v === 'auto' || cups.some(c => c.id === v);
