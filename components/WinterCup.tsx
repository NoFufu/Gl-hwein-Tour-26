'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { asset } from '../lib/asset';

/** Pro Design eine eigene Tasse, komplett aus Three.js-Grundformen gebaut (keine 3D-Datei, keine Lizenzfragen).
 *  Glasierte Keramik (PBR mit Klarlack) in einer Studio-Lichtumgebung, weicher Schattenwurf auf einer unsichtbaren Fläche.
 *  classic: die "26 Bielefeld"-Tasse · tanne: Tannentasse mit Schneehaube · eisbaer: Eisbär mit Ohren und Gesicht
 *  zucker: Zuckerstangen-Tasse mit Streifenhenkel · schneemann: Schneemann mit Möhrennase und Schal
 *  weihnachtsmann: Mütze auf dem Rand, Gesicht, Rauschebart, Mantel mit Gürtel und Stiefel · pinguin: Pinguin mit Bauchfleck, Schnabel, Flügeln und Füßen */
export type CupVariant = 'classic' | 'tanne' | 'eisbaer' | 'zucker' | 'schneemann' | 'weihnachtsmann' | 'pinguin' | 'norweger';

function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const stripes = (a: string, b: string, n: number) => canvasTexture(256, 256, c => {
  c.fillStyle = a; c.fillRect(0, 0, 256, 256); c.fillStyle = b;
  const w = 256 / n;
  for (let i = -n; i < n * 2; i++) { c.beginPath(); c.moveTo(i * w, 0); c.lineTo(i * w + w / 2, 0); c.lineTo(i * w + w / 2 + 256, 256); c.lineTo(i * w + 256, 256); c.fill(); }
});
/** Punkt auf der Tassenwand: Winkel a (0 = vorne), Höhe y, kleiner Abstand nach außen. */
const onWall = (a: number, y: number, r = .8) => new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);
/** Tassen, die in Blender (Cycles) als Drehung vorgerendert sind: Anzahl Bilder pro Umdrehung unter /tassen3d/<variante>/NN.webp.
 *  Three.js zeichnet für sie nur noch den Dampf; Kamera und Maßstab entsprechen der Blender-Szene. */
const PRERENDERED: Partial<Record<CupVariant, number>> = { classic: 36 };
/** etwas kleiner zeigen, damit Zimtstange und Henkel nicht in den Titel ragen (Bild und Dampf-Kamera gleich skaliert) */
const PHOTO_SCALE = .88;
const frameSrc = (variant: CupVariant, i: number) => asset(`/tassen3d/${variant}/${String(i).padStart(2, '0')}.webp`);

