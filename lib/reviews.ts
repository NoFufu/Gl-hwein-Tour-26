import { defaultStands, fallbackImage, stands, type Rating, type Stand, type TourPhoto } from './data';
import { kvGet, kvSet, loadTour, saveTour } from './storage';

export type Review = {
  id: string;
  standId: string;
  authorId: string;
  author: string;
  values: number[];
  comment: string;
  photos: TourPhoto[];
  updated: string;
};
export type Profile = { id: string; name: string };
export type SyncMode = 'live' | 'local';
export type SyncStatus = { online: boolean; pending: number; error: string };
export type SaveResult = 'synced' | 'queued';
export type EventKind = 'treffpunkt' | 'countdown' | 'runde' | 'sieger' | 'text' | 'nasenmeister' | 'nase';
export type GroupMeta = { nasenmeisterId: string | null; nasenmeisterName: string | null };
export type GroupEvent = { id: string; kind: EventKind; title: string; body: string; standId: string | null; endsAt: string | null; createdBy: string; createdAt: string; expiresAt: string };
export type NewEvent = Pick<GroupEvent, 'kind' | 'title' | 'body' | 'standId' | 'endsAt'> & { minutes?: number };

export interface ReviewStore {
  mode: SyncMode;
  list(): Promise<Review[]>;
  save(review: Review): Promise<SaveResult>;
  remove(review: Review): Promise<SaveResult>;
  subscribe(onChange: () => void): () => void;
  /** Allen sagen, an welchem Stand die Truppe gerade ist. */
  shareHere(standId: string, by: string): void;
  onHere(listener: (standId: string, by: string) => void): () => void;
  status(): SyncStatus;
  onStatus(listener: (s: SyncStatus) => void): () => void;
  /** Wartende Änderungen jetzt senden. */
  flush(): Promise<void>;

  // Admin-Bereich
  isAdmin: boolean;
  hasAdmin(): Promise<boolean>;
  /** Gruppe mit diesem Admin-Code einrichten (nur wenn sie noch keinen Admin hat). */
  claimAdmin(key: string): Promise<void>;
  checkAdmin(key: string): Promise<boolean>;
  /** null = die Gruppe nutzt die Standardliste. */
  listStands(): Promise<Stand[] | null>;
  saveStands(list: Stand[]): Promise<void>;
  uploadImage(dataUrl: string): Promise<string>;
  onStands(listener: () => void): () => void;
  listEvents(): Promise<GroupEvent[]>;
  sendEvent(e: NewEvent): Promise<void>;
  endEvent(id: string): Promise<void>;
  onEvent(listener: (e: GroupEvent) => void): () => void;
  getMeta(): Promise<GroupMeta>;
  setNasenmeister(id: string | null, name: string | null): Promise<void>;
  onMeta(listener: () => void): () => void;
}

const GROUP_KEY = 'glueh26-group';
/** Gruppencode aus dem Einladungslink (#g=CODE) oder aus dem Speicher. */
export function loadGroupCode(): string {
  const fromLink = new URLSearchParams(location.hash.slice(1)).get('g');
  if (fromLink) {
    saveGroupCode(fromLink);
    history.replaceState(null, '', location.pathname + location.search);
    return normalizeCode(fromLink);
  }
  // Es gibt eine feste Gruppe für alle (Levis Runde). Alte Test-Gruppen auf dem Handy werden damit abgelöst.
  saveGroupCode(HOME_GROUP);
  return HOME_GROUP;
}
/** Die eine Gruppe der Tour. Levi ist dort Admin. */
export const HOME_GROUP = 'LEVI-TOUR26';
/** Wer sich mit dem Admin-Code anmeldet, ist auf jedem Gerät derselbe Account. */
export const ADMIN_PROFILE: Profile = { id: 'levi-admin', name: 'Levi' };
export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
export function saveGroupCode(code: string) { try { localStorage.setItem(GROUP_KEY, normalizeCode(code)); } catch {} }
export function newGroupCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'GLUEH-' + Array.from(crypto.getRandomValues(new Uint8Array(6)), n => alphabet[n % alphabet.length]).join('');
}
export const inviteLink = (code: string) => `${location.origin}${location.pathname}#g=${encodeURIComponent(code)}`;

const PROFILE_KEY = 'glueh26-profile';
const uuid = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('');

