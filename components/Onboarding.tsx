'use client';
import { useState } from 'react';
import { ArrowRight, Check, MoreVertical, PlusSquare, Share } from 'lucide-react';
import { asset } from '../lib/asset';
import { photoCredit } from '../lib/data';
import type { CupChoice } from '../lib/themes';
import { CupPicker, ThemePicker, useInstall } from './Guide';

/** Erster Start in drei Schritten: App auf den Home-Bildschirm, Namen eintragen, Design und Tasse wählen.
 *  Eine Zahl statt Name gilt als Admin-Code (dann gibt `onName` ggf. einen Fehlertext zurück). */
export default function Onboarding({ theme, onTheme, cup, onCup, onName, onDone }: {
  theme: string; onTheme: (id: string) => void; cup: CupChoice; onCup: (c: CupChoice) => void;
  onName: (name: string) => Promise<string | void>; onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inst = useInstall(), { env } = inst;

  async function submitName(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setBusy(true); setError('');
    const problem = await onName(n);
    setBusy(false);
    if (problem) setError(problem); else setStep(2);
  }

  return (
    <div className="onboard" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
      <div className="onboard-inner">
        <ol className="onboard-dots" aria-label={`Schritt ${step + 1} von 3`}>{[0, 1, 2].map(i => <li key={i} className={i <= step ? 'on' : ''} />)}</ol>

        {step === 0 && <section className="onboard-step">
          <div className="onboard-hero">
            <img className="onboard-photo" src={asset('/fotos/start.jpg')} alt="Bielefelder Weihnachtsmarkt am Abend" width={1000} height={560} />
            <small className="onboard-credit">{photoCredit}</small>
            <img className="onboard-logo" src={asset('/icon-512.png')} alt="Glühwein Tour 26" width={132} height={132} />
          </div>
          <h1 id="onboard-title">Hol dir die App auf den Home-Bildschirm</h1>
          {env.standalone
            ? <p className="onboard-lede"><Check size={16} /> Läuft schon als App. Perfekt.</p>
            : <>
              <p className="onboard-lede">Dann ist die Tour mit einem Tipp offen, auch mit kalten Fingern.</p>
              {env.ios ? <ol className="onboard-how">
                <li><span>1</span><p>Unten in Safari auf <Share size={16} className="inline-icon" /> <b>Teilen</b> tippen</p></li>
                <li><span>2</span><p>Nach unten scrollen, <PlusSquare size={16} className="inline-icon" /> <b>Zum Home-Bildschirm</b></p></li>
                <li><span>3</span><p>Oben rechts auf <b>Hinzufügen</b></p></li>
              </ol> : env.canInstall ? <button type="button" className="btn primary wide" onClick={inst.install}>App installieren</button>
              : env.android ? <ol className="onboard-how">
                <li><span>1</span><p>Oben rechts in Chrome auf <MoreVertical size={16} className="inline-icon" /> tippen</p></li>
                <li><span>2</span><p><b>App installieren</b> oder <b>Zum Startbildschirm</b></p></li>
                <li><span>3</span><p>Bestätigen, dann die App vom Home-Bildschirm öffnen</p></li>
              </ol> : <p className="onboard-lede">Öffne den Link am Handy: iPhone mit Safari, Android mit Chrome.</p>}
            </>}
          <button type="button" className="btn primary wide" onClick={() => setStep(1)}>{env.standalone ? 'Weiter' : 'Erledigt, weiter'} <ArrowRight size={18} /></button>
          {!env.standalone && <button type="button" className="link-btn" onClick={() => setStep(1)}>Später</button>}
        </section>}

        {step === 1 && <form className="onboard-step" onSubmit={submitName}>
          <h1 id="onboard-title">Wie heißt du?</h1>
          <p className="onboard-lede">So sieht die Gruppe, wer bewertet hat.</p>
          <label htmlFor="onboard-name" className="sr-only">Dein Name</label>
          <input id="onboard-name" className="onboard-input" value={name} onChange={e => setName(e.target.value)} maxLength={30} required autoComplete="given-name" placeholder="Dein Vorname" enterKeyHint="go" autoFocus />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn primary wide" disabled={busy || !name.trim()}>{busy ? 'Einen Moment …' : 'Weiter'} {!busy && <ArrowRight size={18} />}</button>
        </form>}

        {step === 2 && <section className="onboard-step">
          <h1 id="onboard-title">Design und Tasse</h1>
          <p className="onboard-lede">Gilt nur auf deinem Handy. Später änderst du beides auf der Startseite unter „Design & Tasse“.</p>
          <ThemePicker value={theme} onChange={onTheme} />
          <h2 className="onboard-sub">Deine Tasse</h2>
          <CupPicker value={cup} theme={theme} onChange={onCup} />
          <button type="button" className="btn primary wide" onClick={onDone}><Check size={18} /> Los geht’s</button>
        </section>}
      </div>
    </div>
  );
}
