'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Theme } from '../lib/themes';

// Hintergrund je Design: ein Vollbild-Shader (Nebel, Tannenwald, Polarlicht, Zuckerstange, Schneekugel)
// plus Partikel (Bokeh, Schnee, Sterne, Glitzer). Reagiert sanft auf Finger und Maus.
// Niedrige Auflösung, ~30 fps, pausiert im Hintergrund, bei reduzierter Bewegung nur ein Standbild.
const BG_MODES = { fog: 0, forest: 1, aurora: 2, candy: 3, globe: 4, clean: 5 } as const;
const PT_MODES = { bokeh: 0, snow: 1, stars: 2, sparkle: 3 } as const;
export type SceneBg = keyof typeof BG_MODES;
export type SceneParticles = keyof typeof PT_MODES;

const bgFrag = `
uniform float uTime, uMode, uGlowStrength; uniform vec2 uRes, uMouse; uniform vec3 uNight, uPlum, uGlow, uGlow2; varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.02;a*=.5;}return v;}
float stars(vec2 uv, float asp, float dens){vec2 q=uv*vec2(asp,1.)*dens,g=floor(q);vec2 f=fract(q)-.5-(vec2(h(g+1.3),h(g+2.7))-.5)*.6;float s=step(.975,h(g))*smoothstep(.16,.02,length(f));return s*(.45+.55*sin(uTime*1.7+h(g+7.)*60.));}
void main(){
  vec2 uv=vUv; float asp=uRes.x/uRes.y; vec2 m=uMouse-.5; float t=uTime; vec3 col;
  if(uMode<.5){ // Marktnacht: warmer Nebel
    vec2 p=uv*vec2(asp,1.)*2.2+m*.15;
    float f=fbm(p+vec2(t*.03,-t*.018)+fbm(p*1.7-t*.03));
    col=mix(uNight,uPlum,smoothstep(.25,.9,f)*.85);
    float glow=smoothstep(.9,0.,length(uv-vec2(.8,.9)-m*.08))*.16+smoothstep(1.,0.,length(uv-vec2(.1,.12)))*.06;
    col+=uGlow*glow*uGlowStrength*(.55+.45*f);
  } else if(uMode<1.5){ // Tannenwald: Mond, Sterne, drei Reihen Tannen mit Parallaxe
    col=mix(uPlum,uNight,smoothstep(.05,.85,uv.y));
    vec2 mc=vec2(.86,.9)+m*.015; float d=length((uv-mc)*vec2(asp,1.));
    col+=uGlow*(smoothstep(.04,.032,d)*.8+smoothstep(.45,0.,d)*.12)*uGlowStrength;
    col+=vec3(stars(uv,asp,60.))*.7*smoothstep(.35,.8,uv.y);
    for(int i=0;i<3;i++){
      float fi=float(i), k=3.+fi*2.2;
      float x=(uv.x+m.x*(.012+fi*.03))*asp*k+fi*7.31;
      float id=floor(x), fx=fract(x)-.5;
      float hgt=(.13+.09*h(vec2(id,fi)))*(1.-fi*.12), base=.2-fi*.075;
      float jag=abs(fract(uv.y*(26.+fi*6.))-.5)*.05;
      float tree=step(uv.y,base+hgt*(1.-abs(fx)*2.3)-jag*hgt*4.)*step(abs(fx),.46);
      float ground=step(uv.y,base-.015+.012*sin(uv.x*9.+fi));
      vec3 layer=mix(uPlum*.55,uNight*.55,fi/2.);
      col=mix(col,layer,max(tree,ground));
      col=mix(col,uPlum,.1*(1.-fi/2.)*smoothstep(base+.15,base,uv.y));
    }
  } else if(uMode<2.5){ // Mitternacht: Polarlicht über Sternenhimmel
    col=mix(uPlum*.5,uNight,smoothstep(0.,.75,uv.y));
    col+=vec3(stars(uv,asp,70.))*.8;
    float x=uv.x*asp+m.x*.2;
    for(int i=0;i<3;i++){
      float fi=float(i);
      float y0=.5+fi*.07+.07*sin(x*1.3+t*.12+fi*2.1)+.06*fbm(vec2(x*.9+t*.04,fi*3.));
      float curtain=uv.y>y0?exp(-(uv.y-y0)*(5.+fi*2.)):exp(-pow((y0-uv.y)*22.,2.));
      float rays=.45+.55*n(vec2(x*16.+fi*11.,t*.35));
      col+=mix(uGlow,uGlow2,fi/2.)*curtain*rays*(.42-fi*.08)*uGlowStrength;
    }
  } else if(uMode<3.5){ // Zuckerstange: langsam drehender Lolli-Wirbel
    vec2 p=(uv-vec2(1.05,1.15)-m*.06)*vec2(asp,1.);
    float r=length(p), a=atan(p.y,p.x);
    float w=a/6.2831*4.+r*2.2-t*.07+.06*sin(r*5.-t*.6);
    float s=smoothstep(.35,.65,.5+.5*sin(w*6.2831));
    col=mix(uNight,uPlum,s*.75);
    col+=uGlow*.07*pow(max(0.,sin(w*6.2831+.9)),12.)*uGlowStrength;
    col*=.85+.15*smoothstep(1.6,.2,length(uv-.5));
  } else if(uMode>4.5){ // Clean: ruhiger, kaum sichtbarer Verlauf ohne Bewegung
    col=mix(uPlum,uNight,smoothstep(0.,.7,uv.y));
  } else { // Schneekugel: hell, weiche Wolken
    col=mix(uPlum,uNight,smoothstep(0.,1.,uv.y));
    float c=fbm(uv*vec2(asp,1.)*1.6+vec2(t*.015,0.)+m*.1);
    col=mix(col,vec3(1.),smoothstep(.45,.85,c)*.35);
    col+=uGlow*smoothstep(.8,0.,length(uv-vec2(.15,.95)))*.1*uGlowStrength;
  }
  gl_FragColor=vec4(col,1.);
}`;
const ptVert = `
uniform float uTime, uScale, uMode, uDensity; uniform vec2 uMouse; attribute float aSize, aSeed, aRand; varying float vSeed;
void main(){ vSeed=aSeed; vec3 p=position;
  if(uMode<.5){ p.y+=sin(uTime*.25+aSeed*6.28)*.06; p.x+=cos(uTime*.18+aSeed*12.)*.04; }
  else if(uMode<1.5){ p.y=mod(p.y-uTime*(.12+aSeed*.22)+2.,4.)-2.; p.x+=sin(uTime*.6+aSeed*20.)*.12; }
  else if(uMode<2.5){ }
  else { p.y=mod(p.y+uTime*(.03+aSeed*.05)+2.,4.)-2.; }
  p.xy+=(uMouse-.5)*vec2(.25,.15)*(1.+p.z*.3);
  vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
  float s=uMode<.5?aSize:uMode<1.5?aSize*.22:uMode<2.5?aSize*.09:aSize*.35;
  gl_PointSize=aRand<uDensity?s*uScale/(-mv.z):0.; }`;