export async function loadProfile(): Promise<Profile> {
  let stored: Partial<Profile> = {};
  try { stored = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'); } catch {}
  let name = stored.name ?? '';
  if (!stored.name) {
    // Name aus der ersten App-Version übernehmen, falls vorhanden.
    try { name = (await loadTour()).name || ''; } catch {}
  }
  const profile = { id: stored.id || uuid(), name };
  saveProfile(profile);
  return profile;
}
export function saveProfile(profile: Profile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
}

export const reviewId = (standId: string, authorId: string) => `${standId}:${authorId}`;
export const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

/** Nur auf diesem Gerät: eigene Bewertungen aus IndexedDB (Format der ersten Version). */
function localStore(profile: () => Profile): ReviewStore {
  const listeners = new Set<() => void>();
  return {
    mode: 'local',
    async list() {
      const state = await loadTour();
      const p = profile();
      return stands
        .filter(s => state.ratings[s.id])
        .map(s => toReview(s.id, state.ratings[s.id], p));
    },
    async save(review) {
      const state = await loadTour();
      const rating: Rating = { values: review.values, comment: review.comment, photos: review.photos, updated: review.updated };
      await saveTour({ ...state, name: review.author, ratings: { ...state.ratings, [review.standId]: rating } });
      listeners.forEach(l => l());
      return 'synced';
    },
    async remove(review) {
      const state = await loadTour();
      const ratings = { ...state.ratings };
      delete ratings[review.standId];
      await saveTour({ ...state, ratings });
      listeners.forEach(l => l());
      return 'synced';
    },
    subscribe(onChange) { listeners.add(onChange); return () => listeners.delete(onChange); },
    shareHere() {},
    onHere() { return () => {}; },
    status: () => ({ online: true, pending: 0, error: '' }),
    onStatus() { return () => {}; },
    flush: async () => {},
    isAdmin: false,
    hasAdmin: async () => false,
    claimAdmin: async () => { throw Error('Admin gibt es nur mit gemeinsamer Datenbank.'); },
    checkAdmin: async () => false,
    listStands: async () => null,
    saveStands: async () => {},
    uploadImage: async src => src,
    onStands: () => () => {},
    listEvents: async () => [],
    sendEvent: async () => {},
    endEvent: async () => {},
    onEvent: () => () => {},
    getMeta: async () => ({ nasenmeisterId: null, nasenmeisterName: null }),
    setNasenmeister: async () => {},
    onMeta: () => () => {},
  };
}
const toReview = (standId: string, r: Rating, p: Profile): Review => ({
  id: reviewId(standId, p.id), standId, authorId: p.id, author: p.name || 'Du',
  values: r.values, comment: r.comment, photos: r.photos, updated: r.updated,
});

type Row = { id: string; group_code: string; stand_id: string; author_id: string; author: string; scores: number[]; comment: string; photos: TourPhoto[]; updated_at: string };
type Pending = { op: 'save' | 'remove'; review: Review };
// Auf dem Markt ist das Netz oft zäh: lieber nach ein paar Sekunden aufgeben und in die Warteschlange.
const timeout = (ms: number) => (typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(ms) : new AbortController().signal);
const fromRow = (r: Row): Review => ({
  id: r.id, standId: r.stand_id, authorId: r.author_id, author: r.author,
  values: r.scores, comment: r.comment, photos: r.photos || [], updated: r.updated_at,
});

/** Fehler von Supabase oder vom Netz in einen verständlichen Satz übersetzen. */
export function explainError(e: unknown): string {
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e);
  if (/schema cache|does not exist|PGRST205|42P01/i.test(msg)) return 'Die Tabelle fehlt in Supabase. Bitte supabase/schema.sql im SQL Editor ausführen.';
  if (/row-level security|violates|permission denied|42501/i.test(msg)) return 'Supabase verweigert den Zugriff. Bitte supabase/schema.sql erneut ausführen.';
  if (/bucket not found/i.test(msg)) return 'Der Foto-Speicher fehlt. Bitte supabase/schema.sql erneut ausführen.';
  if (/fetch|network|load failed|offline|timeout/i.test(msg)) return 'Keine Verbindung zum Server.';
  return msg.slice(0, 160);
}

/** Gemeinsam über Supabase. Zugriff nur mit Gruppencode (Header, geprüft per Row Level Security).
 *  Fotos landen im öffentlichen Bucket "photos" unter einem nicht erratbaren Pfad.
 *  Ohne Netz landen Änderungen in einer Warteschlange und werden später nachgeschickt. */
