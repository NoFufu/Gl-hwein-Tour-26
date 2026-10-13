'use client';
import { useEffect, useRef } from 'react';
import { Check, Footprints, MapPin, X } from 'lucide-react';
import { fallbackImage, stopNumber, type Stand } from '../lib/data';
import type { Review } from '../lib/reviews';
import Avatar from './ui/Avatar';

const meters = (a: [number, number], b: [number, number]) => {
  const rad = Math.PI / 180, dLat = (b[1] - a[1]) * rad, dLng = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};

/** Nach dem Bewerten: Wohin als Nächstes? Die Wahl wird für alle als "Jetzt hier" gesetzt. */
export default function NextPicker({ stands, current, suggestion, ownRated, byStand, groupSize, onPick, onClose }: {
  stands: Stand[]; current: Stand; suggestion: string; ownRated: Set<string>; byStand: Record<string, Review[]>; groupSize: number;
  onPick: (id: string) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (el && !el.open) el.showModal();
    return () => { el?.close(); document.body.style.overflow = overflow; };
  }, []);
  const here = byStand[current.id] || [];
  const options = stands.filter(s => s.id !== current.id)
    .map(s => ({ s, m: meters(current.coords, s.coords), done: ownRated.has(s.id) }))
    .sort((a, b) => Number(a.done) - Number(b.done) || Number(b.s.id === suggestion) - Number(a.s.id === suggestion) || a.m - b.m);

  return (
    <dialog ref={dialog} className="sheet next-picker" aria-labelledby="next-title" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet-body">
        <div className="sheet-top"><h2 id="next-title">Wohin als Nächstes?</h2><button type="button" className="icon-btn" aria-label="Schließen" onClick={onClose}><X size={20} /></button></div>
        <div className="next-progress">
          <span className="stack">{here.slice(0, 5).map(r => <Avatar key={r.id} name={r.author} size={26} />)}</span>
          <p><strong>{current.name}</strong>: {groupSize > 1 ? `${Math.min(here.length, groupSize)} von ${groupSize} haben bewertet` : `${here.length} ${here.length === 1 ? 'Bewertung' : 'Bewertungen'}`}.{groupSize > 1 && here.length < groupSize ? ' Wartet ihr noch auf jemanden?' : ' Alle fertig!'}</p>
        </div>
        <p className="muted">Der gewählte Stand wird bei allen als „Jetzt hier“ gesetzt.</p>
        <ul className="next-list">
          {options.map(({ s, m, done }) => (
            <li key={s.id}>
              <button type="button" className={`${done ? 'done' : ''}${s.id === suggestion ? ' suggested' : ''}`} onClick={() => onPick(s.id)}>
                <img src={s.thumb || s.image || fallbackImage} alt="" width={48} height={56} loading="lazy" decoding="async" />
                <span className="next-main">
                  <small>{stopNumber(s.id)} · {s.place}{s.id === suggestion && <em className="here-tag">Vorschlag</em>}</small>
                  <strong>{s.name}</strong>
                  <span className="next-meta"><Footprints size={12} /> {m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`} · ca. {Math.max(1, Math.round((m * 1.3) / 75))} Min
                    {done && <span className="done"><Check size={11} /> abgehakt</span>}</span>
                </span>
                <MapPin size={18} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
