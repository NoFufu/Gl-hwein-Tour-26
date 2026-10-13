'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowUpRight, BookOpen, Camera, Eye, Crown, Download, Navigation, KeyRound, Shield, Check, ChevronRight, Copy, Images, MapPin, Map, PartyPopper, Star, Trophy, Users, Wifi, WifiOff, X } from 'lucide-react';
import RatingSheet from '../components/RatingSheet';
import StandSheet from '../components/StandSheet';
import Guide, { ThemePicker } from '../components/Guide';
import AdminView from '../components/AdminView';
import EventBanner from '../components/EventBanner';
import NextPicker from '../components/NextPicker';
import NoseBadge from '../components/ui/NoseBadge';
import NoseSheet from '../components/NoseSheet';
import Intro from '../components/Intro';
import Welcome from '../components/Welcome';
import { DEFAULT_LOOK, landingLooks, loadInviteLook, lookFromLink, saveInviteLook, type LandingLook } from '../lib/landing';
import { exportBackup, exportCsv } from '../lib/export';
import { applyTheme, THEME_KEY, themeById } from '../lib/themes';
import Avatar from '../components/ui/Avatar';
import CountUp from '../components/ui/CountUp';
import ShinyText from '../components/ui/ShinyText';
import SpotlightCard from '../components/ui/SpotlightCard';
import Stars from '../components/ui/Stars';
import { formatScore, setStands, stands, stopNumber, type Rating, type Stand } from '../lib/data';
import type { RouteRequest } from '../components/TourMap';
import { average, createStore, explainError, loadAdminKey, saveAdminKey, ADMIN_PROFILE, type GroupEvent, type GroupMeta, inviteLink, liveConfigured, loadGroupCode, loadProfile, newGroupCode, normalizeCode, reviewId, saveGroupCode, saveProfile, type Profile, type Review, type ReviewStore, type SyncStatus } from '../lib/reviews';

const TourMap = dynamic(() => import('../components/TourMap'), { ssr: false, loading: () => <div className="map-skeleton">Karte wird geladen …</div> });
const WinterCup = dynamic(() => import('../components/WinterCup'), { ssr: false });
const BackgroundScene = dynamic(() => import('../components/BackgroundScene'), { ssr: false });

type View = 'tour' | 'ranking' | 'photos' | 'group' | 'admin';
const nav: { id: View; label: string; icon: typeof Map }[] = [
  { id: 'tour', label: 'Tour', icon: Map },
  { id: 'ranking', label: 'Ranking', icon: Trophy },
  { id: 'photos', label: 'Fotos', icon: Images },
  { id: 'group', label: 'Gruppe', icon: Users },
];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const standById = (id: string) => stands.find(s => s.id === id) || stands[0];
const STANDS_CACHE = (g: string) => `glueh26-stands:${g}`;
const SEEN_KEY = 'glueh26-seen-events';
function loadSeen(): string[] { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; } }
const CURRENT_KEY = 'glueh26-current';
const GUIDE_KEY = 'glueh26-guide-done';
const INTRO_KEY = 'glueh26-intro-seen';
const slogans = [
  'Ob rot, ob weiß – Hauptsache heiß!',
  'Sieben Stopps. Null Ausreden.',
  'Erst schnuppern, dann schlürfen, dann bewerten.',
  'Die Nase entscheidet. Der Nasenmeister sowieso.',
  'Kalte Finger, warme Becher, ehrliche Sterne.',
  'Wer zuerst friert, zahlt die nächste Runde.',
];
function loadCurrent() { try { const id = localStorage.getItem(CURRENT_KEY) || ''; return stands.some(s => s.id === id) ? id : ''; } catch { return ''; } }
function saveCurrent(id: string) { try { localStorage.setItem(CURRENT_KEY, id); } catch {} }

