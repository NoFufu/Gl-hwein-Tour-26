import { asset } from './asset';
/** src = Foto in voller Größe, thumb = kleines Vorschaubild für Listen (optional, ältere Fotos haben keins). */
export type TourPhoto = { id: string; src: string; name: string; thumb?: string };
export type Rating = { values: number[]; comment: string; photos: TourPhoto[]; updated: string };
export type TourState = { name: string; ratings: Record<string, Rating> };
export const initialState: TourState = { name: '', ratings: {} };
export const criteria = ['Geschmack', 'Temperatur', 'Atmosphäre', 'Preis / Leistung', 'Schlotzigkeitsfaktor'];
export type StandSource = { title: string; url: string };
export type Stand = {
 id: string; name: string; place: string; wine: string; description: string;
 coords: [number, number]; image: string; sources: StandSource[];
 /** Kleines Vorschaubild für Listen und Bildnachweis zum Foto (beides optional). */
 thumb?: string; credit?: string;
};
/** Fotos vom Weihnachtsmarkt, Nutzung von Bielefeld Marketing freigegeben. */
export const photoCredit = 'Foto: Bielefeld Marketing GmbH | Tim Fröhlich';
const photo = (name: string) => ({ image: asset(`/fotos/${name}.jpg`), thumb: asset(`/fotos/${name}-klein.jpg`), credit: photoCredit });
const marketing: StandSource = { title: 'Bielefeld Marketing · 04.11.2025', url: 'https://www.bielefeld-marketing.de/pressemeldung/bielefeld-laedt-weihnachtsmarkt' };

const list2026 = 'Laut Standliste 2026 für die Bielefelder Innenstadt (Markt vom 19.11. bis 30.12.2026, So bis Do 12 bis 21 Uhr, Fr/Sa 12 bis 22 Uhr).';

