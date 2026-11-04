# DESIGN.md – Glühwein Tour 26

Designsprache für die App. Ziel: warm, einladend, eventig – wie ein Abend auf dem Weihnachtsmarkt,
nicht wie ein Tech-Dashboard. Die Glühwein-Identität bleibt: dunkle Winternacht, Laternengold,
Glühwein-Rot, ein Hauch Tannengrün.

**Inspiration** (nur als Haltung, nichts kopiert), aus der Bibliothek *awesome-design-md*:

| Referenz | Was wir übernehmen | Was nicht |
|---|---|---|
| **Spotify** | Dunkle Bühne, auf der Inhalt (bei uns: Stand-Illustrationen, Fotos) die Farbe liefert. Akzentfarbe ist *funktional*, nicht dekorativ. | Grün, enge Zeilenabstände |
| **Airbnb** | Großzügig, freundlich, gerundet; Bewertungen als große, ruhige Zahl; Bilder führen, Typo bleibt bei mittleren Gewichten. | Weißer Canvas, Coral |
| **Starbucks** | Wärme durch Materialfarben (Creme, Holz, Becher); Gold nur für „Zeremonie“-Momente (bei uns: Platz 1, Nasenmeister, Siegerehrung). | Grünes Vier-Ton-System |

Die Designs (Clean, Marktnacht, Tannenwald, Polarlicht, Frost, Schneekugel) teilen alle
Regeln unten; sie tauschen nur Farb-Tokens, Display-Schrift und Hintergrundszene.

---

## 1. Farb-Tokens (Marktnacht = Referenz)

| Token | Wert | Rolle |
|---|---|---|
| `--bg` | `#120e16` | Nachthimmel, Seitenhintergrund |
| `--surface` | `ink 5.5 %` | Karten |
| `--surface-2` | `ink 9 %` | Eingabefelder, Ghost-Buttons, Chips |
| `--panel-solid` | `#1a141e` | Sheets, Dialoge, schwebende Leiste (immer deckend) |
| `--line` | `ink 12 %` | Haarlinien, Kartenränder |
| `--ink` | `#f7efe7` | Text, Überschriften |
| `--muted` | `#d2c6cc` | Sekundärtext (≥ 7:1 auf `--bg`) |
| `--amber` | `#f3b66a` | **Laternengold** – einzige Aktionsfarbe: Haupt-Button, „Jetzt hier“, Scores |
| `--amber-ink` | `#2a1708` | Text auf Gold |
| `--cranberry` | `#e05770` | **Glühwein-Rot** – Marke (Tasse, Intro), Warnungen, Löschen |
| `--pine` | `#7cc3a5` | **Tannengrün** – nur „erledigt/bewertet/verbunden“ |

Regeln
- Gold ist funktional: höchstens **ein** goldener Haupt-Button pro Ansicht. Kein Gold für Deko-Text.
- Grün bedeutet immer „geschafft“. Nie als Deko.
- Rot ist Marke + Gefahr. Keine roten Flächen hinter Text außer Warnhinweisen.
- Verläufe nur in der Hintergrundszene und der Tasse – nicht in Buttons oder Text.
- Kleiner Text (< 18 px) braucht ≥ 4.5:1 Kontrast. Keine halbtransparente Akzentfarbe für Text.

## 2. Typografie

Display: **Bricolage Grotesque** (Marktnacht/Tannenwald) · Outfit (Polarlicht) · Unbounded (Frost) ·
Playfair Display (Schneekugel). Betonung („26.“) per Farbe in derselben Schrift, keine Kursive, kein Verlauf. Text: **Instrument Sans** in allen Designs.

| Stufe | Größe / Zeilenhöhe | Gewicht | Einsatz |
|---|---|---|---|
| `display-xl` | clamp(44, 13vw, 64) / .95 | 650 | Hero „Glühwein Tour 26.“ |
| `display-lg` | 36 / 1.05 | 600 | Seitentitel (Ranking, Fotos, Gruppe) |
| `title` | 22 / 1.15 | 600 | Kartenüberschriften, Sheet-Titel |
| `score` | 30–56 / 1 | 600, lining nums | Schnitt, Podium |
| `heading-sm` | 17 / 1.3 | 600 | Standname in Listen |
| `body` | 16 / 1.5 | 400 | Fließtext, **alle Eingabefelder** (iOS zoomt sonst) |
| `body-sm` | 14 / 1.45 | 400 | Ort · Getränk, Beschreibungen |
| `caption` | 13 / 1.35 | 500 | Meta-Zeilen, Datum, Zählungen |
| `label` | 12 / 1.2 | 700, `+.08em`, VERSAL | nur kurze Labels (Stopp-Nummer, Eyebrow) |

