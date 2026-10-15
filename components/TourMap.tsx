'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import { Footprints, LoaderCircle, LocateFixed, RotateCcw, X } from 'lucide-react';
import { stands, stopNumber } from '../lib/data';

type LngLat = [number, number];
export type RouteRequest = { to: string; from: string; n: number };
type RouteInfo = { status: 'loading' } | { status: 'ready'; line: LngLat[]; meters: number; seconds: number; note: string } | { status: 'error'; note: string };

const tourBounds = () => stands.reduce((bounds, stand) => bounds.extend(stand.coords), new maplibregl.LngLatBounds());
const coordsOf = (id: string) => stands.find(s => s.id === id)!.coords as LngLat;
function meters(a: LngLat, b: LngLat) {
  const r = 6371000, rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad, dLng = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}
/** Nah genug an der Tour, dass die Karte dem Standort folgen soll (gleiche Grenze wie bei der Route). */
const nearTour = (at: LngLat | null) => !!at && stands.some(s => meters(at, s.coords as LngLat) < 4000);
const fmtDistance = (m: number) => (m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);
const fmtMinutes = (s: number) => `${Math.max(1, Math.round(s / 60))} Min`;

function position(): Promise<LngLat | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    // Eigene Frist: Solange die Standort-Abfrage offen ist, greift der Browser-Timeout nicht.
    const giveUp = setTimeout(() => resolve(null), 10000);
    navigator.geolocation.getCurrentPosition(
      p => { clearTimeout(giveUp); resolve([p.coords.longitude, p.coords.latitude]); },
      () => { clearTimeout(giveUp); resolve(null); },
      { timeout: 8000, maximumAge: 30000, enableHighAccuracy: true });
  });
}
/** Fußweg über den OSRM-Server der FOSSGIS (OpenStreetMap). Ohne Netz: Luftlinie. */
async function walkingRoute(from: LngLat, to: LngLat): Promise<{ line: LngLat[]; meters: number; seconds: number; exact: boolean }> {
  try {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`https://routing.openstreetmap.de/routed-foot/route/v1/foot/${from.join(',')};${to.join(',')}?overview=full&geometries=geojson`, { signal: ctrl.signal });
    clearTimeout(t);
    const route = (await res.json()).routes?.[0];
    if (route) return { line: route.geometry.coordinates, meters: route.distance, seconds: route.distance / 1.25, exact: true };
  } catch {}
  const m = meters(from, to);
  return { line: [from, to], meters: m, seconds: (m * 1.3) / 1.25, exact: false };
}