// Season IDs keep ratings of the former invented stands separate. Stands that already
// existed in 2025 keep their wm2025 id so their ratings stay attached.
// Coordinates identify the documented square/street, not the exact stall.
export const defaultStands: Stand[] = [
 {
  id: 'wm2025-pyramide', name: 'Weihnachtspyramide', place: 'Jahnplatz',
  wine: 'Glühwein & weitere Heißgetränke', description: `Die begehbare Weihnachtspyramide im Hüttendorf am Jahnplatz, laut Veranstalter die größte in Nordrhein-Westfalen. ${list2026}`,
  coords: [8.5329917, 52.0231648], ...photo('pyramide'), sources: [marketing]
 },
 {
  id: 'wm2026-duenhoelter', name: 'Dünhölter Weinhandel', place: 'Alter Markt',
  wine: 'Glühwein', description: `Der Glühweinstand des Weinhandels Dünhölter am Alten Markt. ${list2026}`,
  coords: [8.5325200, 52.0207300], ...photo('duenhoelter'), sources: []
 },
 {
  id: 'wm2026-gluehwuermchen', name: 'Glühwürmchen', place: 'Alter Markt',
  wine: 'Glühwein', description: `Glühweinstand am Alten Markt. ${list2026}`,
  coords: [8.5320300, 52.0204900], ...photo('gluehwuermchen'), sources: []
 },
 {
  id: 'wm2025-nikolaus', name: 'Haus vom Nikolaus', place: 'Altstädter Kirchpark am Leineweber',
  wine: 'Glühwein & Feuerzangenbowle', description: `Der rustikale Stopp im Kirchpark am Leineweber-Denkmal, auch mit Feuerzangenbowle. ${list2026}`,
  coords: [8.5321475, 52.0210376], ...photo('nikolaus'), sources: [marketing]
 },
 {
  id: 'wm2026-feuerzangenbowle', name: 'Feuerzangenbowle', place: 'Altstädter Kirchplatz',
  wine: 'Feuerzangenbowle & heiße Schokolade', description: 'Der Feuerzangenbowle-Stand von Victoria Schneider auf dem Altstädter Kirchplatz an der Nicolaikirche, mit heißer Schokolade als Alternative. Laut Westfalen-Blatt gab es 2024 dort zusätzlich eine „Heiße Dubai-Schokolade“ für 5 Euro. Das Foto zeigt die Altstädter Kirche und den Alten Markt von oben.',
  coords: [8.5326500, 52.0214500], ...photo('feuerzangenbowle'),
  sources: [{ title: 'Westfalen-Blatt · 01.12.2024', url: 'https://www.westfalen-blatt.de/owl/bielefeld/bielefelder-weihnachtsmarkt-am-puls-der-zeit-3199676' }]
 },
 {
  id: 'wm2025-gluehbar', name: 'GlühBar', place: 'Niedernstraße',
  wine: 'Glühwein & mehr', description: `Die GlühBar in der Niedernstraße zwischen Alter Markt und Jahnplatz. ${list2026}`,
  coords: [8.5317787, 52.0222174], ...photo('gluehbar'),
  sources: [{ title: 'Bielefeld Marketing · 20.11.2025', url: 'https://www.bielefeld-marketing.de/pressemeldung/bielefeldjetzt-app-weihnachtsmarktbesuch-planen' }]
 },
 {
  id: 'wm2026-knigge', name: 'Café Knigge', place: 'Niedernstraße & Bahnhofstraße',
  wine: 'Glühwein', description: `Café Knigge schenkt an zwei Stellen aus: in der Niedernstraße und in der Bahnhofstraße. Der Kartenpunkt liegt in der Niedernstraße. ${list2026}`,
  coords: [8.5321500, 52.0226500], ...photo('knigge'), sources: []
 },
 {
  id: 'wm2025-bahnhofstr', name: 'Der Winzer', place: 'Bahnhofstraße',
  wine: 'Glühwein', description: `Der Glühweinstand „Der Winzer“ in der Bahnhofstraße am Rand des Marktgebiets. ${list2026}`,
  coords: [8.5328, 52.0262], ...photo('bahnhofstrasse'), sources: []
 },
 {
  id: 'wm2026-kaiser', name: 'Jerome Kaiser', place: 'Stresemannstraße',
  wine: 'Glühwein', description: `Glühweinstand von Jerome Kaiser in der Stresemannstraße, gleich neben dem Jahnplatz. ${list2026}`,
  coords: [8.5345000, 52.0228500], ...photo('kaiser'), sources: []
 },
 {
  id: 'wm2025-lions', name: 'Lions Club', place: 'Obernstraße',
  wine: 'Roter & weißer Glühwein', description: `Glühwein für den guten Zweck, 2026 in der Obernstraße (2025 noch am Alten Markt). 2025 gab es erstmals auch weißen Glühwein sowie alkoholfreien Claire de Lune. ${list2026}`,
  coords: [8.5312000, 52.0201000], ...photo('lions'),
  sources: [{ title: 'Lions Club Bielefeld Phoenix · November 2025', url: 'https://www.lions-phoenix.com/presse/2025/11/21/dieses-jahr-mit-berraschung-wir-haben-jetzt-auch-weien-glhwein' }, { title: 'Lions Bielefeld Sparrenberg · Saison 2025', url: 'https://www.lc-bi-sparrenberg.de/lions-bielefeld-sparrenberg/aktuelles/' }]
 },
 {
  id: 'wm2026-wintersaeftchen', name: 'Wintersäftchen', place: 'Obernstraße',
  wine: 'Heiße Säfte & Glühwein', description: `Ausschank „Wintersäftchen“ in der Obernstraße. ${list2026}`,
  coords: [8.5306500, 52.0198300], ...photo('wintersaeftchen'), sources: []
 },
 {
  id: 'wm2026-wille-met', name: 'Wille Met', place: 'Obernstraße',
  wine: 'Heißer Met', description: `Met-Stand von Wille in der Obernstraße, die Alternative zum Glühwein. ${list2026}`,
  coords: [8.5301000, 52.0196000], ...photo('wille-met'), sources: []
 },
 {
  id: 'wm2025-almhuette', name: 'Krauses Almhütte', place: 'Bunnemannplatz',
  wine: 'Glühwein, auch weißer', description: `Eine warme Almhütte zwischen Obernstraße und Bunnemannplatz, auch mit weißem Glühwein. ${list2026}`,
  coords: [8.5295743, 52.0193913], ...photo('almhuette'), sources: [marketing]
 },
 {
  id: 'wm2025-fels', name: 'Weihnachten unter dem Fels', place: 'Klosterplatz',
  wine: 'Glühwein & Punsch', description: `Die Glühweinhütte im Weihnachtsmarkt-Areal am Klosterplatz, mit Lounge im Fels. ${list2026}`,
  coords: [8.5285503, 52.0208272], ...photo('fels'),
  sources: [{ title: 'Betreiber · Klosterplatz', url: 'https://www.weihnachtsmarkt-klosterplatz.de/' }]
 }
];
export const legacyStands = [
 { id: '1', name: 'Weihnachtszauber' }, { id: '2', name: 'Die Glühhütte' },
 { id: '3', name: 'Wintergold' }, { id: '4', name: 'Sternenstube' }
];
export function average(_stand: Stand, rating?: Rating) {
 return rating?.values.length ? rating.values.reduce((a,b)=>a+b,0) / rating.values.length : 0;
}
/** Aktuelle Standliste: Standard oder die vom Admin der Gruppe gepflegte Liste (live gebunden). */
export let stands: Stand[] = defaultStands;
export function setStands(list: Stand[] | null) { stands = list && list.length ? list : defaultStands; }
export const fallbackImage = asset('/illustrations/markt-abend.svg');
export const stopNumber = (id: string) => String(stands.findIndex(s => s.id === id) + 1).padStart(2, '0');
export const formatScore = (n: number) => n.toFixed(1).replace('.', ',');
