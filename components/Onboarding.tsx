'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, MoreVertical, Plus, PlusSquare, Share, Users } from 'lucide-react';
import { asset } from '../lib/asset';
import { photoCredit } from '../lib/data';
import { useInstall } from './Guide';

export type NewGroup = { code: string; adminCode: string };

/** Erster Start in drei Schritten: App auf den Home-Bildschirm, Namen eintragen, Gruppe beitreten oder erstellen.
 *  Eine Zahl statt Name gilt als Admin-Code für Levis Runde (dann entfällt die Gruppenwahl). */
export default function Onboarding({ invited, suggested, onName, onJoin, onCreate, onShare, onDone }: {
  /** Code aus dem Einladungslink, sonst leer. */
  invited: string;
  /** Vorschlag im Code-Feld, wenn es keinen Einladungslink gibt. */
  suggested: string;
  onName: (name: string) => Promise<'admin' | string | void>;
  onJoin: (code: string) => Promise<string | void>;
  onCreate: () => Promise<NewGroup | string>;
  onShare: (code: string) => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'choose' | 'join' | 'create'>(invited ? 'join' : 'choose');
  const [code, setCode] = useState(invited || suggested);
  const [created, setCreated] = useState<NewGroup | null>(null);
  const [copied, setCopied] = useState(false);
  const inst = useInstall(), { env } = inst;

  // Schon als App vom Home-Bildschirm geöffnet: der Hinweis ist erledigt.
  useEffect(() => { if (env.standalone) setStep(s => (s === 0 ? 1 : s)); }, [env.standalone]);

  async function run(task: () => Promise<string | void>) {
    setBusy(true); setError('');
    const problem = await task().catch(e => (e instanceof Error ? e.message : 'Hat nicht geklappt.'));
    setBusy(false);
    if (problem) setError(problem);
  }
  function submitName(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    run(async () => {
      const r = await onName(n);
      if (r === 'admin') return onDone(); // Levi mit Admin-Code: seine Runde steht schon.
      if (r) return r;
      setStep(2);
    });
  }
  function submitJoin(e: React.FormEvent) {
    e.preventDefault();
    run(async () => { const problem = await onJoin(code); if (problem) return problem; onDone(); });
  }
  function create() {
    run(async () => { const r = await onCreate(); if (typeof r === 'string') return r; setCreated(r); });
  }
  async function copyCode() {
    if (!created) return;
    try { await navigator.clipboard.writeText(created.code); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  }
  const pick = (m: typeof mode) => { setError(''); setMode(m); };

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
          <p className="onboard-lede">Dann ist die Tour mit einem Tipp offen, auch mit kalten Fingern.</p>
          {env.ios ? <>
            <ol className="onboard-how">
              <li><span>1</span><p>Unten in Safari auf <Share size={16} className="inline-icon" /> <b>Teilen</b> tippen</p></li>
              <li><span>2</span><p>Nach unten scrollen, <PlusSquare size={16} className="inline-icon" /> <b>Zum Home-Bildschirm</b></p></li>
              <li><span>3</span><p>Oben rechts auf <b>Hinzufügen</b>, dann die App vom Home-Bildschirm öffnen</p></li>
            </ol>
            <p className="onboard-note">Die App vom Home-Bildschirm startet frisch. Dort trägst du deinen Namen ein.</p>
          </> : env.canInstall ? <button type="button" className="btn primary wide" onClick={inst.install}>App installieren</button>
          : env.android ? <ol className="onboard-how">
            <li><span>1</span><p>Oben rechts in Chrome auf <MoreVertical size={16} className="inline-icon" /> tippen</p></li>
            <li><span>2</span><p><b>App installieren</b> oder <b>Zum Startbildschirm</b></p></li>
            <li><span>3</span><p>Bestätigen, dann die App vom Home-Bildschirm öffnen</p></li>
          </ol> : <p className="onboard-lede">Öffne den Link am Handy: iPhone mit Safari, Android mit Chrome.</p>}
          <button type="button" className="btn primary wide" onClick={() => setStep(1)}>Erledigt, weiter <ArrowRight size={18} /></button>
          <button type="button" className="link-btn" onClick={() => setStep(1)}>Später, erst mal im Browser</button>
        </section>}

        {step === 1 && <form className="onboard-step" onSubmit={submitName}>
          <h1 id="onboard-title">Wie heißt du?</h1>
          <p className="onboard-lede">So sieht die Gruppe, wer bewertet hat.</p>
          <label htmlFor="onboard-name" className="sr-only">Dein Name</label>
          <input id="onboard-name" className="onboard-input" value={name} onChange={e => setName(e.target.value)} maxLength={30} required autoComplete="given-name" placeholder="Dein Vorname" enterKeyHint="go" autoFocus />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn primary wide" disabled={busy || !name.trim()}>{busy ? 'Einen Moment …' : 'Weiter'} {!busy && <ArrowRight size={18} />}</button>
        </form>}

        {step === 2 && !created && <section className="onboard-step">
          <h1 id="onboard-title">{invited ? 'Du bist eingeladen' : 'Deine Gruppe'}</h1>
          <p className="onboard-lede">{invited ? 'Tritt der Gruppe bei und bewertet die Stände zusammen.' : 'Tritt der Runde deiner Leute bei oder mach eine eigene auf.'}</p>

          {mode === 'choose' && <div className="onboard-choices">
            <button type="button" className="onboard-choice" onClick={() => pick('join')}>
              <span className="onboard-choice-icon"><Users size={22} /></span>
              <span><b>Gruppe beitreten</b><small>Mit dem Gruppencode, den du bekommen hast</small></span>
              <ArrowRight size={18} />
            </button>
            <button type="button" className="onboard-choice" onClick={() => pick('create')}>
              <span className="onboard-choice-icon"><Plus size={22} /></span>
              <span><b>Gruppe erstellen</b><small>Neue Runde, du lädst deine Leute ein</small></span>
              <ArrowRight size={18} />
            </button>
          </div>}

          {mode === 'join' && <form className="onboard-step" onSubmit={submitJoin}>
            <label htmlFor="onboard-code" className="onboard-label">Gruppencode</label>
            <input id="onboard-code" className="onboard-input code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="GLUEH-XXXXXX" autoComplete="off" autoCapitalize="characters" spellCheck={false} enterKeyHint="go" />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="btn primary wide" disabled={busy || code.trim().length < 6}>{busy ? 'Einen Moment …' : 'Beitreten'} {!busy && <ArrowRight size={18} />}</button>
            <button type="button" className="link-btn" onClick={() => pick('create')}>Lieber eine eigene Gruppe erstellen</button>
          </form>}

          {mode === 'create' && <div className="onboard-step">
            <p className="onboard-note">Du bekommst einen Gruppencode zum Teilen und bist Admin: Du kannst Stände anpassen und Ansagen an alle schicken.</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="button" className="btn primary wide" disabled={busy} onClick={create}>{busy ? 'Einen Moment …' : <><Plus size={18} /> Gruppe erstellen</>}</button>
            <button type="button" className="link-btn" onClick={() => pick('join')}>Ich habe schon einen Code</button>
          </div>}

          {mode !== 'choose' && !invited && <button type="button" className="link-btn back" onClick={() => pick('choose')}><ArrowLeft size={14} /> Zurück</button>}
        </section>}

        {step === 2 && created && <section className="onboard-step">
          <h1 id="onboard-title">Eure Gruppe steht</h1>
          <p className="onboard-lede">Schick deinen Leuten den Link. Wer ihn öffnet, landet direkt in deiner Gruppe.</p>
          <div className="onboard-code-card">
            <small>Gruppencode</small>
            <strong className="tabular">{created.code}</strong>
            <button type="button" className="link-btn" onClick={copyCode}>{copied ? <><Check size={14} /> Kopiert</> : <><Copy size={14} /> Kopieren</>}</button>
          </div>
          <p className="onboard-note">Dein Admin-Code ist <b className="tabular">{created.adminCode}</b>. Merk ihn dir, damit du auch auf einem anderen Handy Admin bist (Gruppe → Admin-Login).</p>
          <button type="button" className="btn primary wide" onClick={() => onShare(created.code)}><Share size={18} /> Einladung teilen</button>
          <button type="button" className="btn ghost wide" onClick={onDone}><Check size={18} /> Los geht’s</button>
        </section>}
      </div>
    </div>
  );
}
