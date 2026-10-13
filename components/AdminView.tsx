'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Beer, Clock, Copy, ImagePlus, LoaderCircle, LocateFixed, Megaphone, Navigation, Pencil, Plus, RotateCcw, Trash2, Trophy, X } from 'lucide-react';
import { defaultStands, fallbackImage, stopNumber, type Stand } from '../lib/data';
import { preparePhoto } from '../lib/storage';
import type { EventKind, GroupEvent, GroupMeta, ReviewStore } from '../lib/reviews';
import { eventIcons } from './EventBanner';

const kinds: { id: EventKind; label: string; icon: typeof Clock }[] = [
  { id: 'treffpunkt', label: 'Treffpunkt', icon: Navigation },
  { id: 'countdown', label: 'Countdown', icon: Clock },
  { id: 'runde', label: 'Runde', icon: Beer },
  { id: 'sieger', label: 'Siegerehrung', icon: Trophy },
  { id: 'text', label: 'Nachricht', icon: Megaphone },
];
const timeFmt = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

export default function AdminView({ store, stands, adminKey, adminName, currentId, events, people, meta, onStandsSaved, notify }: {
  store: ReviewStore; stands: Stand[]; adminKey: string; adminName: string; currentId: string; events: GroupEvent[];
  people: { id: string; name: string }[]; meta: GroupMeta;
  onStandsSaved: () => void; notify: (msg: string) => void;
}) {
  const [kind, setKind] = useState<EventKind>('treffpunkt');
  const [standId, setStandId] = useState(currentId);
  const [minutes, setMinutes] = useState(10);
  const [who, setWho] = useState(adminName);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState<Stand | null>(null);
  const [busy, setBusy] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [nose, setNose] = useState(meta.nasenmeisterId || people[0]?.id || '');
  async function crown(remove = false) {
    const person = people.find(p => p.id === nose);
    if (!remove && !person) return;
    setBusy(true);
    try {
      await store.setNasenmeister(remove ? null : person!.id, remove ? null : person!.name);
      if (!remove) await store.sendEvent({ kind: 'nasenmeister', title: `${person!.name} ist Nasenmeister!`, body: 'Die feinste Nase der Runde. Ab jetzt mit Orden bei jeder Bewertung.', standId: null, endsAt: null });
      notify(remove ? 'Titel entfernt.' : `${person!.name} ist jetzt Nasenmeister.`);
    } catch (err) { notify(err instanceof Error ? err.message : 'Hat nicht geklappt.'); }
    finally { setBusy(false); }
  }
  const active = events.filter(e => new Date(e.expiresAt).getTime() > Date.now());

  async function send() {
    const stand = stands.find(s => s.id === standId);
    const e = kind === 'treffpunkt' ? { title: `Treffpunkt: ${stand?.name ?? 'Stand'}`, body, standId, endsAt: null }
      : kind === 'countdown' ? { title: `Weiter in ${minutes} Minuten`, body, standId: null, endsAt: null, minutes }
      : kind === 'runde' ? { title: `${who.trim() || 'Jemand'} gibt eine Runde aus 🍷`, body, standId: null, endsAt: null }
      : kind === 'sieger' ? { title: 'Siegerehrung! 🏆', body, standId: null, endsAt: null }
      : { title: title.trim(), body, standId: null, endsAt: null };
    if (!e.title) { notify('Bitte einen Titel eingeben.'); return; }
    setSending(true);
    try { await store.sendEvent({ kind, ...e }); setBody(''); setTitle(''); notify('Event an alle geschickt.'); }
    catch (err) { notify(err instanceof Error ? err.message : 'Senden hat nicht geklappt.'); }
    finally { setSending(false); }
  }
  async function save(list: Stand[], msg: string) {
    setBusy(true);
    try { await store.saveStands(list); onStandsSaved(); notify(msg); return true; }
    catch (err) { notify(err instanceof Error ? err.message : 'Speichern hat nicht geklappt.'); return false; }
    finally { setBusy(false); }
  }
  const move = (i: number, d: number) => { const l = [...stands]; [l[i], l[i + d]] = [l[i + d], l[i]]; save(l, 'Reihenfolge gespeichert.'); };
  function addStand() {
    const lng = stands.reduce((a, s) => a + s.coords[0], 0) / stands.length, lat = stands.reduce((a, s) => a + s.coords[1], 0) / stands.length;
    setEditing({ id: `s-${Date.now().toString(36)}`, name: '', place: '', wine: '', description: '', image: '', coords: [lng, lat], sources: [] });
  }

  return (
    <>
      <section className="card admin-card">
        <div className="card-head"><h2>Event auslösen</h2><span className="pill">erscheint bei allen</span></div>
        <div className="admin-body">
          <div className="kind-tabs" role="tablist">
            {kinds.map(k => <button key={k.id} type="button" role="tab" aria-selected={kind === k.id} className={kind === k.id ? 'active' : ''} onClick={() => setKind(k.id)}><k.icon size={16} />{k.label}</button>)}
          </div>
          {kind === 'treffpunkt' && <label>Wo?<select value={standId} onChange={e => setStandId(e.target.value)}>{stands.map(s => <option key={s.id} value={s.id}>{stopNumber(s.id)} · {s.name}</option>)}</select></label>}
          {kind === 'countdown' && <div className="chips-row">{[5, 10, 15, 30].map(m => <button key={m} type="button" className={minutes === m ? 'active' : ''} onClick={() => setMinutes(m)}>{m} Min</button>)}</div>}
          {kind === 'runde' && <label>Wer gibt aus?<input autoComplete="off" value={who} onChange={e => setWho(e.target.value)} maxLength={30} /></label>}
          {kind === 'text' && <label>Titel<input autoComplete="off" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="z. B. Alle zum Ausgang!" /></label>}
          <label>{kind === 'text' ? 'Text' : 'Zusatz'} <small>optional</small><input autoComplete="off" value={body} onChange={e => setBody(e.target.value)} maxLength={300} placeholder={kind === 'countdown' ? 'z. B. Dann geht’s zur Pyramide' : ''} /></label>
          <button type="button" className="btn primary wide" disabled={sending} onClick={send}>{sending ? <LoaderCircle className="spin" size={17} /> : <Megaphone size={17} />} An alle senden</button>
          {active.length > 0 && <ul className="active-events">
            {active.map(e => { const Icon = eventIcons[e.kind]; return (
              <li key={e.id}><Icon size={16} /><span><strong>{e.title}</strong><small>seit {timeFmt.format(new Date(e.createdAt))}</small></span>
                <button type="button" className="btn ghost small" onClick={() => store.endEvent(e.id).then(() => notify('Event beendet.'), err => notify(err.message))}>Beenden</button></li>
            ); })}
          </ul>}
        </div>
      </section>

      <section className="card admin-card">
        <div className="card-head"><h2>Stände</h2><button type="button" className="btn ghost small" onClick={addStand}><Plus size={15} /> Neu</button></div>
        <ol className="admin-stands">
          {stands.map((s, i) => (
            <li key={s.id}>
              <img src={s.thumb || s.image || fallbackImage} alt="" />
              <span><small>{stopNumber(s.id)} · {s.place || 'ohne Ort'}</small><strong>{s.name}</strong></span>
              <span className="admin-stand-actions">
                <button type="button" className="icon-btn" aria-label={`${s.name} nach oben`} disabled={busy || i === 0} onClick={() => move(i, -1)}><ArrowUp size={16} /></button>
                <button type="button" className="icon-btn" aria-label={`${s.name} nach unten`} disabled={busy || i === stands.length - 1} onClick={() => move(i, 1)}><ArrowDown size={16} /></button>
                <button type="button" className="icon-btn" aria-label={`${s.name} bearbeiten`} onClick={() => setEditing(s)}><Pencil size={16} /></button>
              </span>
            </li>
          ))}
        </ol>
        <div className="admin-body">
          <button type="button" className="link-btn" disabled={busy} onClick={() => { if (confirm('Standardliste von 2025 wiederherstellen? Eigene Änderungen gehen verloren.')) save(defaultStands, 'Standardliste wiederhergestellt.'); }}><RotateCcw size={14} /> Standardliste wiederherstellen</button>
        </div>
      </section>

      <section className="card admin-card">
        <div className="card-head"><h2>Nasenmeister <span aria-hidden="true">👃</span></h2></div>
        <div className="admin-body">
          <p className="muted">{meta.nasenmeisterName ? <>Aktuell: <strong>{meta.nasenmeisterName}</strong>. </> : 'Noch niemand gekürt. '}Ein Ehrentitel ohne Sonderrechte, sichtbar bei allen Bewertungen.</p>
          {people.length ? <label>Wer bekommt den Orden?<select value={nose} onChange={e => setNose(e.target.value)}>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            : <p className="muted">Sobald jemand bewertet hat, kannst du ihn hier auswählen.</p>}
          <button type="button" className="btn primary wide" disabled={busy || !people.length} onClick={() => crown()}><span aria-hidden="true">👃</span> Zum Nasenmeister küren</button>
          {meta.nasenmeisterId && <button type="button" className="link-btn" disabled={busy} onClick={() => crown(true)}>Titel entfernen</button>}
        </div>
      </section>

      <section className="card admin-card">
        <div className="card-head"><h2>Admin-Code</h2></div>
        <div className="admin-body">
          <p className="muted">Mit diesem Code können weitere Leute Admin werden. Gib ihn nur weiter, wem du das zutraust.</p>
          <div className="key-row"><code className="tabular">{showKey ? adminKey : '••••••-••••••••'}</code>
            <button type="button" className="btn ghost small" onClick={() => setShowKey(v => !v)}>{showKey ? 'Verbergen' : 'Zeigen'}</button>
            <button type="button" className="btn ghost small" onClick={() => navigator.clipboard.writeText(adminKey).then(() => notify('Admin-Code kopiert.'))}><Copy size={14} /></button>
          </div>
        </div>
      </section>

      {editing && <StandEditor stand={editing} isNew={!stands.some(s => s.id === editing.id)} store={store} notify={notify}
        onClose={() => setEditing(null)}
        onSave={async next => { const exists = stands.some(s => s.id === next.id); const ok = await save(exists ? stands.map(s => s.id === next.id ? next : s) : [...stands, next], 'Stand gespeichert.'); if (ok) setEditing(null); }}
        onDelete={async () => { if (stands.length <= 1) { notify('Mindestens ein Stand muss bleiben.'); return; } const ok = await save(stands.filter(s => s.id !== editing.id), 'Stand gelöscht.'); if (ok) setEditing(null); }} />}
    </>
  );
}