async function liveStore(url: string, key: string, group: string, profile: () => Profile, adminKey: string): Promise<ReviewStore> {
  const { createClient } = await import('@supabase/supabase-js');
  const client = (admin: string) => createClient(url, key, { auth: { persistSession: false }, global: { headers: { 'x-group-code': group, 'x-member-id': profile().id, ...(admin ? { 'x-admin-key': admin } : {}) } } });
  const db = client(adminKey);
  const isAdmin = adminKey ? await db.rpc('is_admin').abortSignal(timeout(8000)).then(r => r.data === true, () => false) : false;
  const local = localStore(profile);
  const OUTBOX = `outbox:${group}`, CACHE = `cache:${group}`;
  let outbox: Pending[] = (await kvGet<Pending[]>(OUTBOX).catch(() => undefined)) || [];
  let status: SyncStatus = { online: true, pending: outbox.length, error: '' };
  const statusListeners = new Set<(s: SyncStatus) => void>();
  const setStatus = (next: Partial<SyncStatus>) => { status = { ...status, ...next, pending: outbox.length }; statusListeners.forEach(l => l(status)); };
  const persistOutbox = () => kvSet(OUTBOX, outbox).catch(() => {});

  // Postgres-Änderungen kommen wegen der Header-Regel nicht per Realtime an, daher Broadcast im Gruppenkanal.
  const channel = db.channel(`gruppe-${group}`);
  const listeners = new Set<() => void>();
  const hereListeners = new Set<(standId: string, by: string) => void>();
  const standListeners = new Set<() => void>();
  const eventListeners = new Set<(e: GroupEvent) => void>();
  const metaListeners = new Set<() => void>();
  let here: { standId: string; by: string } | null = null;
  const send = (event: string, payload: object) => channel.send({ type: 'broadcast', event, payload });
  channel
    .on('broadcast', { event: 'changed' }, () => listeners.forEach(l => l()))
    .on('broadcast', { event: 'stands' }, () => standListeners.forEach(l => l()))
    .on('broadcast', { event: 'meta' }, () => metaListeners.forEach(l => l()))
    .on('broadcast', { event: 'event' }, ({ payload }) => { if (payload?.id) eventListeners.forEach(l => l(payload as GroupEvent)); })
    .on('broadcast', { event: 'here' }, ({ payload }) => {
      if (typeof payload?.standId !== 'string') return;
      here = { standId: payload.standId, by: String(payload.by || '') };
      hereListeners.forEach(l => l(here!.standId, here!.by));
    })
    // Wer neu dazukommt, fragt nach dem aktuellen Stand der Truppe.
    .on('broadcast', { event: 'where' }, () => { if (here) send('here', here); })
    .subscribe(s => { if (s === 'SUBSCRIBED') send('where', {}); });
  const announce = () => send('changed', {});

  async function pushSave(review: Review) {
    const photos: TourPhoto[] = [];
    for (const photo of review.photos) {
      if (!photo.src.startsWith('data:')) { photos.push(photo); continue; }
      // Ohne upsert: Überschreiben bräuchte eine Lese-Regel, und die Fotos sollen nicht auflistbar sein.
      const upload = async (dataUrl: string, path: string) => {
        const blob = await (await fetch(dataUrl)).blob();
        const { error } = await db.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' });
        if (error && !/exists|duplicate/i.test(error.message)) throw error;
        return db.storage.from('photos').getPublicUrl(path).data.publicUrl;
      };
      const base = `${group}/${review.standId}/${review.authorId}/${photo.id}`;
      const thumb = photo.thumb?.startsWith('data:') ? await upload(photo.thumb, `${base}_t.jpg`) : photo.thumb;
      photos.push({ ...photo, src: await upload(photo.src, `${base}.jpg`), thumb });
    }
    const row: Row = {
      id: review.id, group_code: group, stand_id: review.standId, author_id: review.authorId, author: review.author,
      scores: review.values, comment: review.comment, photos, updated_at: review.updated,
    };
    const { error } = await db.from('reviews').upsert(row).abortSignal(timeout(15000));
    if (error) throw error;
    return { ...review, photos };
  }
  async function pushRemove(review: Review) {
    const { error } = await db.from('reviews').delete().eq('id', review.id).eq('group_code', group).abortSignal(timeout(15000));
    if (error) throw error;
  }
  let flushing: Promise<void> | null = null;
  function flush() {
    if (!outbox.length) return Promise.resolve();
    return (flushing ||= (async () => {
      try {
        while (outbox.length) {
          const item = outbox[0];
          if (item.op === 'save') await local.save(await pushSave(item.review));
          else await pushRemove(item.review);
          outbox = outbox.slice(1);
          await persistOutbox();
        }
        setStatus({ online: true, error: '' });
        announce();
        listeners.forEach(l => l());
      } catch (e) {
        setStatus({ error: explainError(e) });
      } finally { flushing = null; }
    })());
  }
  function enqueue(item: Pending, e: unknown) {
    outbox = [...outbox.filter(x => x.review.id !== item.review.id), item];
    persistOutbox();
    setStatus({ error: explainError(e) });
  }
  const retry = () => { if (!document.hidden) flush(); };
  addEventListener('online', retry);
  setInterval(() => { if (outbox.length) retry(); }, 30_000);
  if (outbox.length) setTimeout(retry, 1500);

  return {
    mode: 'live',
    async list() {
      let remote: Review[];
      try {
        const { data, error } = await db.from('reviews').select('*').eq('group_code', group).order('updated_at', { ascending: false }).abortSignal(timeout(12000));
        if (error) throw error;
        remote = (data as Row[]).map(fromRow);
        kvSet(CACHE, remote).catch(() => {});
        setStatus({ online: true, ...(outbox.length ? {} : { error: '' }) });
      } catch (e) {
        // Offline: zuletzt geladene Gruppenwertung anzeigen.
        remote = (await kvGet<Review[]>(CACHE).catch(() => undefined)) || [];
        setStatus({ online: false, error: explainError(e) });
      }
      const pending = new Map(outbox.map(p => [p.review.id, p]));
      const merged = remote.filter(r => !pending.has(r.id));
      for (const p of outbox) if (p.op === 'save') merged.unshift(p.review);
      return merged;
    },
    async save(review) {
      try {
        const saved = await pushSave(review);
        await local.save(saved);
        announce();
        setStatus({ online: true, error: outbox.length ? status.error : '' });
        flush();
        return 'synced';
      } catch (e) {
        await local.save(review);
        enqueue({ op: 'save', review }, e);
        return 'queued';
      }
    },
    async remove(review) {
      await local.remove(review);
      try { await pushRemove(review); announce(); return 'synced'; }
      catch (e) { enqueue({ op: 'remove', review }, e); return 'queued'; }
    },
    subscribe(onChange) {
      listeners.add(onChange);
      const focus = () => { if (!document.hidden) { flush(); onChange(); } };
      document.addEventListener('visibilitychange', focus);
      const poll = setInterval(focus, 60_000);
      return () => { listeners.delete(onChange); clearInterval(poll); document.removeEventListener('visibilitychange', focus); };
    },
    shareHere(standId, by) { here = { standId, by }; send('here', here); },
    onHere(listener) { hereListeners.add(listener); return () => hereListeners.delete(listener); },
    status: () => status,
    onStatus(listener) { statusListeners.add(listener); return () => statusListeners.delete(listener); },
    flush,

    isAdmin,
    async hasAdmin() { const { data } = await db.rpc('group_has_admin'); return data === true; },
    async claimAdmin(code) {
      const { error } = await client(code).from('groups').insert({ code: group, admin_hash: await sha256(code) });
      if (error) throw Error(/duplicate|23505/i.test(error.message) ? 'Diese Gruppe hat schon einen Admin. Frag nach dem Admin-Code.' : explainError(error));
    },
    async checkAdmin(code) { const { data } = await client(code).rpc('is_admin'); return data === true; },
    async listStands() {
      const { data, error } = await db.from('stands').select('*').eq('group_code', group).order('position').abortSignal(timeout(12000));
      if (error) throw error;
      if (!data?.length) return null;
      return (data as StandRow[]).map(fromStandRow);
    },
    async saveStands(list) {
      const rows: StandRow[] = list.map((s, i) => ({
        group_code: group, id: s.id, position: i, name: s.name, place: s.place, wine: s.wine, description: s.description,
        image: s.image, lng: s.coords[0], lat: s.coords[1], updated_at: new Date().toISOString(),
      }));
      const { error } = await db.from('stands').upsert(rows);
      if (error) throw Error(explainError(error));
      const keep = list.map(s => s.id);
      const { error: delError } = await db.from('stands').delete().eq('group_code', group).not('id', 'in', `(${keep.map(id => `"${id}"`).join(',')})`);
      if (delError) throw Error(explainError(delError));
      send('stands', {});
    },
    async uploadImage(src) {
      if (!src.startsWith('data:')) return src;
      const blob = await (await fetch(src)).blob();
      const path = `${group}/stands/${uuid()}.jpg`;
      const { error } = await db.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' });
      if (error) throw Error(explainError(error));
      return db.storage.from('photos').getPublicUrl(path).data.publicUrl;
    },
    onStands(listener) { standListeners.add(listener); return () => standListeners.delete(listener); },
    async listEvents() {
      const { data, error } = await db.from('events').select('*').eq('group_code', group).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      return (data as EventRow[]).map(fromEventRow);
    },
    async sendEvent(e) {
      const now = Date.now();
      const row = {
        group_code: group, kind: e.kind, title: e.title, body: e.body, stand_id: e.standId,
        ends_at: e.minutes ? new Date(now + e.minutes * 60_000).toISOString() : e.endsAt,
        created_by: profile().name, expires_at: new Date(now + Math.max(30, (e.minutes || 0) + 15) * 60_000).toISOString(),
      };
      const { data, error } = await db.from('events').insert(row).select().single();
      if (error) throw Error(explainError(error));
      const event = fromEventRow(data as EventRow);
      send('event', event);
      eventListeners.forEach(l => l(event));
    },
    async endEvent(id) {
      const { data, error } = await db.from('events').update({ expires_at: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw Error(explainError(error));
      const event = fromEventRow(data as EventRow);
      send('event', event);
      eventListeners.forEach(l => l(event));
    },
    onEvent(listener) { eventListeners.add(listener); return () => eventListeners.delete(listener); },
    async getMeta() {
      const { data } = await db.from('group_meta').select('*').eq('group_code', group).maybeSingle();
      return { nasenmeisterId: data?.nasenmeister_id ?? null, nasenmeisterName: data?.nasenmeister_name ?? null };
    },
    async setNasenmeister(id, name) {
      const { error } = await db.from('group_meta').upsert({ group_code: group, nasenmeister_id: id, nasenmeister_name: name, updated_at: new Date().toISOString() });
      if (error) throw Error(explainError(error));
      send('meta', {});
      metaListeners.forEach(l => l());
    },
    onMeta(listener) { metaListeners.add(listener); return () => metaListeners.delete(listener); },
  };
}

type StandRow = { group_code: string; id: string; position: number; name: string; place: string; wine: string; description: string; image: string; lng: number; lat: number; updated_at: string };
function fromStandRow(r: StandRow): Stand {
  const base = defaultStands.find(s => s.id === r.id);
  return { id: r.id, name: r.name, place: r.place, wine: r.wine, description: r.description, coords: [r.lng, r.lat], image: r.image || base?.image || fallbackImage, sources: base?.sources || [] };
}
type EventRow = { id: string; kind: EventKind; title: string; body: string; stand_id: string | null; ends_at: string | null; created_by: string; created_at: string; expires_at: string };
const fromEventRow = (r: EventRow): GroupEvent => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, standId: r.stand_id, endsAt: r.ends_at, createdBy: r.created_by, createdAt: r.created_at, expiresAt: r.expires_at });
async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
}
export function newAdminKey() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'ADMIN-' + Array.from(crypto.getRandomValues(new Uint8Array(8)), n => alphabet[n % alphabet.length]).join('');
}
const ADMIN_KEY = (group: string) => `glueh26-admin:${group}`;
export function loadAdminKey(group: string) { try { return localStorage.getItem(ADMIN_KEY(group)) || ''; } catch { return ''; } }
export function saveAdminKey(group: string, key: string) { try { if (key) localStorage.setItem(ADMIN_KEY(group), key); else localStorage.removeItem(ADMIN_KEY(group)); } catch {} }

export const liveConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function createStore(profile: () => Profile, group: string, adminKey = ''): Promise<ReviewStore> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key && group) {
    try { return await liveStore(url, key, group, profile, adminKey); } catch {}
  }
  return localStore(profile);
}
