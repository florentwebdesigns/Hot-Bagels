/* ==========================================================
   SPRINGFIELD HOT BAGELS — the live 3D opening (three.js)
   Everything here is drawn in the browser: the bagels, seeds,
   board, knives, cream cheese, steam and light.
   ========================================================== */
/* ---------- Everything you might want to tune lives here ---------- */
window.INTRO_CONFIG = {
  // the oven film plays by itself, this many seconds long
  filmSeconds: 5,
  // scroll length of the flavor chapters and the slicing finale, in screen heights (vh)
  scroll: {
    desktop: { chapters: 165, finale: 95 },
    phone: { chapters: 120, finale: 75 },
  },
  // where each beat of "The Oven Door Opens" happens, as a share of the film (0–1)
  beats: { darkness: 0.08, heatEnd: 0.25, doorEnd: 0.47, peelStart: 0.5, peelEnd: 0.78, heroLines: [0.84, 0.88, 0.92], heroButtons: 0.95 },
  glow: { deep: '#4a0a02', amber: '#ff8a2a' },
  bloomStrength: 0.6,
  bloomThreshold: 0.92,
  particles: { desktop: 400, phone: 150 },
  seedsScale: { desktop: 1, phone: 0.42 },
  maxPixelRatio: { desktop: 2, phone: 1.5 },
  frameBudgetMs: 22,
};