Regeln
- Keine Größen außerhalb der Skala (heute: 10/12/13/14/15/17/18/24/26/32 gemischt).
- Versal-Labels sparsam: maximal eines pro Ansicht. Laufweite höchstens `.08em`.
- Zahlen immer `font-variant-numeric: lining-nums tabular-nums`.
- Lange Namen trennen (`hyphens: auto`, `lang="de"`), nicht hart umbrechen.

## 3. Abstände

4-px-Raster: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 48`

- Seitenrand mobil 16, Kartenpolster 16–18, Abstand zwischen Sektionen 24 (mobil) / 32 (ab 900 px).
- In Karten: Titel → Inhalt 12, Zeilen in Listen 8.
- Touch-Ziele mindestens **44 × 44** (auch kleine Buttons, Fotos-Entfernen, Pfeile im Admin).

## 4. Radien

| Token | Wert | Einsatz |
|---|---|---|
| `--r-sm` | 10 | Chips, kleine Bilder, Inputs |
| `--r-md` | 16 | Listenkarten, Bilder in Karten |
| `--r-lg` | 24 | große Karten, Sheets, schwebende Leiste |
| `--r-pill` | 999 | Buttons, Status-Pille, Tags |

Buttons sind **Pillen** (freundlicher, „Event-Ticket“-Gefühl). Keine anderen Radien
(heute: 12/14/16/18/20/22/24/26/30 gemischt). Designs dürfen die drei Stufen gemeinsam skalieren
(Tannenwald kantiger, Clean schlichter).

## 5. Tiefe & Schatten

| Stufe | Wert | Einsatz |
|---|---|---|
| `e0` | keiner, 1 px `--line` | normale Karten |
| `e1` | `0 2px 8px rgb(0 0 0 / .25)` | gedrückte/aktive Karten |
| `e2` | `0 16px 40px rgb(0 0 0 / .45)` | schwebend: untere Leiste, Status-Pille, Toast |
| `ring` | `0 0 0 3px amber` | **nur** „Jetzt hier“ (Ring statt Leuchten) |

Glas (Backdrop-Blur) nur für schwebende Elemente (untere Leiste, Status-Pille). Normale Karten
sind ruhige, leicht aufgehellte Flächen ohne Blur – ruhiger, schneller, weniger „KI-Glas-Look“.

## 6. Komponenten

- **Hero:** Eyebrow (Datum) → Display-Titel → Spruch → (Nasenmeister-Knopf). Tasse rechts, nie abgeschnitten.
- **Fortschritt:** große Zahl in Gold + „von 7 Stopps bewertet“, Segmentbalken: grün = bewertet, Gold pulsierend = jetzt hier.
- **Standkarte:** Bild (64 × 76, `--r-md`) · Nummer + Status-Tags · Name (`heading-sm`) · Ort · Getränk (`body-sm`) · *eine* Bewertungszeile.
  Erledigt = grüner Haken auf dem Bild, „Jetzt hier“ = goldener Rand. Nie beides als Farbfläche.
- **Untere Leiste:** eine Einheit, `--panel-solid` mit Blur, `e2`, `--r-lg`. Oben „Jetzt hier“ (kompakt), unten Navigation.
- **Sheets:** deckend `--panel-solid`, Titel `title`, primäre Aktion unten (Sticky-Footer bei langen Formularen).
- **Tags:** Pille, `label`-Typo ohne Versalien, Gold = jetzt, Grün = erledigt, Neutral = Info.
- **Podium:** Medaillen deckend (nie halbtransparent über Bildern), Platz 1 in Gold.

## 7. Bewegung

- Dauer: 150 ms (Tippen), 250 ms (Ein-/Ausblenden), 400 ms (Sheets). Ease-out für Rein, ease-in für Raus.
- Höchstens **eine** Dauer-Animation pro Ansicht (der „Jetzt hier“-Puls). Kein Endlos-Schimmer auf Text.
- Hintergrundszene ruhig (≤ 30 fps, pausiert im Hintergrund).
- `prefers-reduced-motion`: alle Dauer-Animationen aus, Übergänge auf Opazität reduzieren.

## 8. Do & Don't

**Do**
- Illustrationen und Fotos die Farbe machen lassen, UI zurückhaltend.
- Eine klare Hauptaktion pro Ansicht.
- Warme, persönliche Sprache („Ob rot, ob weiß – Hauptsache heiß!“).

**Don't**
- Glas-Blur auf jeder Karte, Glow auf vielen Elementen, Verlaufstext.
- Mehr als ein Versal-Label pro Ansicht, Laufweite über `.1em`.
- Halbtransparente Akzentfarbe für kleinen Text.
- Neue Radien, Schriftgrößen oder Farben außerhalb dieser Datei.
