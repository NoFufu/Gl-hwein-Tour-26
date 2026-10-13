'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, Hand, LocateFixed, MapPin, Palette, Share, Smartphone, X } from 'lucide-react';
import { themes } from '../lib/themes';

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferredInstall: InstallPrompt | null = null;
if (typeof window !== 'undefined') addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e as InstallPrompt; });

export function ThemePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="theme-picker" role="radiogroup" aria-label="Design">
      {themes.map(t => (
        <button key={t.id} type="button" role="radio" aria-checked={t.id === value} className={t.id === value ? 'active' : ''} onClick={() => onChange(t.id)}>
          <span className="swatch" style={{ background: t.vars['--bg'] }}><i style={{ background: t.vars['--amber'] }} /><i style={{ background: t.vars['--pine'] }} /><i style={{ background: t.vars['--cranberry'] }} /></span>
          <strong>{t.name}</strong><small>{t.hint}</small>
          {t.id === value && <Check size={14} className="theme-check" />}
        </button>
      ))}
    </div>
  );
}

/** Läuft die Seite schon als App, und wie kommt sie auf den Home-Bildschirm? */
export function useInstall() {
  const [env, setEnv] = useState({ ios: false, android: false, standalone: false, canInstall: false });
  useEffect(() => {
    const ua = navigator.userAgent;
    setEnv({
      ios: /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
      android: /Android/.test(ua),
      standalone: matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
      canInstall: !!deferredInstall,
    });
  }, []);
  async function install() {
    if (!deferredInstall) return;
    await deferredInstall.prompt();
    const { outcome } = await deferredInstall.userChoice;
    deferredInstall = null;
    setEnv(e => ({ ...e, canInstall: false, standalone: outcome === 'accepted' }));
  }
  return { env, install };
}

export function InstallHint({ env, install }: ReturnType<typeof useInstall>) {
  return env.standalone ? <p><Check size={14} /> Läuft bereits als App.</p>
    : env.ios ? <p>In Safari unten auf <Share size={14} className="inline-icon" /> <b>Teilen</b> tippen, dann <b>„Zum Home-Bildschirm“</b> und <b>Hinzufügen</b>.</p>
    : env.canInstall ? <><p>Mit einem Tipp als App installieren.</p><button type="button" className="btn primary small" onClick={install}>App installieren</button></>
    : env.android ? <p>Im Chrome-Menü <b>⋮</b> auf <b>„App installieren“</b> oder <b>„Zum Startbildschirm“</b> tippen.</p>
    : <p>Öffne den Link am Handy: iPhone mit Safari, Android mit Chrome.</p>;
}

export default function Guide({ theme, onTheme, onClose }: { theme: string; onTheme: (id: string) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const inst = useInstall(), { env } = inst;
  const [geo, setGeo] = useState<'idle' | 'asking' | 'ok' | 'denied'>('idle');
  useEffect(() => {
    const el = dialog.current, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (el && !el.open) el.showModal();
    navigator.permissions?.query({ name: 'geolocation' as PermissionName }).then(p => { if (p.state === 'granted') setGeo('ok'); if (p.state === 'denied') setGeo('denied'); }).catch(() => {});
    return () => { el?.close(); document.body.style.overflow = overflow; };
  }, []);
  function testLocation() {
    if (!navigator.geolocation) { setGeo('denied'); return; }
    setGeo('asking');
    navigator.geolocation.getCurrentPosition(() => setGeo('ok'), () => setGeo('denied'), { timeout: 12000 });
  }

  return (
    <dialog ref={dialog} className="sheet guide" aria-labelledby="guide-title" onCancel={e => { e.preventDefault(); onClose(); }}>
      <div className="sheet-body">
        <div className="sheet-top"><h2 id="guide-title">Kurz eingerichtet</h2><button type="button" className="icon-btn" aria-label="Schließen" onClick={onClose}><X size={20} /></button></div>
        <p className="muted">Einmal kurz durchgehen, dann läuft die Tour rund. Du findest die Anleitung später unter „Gruppe“.</p>
        <ol className="guide-steps">
          <li className={env.standalone ? 'ok' : ''}>
            <span className="guide-icon"><Smartphone size={18} /></span>
            <div>
              <strong>Als App auf den Home-Bildschirm</strong>
              <InstallHint {...inst} />
            </div>
          </li>
          <li className={geo === 'ok' ? 'ok' : geo === 'denied' ? 'bad' : ''}>
            <span className="guide-icon"><LocateFixed size={18} /></span>
            <div>
              <strong>Standort erlauben</strong>
              <p>Für die Route vom eigenen Standort zum nächsten Stand. Er bleibt auf deinem Handy.</p>
              {geo === 'ok' && <p><Check size={14} /> Standort klappt.</p>}
              {geo === 'denied' && <p className="guide-warn">Blockiert. {env.ios ? 'Einstellungen → Datenschutz → Ortungsdienste → Safari-Websites → „Beim Verwenden“.' : 'In den Website-Einstellungen des Browsers den Standort erlauben.'}</p>}
              {geo !== 'ok' && <button type="button" className="btn ghost small" onClick={testLocation} disabled={geo === 'asking'}>{geo === 'asking' ? 'Frage an …' : 'Standort testen'}</button>}
            </div>
          </li>
          <li>
            <span className="guide-icon"><Hand size={18} /></span>
            <div><strong>Karte bedienen</strong><p>Ein Finger scrollt die Seite. <b>Zwei Finger</b> bewegen und zoomen die Karte.</p></div>
          </li>
          <li>
            <span className="guide-icon"><MapPin size={18} /></span>
            <div><strong>Jetzt hier & Route</strong><p>Die Leiste unten zeigt immer den Stand, an dem die Truppe ist. So bewertet keiner den falschen. „Route“ zeigt den Fußweg direkt in der Karte.</p></div>
          </li>
          <li>
            <span className="guide-icon"><Palette size={18} /></span>
            <div><strong>Dein Design</strong><p>Gleicher Aufbau, andere Farben. Gilt nur auf deinem Handy.</p><ThemePicker value={theme} onChange={onTheme} /></div>
          </li>
        </ol>
        <button type="button" className="btn primary wide" onClick={onClose}><Check size={18} /> Los geht’s</button>
      </div>
    </dialog>
  );
}