const ptFrag = `
uniform float uTime, uMode, uAlpha; uniform vec3 uWarm1, uWarm2; varying float vSeed;
void main(){ vec2 c=gl_PointCoord-.5; float d=length(c); if(d>.5)discard;
  vec3 col=mix(uWarm1,uWarm2,step(.7,vSeed)); float a;
  if(uMode<.5){ a=smoothstep(.5,.32,d)*(.35+.25*sin(uTime*.9+vSeed*20.))*.32; }
  else if(uMode<1.5){ a=smoothstep(.5,.15,d)*(.55+.3*vSeed); }
  else if(uMode<2.5){ a=(smoothstep(.5,.0,d)*.6+smoothstep(.12,.0,d))*(.35+.65*abs(sin(uTime*1.3+vSeed*40.))); }
  else { float cr=max(smoothstep(.07,0.,abs(c.x))*smoothstep(.5,0.,abs(c.y)),smoothstep(.07,0.,abs(c.y))*smoothstep(.5,0.,abs(c.x)));
    a=(cr+smoothstep(.18,0.,d))*pow(abs(sin(uTime*1.1+vSeed*30.)),3.); }
  gl_FragColor=vec4(col,a*uAlpha); }`;

type Palette = Theme['scene'];
export default function BackgroundScene({ palette }: { palette: Palette }) {
  const ref = useRef<HTMLDivElement>(null);
  const apply = useRef<(p: Palette) => void>(() => {});
  const current = useRef(palette);
  current.current = palette;
  useEffect(() => { apply.current(palette); }, [palette]);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' }); } catch { return; }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1) * 0.6);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 20);
    camera.position.z = 3;
    const v3 = () => ({ value: new THREE.Vector3() });
    const mouse = { value: new THREE.Vector2(.5, .5) }, target = new THREE.Vector2(.5, .5);
    const bgMat = new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}', fragmentShader: bgFrag, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uMode: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uMouse: mouse, uNight: v3(), uPlum: v3(), uGlow: v3(), uGlow2: v3(), uGlowStrength: { value: 1 } },
    });
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
    bg.frustumCulled = false; bg.renderOrder = -1;
    scene.add(bg);

    const N = 170, pos = new Float32Array(N * 3), size = new Float32Array(N), seed = new Float32Array(N), rand = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 5; pos[i * 3 + 1] = (Math.random() - 0.5) * 4; pos[i * 3 + 2] = -Math.random() * 3;
      size[i] = 10 + Math.random() * 34; seed[i] = Math.random(); rand[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
    const ptMat = new THREE.ShaderMaterial({
      vertexShader: ptVert, fragmentShader: ptFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uMode: { value: 0 }, uDensity: { value: 1 }, uAlpha: { value: 1 }, uMouse: mouse, uWarm1: v3(), uWarm2: v3() },
    });
    scene.add(new THREE.Points(geo, ptMat));

    apply.current = p => {
      const u = bgMat.uniforms;
      u.uMode.value = BG_MODES[p.bg]; u.uNight.value.set(...p.night); u.uPlum.value.set(...p.plum);
      u.uGlow.value.set(...p.glow); u.uGlow2.value.set(...p.glow2); u.uGlowStrength.value = p.glowStrength;
      const q = ptMat.uniforms;
      // Auf großen Bildschirmen weniger und dezentere Lichter, damit der Inhalt vorne bleibt.
      const wide = innerWidth > 900;
      q.uMode.value = PT_MODES[p.particles]; q.uDensity.value = p.density * (wide ? .5 : 1); q.uAlpha.value = p.particleAlpha * (wide ? .6 : 1);
      q.uWarm1.value.set(...p.warm1); q.uWarm2.value.set(...p.warm2);
      const blending = p.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
      if (ptMat.blending !== blending) { ptMat.blending = blending; ptMat.needsUpdate = true; }
      if (reduced) renderer.render(scene, camera);
    };
    apply.current(current.current);
    const resize = () => {
      const w = innerWidth, h = innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      bgMat.uniforms.uRes.value.set(w, h);
      ptMat.uniforms.uScale.value = h * renderer.getPixelRatio() * 0.01;
      apply.current(current.current);
      if (reduced) renderer.render(scene, camera);
    };
    resize();
    addEventListener('resize', resize);
    const move = (e: PointerEvent) => target.set(e.clientX / innerWidth, 1 - e.clientY / innerHeight);
    addEventListener('pointermove', move, { passive: true });

    let raf = 0, last = 0;
    const start = performance.now();
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (t - last < 33) return;
      last = t;
      const s = (t - start) / 1000;
      mouse.value.lerp(target, 0.05);
      bgMat.uniforms.uTime.value = s; ptMat.uniforms.uTime.value = s;
      renderer.render(scene, camera);
    };
    const draw = () => { if (reduced) { renderer.render(scene, camera); return; } if (!raf && !document.hidden) raf = requestAnimationFrame(frame); };
    const vis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else draw(); };
    document.addEventListener('visibilitychange', vis);
    draw();
    return () => {
      cancelAnimationFrame(raf); removeEventListener('resize', resize); removeEventListener('pointermove', move); document.removeEventListener('visibilitychange', vis);
      geo.dispose(); ptMat.dispose(); bgMat.dispose(); bg.geometry.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  return <div ref={ref} className="scene" aria-hidden="true" />;
}
