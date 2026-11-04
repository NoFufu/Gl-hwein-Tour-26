'use client';
import { useEffect, useId, useMemo, useRef } from 'react';
import { paperArch, type CupVariant } from '../lib/paper';

type OrientationPermission = { requestPermission?: () => Promise<'granted' | 'denied'> };

/** Papier-Schwibbogen auf der Startseite. Die Schichten verschieben sich gegeneinander, wenn man das Handy kippt
 *  (am Rechner: wenn man die Maus bewegt). Ohne Bewegung schwingt die Szene ganz leicht von selbst.
 *  Antippen lässt die Tasse hüpfen und fragt auf dem iPhone einmal nach dem Bewegungssensor. */
export default function PaperArch({ theme, cup }: { theme: string; cup: CupVariant }) {
  const host = useRef<HTMLButtonElement>(null);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const markup = useMemo(() => paperArch(theme, cup, id), [theme, cup, id]);

  useEffect(() => {
    const el = host.current; if (!el) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let x = 0, y = 0, tx = 0, ty = 0, lastInput = -1e9, raf = 0, visible = true;
    let base: [number, number] | null = null;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      if (!base) base = [e.gamma, e.beta];
      // Grundhaltung wandert langsam mit, damit die Szene nach dem Hinlegen wieder mittig steht
      base[0] += (e.gamma - base[0]) * .01; base[1] += (e.beta - base[1]) * .01;
      tx = clamp((e.gamma - base[0]) / 18); ty = clamp((e.beta - base[1]) / 18); lastInput = performance.now();
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = clamp((e.clientX / innerWidth - .5) * 2); ty = clamp((e.clientY / innerHeight - .5) * 2); lastInput = performance.now();
    };
    const frame = (t: number) => {
      raf = 0;
      if (t - lastInput > 2500) { tx = Math.sin(t / 2600) * .45; ty = Math.sin(t / 3700) * .2; }
      x += (tx - x) * .08; y += (ty - y) * .08;
      el.style.setProperty('--px', x.toFixed(3)); el.style.setProperty('--py', y.toFixed(3));
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    const io = new IntersectionObserver(e => { visible = e[0].isIntersecting; if (visible) start(); }, { threshold: .05 });
    io.observe(el);
    addEventListener('deviceorientation', onTilt); addEventListener('pointermove', onPointer);
    document.addEventListener('visibilitychange', start); start();
    return () => { cancelAnimationFrame(raf); io.disconnect(); removeEventListener('deviceorientation', onTilt); removeEventListener('pointermove', onPointer); document.removeEventListener('visibilitychange', start); };
  }, []);

  function tap() {
    const el = host.current; if (!el) return;
    el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop');
    const D = (globalThis as { DeviceOrientationEvent?: OrientationPermission }).DeviceOrientationEvent;
    D?.requestPermission?.().catch(() => {});
  }

  return <button type="button" ref={host} className="paper-arch" aria-label="Schwibbogen mit Glühweintasse antippen" onClick={tap} dangerouslySetInnerHTML={{ __html: markup }} />;
}