(async () => {
  'use strict';
  if (!window.HB_STAGE || window.HB_STAGE.mode !== 'live') return;
  const CFG = window.INTRO_CONFIG;
  const PHONE = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
  const TIER = PHONE ? 'phone' : 'desktop';
  const yieldNow = () => new Promise((r) => setTimeout(r, 0));
  // The poster frame and all the text show right away; the 3D film is built once the page has loaded and gone quiet.
  await new Promise((res) => {
    let done = false;
    const go = () => { if (done) return; done = true; res(); };
    const whenIdle = () => (window.requestIdleCallback ? requestIdleCallback(go, { timeout: PHONE ? 1200 : 500 }) : setTimeout(go, 600));
    if (document.readyState === 'complete') whenIdle(); else addEventListener('load', whenIdle, { once: true });
    ['pointerdown', 'wheel', 'touchstart', 'keydown', 'scroll'].forEach((ev) => addEventListener(ev, go, { once: true, passive: true }));
  });

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const stageEl = $('[data-stage]');
  const canvas = $('[data-stage-canvas]');
  const darkEl = $('[data-stage-dark]');
  const progEl = $('[data-stage-progress]');
  const wordIn = $('[data-word-in]');
  const tabsEl = $('[data-tabs]');
  const tabs = $$('[data-tab]');
  const capEls = Object.fromEntries($$('.cap[data-cap]').map((c) => [c.dataset.cap, c]));
  const introEl = $('[data-intro]');
  const skipEl = $('[data-skip]');

  const fallback = () => {
    document.documentElement.classList.add('stage-still');
    window.HB_STAGE.mode = 'still';
    window.HB_FALLBACK_STILL && window.HB_FALLBACK_STILL();
  };

  let THREE, RoomEnvironment, RoundedBoxGeometry, RectAreaLightUniformsLib;
  const A = {};
  try {
    const base = 'three/addons/';
    const mods = await Promise.all([
      import('three'),
      import(base + 'environments/RoomEnvironment.js'),
      import(base + 'geometries/RoundedBoxGeometry.js'),
      import(base + 'lights/RectAreaLightUniformsLib.js'),
      import(base + 'postprocessing/EffectComposer.js'),
      import(base + 'postprocessing/RenderPass.js'),
      import(base + 'postprocessing/ShaderPass.js'),
      import(base + 'postprocessing/UnrealBloomPass.js'),
      import(base + 'postprocessing/BokehPass.js'),
      import(base + 'postprocessing/OutputPass.js'),
    ]);
    THREE = mods[0];
    ({ RoomEnvironment } = mods[1]);
    ({ RoundedBoxGeometry } = mods[2]);
    ({ RectAreaLightUniformsLib } = mods[3]);
    Object.assign(A, mods[4], mods[5], mods[6], mods[7], mods[8], mods[9]);
    if (!window.HB_OVEN || !window.HB_POST) throw new Error('intro modules missing');
  } catch (e) { console.warn('3D unavailable', e); fallback(); return; }

  const V3 = THREE.Vector3;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const range = (p, a, b) => clamp((p - a) / (b - a));

  /* ---------------- seeded random + value noise ---------------- */
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const P = new Uint8Array(512);
  { const r = mulberry(1337); const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; }
  const vnoise = (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const X = xi & 255, Y = yi & 255, Z = zi & 255, X1 = (X + 1) & 255, Y1 = (Y + 1) & 255, Z1 = (Z + 1) & 255;
    const a = P[X] , b = P[X1];
    const aa = P[a + Y], ab = P[a + Y1], ba = P[b + Y], bb = P[b + Y1];
    const n000 = P[aa + Z], n001 = P[aa + Z1], n010 = P[ab + Z], n011 = P[ab + Z1];
    const n100 = P[ba + Z], n101 = P[ba + Z1], n110 = P[bb + Z], n111 = P[bb + Z1];
    const x00 = n000 + (n100 - n000) * u, x01 = n001 + (n101 - n001) * u, x10 = n010 + (n110 - n010) * u, x11 = n011 + (n111 - n011) * u;
    const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return (y0 + (y1 - y0) * w) / 255;
  };
  const fbm = (x, y, z, o = 4) => { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f, z * f); n += a; a *= 0.5; f *= 2.03; } return s / n; };

  /* ---------------- renderer, scene, camera ---------------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  } catch (e) { fallback(); return; }
  let DPR = Math.min(window.devicePixelRatio || 1, CFG.maxPixelRatio[TIER]);
  renderer.setPixelRatio(DPR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0907);
  scene.fog = new THREE.Fog(0x0c0907, 11, 24);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);

  /* ---------------- texture helpers ---------------- */
  const pixelTex = (w, h, fill, { srgb = true, flip = false } = {}) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    fill(img.data, w, h, ctx);
    ctx.putImageData(img, 0, 0);
    return { c, ctx };
  };
  const toTex = (c, { srgb = true, flip = false, wrap = true } = {}) => {
    const t = new THREE.CanvasTexture(c);
    t.flipY = flip;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (wrap) { t.wrapS = THREE.RepeatWrapping; }
    t.anisotropy = Math.min(8, maxAniso);
    return t;
  };

  /* ---------------- bagel shape ---------------- */
  const BR = 1.0, Br = 0.56, BSY = 0.8, BASE = 0.3, SOFT = 0.035;
  const makeShape = (seed) => {
    const o = seed * 13.17;
    const rho = (u, v) => {
      const cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
      const bx = (1 + 0.56 * cv) * cu, by = 0.56 * sv, bz = (1 + 0.56 * cv) * su;
      const n1 = fbm(bx * 1.25 + o, by * 1.25 + 4.1, bz * 1.25, 3) - 0.5;
      const n2 = vnoise(bx * 5.2 + o, by * 5.2, bz * 5.2) - 0.5;
      return Br * (1 + 0.13 * n1 + 0.028 * n2) * (1 + 0.05 * sv);
    };
    const Rm = (u) => BR * (1 + 0.028 * Math.cos(2 * u + seed) + 0.016 * Math.sin(3 * u + seed * 2.3));
    const point = (u, v, out) => {
      const p = rho(u, v), R = Rm(u), cv = Math.cos(v), sv = Math.sin(v);
      const rad = R + p * cv;
      let y = p * sv * BSY;
      y = -BASE + SOFT * Math.log1p(Math.exp((y + BASE) / SOFT));
      return out.set(rad * Math.cos(u), y, rad * Math.sin(u));
    };
    const pa = new V3(), pb = new V3(), pc = new V3(), du = new V3(), dv = new V3();
    const normal = (u, v, out) => {
      point(u, v, pa); point(u + 1e-3, v, pb); point(u, v + 1e-3, pc);
      du.subVectors(pb, pa); dv.subVectors(pc, pa);
      return out.crossVectors(dv, du).normalize();
    };
    return { point, normal, rho, Rm };
  };

  const bagelGeo = (shape, v0, v1, su, sv) => {
    const n = (su + 1) * (sv + 1);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    const p = new V3(), nn = new V3();
    let k = 0;
    for (let i = 0; i <= sv; i++) {
      const v = v0 + (v1 - v0) * (i / sv);
      for (let j = 0; j <= su; j++) {
        const u = TAU * (j / su);
        shape.point(u, v, p); shape.normal(u, v, nn);
        pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z;
        nor[k * 3] = nn.x; nor[k * 3 + 1] = nn.y; nor[k * 3 + 2] = nn.z;
        uv[k * 2] = j / su; uv[k * 2 + 1] = (((v / TAU) % 1) + 1) % 1;
        k++;
      }
    }
    const idx = [];
    for (let i = 0; i < sv; i++) for (let j = 0; j < su; j++) {
      const a = i * (su + 1) + j, b = a + 1, c = a + (su + 1), d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  };
  // For the top half, the v=π row maps to uv.y=.5 exactly; keep uv continuous at the seam
  const fixHalfUV = (g) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) { if (uv.getY(i) === 0 && i > uv.count / 2) uv.setY(i, 1); } };

  /* flat ring at the cut (y = 0) matching the bagel outline exactly */
  const ringGeo = (shape, up, t0 = 0, t1 = 1, su = 256, sr = 28, height = null) => {
    const n = (su + 1) * (sr + 1);
    const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let k = 0;
    for (let i = 0; i <= sr; i++) {
      const t = t0 + (t1 - t0) * (i / sr);
      for (let j = 0; j <= su; j++) {
        const u = TAU * (j / su);
        const R = shape.Rm(u);
        const rin = R - shape.rho(u, Math.PI), rout = R + shape.rho(u, 0);
        const r = lerp(rin, rout, t);
        const y = height ? height(u, t) : 0;
        pos[k * 3] = r * Math.cos(u); pos[k * 3 + 1] = up ? y : -y; pos[k * 3 + 2] = r * Math.sin(u);
        uv[k * 2] = j / su; uv[k * 2 + 1] = t;
        k++;
      }
    }
    const idx = [];
    for (let i = 0; i < sr; i++) for (let j = 0; j < su; j++) {
      const a = i * (su + 1) + j, b = a + 1, c = a + (su + 1), d = c + 1;
      if (up) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };

  /* ---------------- crust textures (shared noise fields) ---------------- */
  const TW = PHONE ? 512 : 1536, TH = PHONE ? 256 : 768;
  const FA = new Float32Array(TW * TH), FB = new Float32Array(TW * TH), FC = new Float32Array(TW * TH), FD = new Float32Array(TW * TH);
  for (let y = 0; y < TH; y++) {
    if ((y & 31) === 31) await yieldNow();
    const v = ((y + 0.5) / TH) * TAU, cv = Math.cos(v), sv = Math.sin(v);
    for (let x = 0; x < TW; x++) {
      const u = ((x + 0.5) / TW) * TAU;
      const bx = (1 + 0.56 * cv) * Math.cos(u), by = 0.56 * sv, bz = (1 + 0.56 * cv) * Math.sin(u);
      const i = y * TW + x;
      FA[i] = fbm(bx * 1.9 + 7, by * 1.9, bz * 1.9, 4);
      FB[i] = fbm(bx * 6.5 + 3, by * 6.5, bz * 6.5, 3);
      FC[i] = vnoise(bx * 34, by * 34, bz * 34);
      FD[i] = vnoise(bx * 82 + 5, by * 82, bz * 82);
    }
  }
  const FLAV = {
    sesame: { top: [140, 74, 28], mid: [194, 124, 54], belly: [236, 200, 146], bot: [198, 150, 96], spot: 0.46 },
    everything: { top: [132, 72, 30], mid: [184, 114, 52], belly: [226, 184, 126], bot: [188, 140, 88], spot: 0.5 },
    poppy: { top: [150, 82, 32], mid: [200, 132, 60], belly: [238, 204, 150], bot: [202, 154, 100], spot: 0.4 },
    cinnamon: { top: [120, 66, 36], mid: [158, 100, 60], belly: [204, 156, 108], bot: [170, 120, 80], spot: 0.32, swirl: true },
  };
  const crustTextures = (fl) => {
    const col = pixelTex(TW, TH, (d) => {
      for (let y = 0; y < TH; y++) {
        const v = ((y + 0.5) / TH) * TAU, t = Math.sin(v), out = Math.cos(v);
        for (let x = 0; x < TW; x++) {
          const i = y * TW + x, a = FA[i], b = FB[i], c = FC[i], dd = FD[i];
          let r, g, bl;
          if (t >= 0) { const k = sstep(0.05, 0.9, t); r = lerp(fl.mid[0], fl.top[0], k); g = lerp(fl.mid[1], fl.top[1], k); bl = lerp(fl.mid[2], fl.top[2], k); }
          else { const k = sstep(0, 0.55, -t); r = lerp(fl.mid[0], fl.bot[0], k); g = lerp(fl.mid[1], fl.bot[1], k); bl = lerp(fl.mid[2], fl.bot[2], k); }
          // pale "belly" where the dough opened in the oven
          let band = Math.exp(-Math.pow((t + 0.06) / 0.17, 2)) * sstep(-0.3, 0.7, out);
          band *= clamp(0.35 + 1.4 * (b - 0.35));
          const inner = Math.exp(-Math.pow(t / 0.35, 2)) * sstep(0.1, -0.8, out) * 0.45;
          const bb = clamp(band * 0.9 + inner);
          r = lerp(r, fl.belly[0], bb); g = lerp(g, fl.belly[1], bb); bl = lerp(bl, fl.belly[2], bb);
          // darker toasted patches on top
          const s = sstep(0.47, 0.72, a) * sstep(-0.1, 0.6, t);
          let m = 1 - fl.spot * s * 0.75;
          m *= 0.86 + 0.28 * b;
          m *= 0.94 + 0.12 * c;
          if (dd > 0.8 && t > 0.1) m *= 0.8 + (1 - dd) * 0.6;
          r *= m; g *= m; bl *= m * 0.98;
          if (t < -0.55 && dd > 0.72) { r = lerp(r, 236, 0.35); g = lerp(g, 222, 0.35); bl = lerp(bl, 196, 0.35); }
          if (fl.swirl) {
            const w = Math.sin((a * 9 + x / TW * TAU * 2 + v * 1.3) * 2.6);
            const st = sstep(0.55, 0.95, w) * (0.6 + 0.4 * b);
            r = lerp(r, 92, st * 0.6); g = lerp(g, 44, st * 0.6); bl = lerp(bl, 22, st * 0.6);
          }
          const o = i * 4;
          d[o] = clamp(r, 0, 255); d[o + 1] = clamp(g, 0, 255); d[o + 2] = clamp(bl, 0, 255); d[o + 3] = 255;
        }
      }
    });
    return toTex(col.c);
  };
  await yieldNow();
  // bump + roughness/clearcoat are shared by every flavor
  const bumpTex = toTex(pixelTex(TW, TH, (d) => {
    for (let y = 0; y < TH; y++) {
      const v = ((y + 0.5) / TH) * TAU, t = Math.sin(v), out = Math.cos(v);
      for (let x = 0; x < TW; x++) {
        const i = y * TW + x;
        let h = 0.5 + 0.42 * (FB[i] - 0.5) + 0.22 * (FC[i] - 0.5);
        if (FD[i] > 0.8 && t > 0.1) h -= (FD[i] - 0.8) * 1.2;
        const band = Math.exp(-Math.pow((t + 0.06) / 0.12, 2)) * sstep(-0.3, 0.7, out);
        h += band * (FC[i] - 0.5) * 0.5;
        const o = i * 4, g = clamp(h * 255, 0, 255);
        d[o] = d[o + 1] = d[o + 2] = g; d[o + 3] = 255;
      }
    }
  }).c, { srgb: false });
  await yieldNow();
  const rcTex = toTex(pixelTex(TW, TH, (d) => {
    for (let y = 0; y < TH; y++) {
      const v = ((y + 0.5) / TH) * TAU, t = Math.sin(v);
      for (let x = 0; x < TW; x++) {
        const i = y * TW + x;
        const coat = sstep(-0.15, 0.6, t) * (0.65 + 0.35 * FB[i]);
        const rough = lerp(0.86, 0.5, sstep(-0.3, 0.7, t)) + 0.12 * (FA[i] - 0.5) + 0.08 * (FC[i] - 0.5);
        const o = i * 4;
        d[o] = clamp(coat * 255, 0, 255); d[o + 1] = clamp(rough * 255, 0, 255); d[o + 2] = 0; d[o + 3] = 255;
      }
    }
  }).c, { srgb: false });

  const crustMat = (map) => new THREE.MeshPhysicalMaterial({
    map, bumpMap: bumpTex, bumpScale: 8, roughnessMap: rcTex, roughness: 1, metalness: 0,
    clearcoat: 0.55, clearcoatMap: rcTex, clearcoatRoughness: 0.32,
    sheen: 0.35, sheenColor: new THREE.Color(0xffc890), sheenRoughness: 0.55,
  });

  await yieldNow();
  /* ---------------- toppings ---------------- */
  const sesameGeo = (() => {
    const g = new THREE.SphereGeometry(1, 12, 8);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i); const taper = x > 0 ? 1 - x * 0.35 : 1; p.setY(i, p.getY(i) * taper); p.setZ(i, p.getZ(i) * taper); }
    g.computeVertexNormals();
    return g;
  })();
  const poppyGeo = new THREE.IcosahedronGeometry(1, 1);
  const flakeGeo = (() => { const g = new THREE.CylinderGeometry(1, 0.8, 0.22, 5, 1); g.computeVertexNormals(); return g; })();
  const chunkGeo = new THREE.DodecahedronGeometry(1, 0);
  const saltGeo = new THREE.BoxGeometry(1, 1, 1);
  const raisinGeo = (() => {
    const g = new THREE.IcosahedronGeometry(1, 3);
    const p = g.attributes.position, v = new V3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = fbm(v.x * 2.4 + 9, v.y * 2.4, v.z * 2.4, 3);
      v.multiplyScalar(0.78 + 0.42 * n);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  })();
  const seedMat = (color, rough = 0.5, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.4, ...extra });

  const acceptTop = (u, v) => { const s = Math.sin(v); return sstep(-0.02, 0.55, s) * (1 + 0.56 * Math.cos(v)) / 1.56; };
  const scatter = (shape, o) => {
    const rnd = mulberry(o.seed || 7);
    const mesh = new THREE.InstancedMesh(o.geo, o.mat, o.count);
    const m = new THREE.Matrix4(), p = new V3(), n = new V3(), t = new V3(), z = new V3(), tmp = new V3(), sc = new V3(), q = new THREE.Quaternion();
    const col = new THREE.Color();
    let placed = 0, tries = 0;
    const keep = [];
    while (placed < o.count && tries < o.count * 40) {
      tries++;
      const u = rnd() * TAU;
      const v = o.vmin != null ? lerp(o.vmin, o.vmax, rnd()) : rnd() * TAU;
      if (rnd() > (o.accept || acceptTop)(u, v)) continue;
      shape.point(u, v, p); shape.normal(u, v, n);
      tmp.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5);
      t.copy(tmp).addScaledVector(n, -tmp.dot(n)).normalize();
      z.crossVectors(t, n);
      const s = o.size * (0.75 + rnd() * 0.5);
      sc.set(s * o.shape[0], s * o.shape[1], s * o.shape[2]);
      m.makeBasis(t, n, z);
      // small random tilt so seeds don't look stamped on
      const tilt = new THREE.Matrix4().makeRotationAxis(t, (rnd() - 0.5) * (o.tilt ?? 0.5));
      m.premultiply(tilt);
      q.setFromRotationMatrix(m);
      p.addScaledVector(n, s * o.shape[1] * (o.lift ?? 0.6));
      m.compose(p, q, sc);
      mesh.setMatrixAt(placed, m);
      if (o.colors) { col.set(o.colors[Math.floor(rnd() * o.colors.length)]); col.offsetHSL(0, 0, (rnd() - 0.5) * 0.06); mesh.setColorAt(placed, col); }
      keep.push(v);
      placed++;
    }
    mesh.count = placed;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.v = keep;
    return mesh;
  };

  /* ---------------- build one bagel ---------------- */
  const SEG_U = PHONE ? 160 : 300, SEG_V = PHONE ? 80 : 150;
  const flavorMaps = {};
  const buildBagel = (id, seed) => {
    const shape = makeShape(seed);
    const group = new THREE.Group();
    const inner = new THREE.Group();           // lift/tilt/spin happen on inner
    group.add(inner);
    flavorMaps[id] = flavorMaps[id] || crustTextures(FLAV[id]);
    const mat = crustMat(flavorMaps[id]);
    if (id === 'cinnamon') {
      const top = new THREE.Group(), bot = new THREE.Group();
      const gTop = bagelGeo(shape, 0, Math.PI, SEG_U, SEG_V / 2);
      const gBot = bagelGeo(shape, Math.PI, TAU, SEG_U, SEG_V / 2);
      const mTop = new THREE.Mesh(gTop, mat), mBot = new THREE.Mesh(gBot, mat);
      [mTop, mBot].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
      top.add(mTop); bot.add(mBot);
      top.userData.mesh = mTop;
      inner.add(top, bot);
      group.userData.top = top; group.userData.bot = bot; group.userData.shape = shape;
    } else {
      const g = bagelGeo(shape, 0, TAU, SEG_U, SEG_V);
      const mesh = new THREE.Mesh(g, mat);
      mesh.castShadow = true; mesh.receiveShadow = true;
      inner.add(mesh);
    }
    // toppings
    const add = (mesh) => inner.add(mesh);
    if (id === 'sesame') {
      add(scatter(shape, { seed: 11, count: 950, geo: sesameGeo, mat: seedMat(0xffffff, 0.46), size: 0.029, shape: [1.25, 0.34, 0.72], lift: 0.3, colors: ['#E8D3A6', '#E2C792', '#EEDDB5', '#D4B07A', '#DDBF8A'] }));
    } else if (id === 'poppy') {
      add(scatter(shape, { seed: 21, count: 2600, geo: poppyGeo, mat: seedMat(0xffffff, 0.42), size: 0.016, shape: [1, 0.8, 1], lift: 0.3, colors: ['#1E2027', '#25262c', '#2c2a2e', '#18191e', '#33302f'] }));
    } else if (id === 'everything') {
      add(scatter(shape, { seed: 31, count: 360, geo: sesameGeo, mat: seedMat(0xffffff, 0.5), size: 0.028, lift: 0.3, shape: [1.15, 0.3, 0.72], colors: ['#EFE1C0', '#E9D6AE', '#DCC090'] }));
      add(scatter(shape, { seed: 32, count: 200, geo: sesameGeo, mat: seedMat(0xffffff, 0.45), size: 0.027, lift: 0.3, shape: [1.15, 0.3, 0.72], colors: ['#2a2420', '#1f1b19', '#3a302a'] }));
      add(scatter(shape, { seed: 33, count: 900, geo: poppyGeo, mat: seedMat(0xffffff, 0.42), size: 0.015, shape: [1, 0.8, 1], lift: 0.3, colors: ['#1E2027', '#2c2a2e'] }));
      add(scatter(shape, { seed: 34, count: 70, geo: flakeGeo, mat: seedMat(0xffffff, 0.55, { transmission: 0, sheen: 0.2 }), size: 0.05, shape: [1, 0.35, 0.8], tilt: 0.9, colors: ['#9A5A22', '#B87634', '#7A4318', '#C88D45'] }));
      add(scatter(shape, { seed: 35, count: 70, geo: chunkGeo, mat: seedMat(0xffffff, 0.6), size: 0.026, shape: [1.2, 0.7, 1], colors: ['#EADBB4', '#F1E5C6', '#DCC79A'] }));
      add(scatter(shape, { seed: 36, count: 90, geo: saltGeo, mat: seedMat(0xffffff, 0.18, { clearcoat: 0.8 }), size: 0.022, shape: [1, 0.8, 1], tilt: 1.4, colors: ['#FFFFFF', '#F4F4F2'] }));
    } else if (id === 'cinnamon') {
      const rMat = seedMat(0xffffff, 0.42, { clearcoat: 0.7, clearcoatRoughness: 0.3, sheen: 0.4, sheenColor: new THREE.Color(0x6a2a40) });
      const rais = scatter(shape, { seed: 41, count: 34, geo: raisinGeo, mat: rMat, size: 0.075, shape: [1.35, 0.62, 1], lift: -0.35, tilt: 0.6, accept: (u, v) => (Math.abs(Math.sin(v)) > 0.4 ? 0.85 : 0), colors: ['#3B1A12', '#4A2016', '#32150F', '#552618'] });
      // split raisins between the halves
      const top = group.userData.top, bot = group.userData.bot;
      const rTop = new THREE.InstancedMesh(raisinGeo, rMat, rais.count), rBot = new THREE.InstancedMesh(raisinGeo, rMat, rais.count);
      let it = 0, ib = 0; const m = new THREE.Matrix4(), c = new THREE.Color();
      for (let i = 0; i < rais.count; i++) {
        rais.getMatrixAt(i, m); rais.getColorAt(i, c);
        if (Math.sin(rais.userData.v[i]) >= 0) { rTop.setMatrixAt(it, m); rTop.setColorAt(it, c); it++; } else { rBot.setMatrixAt(ib, m); rBot.setColorAt(ib, c); ib++; }
      }
      rTop.count = it; rBot.count = ib;
      [rTop, rBot].forEach((r) => { r.castShadow = true; r.receiveShadow = true; });
      top.add(rTop); bot.add(rBot);
    }
    group.userData.inner = inner;
    group.userData.id = id;
    group.visible = false;
    return group;
  };

  await yieldNow();
  /* ---------------- crumb + cream cheese for the sliced bagel ---------------- */
  const crumbTex = (() => {
    const W = 1024, H = 256;
    const r = mulberry(99);
    const { c, ctx } = pixelTex(W, H, (d) => {
      for (let y = 0; y < H; y++) {
        const t = (y + 0.5) / H;
        for (let x = 0; x < W; x++) {
          const a = (x / W) * TAU, rr = 1 + t * 1.1;
          const nx = Math.cos(a) * rr * 9, nz = Math.sin(a) * rr * 9, ny = t * 9;
          const pore = fbm(nx * 2.2, ny * 2.2, nz * 2.2, 3);
          const big = fbm(nx * 0.5 + 3, ny * 0.5, nz * 0.5, 3);
          let R = 222, G = 190, B = 148;
          const sw = Math.sin((t * 7.5 + big * 3 + a * 0.32) * Math.PI);
          const streak = sstep(0.35, 1.0, sw) * (0.5 + big);
          R = lerp(R, 160, streak * 0.38); G = lerp(G, 100, streak * 0.38); B = lerp(B, 58, streak * 0.38);
          const holes = sstep(0.6, 0.72, pore);
          const m = 1 - holes * 0.32 - (big - 0.5) * 0.12;
          R *= m; G *= m; B *= m;
          const edge = Math.min(t, 1 - t);
          const crust = sstep(0.045, 0.012, edge);
          const shadow = sstep(0.12, 0.03, edge) * 0.25;
          R = lerp(R * (1 - shadow), 128, crust); G = lerp(G * (1 - shadow), 72, crust); B = lerp(B * (1 - shadow), 38, crust);
          const o = (y * W + x) * 4;
          d[o] = R; d[o + 1] = G; d[o + 2] = B; d[o + 3] = 255;
        }
      }
    });
    // raisin cross-sections
    for (let i = 0; i < 22; i++) {
      const x = r() * W, y = H * (0.18 + r() * 0.64), rx = 10 + r() * 14, ry = 6 + r() * 7;
      const g = ctx.createRadialGradient(x, y, 1, x, y, rx);
      g.addColorStop(0, 'rgba(70,26,24,0.95)'); g.addColorStop(0.7, 'rgba(84,34,30,0.9)'); g.addColorStop(1, 'rgba(84,34,30,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, r() * Math.PI, 0, TAU); ctx.fill();
    }
    return toTex(c);
  })();
  await yieldNow();
  const crumbBump = toTex(pixelTex(1024, 256, (d, W, H) => {
    for (let y = 0; y < H; y++) { const t = (y + 0.5) / H; for (let x = 0; x < W; x++) {
      const a = (x / W) * TAU, rr = 1 + t * 1.1;
      const pore = fbm(Math.cos(a) * rr * 20, t * 20, Math.sin(a) * rr * 20, 3);
      const h = 1 - sstep(0.55, 0.75, pore) * 0.8;
      const o = (y * W + x) * 4; d[o] = d[o + 1] = d[o + 2] = h * 255; d[o + 3] = 255;
    } }
  }).c, { srgb: false });
  const crumbMat = new THREE.MeshStandardMaterial({ map: crumbTex, bumpMap: crumbBump, bumpScale: 3, roughness: 0.92, side: THREE.FrontSide });

  await yieldNow();
  const creamPlane = new THREE.Plane(new V3(-1, 0, 0), -10);
  const creamBump = toTex(pixelTex(1024, 256, (d, W, H) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = (x / W) * TAU; const v = fbm(Math.cos(a) * 30, y / H * 3, Math.sin(a) * 30, 3) * 0.6 + fbm(Math.cos(a) * 4, y / H * 14, Math.sin(a) * 4, 3) * 0.4; const o = (y * W + x) * 4; d[o] = d[o + 1] = d[o + 2] = v * 255; d[o + 3] = 255; } }).c, { srgb: false });
  const creamMat = new THREE.MeshPhysicalMaterial({ bumpMap: creamBump, bumpScale: 2.5, emissive: 0x2a2218, envMapIntensity: 1.8, color: 0xFBF5EA, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.25, sheen: 0.5, sheenColor: new THREE.Color(0xffffff), clippingPlanes: [creamPlane] });
  const creamHeight = (u, t) => {
    const e0 = lerp(0.07, 0.3, sstep(0.38, 0.62, fbm(Math.cos(u) * 2.4 + 9, 0.5, Math.sin(u) * 2.4, 3))), e1 = lerp(0.93, 0.72, sstep(0.38, 0.62, fbm(Math.cos(u) * 2.4 + 3, 1.5, Math.sin(u) * 2.4, 3)));
    const prof = Math.pow(Math.sin(Math.PI * clamp((t - e0) / (e1 - e0))), 0.6);
    const n = fbm(Math.cos(u) * 3 + 2, t * 3, Math.sin(u) * 3, 3);
    const strokes = Math.sin(u * 11 + n * 10 + t * 4) * 0.024 + Math.sin(u * 37 + n * 6) * 0.004;
    return -0.012 + prof * (0.05 + 0.05 * n + strokes);
  };

  await yieldNow();
  /* ---------------- board, backdrop, shadows ---------------- */
  const boardTex = (() => {
    const W = 1536, H = 960;
    const { c, ctx } = pixelTex(W, H, (d) => {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const fx = x / W, fy = y / H;
        const warp = fbm(fx * 2.5, fy * 9, 1.3, 4);
        const ring = Math.sin((fy * 46 + warp * 16 + fbm(fx * 0.6, fy * 2, 4.2, 2) * 4) * Math.PI);
        const k = sstep(-0.3, 1, ring);
        let R = lerp(60, 78, k), G = lerp(37, 48, k), B = lerp(22, 29, k);
        const pores = vnoise(fx * 900, fy * 40, 2.2);
        const m = 0.9 + 0.2 * pores - sstep(0.75, 0.95, pores) * 0.12;
        const tone = 0.92 + 0.16 * fbm(fx * 1.2 + 8, fy * 1.6, 0.5, 3);
        R *= m * tone; G *= m * tone; B *= m * tone;
        const o = (y * W + x) * 4; d[o] = R; d[o + 1] = G; d[o + 2] = B; d[o + 3] = 255;
      }
    });
    // light knife score marks from years of use
    const r = mulberry(5);
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 70; i++) {
      const x = W * (0.2 + r() * 0.6), y = H * (0.2 + r() * 0.6), len = 30 + r() * 140, ang = (r() - 0.5) * 1.2 + (r() > 0.5 ? 0 : Math.PI / 2);
      ctx.strokeStyle = `rgba(190,150,110,${0.04 + r() * 0.07})`; ctx.lineWidth = 0.6 + r();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke();
    }
    return { map: toTex(c), bump: toTex(c, { srgb: false }) };
  })();
  await yieldNow();
  const board = new THREE.Mesh(
    new RoundedBoxGeometry(15, 0.36, 10, 4, 0.1),
    new THREE.MeshPhysicalMaterial({ map: boardTex.map, bumpMap: boardTex.bump, bumpScale: 0.35, roughness: 0.58, clearcoat: 0.18, clearcoatRoughness: 0.5 })
  );
  board.position.y = -0.18;
  // swap in a real scanned walnut surface (Poly Haven, CC0) as soon as it arrives
  {
    const tl = new THREE.TextureLoader();
    const load = (f, srgb) => new Promise((res) => tl.load('assets/pbr/' + f, (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.4, 1.6); t.anisotropy = Math.min(16, maxAniso); if (srgb) t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, () => res(null)));
    Promise.all([load('walnut_diff.webp', true), load('walnut_nor.webp'), load('walnut_rough.webp')]).then(([d, n, r]) => {
      if (!d) return;
      const m = board.material;
      m.map = d; m.bumpMap = null; m.normalMap = n; m.normalScale = new THREE.Vector2(0.9, 0.9);
      m.roughnessMap = null; m.roughness = 0.82; m.specularIntensity = 0.35;
      m.color.setRGB(0.6, 0.44, 0.34);
      m.clearcoat = 0.05; m.envMapIntensity = 0.35; m.sheen = 0;
      m.needsUpdate = true;
    });
  }
  board.receiveShadow = true;
  board.castShadow = true;
  scene.add(board);

  const backdrop = (() => {
    const { c, ctx } = pixelTex(4, 4, () => {});
    c.width = 1024; c.height = 512;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#0b0806'); g.addColorStop(0.55, '#1c120c'); g.addColorStop(1, '#0d0907');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
    const r = mulberry(8);
    for (let i = 0; i < 26; i++) {
      const x = r() * 1024, y = 120 + r() * 300, rad = 18 + r() * 70;
      const gg = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const a = 0.05 + r() * 0.12;
      gg.addColorStop(0, `rgba(255,${170 + r() * 50 | 0},${90 + r() * 40 | 0},${a})`); gg.addColorStop(0.6, `rgba(255,170,90,${a * 0.6})`); gg.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
    }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ map: toTex(c, { flip: true, wrap: false }), fog: false, depthWrite: false }));
    m.position.set(0, 3, -12);
    return m;
  })();
  scene.add(backdrop);

  const blobTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 30, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(0.45, 'rgba(0,0,0,0.42)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); return t;
  })();
  const makeBlob = (s = 3.8) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.8 }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.004; m.renderOrder = 1;
    scene.add(m);
    return m;
  };

  /* ---------------- lights ---------------- */
  const key = new THREE.SpotLight(0xffd6a0, 0, 26, 0.52, 0.85, 1.4);
  key.position.set(2.6, 9.6, 4.2);
  key.target.position.set(0, 0.3, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 6;
  key.shadow.camera.near = 3; key.shadow.camera.far = 18;
  scene.add(key, key.target);
  const KEY_MAX = 85;
  const rim = new THREE.DirectionalLight(0xffb06a, 0); rim.position.set(-4, 3.2, -6); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffe6cc, 0); fill.position.set(-5, 2.5, 4); scene.add(fill);
  const bounce = new THREE.HemisphereLight(0xffe2c0, 0x2a160c, 0); scene.add(bounce);

  /* ---------------- steam ---------------- */
  const steamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uSeed: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      varying vec2 vUv; uniform float uTime; uniform float uOpacity; uniform float uSeed;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }
      void main(){
        vec2 uv = vUv;
        float t = uTime * 0.18 + uSeed;
        vec2 q = vec2(fbm(uv*vec2(2.0,3.0) + vec2(0.0,-t)), fbm(uv*vec2(2.0,3.0) + vec2(5.2,-t*1.3)));
        float d = fbm(uv*vec2(2.6,2.2) + q*1.6 + vec2(0.0,-t*1.6));
        float x = uv.x - 0.5 + (q.x - 0.5) * 0.5 * uv.y;
        float w = exp(-x*x*14.0);
        float fade = smoothstep(0.0, 0.22, uv.y) * smoothstep(1.0, 0.35, uv.y);
        float a = w * fade * smoothstep(0.42, 0.85, d) * uOpacity;
        gl_FragColor = vec4(vec3(1.0, 0.95, 0.88), a * 0.28);
      }`,
  });
  const steam = new THREE.Group();
  [0, 1, 2].forEach((i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.0), steamMat.clone());
    m.material.uniforms.uSeed.value = i * 3.7;
    m.position.set((i - 1) * 0.5, 1.5, (i - 1) * 0.2);
    m.renderOrder = 5;
    steam.add(m);
  });
  scene.add(steam);

  /* ---------------- knives ---------------- */
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xe4e4e2, metalness: 1, roughness: 0.2, clearcoat: 0.3, envMapIntensity: 1.4 });
  const walnutDark = new THREE.MeshPhysicalMaterial({ color: 0x3a2214, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.25, map: boardTex.map });
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xd6b26e, metalness: 1, roughness: 0.3 });

  const breadKnife = (() => {
    const L = 3.7, Wd = 0.4;
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    // serrated edge from heel (0) to the tip (-L)
    const teeth = 46;
    for (let i = 0; i < teeth; i++) {
      const x0 = -(i / teeth) * (L - 0.25), x1 = -((i + 1) / teeth) * (L - 0.25);
      s.quadraticCurveTo((x0 + x1) / 2, 0.035, x1, 0);
    }
    s.quadraticCurveTo(-L - 0.02, 0.05, -L + 0.02, Wd * 0.75);
    s.lineTo(-L + 0.3, Wd);
    s.lineTo(0, Wd);
    s.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 3 });
    g.rotateX(Math.PI / 2);
    g.translate(0, 0.006, 0);
    const blade = new THREE.Mesh(g, steel);
    blade.castShadow = true;
    const handle = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.15, 0.3, 3, 0.06), walnutDark);
    handle.position.set(0.68, 0, Wd * 0.5);
    handle.castShadow = true;
    const k = new THREE.Group(); k.add(blade, handle);
    [0.35, 0.95].forEach((x) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 16), brass); r.position.set(x, 0, Wd * 0.5); k.add(r); });
    k.visible = false;
    scene.add(k);
    return k;
  })();

  const butterKnife = (() => {
    const s = new THREE.Shape();
    const L = 1.45, W = 0.27;
    s.moveTo(0, -W / 2);
    s.lineTo(-L + W / 2, -W / 2);
    s.absarc(-L + W / 2, 0, W / 2, -Math.PI / 2, -Math.PI * 1.5, true);
    s.lineTo(0, W / 2);
    s.lineTo(0.12, W * 0.18);
    s.lineTo(0.12, -W * 0.18);
    s.lineTo(0, -W / 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.008, bevelSegments: 2, curveSegments: 18 });
    g.rotateX(Math.PI / 2);
    const blade = new THREE.Mesh(g, steel);
    const hg = new THREE.CapsuleGeometry(0.075, 1.15, 8, 18); hg.rotateZ(Math.PI / 2); hg.scale(1, 0.62, 1.15);
    const handle = new THREE.Mesh(hg, steel);
    handle.position.set(0.12 + 0.65, 0.03, 0);
    blade.castShadow = handle.castShadow = true;
    const inner = new THREE.Group(); inner.add(blade, handle);
    inner.rotation.y = Math.PI / 2;          // point the blade into the scene (-z)
    const k = new THREE.Group(); k.add(inner);
    // cream cheese on the blade
    const dab = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 12), creamMat.clone());
    dab.material.clippingPlanes = [];
    dab.scale.set(0.9, 0.22, 1.6); dab.position.set(0, -0.02, -0.75);
    k.add(dab); k.userData.dab = dab;
    k.visible = false;
    scene.add(k);
    return k;
  })();

  /* ================================================================
     ONE SHARED BAGEL — it comes out of the oven, becomes each flavor,
     then gets sliced and schmeared. No cuts, no swaps.
     ================================================================ */
  const SHAPE = makeShape(3);
  const SEEDS = CFG.seedsScale[TIER];
  const growU = {};
  const growMat = (mat, id) => {
    const u = growU[id] || (growU[id] = { value: id === 'everything' ? 1 : 0 });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uGrow = u;
      sh.vertexShader = 'uniform float uGrow;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed *= uGrow;');
    };
    mat.customProgramCacheKey = () => 'grow';
    return mat;
  };
  await yieldNow();
  // the crust blends between two flavor textures
  flavorMaps.everything = crustTextures(FLAV.everything);
  const crustU = { mapB: { value: flavorMaps.everything }, uMix: { value: 0 } };
  const crust = crustMat(flavorMaps.everything);
  crust.onBeforeCompile = (sh) => {
    sh.uniforms.mapB = crustU.mapB; sh.uniforms.uMix = crustU.uMix;
    sh.fragmentShader = 'uniform sampler2D mapB;\nuniform float uMix;\n' + sh.fragmentShader.replace('#include <map_fragment>',
      '#ifdef USE_MAP\n  vec4 sampledDiffuseColor = mix(texture2D(map, vMapUv), texture2D(mapB, vMapUv), uMix);\n  diffuseColor *= sampledDiffuseColor;\n#endif');
  };
  crust.customProgramCacheKey = () => 'crust-mix';

  await yieldNow();
  const C = { group: new THREE.Group(), inner: new THREE.Group(), top: new THREE.Group(), bot: new THREE.Group() };
  C.group.add(C.inner); C.inner.add(C.top, C.bot);
  {
    const mTop = new THREE.Mesh(bagelGeo(SHAPE, 0, Math.PI, SEG_U, SEG_V / 2), crust);
    const mBot = new THREE.Mesh(bagelGeo(SHAPE, Math.PI, TAU, SEG_U, SEG_V / 2), crust);
    [mTop, mBot].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
    C.top.add(mTop); C.bot.add(mBot);
  }
  scene.add(C.group);
  // split a scattered topping between the two halves so slicing works later
  const addTopping = (id, mesh) => {
    const mk = () => { const im = new THREE.InstancedMesh(mesh.geometry, mesh.material, mesh.count); im.castShadow = true; im.receiveShadow = true; return im; };
    const a = mk(), b = mk();
    const m = new THREE.Matrix4(), col = new THREE.Color();
    let ia = 0, ib = 0;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, m);
      const toTop = Math.sin(mesh.userData.v[i]) >= 0;
      const t = toTop ? a : b, k = toTop ? ia++ : ib++;
      t.setMatrixAt(k, m);
      if (mesh.instanceColor) { mesh.getColorAt(i, col); t.setColorAt(k, col); }
    }
    a.count = ia; b.count = ib;
    C.top.add(a); C.bot.add(b);
    a.userData.flavor = b.userData.flavor = id;
  };
  const N = (n) => Math.max(8, Math.round(n * SEEDS));
  const TOPPINGS = {
    everything: () => [
      { seed: 31, count: N(220), geo: sesameGeo, mat: seedMat(0xffffff, 0.5), size: 0.028, lift: 0.3, shape: [1.15, 0.3, 0.72], colors: ['#EFE1C0', '#E9D6AE', '#DCC090'] },
      { seed: 32, count: N(120), geo: sesameGeo, mat: seedMat(0xffffff, 0.45), size: 0.027, lift: 0.3, shape: [1.15, 0.3, 0.72], colors: ['#2a2420', '#1f1b19', '#3a302a'] },
      { seed: 33, count: N(320), geo: poppyGeo, mat: seedMat(0xffffff, 0.42), size: 0.016, shape: [1, 0.8, 1], lift: 0.3, colors: ['#1E2027', '#2c2a2e'] },
      { seed: 34, count: N(45), geo: flakeGeo, mat: seedMat(0xffffff, 0.55, { sheen: 0.2 }), size: 0.05, shape: [1, 0.35, 0.8], tilt: 0.9, colors: ['#9A5A22', '#B87634', '#7A4318', '#C88D45'] },
      { seed: 35, count: N(45), geo: chunkGeo, mat: seedMat(0xffffff, 0.6), size: 0.026, shape: [1.2, 0.7, 1], colors: ['#EADBB4', '#F1E5C6', '#DCC79A'] },
      { seed: 36, count: N(55), geo: saltGeo, mat: seedMat(0xffffff, 0.18, { clearcoat: 0.8 }), size: 0.022, shape: [1, 0.8, 1], tilt: 1.4, colors: ['#FFFFFF', '#F4F4F2'] },
    ],
    sesame: () => [
      { seed: 11, count: N(620), geo: sesameGeo, mat: seedMat(0xffffff, 0.46), size: 0.03, shape: [1.25, 0.34, 0.72], lift: 0.3, colors: ['#E8D3A6', '#E2C792', '#EEDDB5', '#D4B07A', '#DDBF8A'] },
    ],
    cinnamon: () => [
      { seed: 41, count: 34, geo: raisinGeo, mat: seedMat(0xffffff, 0.42, { clearcoat: 0.7, clearcoatRoughness: 0.3, sheen: 0.4, sheenColor: new THREE.Color(0x6a2a40) }), size: 0.075, shape: [1.35, 0.62, 1], lift: -0.35, tilt: 0.6, accept: (u, v) => (Math.abs(Math.sin(v)) > 0.4 ? 0.85 : 0), colors: ['#3B1A12', '#4A2016', '#32150F', '#552618'] },
    ],
  };
  const builtFlavors = new Set();
  const buildFlavor = (id) => {
    if (builtFlavors.has(id)) return;
    builtFlavors.add(id);
    flavorMaps[id] = flavorMaps[id] || crustTextures(FLAV[id]);
    TOPPINGS[id]().forEach((o) => { growMat(o.mat, id); addTopping(id, scatter(SHAPE, o)); });
  };
  await yieldNow();
  buildFlavor('everything');
  await yieldNow();
  // slicing pieces (built a moment later, they hide inside the closed bagel)
  let cream = null;
  const buildSlicing = () => {
    if (cream) return;
    const capTop = new THREE.Mesh(ringGeo(SHAPE, false), crumbMat);
    const capBot = new THREE.Mesh(ringGeo(SHAPE, true), crumbMat);
    capTop.receiveShadow = capBot.receiveShadow = true;
    C.top.add(capTop); C.bot.add(capBot);
    const ccTop = new THREE.Mesh(ringGeo(SHAPE, false, 0.06, 0.94, 300, 40, creamHeight), creamMat);
    const ccBot = new THREE.Mesh(ringGeo(SHAPE, true, 0.06, 0.94, 300, 40, (u, t) => creamHeight(u + 1.7, t)), creamMat);
    ccTop.castShadow = ccBot.castShadow = true; ccTop.receiveShadow = ccBot.receiveShadow = true;
    C.top.add(ccTop); C.bot.add(ccBot);
    cream = [ccTop, ccBot];
  };
  const FLAVOR_ORDER = ['everything', 'sesame', 'cinnamon'];
  const setFlavor = (a, b, t) => {
    if (!builtFlavors.has(b)) { b = a; t = 0; }
    crust.map = flavorMaps[a];
    crustU.mapB.value = flavorMaps[b];
    crustU.uMix.value = t;
    Object.keys(growU).forEach((id) => {
      let g = 0;
      if (id === a && id === b) g = 1;
      else if (id === a) g = 1 - sstep(0.12, 0.72, t);
      else if (id === b) g = sstep(0.28, 0.88, t);
      growU[id].value = g;
    });
  };
  C.blob = makeBlob();

  /* ---------------- the oven, the peel ---------------- */
  RectAreaLightUniformsLib.init();
  await yieldNow();
  const oven = window.HB_OVEN(THREE, { RoundedBoxGeometry, mulberry, vnoise, fbm, TAU, lowTier: PHONE, RectAreaLight: THREE.RectAreaLight });
  scene.add(oven.group);
  scene.add(oven.peel);
  const peelBlob = makeBlob(2.4);
  // a faint cool fill so shadows never go muddy (about 6500K)
  const cool = new THREE.HemisphereLight(0x9fb8ff, 0x0a0705, 0.06);
  scene.add(cool);

  await yieldNow();
  /* ---------------- film look ---------------- */
  const post = window.HB_POST(THREE, A, renderer, scene, camera, {
    msaa: PHONE ? 0 : 4, dof: !PHONE, particles: CFG.particles[TIER],
    bloomStrength: CFG.bloomStrength, bloomThreshold: CFG.bloomThreshold,
  });

  /* ---------------- sizing ---------------- */
  let W = 1, H = 1;
  const sv = CFG.scroll[TIER];
  const TOTAL = sv.chapters + sv.finale;
  const F1 = 0, F2 = sv.chapters / TOTAL;
  stageEl.style.height = (TOTAL + 100) + 'vh';
  let resScale = 1;
  const resize = () => {
    W = stageEl.clientWidth; H = window.innerHeight;
    renderer.setPixelRatio(DPR * resScale);
    renderer.setSize(W, H, false);
    post.setSize(W, H, DPR * resScale);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  /* ---------------- scroll + pointer ---------------- */
  const scrollRange = () => Math.max(1, stageEl.offsetHeight - window.innerHeight);
  const scrollP = () => (typeof window.HB_PROGRESS === 'number' ? window.HB_PROGRESS : clamp((window.scrollY - stageEl.offsetTop) / scrollRange()));
  const chapterCenter = (i) => F1 + (F2 - F1) * ((i + 0.62) / 3);
  tabs.forEach((t, i) => t.addEventListener('click', () => window.HB_SCROLL_TO(stageEl.offsetTop + chapterCenter(i) * scrollRange())));
  let mx = 0, my = 0, smx = 0, smy = 0;
  addEventListener('pointermove', (e) => { mx = (e.clientX / innerWidth) * 2 - 1; my = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

  /* ---------------- camera path ---------------- */
  const HOVER_Y = 0.78;
  const B = CFG.beats;
  const narrow = () => W / H < 0.9;
  const K = (p, pos, look, fov) => [p, new V3(...pos), new V3(...look), fov];
  const filmKeys = () => (narrow() ? [
    K(0, [0, 2.2, 7.4], [0, 2.0, -5.6], 52),
    K(B.heatEnd, [0, 2.2, 6.4], [0, 2.0, -5.6], 52),
    K(B.doorEnd, [0, 2.4, 6.6], [0, 1.85, -6.4], 52),
    K(B.peelEnd, [0, 2.4, 7.6], [0, 1.0, -1.6], 50),
    K(1, [0, 2.6, 8.6], [0, 0.75, 0], 44),
  ] : [
    K(0, [0, 2.4, 2.3], [0, 2.3, -5.6], 38),
    K(B.heatEnd, [0, 2.3, 0.45], [0, 2.2, -5.6], 38),
    K(B.doorEnd, [0, 2.5, 0.7], [0, 2.0, -6.5], 38),
    K(B.peelEnd, [0.2, 1.95, 2.7], [0, 1.35, -1.6], 36),
    K(1, [-0.75, 2.2, 7.4], [-1.0, 0.95, 0], 32),
  ]);
  const stopPose = () => (narrow() ? [new V3(0, 2.6, 8.6), new V3(0, 0.75, 0), 44] : [new V3(-0.75, 2.2, 7.4), new V3(-1.0, 0.95, 0), 32]);
  const far = (a, b) => (narrow() ? [b.clone().add(a.clone().sub(b).multiplyScalar(1.9)), b] : [a, b]);
  const finaleKeys = () => {
    const sp = stopPose(), fv = narrow() ? 44 : 32;
    return [
      [0.0, sp[0].clone().add(new V3(0.25, 0, 0)), sp[1].clone(), fv],
      [0.14, new V3(2.6, 1.45, 4.5), new V3(0, 0.32, 0), fv],
      [0.38, new V3(1.9, 1.75, 4.25), new V3(0, 0.3, 0), fv],
      [0.54, ...far(new V3(0, 5.6, 7.0), new V3(0, 0.2, 0)), fv],
      [0.72, ...far(new V3(-0.6, 5.0, 6.0), new V3(-0.5, 0.25, 0)), fv],
      [0.93, ...far(new V3(0, 11.2, 3.0), new V3(0, 0, 0.2)), fv],
      [1.0, ...far(new V3(0, 11.2, 3.0), new V3(0, 0, 0.2)), fv],
    ];
  };
  const cam = { pos: new V3(), look: new V3(), fov: 38 };
  const along = (keys, t) => {
    let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
    const k = ease(range(t, keys[i][0], keys[i + 1][0]));
    cam.pos.lerpVectors(keys[i][1], keys[i + 1][1], k);
    cam.look.lerpVectors(keys[i][2], keys[i + 1][2], k);
    cam.fov = lerp(keys[i][3], keys[i + 1][3], k);
  };

  const setCap = (id, on) => { const c = capEls[id]; if (c && c.classList.contains('is-on') !== on) c.classList.toggle('is-on', on); };
  const heroEl = $('[data-stage-hero]');
  const heroLines = heroEl ? $$('.ln', heroEl) : [];
  const heroBtns = heroEl ? $('.stage__ctas', heroEl) : null;
  const toggle = (el, cls, on) => { if (el && el.classList.contains(cls) !== on) el.classList.toggle(cls, on); };
  let curTab = -2;
  const projV = new V3(), tmpV = new V3();
  const doorEase = (t) => { const s = 0.9; const u = t - 1; return t <= 0 ? 0 : 1 + (s + 1) * u * u * u + s * u * u; };
  const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);

  const state = { forceP: null, freezeTime: null, forceFilm: null };
  // ---- the film plays on its own; scrolling takes over at the hero shot ----
  let filmT = 0, filmOn = true, ffwd = 1;
  const lock = (on) => window.HB_LOCK && window.HB_LOCK(on);
  const finishFilm = () => {
    if (!filmOn) return;
    filmT = 1; filmOn = false; lock(false);
    stageEl.classList.add('is-film-done');
  };
  // trying to scroll during the film fast-forwards it instead
  const hurry = () => { if (filmOn) ffwd = 4; };
  ['wheel', 'touchmove'].forEach((ev) => addEventListener(ev, hurry, { passive: true }));
  addEventListener('keydown', (e) => { if (filmOn && [' ', 'ArrowDown', 'PageDown', 'End', 'Enter'].includes(e.key) && e.target === document.body) hurry(); });
  skipEl.addEventListener('click', () => finishFilm(), { capture: true });
  let pS = scrollP();
  let t0 = performance.now();
  let last = t0;
  let lastOpen = 0;

  const update = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const time = state.freezeTime != null ? state.freezeTime : (now - t0) / 1000;
    const pRaw = state.forceP != null ? state.forceP : scrollP();
    pS = state.forceP != null ? pRaw : pS + (pRaw - pS) * Math.min(1, dt * 6);
    const p = pS;
    if (state.forceFilm == null && filmOn && running) {
      filmT = Math.min(1, filmT + (dt * ffwd) / CFG.filmSeconds);
      if (filmT >= 1) finishFilm();
    }
    if (state.forceFilm != null) { filmOn = state.forceFilm < 1; filmT = state.forceFilm; }
    const f = filmOn ? filmT : 1, c = filmOn ? 0 : range(p, 0, F2), q = range(p, F2, 1);

    // ---- the oven ----
    const heat = 0.06 + 0.94 * sstep(B.darkness, B.heatEnd, f);
    const dialT = ease(range(f, B.darkness + 0.01, B.heatEnd - 0.01));
    const open = Math.min(1.04, doorEase(range(f, B.heatEnd, B.doorEnd)));
    const flicker = 1 + 0.05 * (Math.sin(time * 2.3) + 0.6 * Math.sin(time * 3.7 + 1.3) + 0.5 * Math.sin(time * 0.9 + 4)) / 2.1;
    const breath = 0.5 + 0.5 * Math.sin(time * 1.4);
    const ovenDim = (1 - 0.55 * sstep(0.84, 1, f)) * lerp(1, 0.22, sstep(0, 0.2, c));
    oven.set({ heat, open, dialT, flicker, breath, dim: ovenDim });
    if (window.HB_SOUND) window.HB_SOUND.update({ heat, open, active: filmOn || p < 0.02 });
    if (open >= 0.995 && lastOpen < 0.995 && window.HB_SOUND) window.HB_SOUND.thunk();
    lastOpen = open;

    // ---- studio light comes up as the bagel lands ----
    const studio = sstep(0.8, 1, f);
    key.intensity = KEY_MAX * studio;
    rim.intensity = 2.2 * sstep(0.7, 1, f);
    fill.intensity = 0.35 * studio;
    bounce.intensity = 0.35 * studio;
    scene.environmentIntensity = Math.max(0.035 + 0.13 * heat * (0.5 + 0.5 * open), lerp(0, 0.32, studio));
    cool.intensity = lerp(0.07, 0.03, studio);
    // bloom is for the oven and embers; it backs off once the studio lights take over
    post.bloom.strength = lerp(CFG.bloomStrength, 0.1, studio);
    post.bloom.threshold = lerp(CFG.bloomThreshold, 2.5, studio);

    // ---- where is the bagel? ----
    let bx = 0, by = HOVER_Y, bz = 0, rx = 0.55, ry = 0.6, rz = 0.06;
    let steamAmt = 0, activeTab = -1, overBoard = true;
    oven.peel.visible = false;
    breadKnife.visible = butterKnife.visible = false;
    if (filmOn) {
      // film: the bagel rides the peel out of the oven, then lifts into place
      const slide = ease(range(f, B.peelStart, B.peelEnd));
      const bladeZ = lerp(-7.25, -1.6, slide), bladeY = lerp(oven.O.open.y0 + 0.02, 1.25, sstep(0.25, 1, slide));
      const leave = ease(range(f, 0.8, 0.97));
      const peelPos = tmpV.set(0, bladeY - leave * 0.9, bladeZ - leave * 2.2);
      oven.peel.visible = f > B.heatEnd - 0.02 && leave < 1;
      oven.peel.position.copy(peelPos).sub(oven.peel.userData.bladeCenter);
      oven.peel.rotation.set(-0.04 * slide + leave * 0.2, 0.18, 0);
      const onPeel = new V3(0, bladeY + 0.045, bladeZ);
      const lift = ease(range(f, B.peelEnd, 1));
      bx = 0; bz = lerp(onPeel.z, 0, lift);
      by = lerp(onPeel.y, HOVER_Y + 0, lift) + Math.sin(lift * Math.PI) * 0.35;
      rx = lerp(0, 0.55, lift); ry = lerp(-0.6, 0.6, lift); rz = 0.06 * lift;
      overBoard = lift > 0.6;
      steamAmt = sstep(B.peelStart, B.peelStart + 0.15, f) * 0.85;
      peelBlob.visible = oven.peel.visible;
      peelBlob.position.set(0, bladeY + 0.05 - leave, bladeZ);
      peelBlob.material.opacity = 0.55 * (1 - lift);
      setFlavor('everything', 'everything', 0);
      // bagel is hidden until the door is open enough to see it inside
      C.group.visible = f > B.heatEnd;
    } else if (p < F2) {
      // flavors: the same bagel turns into the next one
      C.group.visible = true; peelBlob.visible = false;
      const k3 = c * 3, idx = Math.min(2, Math.floor(k3)), local = clamp(k3 - idx);
      const t = idx === 0 ? 0 : smoother(range(local, 0, 0.5));
      const a = FLAVOR_ORDER[Math.max(0, idx - 1)], b = FLAVOR_ORDER[idx];
      setFlavor(idx === 0 ? 'everything' : a, b, idx === 0 ? 0 : t);
      const done = [1, idx >= 1 ? (idx > 1 ? 1 : t) : 0, idx >= 2 ? t : 0];
      const arc = Math.sin(Math.PI * t);
      const bob = Math.sin(time * 1.3) * 0.04;
      const settle = idx === 2 ? ease(range(local, 0.7, 1)) : 0;
      const ryRun = 0.6 + c * 3.6 + Math.PI * (done[1] + done[2]);
      by = lerp(HOVER_Y + bob + arc * 0.3, 0, settle);
      rx = lerp(0.55 + arc * 0.2, 0, settle);
      ry = lerp(ryRun, Math.PI * 4, settle);
      rz = lerp(0.06 - arc * 0.1, 0, settle);
      steamAmt = 0.5 * (1 - arc);
      activeTab = idx === 0 ? (c > 0.06 ? 0 : -1) : (t > 0.5 ? idx : idx - 1);
    } else {
      C.group.visible = true; peelBlob.visible = false;
      setFlavor('cinnamon', 'cinnamon', 0);
      by = 0; rx = 0; ry = Math.PI * 4; rz = 0;
    }
    C.group.position.set(bx, BASE + by, bz);
    C.inner.rotation.set(rx, ry, rz);
    C.blob.visible = overBoard && C.group.visible;
    C.blob.position.set(bx, 0.004, bz);
    C.blob.scale.setScalar(1 + Math.max(0, by) * 0.35);
    C.blob.material.opacity = 0.85 / (1 + Math.max(0, by) * 2.2);

    // ---- finale: slice → open → spread → name ----
    const P = 0.64 + q * 0.36;
    if (p >= F2 && cream) {
      const top = C.top, bot = C.bot;
      const sl = range(P, 0.665, 0.78);
      const op = ease(range(P, 0.78, 0.84));
      const sep = sstep(0.85, 1, sl) * 0.035;
      top.position.set(lerp(0, 1.78, op), sep + Math.sin(op * Math.PI) * 1.05 + lerp(0, 0.19, op), lerp(0, 0.08, op));
      top.rotation.set(0, lerp(0, -0.35, op), lerp(0, -Math.PI, op));
      bot.position.set(lerp(0, -1.72, op), 0, lerp(0, -0.05, op));
      bot.rotation.set(0, lerp(0, 0.25, op), 0);
      C.blob.scale.set(1 + op * 0.9, 1, 1);
      breadKnife.visible = sl > 0 && op < 1;
      if (breadKnife.visible) {
        const enter = ease(range(sl, 0, 0.32)), through = range(sl, 0.3, 1), exit = ease(op);
        breadKnife.position.set(lerp(9, 1.95, enter) + Math.sin(through * Math.PI * 7) * 0.32 * sstep(0, 0.1, through) + exit * 6, BASE + exit * 1.8, lerp(1.95, -1.95, ease(through)));
        breadKnife.rotation.set(0, 0, exit * 0.3);
      }
      const sp = range(P, 0.84, 0.92), fin = range(P, 0.92, 0.985);
      butterKnife.visible = sp > 0 && fin < 1;
      let kx = -10;
      if (butterKnife.visible) {
        const xA = lerp(-3.6, 0.05, ease(sp)), xB = lerp(0.05, 11, ease(fin));
        kx = sp < 1 ? xA : xB;
        const yBase = kx > 0.05 ? BASE + 0.19 + 0.07 : BASE + 0.07;
        const inZ = Math.sin((sp + fin) * Math.PI * 4) * 0.55;
        const lift = (1 - sstep(0, 0.08, sp)) * 1.2;
        butterKnife.position.set(kx, yBase + lift + sstep(3.4, 6, kx) * 1.6, inZ + 0.25);
        butterKnife.rotation.set(-0.32, (sp - 0.5) * 0.4, -0.06);
        butterKnife.userData.dab.scale.set(0.9 * (1 - ease(sp) * 0.7), 0.22, 1.6 * (1 - ease(sp) * 0.5));
      }
      creamPlane.constant = sp > 0 ? (fin >= 1 ? 50 : kx + 0.25) : -50;
      steamAmt = sl > 0.9 ? 0.75 * (1 - fin * 0.6) : 0.25;
      let reveal = 0;
      if (fin > 0 && butterKnife.visible) { projV.copy(butterKnife.position).project(camera); reveal = clamp((projV.x + 1) / 2); }
      else if (fin >= 1) reveal = 1;
      wordIn.style.clipPath = `inset(-10% ${(100 - reveal * 104).toFixed(2)}% -10% 0)`;
      darkEl.style.opacity = (0.42 * sstep(0.9, 0.99, P)).toFixed(3);
      setCap('slice', sl > 0.05 && sl < 0.95);
      setCap('spread', sp > 0.05 && sp < 0.95);
      tmpV.set(lerp(0, -1.72, op), BASE + 0.1, 0);
    } else {
      C.top.position.set(0, 0, 0); C.top.rotation.set(0, 0, 0);
      C.bot.position.set(0, 0, 0); C.bot.rotation.set(0, 0, 0);
      creamPlane.constant = -50;
      wordIn.style.clipPath = 'inset(-10% 100% -10% 0)';
      darkEl.style.opacity = '0';
      setCap('slice', false); setCap('spread', false);
      tmpV.set(C.group.position.x, C.group.position.y, C.group.position.z);
    }

    // ---- steam follows the bagel ----
    steam.visible = steamAmt > 0.01;
    steam.position.copy(tmpV);
    steam.children.forEach((m) => {
      m.material.uniforms.uTime.value = time;
      m.material.uniforms.uOpacity.value = steamAmt;
      m.quaternion.copy(camera.quaternion);
    });

    // ---- camera ----
    if (filmOn) along(filmKeys(), f);
    else if (p < F2) { const sp = stopPose(); cam.pos.copy(sp[0]).add(tmpV.set(c * 0.25, 0, 0)); cam.look.copy(sp[1]); cam.fov = sp[2]; }
    else along(finaleKeys(), q);
    smx += (mx - smx) * Math.min(1, dt * 2.5); smy += (my - smy) * Math.min(1, dt * 2.5);
    const drift = state.forceP != null ? 0 : 1;
    camera.position.set(cam.pos.x + smx * 0.28 * drift, cam.pos.y - smy * 0.15 * drift, cam.pos.z);
    camera.lookAt(cam.look.x + smx * 0.07 * drift, cam.look.y, cam.look.z);
    // handheld micro-drift, well under 0.3°
    camera.rotateX((Math.sin(time * 0.71) * 0.6 + Math.sin(time * 1.37 + 2) * 0.4) * 0.0022 * drift);
    camera.rotateY((Math.sin(time * 0.53 + 1) * 0.6 + Math.sin(time * 1.11) * 0.4) * 0.0022 * drift);
    if (Math.abs(camera.fov - cam.fov) > 0.01) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }

    // ---- film effects ----
    const focusDist = filmOn
      ? lerp(camera.position.distanceTo(oven.openingCenter) + 1.2, camera.position.distanceTo(C.group.position), sstep(B.peelStart, B.peelStart + 0.18, f))
      : camera.position.distanceTo(C.group.position);
    post.update({
      time,
      hazeAmt: filmOn ? Math.min(1, open) * heat * (1 - sstep(0.82, 1, f)) : 0,
      hazeAt: oven.openingTop,
      emberAmt: filmOn ? sstep(B.heatEnd + 0.02, B.heatEnd + 0.12, f) * (1 - sstep(0.86, 1, f)) : 0,
      emberAt: tmpV.set(0, oven.O.open.y0 + 0.9, oven.O.zFront - 0.4),
      focus: focusDist,
      aperture: filmOn ? 0.0022 : 0.0012,
    });

    // ---- overlay text ----
    progEl.style.transform = `scaleX(${(filmOn ? f : p).toFixed(4)})`;
    introEl.style.opacity = String(1 - sstep(B.darkness * 0.6, B.darkness * 1.2, f));
    setCap('heat', filmOn && f > B.darkness + 0.02 && f < B.heatEnd - 0.01);
    setCap('door', filmOn && f > B.heatEnd + 0.02 && f < B.doorEnd);
    setCap('peel', filmOn && f > B.peelStart + 0.02 && f < B.peelEnd - 0.02);
    const heroOn = (filmOn && f > B.heroLines[0] - 0.01) || (!filmOn && c < 0.08);
    toggle(heroEl, 'is-on', heroOn);
    heroLines.forEach((ln, i) => toggle(ln, 'is-in', heroOn && (!filmOn || f >= B.heroLines[i])));
    toggle(heroBtns, 'is-in', heroOn && (!filmOn || f >= B.heroButtons));
    for (let i = 0; i < 3; i++) setCap(String(i), activeTab === i && c > 0.08);
    if (activeTab !== curTab) { tabs.forEach((t, i) => t.setAttribute('aria-selected', String(i === activeTab))); curTab = activeTab; }
    toggle(tabsEl, 'is-away', filmOn || p > F2 + 0.005);
    skipEl.style.opacity = p > 0.97 ? '0' : '1';
  };

  /* ---------------- render loop with quality tiers ---------------- */
  let visible = true, tabVisible = document.visibilityState === 'visible';
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(stageEl);
  document.addEventListener('visibilitychange', () => { tabVisible = document.visibilityState === 'visible'; });
  let tier = 0, ft = 0, fn = 0, warm = 0;
  const qualityLog = [];
  const dropTier = () => {
    tier++;
    if (tier === 1 && post.bokeh) post.bokeh.enabled = false;
    else if (tier === 2) post.setParticles(0.5);
    else if (tier === 3) post.bloom.enabled = false;
    else if (tier === 4) { resScale = 0.75; resize(); }
    qualityLog.push({ tier, at: Math.round(performance.now()) });
  };
  if (!post.bokeh) tier = 1;
  let running = false;
  const loop = (now) => {
    requestAnimationFrame(loop);
    if ((!visible || !tabVisible) && state.forceP == null) { last = now; return; }
    const dtm = now - last;
    update(now);
    post.render();
    if (running && dtm < 250 && now - t0 > 6500) {
      if (warm < 30) { warm++; return; }
      ft += dtm; fn++;
      if (fn >= 60) { if (ft / fn > CFG.frameBudgetMs && tier < 4) dropTier(); ft = 0; fn = 0; }
    }
  };

  // compile every shader before the first visible frame so the door never stutters
  oven.peel.visible = true; C.group.visible = true; steam.visible = true; breadKnife.visible = butterKnife.visible = true; post.points.visible = true;
  try { renderer.compile(scene, camera); } catch (e) { /* not fatal */ }
  update(performance.now());
  post.render();
  stageEl.classList.add('is-lit', 'is-live');
  // if someone already scrolled past the intro (or reloaded mid-page), skip the film
  if (window.scrollY > stageEl.offsetTop + 40) finishFilm(); else lock(true);
  darkEl.style.opacity = '0';
  setTimeout(() => { running = true; }, 1000);
  requestAnimationFrame(loop);

  const idle = window.requestIdleCallback || ((fn2) => setTimeout(fn2, 300));
  const later = (fn2, ms) => setTimeout(() => idle(fn2, { timeout: 2000 }), ms);
  // real studio light for reflections on the crust and steel (Poly Haven HDRI, desktop only)
  if (!PHONE) later(async () => {
    try {
      const { RGBELoader } = await import('three/addons/loaders/RGBELoader.js');
      new RGBELoader().load('assets/pbr/studio_1k.hdr', (hdr) => {
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        const env = pmrem.fromEquirectangular(hdr).texture;
        scene.environment = env;
        scene.environmentRotation.set(0, 2.2, 0);
        hdr.dispose();
      }, undefined, () => { /* keep the built-in studio light */ });
    } catch (e) { /* keep the built-in studio */ }
  }, 3200);
  later(() => buildFlavor('sesame'), 900);
  later(() => buildFlavor('cinnamon'), 1700);
  later(() => { buildSlicing(); try { renderer.compile(scene, camera); } catch (e) { /* ok */ } }, 2500);

  /* ---------------- more live bagels down the page (desktop only) ---------------- */
  const minis = [];
  const makeMini = (canvasEl, opts) => {
    if (!canvasEl) return null;
    let r;
    try { r = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, CFG.maxPixelRatio[TIER]));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = opts.exposure || 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.setClearColor(0x000000, 0);
    const sc = new THREE.Scene();
    sc.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    sc.environmentIntensity = 0.42;
    const cm = new THREE.PerspectiveCamera(opts.fov || 28, 1, 0.1, 60);
    const k = new THREE.SpotLight(0xffd0a0, opts.key || 130, 30, 0.6, 0.9, 1.4);
    k.position.set(3, 8.5, 5); k.target.position.set(0, 1, 0);
    k.castShadow = true; k.shadow.mapSize.set(2048, 2048); k.shadow.radius = 9; k.shadow.bias = -0.0003; k.shadow.normalBias = 0.02;
    sc.add(k, k.target);
    const rm = new THREE.DirectionalLight(0xff9a52, 3.4); rm.position.set(-5, 3.5, -4); sc.add(rm);
    const rm2 = new THREE.DirectionalLight(0xffc68a, 1.6); rm2.position.set(5, 2, -5); sc.add(rm2);
    const fl = new THREE.DirectionalLight(0xffe2c4, 0.45); fl.position.set(-4, 2, 6); sc.add(fl);
    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(opts.blob || 4.6, (opts.blob || 4.6) * 0.8), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.75, color: 0x1a0c05 }));
    catcher.rotation.x = -Math.PI / 2; catcher.position.y = 0.002; sc.add(catcher);
    const m = { r, sc, cam: cm, canvasEl, visible: false, w: 1, h: 1, ready: false, ...opts };
    m.obj = opts.build(sc, m);
    const size = () => { const b = canvasEl.getBoundingClientRect(); m.w = Math.max(1, b.width); m.h = Math.max(1, b.height); r.setSize(m.w, m.h, false); cm.aspect = m.w / m.h; cm.updateProjectionMatrix(); };
    new ResizeObserver(size).observe(canvasEl); size();
    new IntersectionObserver(([e]) => { m.visible = e.isIntersecting; }, { rootMargin: '150px' }).observe(canvasEl);
    minis.push(m);
    return m;
  };
  const driftSeeds = (sc, n, spread) => {
    const mesh = new THREE.InstancedMesh(sesameGeo, seedMat(0xE9D6AE, 0.45), n);
    const rnd = mulberry(404);
    const d = Array.from({ length: n }, () => ({ x: (rnd() - 0.5) * spread, y: rnd() * 4, z: (rnd() - 0.5) * spread * 0.6, s: 0.035 + rnd() * 0.02, sp: 0.08 + rnd() * 0.12, r: rnd() * TAU, rs: (rnd() - 0.5) * 2 }));
    mesh.castShadow = true; sc.add(mesh);
    const m = new THREE.Matrix4(), qq = new THREE.Quaternion(), e = new THREE.Euler(), pp = new V3(), ss = new V3();
    return (t) => {
      d.forEach((o, i) => {
        const y = 4.2 - (((o.y + t * o.sp) % 4.2 + 4.2) % 4.2);
        e.set(o.r + t * o.rs, o.r * 2 + t * o.rs * 0.7, 0); qq.setFromEuler(e);
        pp.set(o.x + Math.sin(t * 0.3 + o.r) * 0.2, y, o.z); ss.set(o.s * 1.2, o.s * 0.32, o.s * 0.75);
        m.compose(pp, qq, ss); mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
  };
  const fadeIn = (m) => { if (!m.ready) { m.ready = true; m.canvasEl.closest('[data-live]')?.classList.add('is-live'); } };
  const buildMinis = () => {
    makeMini($('[data-hero-canvas]'), {
      fov: 26,
      build(sc, m) {
        const g = buildBagel('everything', 13);
        g.visible = true; g.position.set(0, 1.55, 0); g.rotation.set(0.95, 0, -0.28);
        sc.add(g);
        m.seeds = driftSeeds(sc, 34, 7);
        m.cam.position.set(0, 1.85, 7.6); m.cam.lookAt(0, 1.45, 0);
        return g;
      },
      tick(t, m) {
        const g = m.obj, y = window.scrollY;
        g.userData.inner.rotation.y = y * 0.0032 + t * 0.14;
        g.position.y = 1.55 + Math.sin(t * 0.8) * 0.07;
        g.rotation.x = 0.95 + Math.sin(t * 0.5) * 0.04;
        m.seeds(t);
      },
    });
    makeMini($('[data-cater-canvas]'), {
      fov: 26, exposure: 1.05,
      build(sc, m) {
        const stack = new THREE.Group();
        [['sesame', 21], ['poppy', 22], ['everything', 23]].forEach(([id, seed], i) => {
          const g = buildBagel(id, seed);
          g.visible = true;
          g.position.set(Math.sin(i * 2.1) * 0.12, BASE + i * 0.8, Math.cos(i * 2.1) * 0.1);
          g.rotation.set((i - 1) * 0.04, i * 1.9, (i - 1) * -0.05);
          stack.add(g);
        });
        sc.add(stack);
        m.seeds = driftSeeds(sc, 18, 6);
        m.cam.position.set(0, 3.0, 8.4); m.cam.lookAt(0, 1.05, 0);
        return stack;
      },
      tick(t, m) { m.obj.rotation.y = t * 0.16 + window.scrollY * 0.0012; m.seeds(t); },
    });
    const tm = performance.now();
    const miniLoop = (now) => {
      requestAnimationFrame(miniLoop);
      if (!tabVisible) return;
      const t = (now - tm) / 1000;
      minis.forEach((m) => { if (!m.visible) return; m.tick(t, m); m.r.render(m.sc, m.cam); fadeIn(m); });
    };
    requestAnimationFrame(miniLoop);
  };
  if (!PHONE) later(buildMinis, 4200);

  /* ---------------- hooks for the still-image script and QA ---------------- */
  window.HB3D = {
    state, THREE, minis, F1, F2, qualityLog,
    get tier() { return tier; },
    ready: () => builtFlavors.has('cinnamon') && !!cream,
    build: () => { buildFlavor('sesame'); buildFlavor('cinnamon'); buildSlicing(); },
    // render one frame of the film at progress p and return it as an image
    finishFilm,
    get filmOn() { return filmOn; },
    // render one frame and return it as an image: film < 1 shows the oven film at that point
    frame(p, w, hh, type = 'image/png', quality = 0.92, film = null) {
      state.forceP = p; state.freezeTime = 6; state.forceFilm = film;
      renderer.setPixelRatio(1); renderer.setSize(w, hh, false); post.setSize(w, hh, 1);
      camera.aspect = w / hh; camera.updateProjectionMatrix(); W = w; H = hh;
      const now = performance.now();
      update(now); update(now + 16); post.render();
      const url = canvas.toDataURL(type, quality);
      state.forceP = null; state.freezeTime = null; state.forceFilm = null; resize();
      return url;
    },
    async miniShot(i, name, w, hh) {
      const m = minis[i];
      m.r.setPixelRatio(1); m.r.setSize(w, hh, false); m.cam.aspect = w / hh; m.cam.updateProjectionMatrix();
      m.tick(6, m); m.r.render(m.sc, m.cam);
      const url = m.canvasEl.toDataURL('image/png');
      const blob = await (await fetch(url)).blob();
      m.r.setSize(m.w, m.h, false); m.cam.aspect = m.w / m.h; m.cam.updateProjectionMatrix();
      const res = await fetch('/__save?name=' + encodeURIComponent(name), { method: 'POST', body: blob });
      return res.status + ' ' + blob.size;
    },
  };
})();