type Pt = { id: string; x: number; y: number; ox: number; oy: number };
function layoutStands(w: number, h: number): Pt[] {
  if (!w || !h) return [];
  const lat0 = stands.reduce((a, s) => a + s.coords[1], 0) / stands.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const raw = stands.map(s => ({ id: s.id, x: s.coords[0] * k, y: -s.coords[1] }));
  const xs = raw.map(r => r.x), ys = raw.map(r => r.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const padX = 34, top = 34, bottom = 58, dx = Math.max(maxX - minX, 1e-9), dy = Math.max(maxY - minY, 1e-9);
  const availH = h - top - bottom;
  const scale = Math.min((w - padX * 2) / dx, availH / dy);
  const offX = (w - dx * scale) / 2, offY = top + (availH - dy * scale) / 2;
  const pts: Pt[] = raw.map(r => {
    const x = offX + (r.x - minX) * scale, y = offY + (r.y - minY) * scale;
    return { id: r.id, x, y, ox: x, oy: y };
  });
  const minD = 40;
  for (let it = 0; it < 120; it++) {
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      let vx = pts[j].x - pts[i].x, vy = pts[j].y - pts[i].y, d = Math.hypot(vx, vy);
      if (d >= minD) continue;
      if (d < 0.01) { vx = Math.cos(i * 2.4); vy = Math.sin(i * 2.4); d = 1; }
      const push = (minD - d) / 2 / d;
      pts[i].x -= vx * push; pts[i].y -= vy * push; pts[j].x += vx * push; pts[j].y += vy * push;
    }
    for (const p of pts) { p.x = Math.min(w - 28, Math.max(28, p.x)); p.y = Math.min(h - bottom, Math.max(top - 6, p.y)); }
  }
  return pts;
}
function SchemeMap({ selected, current, ratedIds, onSelect }: { selected: string; current: string; ratedIds: string[]; onSelect: (id: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pts = useMemo(() => layoutStands(size.w, size.h), [size]);
  return (
    <div ref={box} className="scheme-map" role="group" aria-label="Schema der Stopp-Standorte, Karte nicht verfügbar">
      <svg width={size.w} height={size.h} aria-hidden="true">
        {pts.map(p => <g key={p.id}><line x1={p.ox} y1={p.oy} x2={p.x} y2={p.y} className="scheme-leader" /><circle cx={p.ox} cy={p.oy} r="3" className="scheme-dot" /></g>)}
      </svg>
      {pts.map(p => {
        const s = stands.find(x => x.id === p.id)!;
        return <button key={p.id} type="button" className={`map-marker scheme-marker${p.id === selected ? ' selected' : ''}${p.id === current ? ' current' : ''}${ratedIds.includes(p.id) ? ' visited' : ''}`}
          style={{ left: p.x, top: p.y }} aria-label={`${s.name} auswählen`} aria-pressed={p.id === selected} onClick={() => onSelect(p.id)}>{stopNumber(p.id)}</button>;
      })}
      <p className="scheme-note">Keine Kartenkacheln. Schema der Standorte.</p>
    </div>
  );
}

export default function TourMap({ selected, current, ratedIds, route, onSelect, onRouteClose }: {
  selected: string; current: string; ratedIds: string[]; route: RouteRequest | null;
  onSelect: (id: string) => void; onRouteClose: () => void;
}) {
  const host = useRef<HTMLDivElement>(null), map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]), select = useRef(onSelect), me = useRef<maplibregl.Marker | null>(null);
  const [failed, setFailed] = useState(false), [loaded, setLoaded] = useState(false);
  const [overlay, setOverlay] = useState<HTMLElement | null>(null), [frame, setFrame] = useState(0);
  const [note, setNote] = useState(''), [locating, setLocating] = useState(false);
  const [info, setInfo] = useState<RouteInfo | null>(null);
  // Folgen: Die Karte bleibt auf dem eigenen Standort, bis man sie selbst verschiebt. Der Standort-Knopf schaltet es wieder ein.
  const follow = useRef(true), here = useRef<LngLat | null>(null), routeOpen = useRef(false);
  select.current = onSelect;
  routeOpen.current = !!route;

  useEffect(() => {
    if (!host.current) return;
    let m: maplibregl.Map, timer: ReturnType<typeof setTimeout> | undefined;
    try {
      m = new maplibregl.Map({
        container: host.current, style: 'https://tiles.openfreemap.org/styles/positron', center: stands[0].coords, zoom: 16.2,
        attributionControl: { compact: true }, pitch: 0, dragRotate: false, touchPitch: false,
        // Ein Finger scrollt die Seite, zwei Finger bewegen die Karte.
        cooperativeGestures: true,
        locale: {
          'CooperativeGesturesHandler.MobileHelpText': 'Mit zwei Fingern die Karte bewegen',
          'CooperativeGesturesHandler.WindowsHelpText': 'Strg + Scrollen zum Zoomen',
          'CooperativeGesturesHandler.MacHelpText': '⌘ + Scrollen zum Zoomen',
        },
      });
      map.current = m;
      timer = setTimeout(() => { if (!m.loaded()) setFailed(true); }, 18000);
      m.on('load', () => {
        clearTimeout(timer); setLoaded(true); setFailed(false);
        for (const layer of m.getStyle().layers) {
          if (layer.type === 'background') m.setPaintProperty(layer.id, 'background-color', '#f3eee4');
          if (layer.type === 'fill' && /park|landcover|landuse/.test(layer.id)) m.setPaintProperty(layer.id, 'fill-color', '#dde4d4');
        }
        // Linien als SVG über der Karte, damit der Dunkel-Filter der Kacheln sie nicht verfärbt.
        const svg = document.createElement('div');
        svg.className = 'map-overlay';
        m.getCanvasContainer().insertBefore(svg, m.getCanvas().nextSibling);
        setOverlay(svg);
        stands.forEach(s => {
          const button = document.createElement('button');
          button.className = 'map-marker';
          button.textContent = stopNumber(s.id);
          button.setAttribute('aria-label', `${s.name} auf Karte auswählen`);
          button.onclick = () => select.current(s.id);
          markers.current.push(new maplibregl.Marker({ element: button, anchor: 'center' }).setLngLat(s.coords).addTo(m));
        });
        m.fitBounds(tourBounds(), { padding: 40, maxZoom: 16.5, duration: 0 });
      });
      m.on('move', () => setFrame(f => f + 1));
      m.on('dragstart', () => { follow.current = false; });
      m.on('error', () => { if (!m.isStyleLoaded()) setFailed(true); });
    } catch { setFailed(true); }
    return () => { clearTimeout(timer); markers.current.forEach(x => x.remove()); markers.current = []; map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    markers.current.forEach((marker, i) => {
      const el = marker.getElement(), id = stands[i].id;
      el.classList.toggle('selected', id === selected);
      el.classList.toggle('current', id === current);
      el.classList.toggle('visited', ratedIds.includes(id));
      el.setAttribute('aria-pressed', String(id === selected));
    });
  }, [selected, current, ratedIds, loaded]);

  useEffect(() => {
    if (!loaded || route || (follow.current && nearTour(here.current))) return;
    map.current?.easeTo({ center: coordsOf(selected), duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450 });
  }, [selected, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  function showMe(at: LngLat) {
    if (!map.current) return;
    if (me.current) { me.current.setLngLat(at); return; }
    const dot = document.createElement('span');
    dot.className = 'me-dot';
    me.current = new maplibregl.Marker({ element: dot }).setLngLat(at).addTo(map.current);
  }

  // Standort laufend beobachten und die Karte mitführen (nur in der Nähe der Tour, sonst bleibt die Übersicht).
  useEffect(() => {
    if (!loaded || !navigator.geolocation) return;
    let first = true;
    const id = navigator.geolocation.watchPosition(p => {
      const at: LngLat = [p.coords.longitude, p.coords.latitude];
      here.current = at;
      showMe(at);
      if (!follow.current || routeOpen.current || !nearTour(at) || !map.current) return;
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      map.current.easeTo({ center: at, zoom: first ? 16.5 : map.current.getZoom(), duration: still ? 0 : first ? 600 : 400 });
      first = false;
    }, () => {}, { enableHighAccuracy: true, maximumAge: 5000 });
    return () => navigator.geolocation.clearWatch(id);
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!route) { setInfo(null); return; }
    let cancelled = false;
    setInfo({ status: 'loading' });
    (async () => {
      const target = coordsOf(route.to);
      const here = await position();
      let from: LngLat | null = here, note = '';
      if (here && meters(here, target) > 4000) { from = null; note = 'Du bist weiter weg. '; }
      if (!from) {
        if (route.from === route.to) {
          if (!cancelled) setInfo({ status: 'error', note: here ? 'Du bist mehr als 4 km entfernt. Die Route startet, sobald du in der Altstadt bist.' : 'Standort nicht verfügbar. Erlaube den Standort, um die Route zu sehen.' });
          return;
        }
        from = coordsOf(route.from);
        note += `Route ab Stopp ${stopNumber(route.from)}.`;
      } else showMe(from);
      const r = await walkingRoute(from, target);
      if (cancelled) return;
      if (!r.exact) note = (note + ' Ohne Netz: Luftlinie.').trim();
      setInfo({ status: 'ready', line: r.line, meters: r.meters, seconds: r.seconds, note });
      if (map.current && loaded) {
        const b = r.line.reduce((acc, p) => acc.extend(p), new maplibregl.LngLatBounds(r.line[0], r.line[0]));
        map.current.fitBounds(b, { padding: { top: 40, bottom: 90, left: 40, right: 40 }, maxZoom: 17, duration: 500 });
      }
    })();
    return () => { cancelled = true; };
  }, [route?.n, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  async function locate() {
    setLocating(true);
    const at = await position();
    setLocating(false);
    if (!at) { setNote('Standort nicht verfügbar. Wähle deinen Stopp direkt auf der Karte.'); return; }
    setNote('');
    here.current = at;
    follow.current = true;
    showMe(at);
    map.current?.easeTo({ center: at, zoom: 16.5 });
  }

  const path = (line: LngLat[]) => {
    const m = map.current;
    if (!m) return '';
    return line.map((p, i) => { const q = m.project(p); return `${i ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join('');
  };
  const tourLine = stands.map(s => s.coords as LngLat);
  void frame;

  return (
    <div className="map-wrap">
      <div ref={host} className="map" aria-label="Karte der Weihnachtsmarkt-Stopps in Bielefeld" />
      {overlay && createPortal(
        <svg className="map-lines" aria-hidden="true">
          <path d={path(tourLine)} className="tour-line" />
          {info?.status === 'ready' && <><path d={path(info.line)} className="route-casing" /><path d={path(info.line)} className="route-line" /></>}
        </svg>, overlay)}
      {!loaded && !failed && <div className="map-loading">Karte wird geladen …</div>}
      {failed && <SchemeMap selected={selected} current={current} ratedIds={ratedIds} onSelect={onSelect} />}
      {!failed && !info && <div className="map-tools">
        <button type="button" aria-label="Meinen Standort anzeigen" disabled={locating} onClick={locate}>{locating ? <LoaderCircle className="spin" size={18} /> : <LocateFixed size={19} />}</button>
        <button type="button" aria-label="Alle Tourstopps anzeigen" onClick={() => { follow.current = false; map.current?.fitBounds(tourBounds(), { padding: 40, maxZoom: 16.5, duration: 400 }); }}><RotateCcw size={18} /></button>
      </div>}
      {info && route && <div className="route-panel" role="status">
        <Footprints size={18} />
        <span>
          <strong>{info.status === 'loading' ? 'Route wird berechnet …' : info.status === 'ready' ? `${fmtMinutes(info.seconds)} · ${fmtDistance(info.meters)}` : 'Keine Route'}</strong>
          <small>{info.status === 'ready' ? (info.note || `Zu Fuß zu Stopp ${stopNumber(route.to)}`) : info.status === 'error' ? info.note : `Zu Stopp ${stopNumber(route.to)}`}</small>
        </span>
        <button type="button" className="icon-btn" aria-label="Route schließen" onClick={onRouteClose}><X size={18} /></button>
      </div>}
      {note && <p className="location-note" role="status">{note}</p>}
    </div>
  );
}
