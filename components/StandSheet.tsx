'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, MapPin, Navigation, Pencil, Star, Trash2, X } from 'lucide-react';
import { criteria, formatScore, stopNumber, type Stand } from '../lib/data';
import { average, type Review } from '../lib/reviews';
import Avatar from './ui/Avatar';
import CountUp from './ui/CountUp';
import Stars from './ui/Stars';
import NoseBadge from './ui/NoseBadge';
import Radar from './ui/Radar';

const dateFmt = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function StandSheet({ stand, reviews, ownId, nasenId, isCurrent, onRate, onHere, onRoute, onDelete, onPhoto, onClose }: {
  stand: Stand; reviews: Review[]; ownId: string; nasenId: string | null; isCurrent: boolean;
  onRate: () => void; onHere: () => void; onRoute: () => void; onDelete: (review: Review) => Promise<void>; onPhoto: (src: string, label: string) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    const el = dialog.current, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (el && !el.open) el.showModal();
    return () => { el?.close(); document.body.style.overflow = overflow; };
  }, []);
  const avg = average(reviews.map(r => average(r.values)));
  const perCriterion = criteria.map((_, i) => average(reviews.map(r => r.values[i])));
  const own = reviews.find(r => r.authorId === ownId);
  const sorted = [...reviews].sort((a, b) => (a.authorId === ownId ? -1 : b.authorId === ownId ? 1 : b.updated.localeCompare(a.updated)));

  return (
    <dialog ref={dialog} className="sheet stand-sheet" aria-labelledby="stand-title" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet-media">
        <img src={stand.image} alt="" width={560} height={210} />
        <button type="button" className="icon-btn sheet-close" aria-label="Schließen" onClick={onClose}><X size={20} /></button>
        {stand.credit && <small className="photo-credit">{stand.credit}</small>}
        <span className="sheet-number">Stopp {stopNumber(stand.id)}{isCurrent && ' · Jetzt hier'}</span>
      </div>
      <div className="sheet-body">
        <h2 id="stand-title">{stand.name}</h2>
        <p className="sheet-place">{stand.place} · {stand.wine}</p>

        <section className="score-panel" aria-label="Gruppenwertung">
          <div className="score-big">
            <strong>{reviews.length ? <CountUp value={avg} decimals={1} /> : '–'}</strong>
            <div>
              <Stars value={avg} size={15} />
              <span>{reviews.length === 0 ? 'Noch keine Bewertung' : reviews.length === 1 ? '1 Bewertung' : `${reviews.length} Bewertungen`}</span>
            </div>
          </div>
          {reviews.length > 0 && <div className="radar-wrap"><Radar labels={criteria} group={perCriterion} own={own?.values} />{own && <p className="radar-legend"><i className="g" /> Gruppe <i className="o" /> Du</p>}</div>}
          {reviews.length > 0 && (
            <ul className="criteria-bars">
              {criteria.map((c, i) => (
                <li key={c}><span>{c}</span><i><b style={{ width: `${(perCriterion[i] / 5) * 100}%` }} /></i><em>{formatScore(perCriterion[i])}</em></li>
              ))}
            </ul>
          )}
        </section>

        <div className="sheet-actions">
          <button type="button" className="btn ghost" onClick={onRoute}><Navigation size={17} /> Route</button>
          <button type="button" className="btn primary" onClick={onRate}>{own ? <><Pencil size={17} /> Meine Bewertung ändern</> : <><Star size={17} /> Jetzt bewerten</>}</button>
        </div>
        {!isCurrent && <button type="button" className="btn ghost wide" onClick={onHere}><MapPin size={17} /> Wir sind jetzt hier</button>}

        <h3 className="sheet-heading">Alle Bewertungen <span>{reviews.length}</span></h3>
        {sorted.length === 0 && <p className="empty">Sei die erste Person, die hier bewertet.</p>}
        <ol className="review-list">
          {sorted.map(r => (
            <li key={r.id} className="review">
              <header>
                <Avatar name={r.author} size={36} />
                <div><strong>{r.author}{r.authorId === nasenId && <NoseBadge />}{r.authorId === ownId && <span className="you">Du</span>}</strong><time dateTime={r.updated}>{dateFmt.format(new Date(r.updated))}</time></div>
                <span className="review-score">{formatScore(average(r.values))}</span>
              </header>
              <ul className="chips">{criteria.map((c, i) => <li key={c}>{c} <b>{r.values[i]}</b></li>)}</ul>
              {r.comment && <p className="review-comment">{r.comment}</p>}
              {r.authorId === ownId && (
                <div className="review-own">
                  {confirming
                    ? <><span>Bewertung wirklich löschen?</span><button type="button" className="btn ghost small" onClick={() => setConfirming(false)}>Behalten</button><button type="button" className="btn danger small" onClick={async () => { await onDelete(r); setConfirming(false); }}>Löschen</button></>
                    : <button type="button" className="link-btn" onClick={() => setConfirming(true)}><Trash2 size={14} /> Meine Bewertung löschen</button>}
                </div>
              )}
              {r.photos.length > 0 && (
                <div className="review-photos">
                  {r.photos.map((p, i) => <button key={p.id} type="button" onClick={() => onPhoto(p.src, `${stand.name} · ${r.author}`)}><img src={p.thumb || p.src} loading="lazy" decoding="async" alt={`Foto ${i + 1} von ${r.author}`} /></button>)}
                </div>
              )}
            </li>
          ))}
        </ol>

        <details className="sources">
          <summary>Über diesen Stopp · Quellen 2025</summary>
          <p>{stand.description}</p>
          <p>Preise vor Ort prüfen. Die Markierung zeigt den Ortsbereich, keine vermessene Standposition.</p>
          {stand.sources.map(s => <a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title}<ArrowUpRight size={13} /></a>)}
        </details>
      </div>
    </dialog>
  );
}
