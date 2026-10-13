/** Einladungsseite: drei Looks. Wer einlädt, wählt einen; er reist im Link mit (#g=CODE&l=LOOK). */
export const landingLooks = [
  { id: 'lichterkette', name: 'Lichterkette', hint: 'Nacht, warmes Licht' },
  { id: 'frostklar', name: 'Frostklar', hint: 'Hell, Plakat-Schrift' },
  { id: 'stadtplan', name: 'Stadtplan', hint: 'Route als Karte' },
] as const;
export type LandingLook = typeof landingLooks[number]['id'];
export const DEFAULT_LOOK: LandingLook = 'lichterkette';
const INVITE_LOOK_KEY = 'glueh26-invite-look';
const isLook = (v: unknown): v is LandingLook => landingLooks.some(l => l.id === v);

/** Look aus dem Einladungslink. Vor loadGroupCode() lesen, das den Hash leert. */
export function lookFromLink(): LandingLook {
  const l = new URLSearchParams(location.hash.slice(1)).get('l');
  return isLook(l) ? l : DEFAULT_LOOK;
}
/** Der Look, mit dem diese Person selbst einlädt. */
export function loadInviteLook(): LandingLook {
  try { const l = localStorage.getItem(INVITE_LOOK_KEY); return isLook(l) ? l : DEFAULT_LOOK; } catch { return DEFAULT_LOOK; }
}
export function saveInviteLook(look: LandingLook) { try { localStorage.setItem(INVITE_LOOK_KEY, look); } catch {} }
