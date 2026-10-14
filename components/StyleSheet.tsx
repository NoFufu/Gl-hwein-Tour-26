'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { CupChoice } from '../lib/themes';
import { CupPicker, ThemePicker } from './Guide';

/** Design und Tasse direkt von der Startseite aus wählen. Änderungen gelten sofort, die Tasse dahinter wechselt mit. */
export default function StyleSheet({ theme, cup, onTheme, onCup, onClose }: {
  theme: string; cup: CupChoice; onTheme: (id: string) => void; onCup: (c: CupChoice) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (el && !el.open) el.showModal();
    return () => { el?.close(); document.body.style.overflow = overflow; };
  }, []);
  return (
    <dialog ref={dialog} className="sheet style-sheet" aria-labelledby="style-title" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet-body">
        <div className="sheet-top"><h2 id="style-title">Design & Tasse</h2><button type="button" className="icon-btn" aria-label="Schließen" onClick={onClose}><X size={20} /></button></div>
        <p className="muted">Gilt nur auf deinem Handy.</p>
        <h3 className="style-sub">Design</h3>
        <ThemePicker value={theme} onChange={onTheme} />
        <h3 className="style-sub">Tasse</h3>
        <p className="muted small">„Automatisch“ wechselt mit dem Design.</p>
        <CupPicker value={cup} theme={theme} onChange={onCup} />
        <button type="button" className="btn primary wide" onClick={onClose}>Fertig</button>
      </div>
    </dialog>
  );
}