function StandEditor({ stand, isNew, store, notify, onSave, onDelete, onClose }: {
  stand: Stand; isNew: boolean; store: ReviewStore; notify: (m: string) => void;
  onSave: (s: Stand) => Promise<void>; onDelete: () => Promise<void>; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null), file = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(stand);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    const el = dialog.current, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (el && !el.open) el.showModal();
    return () => { el?.close(); document.body.style.overflow = overflow; };
  }, []);
  // Ein neues Bild ersetzt auch Vorschaubild und Bildnachweis des alten Fotos.
  const set = (k: keyof Stand, v: string) => setDraft(d => k === 'image' ? { ...d, image: v, thumb: undefined, credit: undefined } : { ...d, [k]: v });
  const setCoord = (i: 0 | 1, v: string) => { const n = parseFloat(v.replace(',', '.')); if (!Number.isNaN(n)) setDraft(d => { const c = [...d.coords] as [number, number]; c[i] = n; return { ...d, coords: c }; }); };
  async function pickImage(files: FileList | null) {
    if (!files?.[0]) return;
    try { const p = await preparePhoto(files[0]); setDraft(d => ({ ...d, image: p.src })); }
    catch (e) { notify(e instanceof Error ? e.message : 'Bild konnte nicht geöffnet werden.'); }
    finally { if (file.current) file.current.value = ''; }
  }
  function here() {
    navigator.geolocation?.getCurrentPosition(p => { setDraft(d => ({ ...d, coords: [+p.coords.longitude.toFixed(6), +p.coords.latitude.toFixed(6)] })); notify('Standort übernommen.'); },
      () => notify('Standort nicht verfügbar.'), { enableHighAccuracy: true, timeout: 12000 });
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) { notify('Bitte einen Namen eingeben.'); return; }
    setBusy(true);
    try { const image = draft.image.startsWith('data:') ? await store.uploadImage(draft.image) : draft.image; await onSave({ ...draft, name: draft.name.trim(), image }); }
    catch (err) { notify(err instanceof Error ? err.message : 'Speichern hat nicht geklappt.'); }
    finally { setBusy(false); }
  }

  return (
    <dialog ref={dialog} className="sheet stand-editor" aria-labelledby="editor-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
      <form className="sheet-body" onSubmit={submit}>
        <div className="sheet-top"><h2 id="editor-title">{isNew ? 'Neuer Stand' : 'Stand bearbeiten'}</h2><button type="button" className="icon-btn" aria-label="Schließen" disabled={busy} onClick={onClose}><X size={20} /></button></div>
        <div className="editor-image">
          <img src={draft.image || fallbackImage} alt="" />
          <div>
            <button type="button" className="btn ghost small" onClick={() => file.current?.click()}><ImagePlus size={15} /> Bild wählen</button>
            {draft.image && <button type="button" className="link-btn" onClick={() => set('image', '')}>Bild entfernen</button>}
            <small className="muted">Nur Bilder, die du verwenden darfst.</small>
          </div>
          <input ref={file} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={e => pickImage(e.target.files)} />
        </div>
        <label>Name<input autoComplete="off" value={draft.name} onChange={e => set('name', e.target.value)} maxLength={60} required /></label>
        <label>Ort<input autoComplete="off" value={draft.place} onChange={e => set('place', e.target.value)} maxLength={60} placeholder="z. B. Alter Markt" /></label>
        <label>Getränke<input autoComplete="off" value={draft.wine} onChange={e => set('wine', e.target.value)} maxLength={80} placeholder="z. B. Roter & weißer Glühwein" /></label>
        <label>Beschreibung<textarea value={draft.description} onChange={e => set('description', e.target.value)} maxLength={500} /></label>
        <fieldset className="coords">
          <legend>Position auf der Karte</legend>
          <label>Breite<input inputMode="decimal" defaultValue={draft.coords[1]} key={`lat-${draft.coords[1]}`} onBlur={e => setCoord(1, e.target.value)} /></label>
          <label>Länge<input inputMode="decimal" defaultValue={draft.coords[0]} key={`lng-${draft.coords[0]}`} onBlur={e => setCoord(0, e.target.value)} /></label>
          <button type="button" className="btn ghost small" onClick={here}><LocateFixed size={15} /> Mein Standort</button>
        </fieldset>
        <button type="submit" className="btn primary wide" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : null} Speichern</button>
        {!isNew && (confirmDelete
          ? <div className="review-own"><span>Stand wirklich löschen? Bewertungen dazu werden ausgeblendet.</span><button type="button" className="btn ghost small" onClick={() => setConfirmDelete(false)}>Behalten</button><button type="button" className="btn danger small" disabled={busy} onClick={onDelete}>Löschen</button></div>
          : <button type="button" className="link-btn" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Stand löschen</button>)}
      </form>
    </dialog>
  );
}