export default function WinterCup({ variant = 'classic', light = false }: { variant?: CupVariant; light?: boolean }) {
  const host = useRef<HTMLDivElement>(null), turn = useRef<(() => void) | null>(null), photo = useRef<HTMLImageElement>(null);
  const [available, setAvailable] = useState(false);
  const frames = PRERENDERED[variant] ?? 0;
  useEffect(() => {
    if (!host.current) return;
    let renderer: THREE.WebGLRenderer; let raf = 0, disposed = false;
    const scene = new THREE.Scene(), target = host.current, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); } catch { return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    target.appendChild(renderer.domElement); setAvailable(true);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), .04).texture;
    scene.environment = envTex;
    const camera = new THREE.PerspectiveCamera(32, 230 / 260, .1, 50); camera.position.set(0, 2.3, 7.6); camera.lookAt(0, .15, 0);
    // Vorgerenderte Tasse: gleiche Kamera wie in Blender, damit der Dampf genau aus der Öffnung steigt
    if (frames) { camera.fov = 26; camera.position.set(0, 2.1, 7.6); camera.lookAt(.12, .12, 0); camera.updateProjectionMatrix(); }
    const unitsPerHeight = 2 * camera.position.length() * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // übrige Bilder der Drehung im Hintergrund laden, damit das Antippen sofort flüssig dreht
    const preload = frames ? Array.from({ length: frames - 1 }, (_, i) => { const im = new Image(); im.decoding = 'async'; im.src = frameSrc(variant, i + 1); return im; }) : [];
    // Zeichenfläche immer in der echten Größe des Platzes: so wird die Tasse nie gestaucht oder gestreckt.
    const fit = () => {
      const w = Math.max(1, target.clientWidth), h = Math.max(1, target.clientHeight);
      renderer.setSize(w, h, false); camera.aspect = w / h;
      // Bei schmalem Platz etwas zurückzoomen, damit Henkel und Dampf ins Bild passen.
      camera.zoom = Math.min(1, (w / h) / (230 / 260)) * (frames ? PHOTO_SCALE : 1); camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const sizeObserver = new ResizeObserver(fit);
    sizeObserver.observe(target);
    scene.add(new THREE.HemisphereLight(0xfff4e5, 0x8a6a74, .6));
    const key = new THREE.DirectionalLight(0xfff0dc, 2.6); key.position.set(-2.5, 6, 3.5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6; key.shadow.bias = -.0004; key.shadow.normalBias = .02;
    Object.assign(key.shadow.camera, { left: -2.2, right: 2.2, top: 2.2, bottom: -2.2, near: .5, far: 15 }); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffd6c8, 1.6); rim.position.set(2, 3, -4); scene.add(rim);

    const mug = new THREE.Group(); scene.add(mug); mug.rotation.set(.05, -.32, -.14);
    // Glasierte Keramik: glatte Oberfläche mit Klarlack, Spiegelungen kommen aus der Lichtumgebung.
    const toon = (color: number, map?: THREE.Texture, rough = .32) => new THREE.MeshPhysicalMaterial({ color, map, roughness: rough, metalness: 0, clearcoat: .9, clearcoatRoughness: .12, sheen: .2, sheenColor: new THREE.Color(0xffffff) });
    const gold = new THREE.MeshStandardMaterial({ color: 0xe6c491, metalness: 1, roughness: .22 });
    const black = new THREE.MeshPhysicalMaterial({ color: 0x140c0f, roughness: .08, clearcoat: 1, clearcoatRoughness: .04 });
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Grundform: Körper (gedrehtes Profil), Henkel, Getränk
    const body: Record<CupVariant, THREE.Material> = {
      classic: new THREE.MeshPhysicalMaterial({ color: 0x86132f, roughness: .19, metalness: .05, clearcoat: 1, clearcoatRoughness: .12 }),
      tanne: toon(0x1f6a45), eisbaer: toon(0xf2f6fb, undefined, .38), zucker: toon(0xffffff, stripes('#fff6f3', '#d92c46', 5)), schneemann: toon(0xf7f9fc, undefined, .4),
      weihnachtsmann: toon(0xf7f4f1, undefined, .32), norweger: toon(0xb3121f, undefined, .3), pinguin: toon(0x101828, undefined, .28),
    };
    const ceramic = body[variant];
    const outer = new THREE.SplineCurve([[0, -.78], [.5, -.78], [.64, -.75], [.72, -.64], [.76, -.3], [.79, .3], [.805, .66]].map(([x, y]) => new THREE.Vector2(x, y))).getPoints(28);
    const lipArc = Array.from({ length: 9 }, (_, i) => { const a = (i / 8) * Math.PI; return new THREE.Vector2(.77 + Math.cos(a) * .035, .69 + Math.sin(a) * .06); });
    const inner = new THREE.SplineCurve([[.735, .69], [.72, .2], [.69, -.4], [.6, -.6], [0, -.63]].map(([x, y]) => new THREE.Vector2(x, y))).getPoints(20);
    const profile = [...outer, ...lipArc, ...inner];
    mug.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 128), ceramic));
    const handleCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(.72, .48, 0), new THREE.Vector3(1.2, .5, 0), new THREE.Vector3(1.42, .1, 0), new THREE.Vector3(1.25, -.36, 0), new THREE.Vector3(.74, -.42, 0)]);
    const handleMat = variant === 'zucker' ? toon(0xffffff, Object.assign(stripes('#ffffff', '#e2364d', 3), { wrapS: THREE.RepeatWrapping, repeat: new THREE.Vector2(6, 1) }))
      : variant === 'tanne' ? toon(0x8a5a3a) : variant === 'weihnachtsmann' ? toon(0xc0182a, undefined, .3) : ceramic;
    mug.add(new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 80, variant === 'zucker' ? .13 : .115, 24, false), handleMat));
    const drink = variant === 'eisbaer' ? 0x5a3020 : 0x3e0715;
    const liquid = new THREE.Mesh(new THREE.CircleGeometry(.715, 96), new THREE.MeshStandardMaterial({ color: drink, roughness: .22, metalness: 0, envMapIntensity: .25 }));
    liquid.rotation.x = -Math.PI / 2; liquid.position.y = .56; mug.add(liquid);
    let charm: THREE.Object3D | null = null;

    const face = (y: number, blush = 0xff8fa3) => {
      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(.075, 20, 16), black);
        eye.position.copy(onWall(s * .3, y, .79)); eye.scale.z = .5; eye.lookAt(eye.position.clone().multiplyScalar(2)); mug.add(eye);
        const shine = new THREE.Mesh(new THREE.SphereGeometry(.022, 10, 8), white);
        shine.position.copy(onWall(s * .3 - .03, y + .03, .83)); mug.add(shine);
        const cheek = new THREE.Mesh(new THREE.CircleGeometry(.09, 24), new THREE.MeshBasicMaterial({ color: blush, transparent: true, opacity: .55, depthWrite: false }));
        cheek.position.copy(onWall(s * .48, y - .14, .805)); cheek.lookAt(cheek.position.clone().multiplyScalar(2)); mug.add(cheek);
      }
    };
    // Aufdruck auf der Wand (wie das Etikett): Canvas-Motiv auf einem passenden Zylinderstück
    const decal = (draw: (c: CanvasRenderingContext2D) => void, arc = 1.46) => {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(.801, .75, 1.1, 64, 1, true, -arc / 2, arc), new THREE.MeshPhysicalMaterial({ map: canvasTexture(512, 512, draw), transparent: true, roughness: .34, clearcoat: .8, clearcoatRoughness: .14, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      d.position.y = .04; mug.add(d); return d;
    };
    const fluff = (color = 0xfffbf7) => new THREE.MeshPhysicalMaterial({ color, roughness: .95, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: .5 });
    // Weihnachtsmütze schräg hinten auf dem Rand: gebogener Kegel, Fellrand, Bommel
    const santaHat = (fur: THREE.Material) => {
      const hat = new THREE.Group(), red = toon(0xc0182a, undefined, .35);
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(.27, .56, .5, 48), red); lower.position.y = .25; hat.add(lower);
      // obere Hälfte kippt weich nach vorne über
      const fold = new THREE.Group(); fold.position.y = .48; fold.rotation.z = -.95; hat.add(fold);
      const joint = new THREE.Mesh(new THREE.SphereGeometry(.27, 32, 20), red); fold.add(joint);
      const upper = new THREE.Mesh(new THREE.ConeGeometry(.27, .62, 40), red); upper.position.y = .3; fold.add(upper);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(.13, 20, 16), fur); tip.position.y = .62; fold.add(tip);
      const band = new THREE.Mesh(new THREE.TorusGeometry(.56, .12, 20, 64), fur); band.rotation.x = Math.PI / 2; hat.add(band);
      hat.position.set(-.1, .8, -.42); hat.rotation.set(-.28, .5, .18); hat.scale.setScalar(.95); mug.add(hat);
      return tip;
    };
    const boots = (mat: THREE.Material) => {
      for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.SphereGeometry(.17, 20, 14), mat); f.position.copy(onWall(s * .3, -.8, .7)); f.scale.set(1, .42, 1.25); mug.add(f); }
    };
    const smile = (y: number) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(.07, .016, 8, 20, Math.PI), black);
      m.position.copy(onWall(0, y, .805)); m.rotation.z = Math.PI; mug.add(m);
    };

    if (variant === 'classic') {
      const lip = new THREE.Mesh(new THREE.TorusGeometry(.768, .017, 12, 80), gold); lip.rotation.x = Math.PI / 2; lip.position.y = .768; mug.add(lip);
      const label = canvasTexture(512, 512, c => {
        c.fillStyle = '#fff5e7'; c.textAlign = 'center'; c.font = '600 32px Arial'; c.fillText('GLÜHWEIN', 256, 160);
        c.font = '700 170px Arial'; c.fillText('26', 256, 327); c.font = '500 27px Arial'; c.fillText('B I E L E F E L D', 256, 385);
        c.lineWidth = 3; c.strokeStyle = '#fff5e7'; c.beginPath(); c.moveTo(133, 420); c.lineTo(379, 420); c.stroke();
      });
      const l = new THREE.Mesh(new THREE.CylinderGeometry(.801, .75, 1.1, 64, 1, true, -.73, 1.46), new THREE.MeshStandardMaterial({ map: label, transparent: true, roughness: .3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      l.position.y = .04; mug.add(l);
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 === 0 ? .19 : .085; i ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      shape.closePath();
      charm = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .035, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .015, bevelThickness: .015 }), gold);
      charm.position.set(1.18, -.38, .1); charm.rotation.z = -.2; mug.add(charm);
      const loop = new THREE.Mesh(new THREE.TorusGeometry(.08, .015, 8, 28), gold); loop.position.set(1.18, -.17, .08); mug.add(loop);
      const orange = new THREE.Mesh(new THREE.CircleGeometry(.19, 32), new THREE.MeshStandardMaterial({ color: 0xec9c45, roughness: .55 }));
      orange.rotation.x = -Math.PI / 2; orange.position.set(.3, .565, -.23); mug.add(orange);
      const cinnamon = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .6, 12), new THREE.MeshStandardMaterial({ color: 0x95593b, roughness: .8 }));
      cinnamon.rotation.set(Math.PI / 2, 0, .35); cinnamon.position.set(-.16, .6, -.29); mug.add(cinnamon);
    }
    if (variant === 'tanne') {
      // Schneehaube mit Tropfen
      const snow = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .9, sheen: 1, sheenColor: new THREE.Color(0xdfeaff) });
      const cap = new THREE.Mesh(new THREE.TorusGeometry(.77, .075, 20, 120), snow); cap.rotation.x = Math.PI / 2; cap.position.y = .76; mug.add(cap);
      for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + .2, d = new THREE.Mesh(new THREE.SphereGeometry(.05 + (i % 3) * .015, 12, 10), snow); d.position.copy(onWall(a, .66 - (i % 3) * .05, .79)); d.scale.y = 1.6; mug.add(d); }
      // kleine Tanne vorne mit Stern
      const tree = new THREE.Group(), green = toon(0x9fe0a8);
      [[.24, .26, -.25], [.19, .22, -.05], [.13, .18, .12]].forEach(([r, h, y]) => { const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), green); c.position.y = y; tree.add(c); });
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(.06), gold); star.position.y = .27; tree.add(star);
      tree.position.copy(onWall(0, -.05, .82)); tree.scale.set(1, 1, .35); tree.lookAt(tree.position.clone().setY(-.05).multiplyScalar(2)); mug.add(tree);
      charm = star;
    }
    if (variant === 'eisbaer') {
      const ear = (s: number) => {
        const e = new THREE.Mesh(new THREE.SphereGeometry(.24, 20, 16), ceramic); e.position.set(s * .52, .98, .2); e.scale.z = .6; mug.add(e);
        const inner = new THREE.Mesh(new THREE.SphereGeometry(.11, 16, 12), toon(0xffb3c4)); inner.position.set(s * .52, .98, .33); inner.scale.z = .4; mug.add(inner);
        return e;
      };
      ear(-1); charm = ear(1);
      face(.18, 0xffa3b8);
      const snout = new THREE.Mesh(new THREE.SphereGeometry(.17, 24, 16), toon(0xffffff)); snout.position.copy(onWall(0, -.05, .8)); snout.scale.set(1.2, .85, .5); mug.add(snout);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(.06, 16, 12), black); nose.position.copy(onWall(0, .01, .89)); nose.scale.set(1.3, .9, .8); mug.add(nose);
      const marsh = new THREE.MeshPhysicalMaterial({ color: 0xfff6ee, roughness: .85, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: .6 });
      [[.25, -.2, .4], [-.2, .15, 1.2], [.05, .32, 2.1], [-.3, -.25, .9]].forEach(([x, z, r]) => { const m = new THREE.Mesh(new RoundedBoxGeometry(.17, .14, .17, 3, .045), marsh); m.position.set(x, .6, z); m.rotation.set(.25, r, .2); mug.add(m); });
    }
    if (variant === 'zucker') {
      face(.12);
      smile(-.06);
      const bow = new THREE.Group(), red = toon(0xe2364d);
      for (const s of [-1, 1]) { const loop = new THREE.Mesh(new THREE.TorusGeometry(.1, .04, 10, 24), red); loop.position.x = s * .11; loop.scale.y = .7; bow.add(loop); }
      bow.add(new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 10), red));
      bow.position.copy(onWall(-.55, .62, .82)); bow.lookAt(bow.position.clone().setY(.62).multiplyScalar(2)); mug.add(bow);
      charm = bow;
    }
    if (variant === 'schneemann') {
      for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.065, 16, 12), black); e.position.copy(onWall(s * .26, .28, .79)); e.scale.z = .5; mug.add(e); }
      const carrot = new THREE.Mesh(new THREE.ConeGeometry(.07, .4, 16), toon(0xff8a2a)); carrot.position.copy(onWall(0, .1, .97)); carrot.rotation.x = Math.PI / 2; mug.add(carrot);
      for (let i = 0; i < 5; i++) { const a = (i - 2) * .12, d = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), black); d.position.copy(onWall(a, -.12 - Math.cos(a * 4) * .04 + .04, .79)); mug.add(d); }
      const scarfMat = toon(0xd8344a, Object.assign(stripes('#d8344a', '#f2e6d8', 6), { wrapS: THREE.RepeatWrapping, repeat: new THREE.Vector2(8, 1) }));
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(.8, .075, 12, 80), scarfMat); scarf.rotation.x = Math.PI / 2; scarf.position.y = -.42; mug.add(scarf);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(.2, .45, .06), scarfMat); tail.position.copy(onWall(.5, -.6, .84)); tail.rotation.set(.1, .5, .25); mug.add(tail);
      charm = tail;
    }

    if (variant === 'weihnachtsmann') {
      // Weiß glasierte Tasse, unten der rote Mantel mit Gürtel, oben Gesicht und großer Bart, dazu die Mütze schräg auf dem Rand
      const fur = fluff();
      decal(c => {
        c.fillStyle = '#c0182a'; c.fillRect(0, 330, 512, 182);
        c.fillStyle = '#f6c9a8'; c.beginPath(); c.ellipse(256, 108, 62, 96, 0, 0, Math.PI * 2); c.fill();
      }, Math.PI * 2 - .35);
      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(.06, 18, 14), black); eye.position.copy(onWall(s * .22, .44, .8)); eye.scale.z = .5; eye.lookAt(eye.position.clone().multiplyScalar(2)); mug.add(eye);
        const shine = new THREE.Mesh(new THREE.SphereGeometry(.018, 10, 8), white); shine.position.copy(onWall(s * .22 - .025, .465, .835)); mug.add(shine);
        const cheek = new THREE.Mesh(new THREE.CircleGeometry(.075, 24), new THREE.MeshBasicMaterial({ color: 0xff7f8f, transparent: true, opacity: .6, depthWrite: false }));
        cheek.position.copy(onWall(s * .4, .3, .806)); cheek.lookAt(cheek.position.clone().multiplyScalar(2)); mug.add(cheek);
        const brow = new THREE.Mesh(new THREE.CapsuleGeometry(.032, .11, 4, 10), fur); brow.position.copy(onWall(s * .23, .55, .815)); brow.rotation.set(0, s * -.22, Math.PI / 2 + s * .25); mug.add(brow);
      }
      const nose = new THREE.Mesh(new THREE.SphereGeometry(.085, 20, 16), toon(0xf08a7a)); nose.position.copy(onWall(0, .32, .85)); nose.scale.z = .7; mug.add(nose);
      // Bart: eine große weiche Form vorne, unten spitz, mit wenigen Locken am Rand
      const beard = new THREE.Mesh(new THREE.SphereGeometry(.5, 40, 28, 0, Math.PI * 2, 0, Math.PI), fur);
      beard.geometry.translate(0, -.12, 0); beard.position.copy(onWall(0, .02, .62)); beard.scale.set(1.12, .78, .42); mug.add(beard);
      for (const [a, y, r] of [[-.52, .14, .12], [.52, .14, .12], [-.42, -.12, .13], [.42, -.12, .13], [-.2, -.32, .13], [.2, -.32, .13], [0, -.4, .13]]) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), fur); b.position.copy(onWall(a, y, .82)); b.lookAt(b.position.clone().setY(y).multiplyScalar(2)); b.scale.z = .6; mug.add(b);
      }
      for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(.075, .19, 6, 14), fur); m.position.copy(onWall(s * .13, .21, .9)); m.rotation.set(0, s * -.12, Math.PI / 2 + s * .35); mug.add(m); }
      // Gürtel mit goldener Schnalle, schwarze Stiefel
      const belt = new THREE.Mesh(new THREE.TorusGeometry(.765, .05, 10, 100), black); belt.rotation.x = Math.PI / 2; belt.position.y = -.5; belt.scale.z = 1.6; mug.add(belt);
      const buckle = new THREE.Mesh(new RoundedBoxGeometry(.24, .17, .05, 2, .02), gold); buckle.position.copy(onWall(0, -.5, .8)); buckle.lookAt(buckle.position.clone().setY(-.5).multiplyScalar(2)); mug.add(buckle);
      boots(black);
      charm = santaHat(fur);
    }
    if (variant === 'pinguin') {
      // weißer Bauch- und Gesichtsfleck als Aufdruck
      decal(c => {
        c.fillStyle = '#fbfaf7';
        c.beginPath(); c.ellipse(196, 150, 92, 84, 0, 0, Math.PI * 2); c.ellipse(316, 150, 92, 84, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(256, 330, 170, 200, 0, 0, Math.PI * 2); c.fill();
      }, 1.75);
      face(.3, 0xff9fb2);
      const orange = toon(0xff7a00, undefined, .4);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(.08, .2, 18), orange); beak.position.copy(onWall(0, .17, .86)); beak.rotation.x = Math.PI / 2; beak.scale.set(1.3, 1, .8); mug.add(beak);
      // kleine Flügel an den Seiten, Füße vorne am Boden
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.SphereGeometry(.26, 22, 16), ceramic); wing.position.copy(onWall(s * 1.3, -.05, .8)); wing.scale.set(.3, 1.05, .6); wing.rotation.z = s * -.25; wing.lookAt(wing.position.clone().setY(-.12).multiplyScalar(2)); wing.rotateZ(s * .3); mug.add(wing);
        const foot = new THREE.Mesh(new THREE.SphereGeometry(.16, 20, 14), orange); foot.position.copy(onWall(s * .27, -.82, .72)); foot.scale.set(1, .34, 1.2); mug.add(foot);
      }
      charm = santaHat(fluff());
    }

    if (variant === 'norweger') {
      // Norweger-Muster: Bordüren, Zackenreihen und Schneeflocken als Glasur rundherum
      const knit = canvasTexture(1024, 256, c => {
        c.fillStyle = '#b3121f'; c.fillRect(0, 0, 1024, 256); c.fillStyle = '#fff6ee';
        const px = 8;
        for (let x = 0; x < 1024; x += px) { // Zickzack oben und unten
          const z = Math.abs(((x / px) % 8) - 4);
          c.fillRect(x, 26 + z * px / 2, px, px); c.fillRect(x, 214 - z * px / 2, px, px);
        }
        c.fillRect(0, 10, 1024, 6); c.fillRect(0, 240, 1024, 6);
        for (let i = 0; i < 8; i++) { // Schneeflocken
          const cx = 64 + i * 128, cy = 128;
          for (let k = -4; k <= 4; k++) { c.fillRect(cx + k * px - px / 2, cy - px / 2, px, px); c.fillRect(cx - px / 2, cy + k * px - px / 2, px, px); if (Math.abs(k) < 4 && k) { c.fillRect(cx + k * px - px / 2, cy + k * px - px / 2, px, px); c.fillRect(cx + k * px - px / 2, cy - k * px - px / 2, px, px); } }
        }
        for (let i = 0; i < 8; i++) { c.fillRect(128 + i * 128 - px / 2, 124, px, px); c.fillRect(128 + i * 128 - px * 1.5, 88, px, px); c.fillRect(128 + i * 128 + px / 2, 160, px, px); }
      });
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(.801, .75, 1.1, 96, 1, true), new THREE.MeshPhysicalMaterial({ map: knit, roughness: .3, clearcoat: .9, clearcoatRoughness: .12, polygonOffset: true, polygonOffsetFactor: -2 }));
      wall.position.y = .04; mug.add(wall);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(.77, .03, 12, 80), toon(0xfff6ee)); lip.rotation.x = Math.PI / 2; lip.position.y = .755; mug.add(lip);
    }

    // Dampf und Schatten
    // Dampf: zwei weiche Rauchfahnen aus Rauschen (Shader auf Flächen zur Kamera), steigen auf, wabern und lösen sich oben auf
    const steamMat = (seed: number, strength: number) => new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 3 }, uSeed: { value: seed }, uColor: { value: new THREE.Color(light ? 0xa9a1a3 : 0xfff8f2) }, uOpacity: { value: (light ? .36 : .55) * strength } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform float uTime, uSeed, uOpacity; uniform vec3 uColor; varying vec2 vUv;
        float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
        float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
        void main(){
          float y=vUv.y, t=uTime+uSeed*7.;
          // Fahne schwingt seitlich, nach oben stärker und breiter
          float sway=(fbm(vec2(y*1.6-t*.35,uSeed))-.5)*.55*y+sin(y*4.-t*.9+uSeed*3.)*.05*y;
          float x=vUv.x-.5-sway, w=.09+.26*y;
          float column=exp(-x*x/(w*w));
          vec2 p=vec2(vUv.x*2.6+uSeed, y*2.2-t*.5);
          float d=fbm(p+vec2(fbm(p*1.4+t*.12),0.)*1.2);
          float a=column*smoothstep(.0,.14,y)*smoothstep(.92,.3,y)*smoothstep(.28,.75,d);
          gl_FragColor=vec4(uColor,a*uOpacity);
        }`,
    });
    const steam = [new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.55), steamMat(.3, 1)), new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.4), steamMat(1.7, .8))];
    steam[0].position.set(-.04, 1.4, -.05); steam[1].position.set(.18, 1.33, .05);
    steam.forEach(s => { s.lookAt(camera.position.clone().setY(s.position.y)); s.userData.y = s.position.y; s.renderOrder = 2; scene.add(s); });
    mug.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    if (frames) { mug.visible = false; steam[0].position.set(.02, 1.42, -.05); steam[1].position.set(.22, 1.35, .05); steam.forEach(s => { s.lookAt(camera.position.clone().setY(s.position.y)); s.userData.y = s.position.y; }); }
    // Weicher Kontaktschatten (unscharfer Fleck) plus echter Schattenwurf des Lichts auf einer unsichtbaren Fläche
    const contactTex = canvasTexture(128, 128, c => { const g = c.createRadialGradient(64, 64, 2, 64, 64, 62); g.addColorStop(0, 'rgba(20,8,14,.42)'); g.addColorStop(.5, 'rgba(20,8,14,.14)'); g.addColorStop(1, 'rgba(20,8,14,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false }));
    contact.rotation.x = -Math.PI / 2; contact.position.set(.12, -.9, 0); if (!frames) scene.add(contact);
    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: .28 }));
    catcher.rotation.x = -Math.PI / 2; catcher.position.y = -.91; catcher.receiveShadow = true; if (!frames) scene.add(catcher);
    let shown = 0;
    const showPhoto = () => {
      const img = photo.current; if (!img) return;
      // Drehung = Bildnummer, Schweben und Hüpfen = Verschiebung in Pixeln
      const i = ((Math.round(spin / (Math.PI * 2) * frames) % frames) + frames) % frames;
      if (i !== shown) { shown = i; img.src = frameSrc(variant, i); }
      img.style.transform = `translateY(${(-mug.position.y / unitsPerHeight) * target.clientHeight * PHOTO_SCALE}px) scale(${PHOTO_SCALE})`;
    };

    let spin = 0, last = 0, hop = 0;
    turn.current = () => { spin += Math.PI * 2; hop = 1; if (reduced) { if (frames) { spin = 0; return; } mug.rotation.y += .4; renderer.render(scene, camera); } else if (!raf) raf = requestAnimationFrame(frame); };
    const charmBase = charm?.rotation.z ?? 0;
    function frame(time = 0) {
      raf = 0; if (disposed) return;
      const dt = Math.min(.05, (time - last) / 1000); last = time; const t = time / 1000;
      if (!reduced) {
        mug.rotation.y = -.32 + Math.sin(t * .35) * .12 + spin; spin *= Math.exp(-dt * 2.8);
        hop *= Math.exp(-dt * 3); mug.position.y = Math.sin(t * .75) * .025 + Math.abs(Math.sin(t * 9)) * hop * .25;
        steam.forEach(s => { (s.material as THREE.ShaderMaterial).uniforms.uTime.value = t; s.position.y = s.userData.y + mug.position.y; });
        if (charm) charm.rotation.z = charmBase + Math.sin(t * .8) * .08;
        if (frames) showPhoto();
      }
      renderer.render(scene, camera);
      if (!reduced && !document.hidden) raf = requestAnimationFrame(frame);
    }
    let visible = true;
    const observer = new IntersectionObserver(e => { visible = e[0].isIntersecting; if (visible && !document.hidden && !raf) frame(performance.now()); else if (!visible) { cancelAnimationFrame(raf); raf = 0; } }, { threshold: .05 });
    observer.observe(target);
    const visibility = () => { cancelAnimationFrame(raf); raf = 0; if (!document.hidden && visible) frame(performance.now()); };
    document.addEventListener('visibilitychange', visibility); frame();
    return () => {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect(); sizeObserver.disconnect(); document.removeEventListener('visibilitychange', visibility); turn.current = null;
      scene.traverse(obj => { const m = obj as THREE.Mesh; m.geometry?.dispose(); if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(mat => { (mat as THREE.MeshStandardMaterial).map?.dispose(); mat.dispose(); }); });
      envTex.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove(); preload.length = 0;
    };
  }, [variant, light, frames]);
  return <button type="button" className="winter-cup" aria-label="3D-Glühweintasse antippen" onClick={() => turn.current?.()}>
    {frames > 0 && <img ref={photo} src={frameSrc(variant, 0)} alt="" className="cup-photo" style={{ transform: `scale(${PHOTO_SCALE})` }} draggable={false} />}
    <div ref={host} />{!available && !frames && <img src={asset('/illustrations/tasse.svg')} alt="Glühweintasse" className="cup-fallback" />}</button>;
}