export default function Home() {
  const [view, setView] = useState<View>('tour');
  const [profile, setProfile] = useState<Profile>({ id: '', name: '' });
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const [store, setStore] = useState<ReviewStore | null>(null);
  const [group, setGroup] = useState('');
  const [gate, setGate] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const unsubscribeRef = useRef<() => void>(() => {});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sync, setSync] = useState<SyncStatus>({ online: true, pending: 0, error: '' });
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState(stands[0].id);
  const [current, setCurrent] = useState('');
  const [route, setRoute] = useState<RouteRequest | null>(null);
  const [firstName, setFirstName] = useState(false);
  const [guide, setGuide] = useState(false);
  const [theme, setTheme] = useState('marktnacht');
  const [standsVersion, setStandsVersion] = useState(0);
  const [adminKey, setAdminKey] = useState('');
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [adminDraft, setAdminDraft] = useState('');
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [pickNext, setPickNext] = useState(false);
  const [noseOpen, setNoseOpen] = useState(false);
  const [intro, setIntro] = useState(false);
  const [welcome, setWelcome] = useState<null | { look: LandingLook; preview: boolean }>(null);
  const [inviteLook, setInviteLook] = useState<LandingLook>(DEFAULT_LOOK);
  const [slogan, setSlogan] = useState(0);
  const [flashLive, setFlashLive] = useState(false);
  const wasOnline = useRef(false);
  const [meta, setMeta] = useState<GroupMeta>({ nasenmeisterId: null, nasenmeisterName: null });
  const [openStand, setOpenStand] = useState<Stand | null>(null);
  const [rateStand, setRateStand] = useState<Stand | null>(null);
  const [askName, setAskName] = useState<null | (() => void)>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [lightbox, setLightbox] = useState<{ src: string; label: string } | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const photoDialog = useRef<HTMLDialogElement>(null), nameDialog = useRef<HTMLDialogElement>(null);

  const notify = (message: string) => { setToast(message); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 3200); };

  const refresh = useCallback(async (s: ReviewStore) => {
    try { setReviews(await s.list()); setLoadError(''); }
    catch (e) { setLoadError(`Bewertungen konnten gerade nicht geladen werden. ${explainError(e)}`); }
  }, []);

  const loadStands = useCallback(async (s: ReviewStore, code: string) => {
    if (s.mode !== 'live') { setStands(null); setStandsVersion(v => v + 1); return; }
    try {
      const list = await s.listStands();
      setStands(list);
      try { localStorage.setItem(STANDS_CACHE(code), JSON.stringify(list)); } catch {}
    } catch {
      // Offline: zuletzt bekannte Standliste der Gruppe.
      try { setStands(JSON.parse(localStorage.getItem(STANDS_CACHE(code)) || 'null')); } catch {}
    }
    setStandsVersion(v => v + 1);
  }, []);

  const connect = useCallback(async (code: string) => {
    unsubscribeRef.current();
    const key = loadAdminKey(code);
    const s = await createStore(() => profileRef.current, code, key);
    setStore(s);
    setAdminKey(s.isAdmin ? key : '');
    setSeen(loadSeen());
    await loadStands(s, code);
    await refresh(s);
    s.listEvents().then(setEvents, () => {});
    if (s.mode === 'live' && !s.isAdmin) s.hasAdmin().then(setHasAdmin, () => setHasAdmin(null));
    const offStands = s.onStands(() => loadStands(s, code));
    const loadMeta = () => s.getMeta().then(setMeta, () => {});
    loadMeta();
    const offMeta = s.onMeta(loadMeta);
    const offEvent = s.onEvent(e => {
      setEvents(list => [e, ...list.filter(x => x.id !== e.id)]);
      if (new Date(e.expiresAt).getTime() > Date.now()) navigator.vibrate?.([180, 80, 180]);
    });
    const offChange = s.subscribe(() => { refresh(s); s.listEvents().then(setEvents, () => {}); });
    setSync(s.status());
    const offStatus = s.onStatus(setSync);
    const offHere = s.onHere((id, by) => {
      if (!stands.some(x => x.id === id)) return;
      setCurrent(id); saveCurrent(id); setSelected(id);
      notify(`${by || 'Jemand'}: Wir sind jetzt bei ${standById(id).name}.`);
    });
    unsubscribeRef.current = () => { offChange(); offHere(); offStatus(); offStands(); offEvent(); offMeta(); };
  }, [refresh, loadStands]);

  useEffect(() => {
    (async () => {
      const look = lookFromLink(); // vor loadGroupCode(), das den Link-Hash leert
      setInviteLook(loadInviteLook());
      const p = await loadProfile();
      setProfile(p); profileRef.current = p;
      // Neu hier: Einladungsseite statt Start-Animation und Namensdialog.
      const isNew = !p.name.trim();
      if (isNew) setWelcome({ look, preview: false });
      try {
        const t = localStorage.getItem(THEME_KEY);
        if (t) { setTheme(themeById(t).id); applyTheme(themeById(t)); }
        if (p.name.trim() && !localStorage.getItem(GUIDE_KEY)) setGuide(true);
      } catch {}
      setSlogan(Math.floor(Math.random() * slogans.length));
      try { if (!isNew && !localStorage.getItem(INTRO_KEY) && !matchMedia('(prefers-reduced-motion: reduce)').matches) setIntro(true); } catch {}
      const c = loadCurrent();
      if (c) { setCurrent(c); setSelected(c); }
      const code = loadGroupCode();
      setGroup(code);
      if (liveConfigured() && !code) { setGate(true); return; }
      await connect(code);
    })();
    return () => { unsubscribeRef.current(); clearTimeout(toastTimer.current); };
  }, [connect]);

  async function joinGroup(code: string) {
    const c = normalizeCode(code);
    if (c.length < 6) return;
    saveGroupCode(c); setGroup(c); setGate(false);
    await connect(c);
  }

  async function foundGroup() {
    const code = newGroupCode();
    shareInvite(code); // vor dem ersten await, damit das Teilen-Menü als Nutzeraktion zählt
    await joinGroup(code);
  }

  useEffect(() => { if (lightbox) photoDialog.current?.showModal(); else photoDialog.current?.close(); }, [lightbox]);
  useEffect(() => { if (askName && !intro) nameDialog.current?.showModal(); else nameDialog.current?.close(); }, [askName, intro]);
  // Verbindung nur kurz bestätigen; dauerhaft sichtbar ist nur ein Problem (offline oder wartende Uploads).
  useEffect(() => {
    const online = store?.mode === 'live' && sync.online;
    if (online && !wasOnline.current) { setFlashLive(true); const t = setTimeout(() => setFlashLive(false), 2600); wasOnline.current = true; return () => clearTimeout(t); }
    if (!online) wasOnline.current = false;
  }, [store, sync.online]);

  const byStand = useMemo(() => {
    const m: Record<string, Review[]> = {};
    for (const s of stands) m[s.id] = [];
    for (const r of reviews) (m[r.standId] ||= []).push(r);
    return m;
  }, [reviews, standsVersion]);
  const standAvg = (id: string) => average(byStand[id].map(r => average(r.values)));
  const people = useMemo(() => {
    const m: Record<string, { name: string; count: number; sum: number }> = {};
    for (const r of reviews) { const e = (m[r.authorId] ||= { name: r.author, count: 0, sum: 0 }); e.count++; e.sum += average(r.values); }
    return Object.entries(m).map(([id, e]) => ({ id, ...e, avg: e.sum / e.count })).sort((a, b) => b.count - a.count);
  }, [reviews]);
  const ownRated = useMemo(() => new Set(reviews.filter(r => r.authorId === profile.id).map(r => r.standId)), [reviews, profile.id]);
  const ranked = useMemo(() => stands.filter(s => byStand[s.id].length).sort((a, b) => standAvg(b.id) - standAvg(a.id) || byStand[b.id].length - byStand[a.id].length), [byStand]); // eslint-disable-line react-hooks/exhaustive-deps
  const photos = useMemo(() => reviews.flatMap(r => r.photos.map(p => ({ ...p, author: r.author, stand: stands.find(s => s.id === r.standId) }))).filter(p => p.stand), [reviews]);
  const now = (current && stands.some(s => s.id === current) ? current : '') || stands.find(s => !ownRated.has(s.id))?.id || stands[0].id;
  const nowStand = standById(now);
  const nowIndex = stands.findIndex(s => s.id === now);
  const after = [...stands.slice(nowIndex + 1), ...stands.slice(0, nowIndex)];
  const nextStand = after.find(s => !ownRated.has(s.id)) || after[0];
  const allDone = ownRated.size === stands.length;
  const groupSize = people.length;
  const live = store?.mode === 'live';
  const isAdmin = !!adminKey;
  const syncProblem = live && (!sync.online || sync.pending > 0);
  const isNose = live && !!meta.nasenmeisterId && meta.nasenmeisterId === profile.id;
  const activeEvent = events.find(e => new Date(e.expiresAt).getTime() > Date.now() && !seen.includes(e.id));
  const podium = ranked.map(st => ({ stand: st, avg: standAvg(st.id), count: byStand[st.id].length }));
  const tabs = isAdmin ? [...nav, { id: 'admin' as View, label: 'Admin', icon: Shield }] : nav;
  const hint = live ? 'Deine Bewertung und Fotos sieht die ganze Gruppe.' : 'Noch nicht verbunden: Bewertung und Fotos bleiben vorerst auf diesem Gerät.';

  function withName(next: () => void) {
    if (profile.name.trim()) next();
    else { setNameDraft(''); setAskName(() => next); }
  }
  function chooseTheme(id: string) {
    const t = themeById(id);
    setTheme(t.id); applyTheme(t);
    try { localStorage.setItem(THEME_KEY, t.id); } catch {}
  }
  function dismissEvent(id: string) {
    const next = [...seen, id].slice(-50);
    setSeen(next);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch {}
  }
  /** Admin-Code prüfen und als Levi anmelden. Hat die Gruppe noch keinen Admin, richtet der erste Code sie ein. */
  async function loginAdmin(raw: string): Promise<string | void> {
    if (!store || store.mode !== 'live') return 'Noch nicht mit der Gruppe verbunden. Versuch es gleich nochmal.';
    const key = raw.trim().toUpperCase();
    let ok = await store.checkAdmin(key).catch(() => false);
    if (!ok && !(await store.hasAdmin().catch(() => true))) {
      try { await store.claimAdmin(key); ok = true; } catch (e) { return e instanceof Error ? e.message : 'Hat nicht geklappt.'; }
    }
    if (!ok) return 'Dieser Admin-Code passt nicht.';
    const p = ADMIN_PROFILE;
    setProfile(p); profileRef.current = p; saveProfile(p);
    saveAdminKey(group, key); setAdminDraft('');
    try { localStorage.setItem(GUIDE_KEY, '1'); localStorage.setItem(INTRO_KEY, '1'); } catch {}
    await connect(group);
    setView('admin');
    notify(`Hallo ${p.name}, du bist als Admin angemeldet.`);
  }
  async function enterAdmin(e: React.FormEvent) {
    e.preventDefault();
    const problem = await loginAdmin(adminDraft);
    if (problem) notify(problem);
  }
  function leaveAdmin() { saveAdminKey(group, ''); setAdminKey(''); setView('group'); connect(group); }
  function finishIntro() { setIntro(false); try { localStorage.setItem(INTRO_KEY, '1'); } catch {} }
  function closeGuide() { setGuide(false); try { localStorage.setItem(GUIDE_KEY, '1'); } catch {} }
  function startRating(stand: Stand) { withName(() => setRateStand(stand)); }
  function moveHere(id: string) {
    setCurrent(id); saveCurrent(id); setSelected(id);
    store?.shareHere(id, profile.name.trim());
    notify(live ? `Alle sehen jetzt: ${standById(id).name}.` : `Jetzt hier: ${standById(id).name}.`);
  }
  function startRoute(id: string) {
    setOpenStand(null); setView('tour'); setSelected(id);
    setRoute({ to: id, from: now, n: Date.now() });
    setTimeout(() => document.getElementById('map-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }
  async function saveRating(r: Rating) {
    if (!store || !rateStand) return;
    const review: Review = { id: reviewId(rateStand.id, profile.id), standId: rateStand.id, authorId: profile.id, author: profile.name.trim(), ...r };
    const result = await store.save(review);
    // Der Stand bleibt "Jetzt hier", bis jemand auf "Weiter" tippt.
    if (!current) { setCurrent(rateStand.id); saveCurrent(rateStand.id); }
    // Aktuellen Stand fertig bewertet: gleich fragen, wohin es weitergeht.
    const open = stands.filter(x => x.id !== rateStand.id && !ownRated.has(x.id)).length;
    if (rateStand.id === now && open > 0) {
      setSelected(nextStand.id); // Karte springt schon zum vorgeschlagenen nächsten Stand
      setTimeout(() => setPickNext(true), 900);
    }
    await refresh(store);
    notify(result === 'synced' ? 'Bewertung gespeichert. Prost!' : 'Auf dem Handy gespeichert. Wird hochgeladen, sobald es klappt.');
  }
  async function deleteRating(review: Review) {
    if (!store) return;
    try { const result = await store.remove(review); await refresh(store); notify(result === 'synced' ? 'Bewertung gelöscht.' : 'Gelöscht. Die Gruppe sieht es, sobald wieder Verbindung da ist.'); }
    catch { notify('Löschen hat nicht geklappt. Bitte erneut versuchen.'); }
  }
  function saveName(e: React.FormEvent) {
    e.preventDefault();
    const name = nameDraft.trim();
    if (!name) return;
    const p = { ...profile, name };
    setProfile(p); profileRef.current = p; saveProfile(p);
    const next = askName; setAskName(null);
    if (firstName) { setFirstName(false); setGuide(true); }
    next?.();
  }
  async function joinFromWelcome(name: string): Promise<string | void> {
    const preview = welcome?.preview;
    if (preview || !name) { setWelcome(null); return; }
    // Eine Zahl statt Name ist der Admin-Code.
    if (/^\d{4,}$/.test(name)) { const problem = await loginAdmin(name); if (!problem) setWelcome(null); return problem; }
    setWelcome(null);
    const p = { ...profile, name };
    setProfile(p); profileRef.current = p; saveProfile(p);
    // Die Seite hat schon erklärt, worum es geht: Anleitung und Start-Animation nicht mehr hinterher.
    try { localStorage.setItem(GUIDE_KEY, '1'); localStorage.setItem(INTRO_KEY, '1'); } catch {}
    notify(`Willkommen in der Runde, ${name}!`);
  }
  function chooseInviteLook(look: LandingLook) { setInviteLook(look); saveInviteLook(look); }
  function changeView(v: View) { setView(v); window.scrollTo({ top: 0, behavior: 'instant' }); }
  const share = () => shareInvite(group);
  async function shareInvite(code: string) {
    const url = code ? inviteLink(code, inviteLook) : location.href.split('#')[0];
    try {
      if (navigator.share) await navigator.share({ title: 'Glühwein Tour 26', url });
      else { await navigator.clipboard.writeText(url); notify('Link kopiert.'); }
    } catch {}
  }
  const ownRating = (s: Stand): Rating | undefined => { const r = byStand[s.id].find(x => x.authorId === profile.id); return r && { values: r.values, comment: r.comment, photos: r.photos, updated: r.updated }; };

  return (
    <div className="app">
      <a className="skip-link" href="#inhalt">Zum Inhalt springen</a>
      <BackgroundScene palette={themeById(theme).scene} />
      {intro && <Intro slogan={slogans[slogan]} onDone={finishIntro} />}
      {welcome && <Welcome look={welcome.look} preview={welcome.preview} onJoin={joinFromWelcome} onClose={() => setWelcome(null)} />}
      {(syncProblem || flashLive) && !gate && (
        <button type="button" className={`status-pill ${syncProblem ? 'warn' : 'ok'}`} onClick={() => changeView('group')} role="status">
          {syncProblem ? <WifiOff size={14} /> : <Wifi size={14} />}
          {!sync.online ? (sync.pending ? `Offline · ${sync.pending} wartet` : 'Offline') : sync.pending ? `${sync.pending} wartet auf Upload` : 'Live verbunden'}
        </button>
      )}

      <main className="content" id="inhalt">
        {gate && <section className="gate">
          <ShinyText>Willkommen</ShinyText>
          <h1>Eure Runde<br />beitreten.</h1>
          <p>Gib den Gruppencode ein, den du per Link oder Nachricht bekommen hast. Oder gründe eine neue Gruppe und lade deine Leute ein.</p>
          <form className="card gate-form" onSubmit={e => { e.preventDefault(); joinGroup(codeDraft); }}>
            <label htmlFor="code-input">Gruppencode</label>
            <input id="code-input" value={codeDraft} onChange={e => setCodeDraft(e.target.value.toUpperCase())} placeholder="GLUEH-XXXXXX" autoComplete="off" autoCapitalize="characters" spellCheck={false} />
            <button type="submit" className="btn primary wide" disabled={normalizeCode(codeDraft).length < 6}>Beitreten</button>
          </form>
          <button type="button" className="btn ghost wide" onClick={foundGroup}>Neue Gruppe gründen & Link teilen</button>
          {group && <button type="button" className="btn ghost wide" onClick={() => setGate(false)}>Abbrechen</button>}
        </section>}
        {!gate && loadError && <p className="notice" role="alert">{loadError}</p>}

        {!gate && view === 'tour' && <>
          <section className="hero">
            <div className="hero-copy">
              <ShinyText>Bielefeld · 19.11.–30.12.</ShinyText>
              <h1>Glühwein<br />Tour <em>26.</em></h1>
              <button type="button" className="slogan" onClick={() => setSlogan(i => (i + 1) % slogans.length)} aria-label="Nächster Spruch">{slogans[slogan]}</button>
              <button type="button" className="how-link" onClick={() => setGuide(true)}><BookOpen size={15} /> So funktioniert's</button>
              {isNose && <button type="button" className="nose-btn" onClick={() => setNoseOpen(true)}><span aria-hidden="true">👃</span> Nasenmeister-Ansage</button>}
            </div>
            <div className="hero-cup">
              <WinterCup variant={themeById(theme).cup} />
            </div>
          </section>

          <section className="progress-card" aria-label="Fortschritt der Tour">
            <div className="progress-top">
              <p><strong><CountUp value={ownRated.size} /></strong> von {stands.length} Stopps bewertet</p>
              <span>{plural(people.length, 'Person', 'Leute')} · {plural(reviews.length, 'Bewertung', 'Bewertungen')}</span>
            </div>
            <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={stands.length} aria-valuenow={ownRated.size}>
              {stands.map(st => <i key={st.id} className={ownRated.has(st.id) ? 'on' : st.id === now ? 'now' : ''} />)}
            </div>
          </section>

          <section className="card map-card" id="map-card">
            <div className="card-head"><h2>Durch die Altstadt</h2></div>
            <TourMap key={standsVersion} selected={selected} current={now} ratedIds={[...ownRated]} route={route} onSelect={id => { setSelected(id); }} onRouteClose={() => setRoute(null)} />
            <div className="map-selected">
              <button type="button" className="map-selected-main" onClick={() => setOpenStand(standById(selected))}>
                <span className="num">{stopNumber(selected)}</span>
                <span><strong>{standById(selected).name}{selected === now && <em className="here-tag">Jetzt hier</em>}</strong><small>{plural(byStand[selected].length, 'Bewertung', 'Bewertungen')} · ansehen</small></span>
              </button>
              <button type="button" className="btn ghost small route-btn" onClick={() => startRoute(selected)} aria-label={`Route zu ${standById(selected).name}`}><Navigation size={15} /> Route</button>
            </div>
          </section>

          <section>
            <div className="section-head"><h2>Alle Stände</h2></div>
            <div className="stand-list">
              {stands.map(s => {
                const rs = byStand[s.id], avg = standAvg(s.id), done = ownRated.has(s.id);
                const everyone = groupSize > 1 && rs.length >= groupSize;
                return (
                  <SpotlightCard key={s.id} className={`stand-card${done ? ' is-done' : ''}${s.id === now ? ' is-now' : ''}`} onClick={() => setOpenStand(s)} label={`${s.name}, ${plural(rs.length, 'Bewertung', 'Bewertungen')}`}>
                    <span className="stand-thumb"><img src={s.image} alt="" width={64} height={76} loading="lazy" decoding="async" />{done && <span className="tick" aria-hidden="true"><Check size={22} strokeWidth={3} /></span>}</span>
                    <span className="stand-main">
                      <span className="stand-num">{stopNumber(s.id)}{s.id === now && <span className="here-tag">Jetzt hier</span>}{done && <span className="done"><Check size={11} /> abgehakt</span>}{everyone && <span className="done all">alle durch</span>}</span>
                      <strong>{s.name}</strong>
                      <small>{s.place} · {s.wine}</small>
                      <span className="stand-meta">
                        {rs.length ? <><Stars value={avg} size={13} /><b>{formatScore(avg)}</b><span className="raters"><span className="stack">{rs.slice(0, 3).map(r => <Avatar key={r.id} name={r.author} size={18} />)}</span><span className="count">von {rs[0].author}{rs.length > 1 && ` + ${rs.length - 1}`}</span></span></> : <span className="count">Noch keine Bewertung</span>}
                      </span>
                    </span>
                  </SpotlightCard>
                );
              })}
            </div>
          </section>
        </>}

        {!gate && view === 'ranking' && <>
          <PageHead label="Gruppenwertung" title="Ranking" sub="Durchschnitt aller Bewertungen der Gruppe." />
          {ranked.length === 0 ? (
            <div className="card empty-card"><Trophy size={30} /><h2>Noch kein Favorit</h2><p>Sobald jemand bewertet, entsteht hier das Ranking.</p><button type="button" className="btn primary" onClick={() => changeView('tour')}>Zu den Ständen</button></div>
          ) : <>
            <ol className="podium">
              {ranked.slice(0, 3).map((s, i) => (
                <li key={s.id} className={`place-${i + 1}`}>
                  <button type="button" onClick={() => setOpenStand(s)}>
                    <img src={s.image} alt="" width={96} height={96} />
                    {i === 0 && <span className="crown" aria-hidden="true"><Crown size={22} /></span>}
                    <span className="medal">{i + 1}</span>
                    <strong>{s.name}</strong>
                    <span className="podium-score"><CountUp value={standAvg(s.id)} decimals={1} /></span>
                    <small>{plural(byStand[s.id].length, 'Bewertung', 'Bewertungen')}</small>
                  </button>
                  <span className="pedestal" aria-hidden="true">{i + 1}</span>
                </li>
              ))}
            </ol>
            {ranked.slice(0, 3).some(s => byStand[s.id].length < 3) && <p className="fine rank-hint">Noch wenige Stimmen, das Ranking kann sich noch drehen.</p>}
            {ranked.length > 3 && <ol className="rank-bars" aria-label="Weitere Plätze">
              {ranked.slice(3).map((s, i) => (
                <li key={s.id}><button type="button" onClick={() => setOpenStand(s)}>
                  <span className="rank">{i + 4}</span>
                  <span className="rank-bar-main"><strong>{s.name}</strong><i><b style={{ width: `${(standAvg(s.id) / 5) * 100}%` }} /></i></span>
                  <b>{formatScore(standAvg(s.id))}</b>
                </button></li>
              ))}
            </ol>}
            <ol className="rank-list" start={4}>
              {ranked.slice(3).map((s, i) => (
                <li key={s.id}><button type="button" onClick={() => setOpenStand(s)}><span className="rank">{i + 4}</span><span><strong>{s.name}</strong><small>{plural(byStand[s.id].length, 'Bewertung', 'Bewertungen')}</small></span><b>{formatScore(standAvg(s.id))}</b></button></li>
              ))}
            </ol>
          </>}
          {stands.length > ranked.length && <p className="fine">Noch ohne Bewertung: {stands.filter(s => !byStand[s.id].length).map(s => s.name).join(', ')}.</p>}
        </>}

        {!gate && view === 'photos' && <>
          <PageHead label="Winter 2026" title="Momente" sub={photos.length ? plural(photos.length, 'Foto', 'Fotos') + ' aus der Gruppe' : 'Fotos aus euren Bewertungen erscheinen hier.'} />
          {photos.length === 0 && <div className="card empty-card"><Camera size={30} /><h2>Noch keine Fotos</h2><p>Füge beim Bewerten ein Foto hinzu.</p></div>}
          <div className="masonry">
            {photos.map(p => (
              <button key={p.id} type="button" className="photo" onClick={() => setLightbox({ src: p.src, label: `${p.stand!.name} · ${p.author}` })}>
                <img src={p.thumb || p.src} alt={`${p.stand!.name}, Foto von ${p.author}`} width={360} height={270} loading="lazy" decoding="async" /><span><strong>{p.stand!.name}</strong><small>{p.author}</small></span>
              </button>
            ))}
          </div>
        </>}

        {!gate && view === 'group' && <>
          <PageHead label="Eure Runde" title="Gruppe" sub={people.length ? `${plural(people.length, 'Person hat', 'Leute haben')} schon bewertet.` : 'Noch hat niemand bewertet.'} />
          <section className="card me">
            <Avatar name={profile.name || '?'} size={48} />
            <div><small>Du bewertest als</small><strong>{profile.name || 'noch ohne Namen'}</strong></div>
            <button type="button" className="btn ghost small" onClick={() => { setNameDraft(profile.name); setAskName(() => () => {}); }}>Ändern</button>
          </section>
          <section className={`card sync-card ${live && sync.online && !sync.pending ? 'is-live' : ''}`}>
            {live && sync.online ? <Wifi size={20} /> : <WifiOff size={20} />}
            <div>
              <strong>{!live ? 'Nur auf diesem Gerät' : sync.pending ? plural(sync.pending, 'Änderung wartet', 'Änderungen warten') + ' auf Upload' : sync.online ? 'Live verbunden' : 'Gerade offline'}</strong>
              <p>{!live ? 'Die gemeinsame Datenbank ist noch nicht eingerichtet. Bis dahin siehst du nur deine eigenen Bewertungen.'
                : sync.pending ? 'Alles ist auf deinem Handy gespeichert und wird automatisch nachgeschickt.'
                : sync.online ? 'Neue Bewertungen der Gruppe erscheinen automatisch.' : 'Du siehst den letzten Stand. Neue Bewertungen werden nachgeschickt.'}</p>
              {live && sync.error && <p className="sync-error">Grund: {sync.error}</p>}
              {live && sync.pending > 0 && <button type="button" className="btn ghost small" onClick={() => store?.flush()}>Jetzt erneut senden</button>}
            </div>
          </section>
          {live && group && <section className="card code-card">
            <div><small>Gruppencode</small><strong className="tabular">{group}</strong></div>
          </section>}
          {live && group && (isAdmin
            ? <section className="card admin-entry"><Shield size={20} /><div><strong>Du bist Admin</strong><p>Stände bearbeiten und Events an alle schicken.</p></div><button type="button" className="btn primary small" onClick={() => changeView('admin')}>Öffnen</button></section>
            : <form className="card admin-entry" onSubmit={enterAdmin}><KeyRound size={20} /><div><strong>Admin-Code</strong><input value={adminDraft} onChange={e => setAdminDraft(e.target.value.toUpperCase())} placeholder={hasAdmin === false ? 'Code festlegen' : 'Code'} inputMode="numeric" autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-label="Admin-Code" /></div><button type="submit" className="btn ghost small" disabled={adminDraft.trim().length < 4}>Freischalten</button></form>)}
          <section className="card invite-card">
            <div className="card-head"><h2>Einladungsseite</h2><span className="pill">sehen Neue im Link</span></div>
            <div className="look-picker" role="group" aria-label="Look der Einladungsseite">
              {landingLooks.map(l => <button key={l.id} type="button" aria-pressed={inviteLook === l.id} onClick={() => chooseInviteLook(l.id)}><i className={`sw-${l.id}`} aria-hidden="true" /><strong>{l.name}</strong><small>{l.hint}</small></button>)}
            </div>
            <div className="invite-actions">
              <button type="button" className="btn ghost" onClick={() => setWelcome({ look: inviteLook, preview: true })}><Eye size={17} /> Vorschau</button>
              <button type="button" className="btn primary" onClick={share}><Copy size={17} /> Freunde einladen</button>
            </div>
          </section>
          {live && <p className="fine">Der Einladungslink enthält euren Gruppencode. Wer ihn hat, kann mitbewerten.</p>}
          {people.length > 0 && <ul className="people">
            {people.map(p => <li key={p.id}><Avatar name={p.name} size={38} /><span className="person"><strong>{p.name}{p.id === meta.nasenmeisterId && <NoseBadge compact />}{p.id === profile.id && <span className="you">Du</span>}</strong><small>{plural(p.count, 'Stand', 'Stände')} bewertet · im Schnitt {formatScore(p.avg)}</small></span><span className="progress"><i style={{ width: `${(p.count / stands.length) * 100}%` }} /></span></li>)}
          </ul>}
          <section className="card design-card">
            <div className="card-head"><h2>Design</h2><span className="pill">nur auf deinem Handy</span></div>
            <ThemePicker value={theme} onChange={chooseTheme} />
          </section>
          <button type="button" className="btn ghost wide" onClick={() => setGuide(true)}><BookOpen size={17} /> Anleitung & Handy-Check</button>
          <section className="card export-card">
            <div className="card-head"><h2>Sichern</h2><span className="pill">{plural(reviews.length, 'Bewertung', 'Bewertungen')}</span></div>
            <div className="admin-body">
              <p className="muted">Alle Bewertungen der Gruppe als Tabelle, mit Ranking. Öffnet sich in Excel, Numbers oder Google Sheets.</p>
              <button type="button" className="btn ghost wide" disabled={!reviews.length} onClick={() => exportCsv(group || 'lokal', stands, reviews)}><Download size={17} /> Als Tabelle speichern (CSV)</button>
              {isAdmin && <button type="button" className="btn ghost wide" onClick={() => exportBackup(group, stands, reviews, meta)}><Download size={17} /> Komplett-Backup (JSON)</button>}
            </div>
          </section>
          <button type="button" className="link-btn" onClick={() => setIntro(true)}>Start-Animation nochmal ansehen</button>
          <details className="sources">
            <summary>Standliste 2025 & Quellen</summary>
            <p>Belegte Auswahl, keine vollständige Beschickerliste. Preise und genaue Standpositionen sind nicht gesichert. Für 2026 müssen die Stopps neu geprüft werden.</p>
            {stands.map(s => <div key={s.id}><strong>{s.name} · {s.place}</strong>{s.sources.map(src => <a key={src.url} href={src.url} target="_blank" rel="noreferrer">{src.title}<ArrowUpRight size={12} /></a>)}</div>)}
            <p>Karte: MapLibre, OpenFreeMap, OpenStreetMap. Bilder: eigene Illustrationen.</p>
          </details>
        </>}

        {!gate && view === 'admin' && isAdmin && store && <>
          <PageHead label="Nur für Admins" title="Admin" sub="Events erscheinen sofort bei allen in der Gruppe. Änderungen an Ständen sehen alle beim nächsten Laden." />
          <AdminView store={store} stands={stands} adminKey={adminKey} adminName={profile.name} currentId={now} events={events} people={people.some(x => x.id === profile.id) ? people : [{ id: profile.id, name: profile.name }, ...people]} meta={meta}
            onStandsSaved={() => loadStands(store, group)} notify={notify} />
          <button type="button" className="link-btn" onClick={leaveAdmin}>Admin auf diesem Handy abmelden</button>
        </>}
      </main>

      {!gate && <div className="bottom-ui">
      <div className="now-bar" aria-label="Aktueller Stand">
        <button type="button" className="now-info" onClick={() => setPickNext(true)} aria-label={`Jetzt hier: ${nowStand.name}. Stand wechseln`}>
          <span className="now-num">{stopNumber(now)}</span>
          <span><small><MapPin size={11} /> Jetzt hier · <u>wechseln</u></small><strong>{nowStand.name}</strong></span>
        </button>
        {!ownRated.has(now)
          ? <button type="button" className="btn primary small" onClick={() => startRating(nowStand)}><Star size={15} /> Bewerten</button>
          : allDone
            ? <button type="button" className="btn ghost small" onClick={() => changeView('ranking')}><PartyPopper size={15} /> Ranking</button>
            : <button type="button" className="btn ghost small" onClick={() => setPickNext(true)}>Nächster Stand <ChevronRight size={15} /></button>}
      </div>

      <nav className={`dock${isAdmin ? ' five' : ''}`} aria-label="Hauptnavigation">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={view === id ? 'active' : ''} aria-current={view === id ? 'page' : undefined} onClick={() => changeView(id)}><Icon size={20} /><span>{label}</span></button>
        ))}
      </nav>
      </div>}

      {openStand && <StandSheet key={openStand.id} stand={openStand} reviews={byStand[openStand.id]} ownId={profile.id} nasenId={meta.nasenmeisterId} isCurrent={openStand.id === now} onHere={() => moveHere(openStand.id)} onRoute={() => startRoute(openStand.id)} onClose={() => setOpenStand(null)} onRate={() => { const s = openStand; setOpenStand(null); startRating(s); }} onDelete={deleteRating} onPhoto={(src, label) => setLightbox({ src, label })} />}
      {activeEvent && !gate && <EventBanner key={activeEvent.id} event={activeEvent} stand={activeEvent.standId ? stands.find(x => x.id === activeEvent.standId) : undefined} podium={podium}
        onRoute={id => startRoute(id)} onClose={() => dismissEvent(activeEvent.id)} />}
      {noseOpen && store && <NoseSheet onClose={() => setNoseOpen(false)} onSend={async (title, body) => {
        try { await store.sendEvent({ kind: 'nase', title, body, standId: null, endsAt: null }); notify('Ansage an alle geschickt.'); }
        catch (e) { notify(e instanceof Error ? e.message : 'Senden hat nicht geklappt.'); throw e; }
      }} />}
      {pickNext && <NextPicker stands={stands} current={nowStand} suggestion={nextStand.id} ownRated={ownRated} byStand={byStand} groupSize={groupSize}
        onPick={id => { setPickNext(false); moveHere(id); }} onClose={() => setPickNext(false)} />}
      {guide && !askName && !intro && <Guide theme={theme} onTheme={chooseTheme} onClose={closeGuide} />}
      {rateStand && <RatingSheet key={rateStand.id} stand={rateStand} rating={ownRating(rateStand)} hint={hint} current={rateStand.id === now ? undefined : nowStand} onSwitch={() => { setRateStand(null); startRating(nowStand); }} onClose={() => setRateStand(null)} onSave={saveRating} />}

      <dialog ref={nameDialog} className="sheet name-dialog" aria-labelledby="name-title" onCancel={e => { if (firstName) e.preventDefault(); else setAskName(null); }}>
        <form onSubmit={saveName}>
          <div className="sheet-top"><h2 id="name-title">{firstName ? 'Hi! Wie heißt du?' : 'Wie heißt du?'}</h2>{!firstName && <button type="button" className="icon-btn" aria-label="Schließen" onClick={() => setAskName(null)}><X size={20} /></button>}</div>
          <p className="muted">So sieht die Gruppe, wer bewertet hat. Du kannst den Namen später unter „Gruppe“ ändern.</p>
          <label htmlFor="name-input">Dein Name</label>
          <input id="name-input" value={nameDraft} onChange={e => setNameDraft(e.target.value)} maxLength={30} required autoComplete="given-name" />
          <button className="btn primary wide" type="submit"><Check size={18} /> Speichern</button>
        </form>
      </dialog>
      <dialog ref={photoDialog} className="lightbox" aria-label="Foto" onCancel={() => setLightbox(null)} onClick={() => setLightbox(null)}>
        <button type="button" className="icon-btn" aria-label="Foto schließen"><X /></button>
        {lightbox && <><img src={lightbox.src} alt={lightbox.label} /><p>{lightbox.label}</p></>}
      </dialog>
      {toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}
    </div>
  );
}

function PageHead({ label, title, sub }: { label: string; title: string; sub: string }) {
  return <div className="page-head"><ShinyText>{label}</ShinyText><h1>{title}</h1><p>{sub}</p></div>;
}
