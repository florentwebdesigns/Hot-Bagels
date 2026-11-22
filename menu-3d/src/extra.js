// Springfield Hot Bagels: the rest of the real menu in 3D.
// Bakery (croissant, muffin, crumb cake, brownie), deli (Italian hero, turkey club, Greek salad),
// bottled drinks, a dozen bagels and the Breakfast Special. Same rules as bagel.js: generated textures,
// physical materials, no downloaded models. Every item sits on y = 0 and is about 2.4 units wide.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { gen, cached, tex } from './tex.js';
import { perlin, fbm, worley, smooth, mix3, hex, rng, clamp } from './noise.js';
import { mesh, GC, board, top as T0 } from './food.js';
import { mats } from './mats.js';
import * as G from './geo.js';
import { crustDetail, loadModel } from './real.js';
import { bagelPart, BM, FILL, ribbon, softDisc, buildSandwich, buildHotCoffee } from './bagel.js';

const TAU = Math.PI * 2;
const memo = new Map();
const M = (k, f) => { if (!memo.has(k)) memo.set(k, f()); return memo.get(k); };
const Y0 = .085;   // top of the wooden board
const item = (grp, parts, kind, H) => { grp.userData = { parts, kind, H }; return grp; };
const phys = (o) => new THREE.MeshPhysicalMaterial(o);

/* a tube swept along a curve: f(s, th) -> [x, y, z]; u = s, v = th / TAU */
function sweep(key, S, R, f) {
  return GC(key, () => {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= S; i++) for (let j = 0; j <= R; j++) { const s = i / S, th = j / R * TAU; pos.push(...f(s, th)); uv.push(s, j / R); }
    const W = R + 1;
    for (let i = 0; i < S; i++) for (let j = 0; j < R; j++) { const a = i * W + j, b = a + W; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const N = g.attributes.normal;   // weld the seam around the tube
    for (let i = 0; i <= S; i++) { const a = i * W, b = a + R; const x = (N.getX(a) + N.getX(b)) / 2, y = (N.getY(a) + N.getY(b)) / 2, z = (N.getZ(a) + N.getZ(b)) / 2; N.setXYZ(a, x, y, z); N.setXYZ(b, x, y, z); }
    return g;
  });
}
/* per-vertex colour from a function of the (unit) normal direction, for blobby bakes without uv seams */
function paint(g, f) {
  const p = g.attributes.position, col = new Float32Array(p.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const c = f(v); col[i * 3] = c[0] / 255; col[i * 3 + 1] = c[1] / 255; col[i * 3 + 2] = c[2] / 255; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
const lin = (c) => { const k = new THREE.Color(c[0] / 255, c[1] / 255, c[2] / 255); k.convertSRGBToLinear(); return [k.r * 255, k.g * 255, k.b * 255]; };

/* ================= bakery ================= */
const CK = 6;   // croissant: rolled bands
function croissantTex() {
  return cached('croissantT', () => {
    const n = perlin(301), n2 = perlin(302);
    return gen(1024, (u, v, o) => {
      const t = Math.sin(v * TAU);                                   // 1 top, -1 underneath
      const band = Math.pow(Math.sin(Math.PI * CK * u) ** 2, .6);   // 1 in the middle of each roll, 0 in the folds
      const m = fbm(n, u * 14, v * 5, 5) * .5 + .5;
      let c = mix3(hex('#d89a4c'), hex('#8a4512'), smooth(-.2, .9, t) * (.55 + .5 * band) * (.8 + .4 * m));
      c = mix3(c, hex('#f0cf94'), (1 - band) * .55 * smooth(-.5, .6, t));         // pale, flaky folds
      c = mix3(c, hex('#e8c48a'), smooth(-.2, -.8, t) * .6);                       // pale base
      const flake = Math.pow(Math.abs(Math.sin((u * CK * 7 + v * 2.2 + n2(u * 20, v * 6) * .5) * Math.PI)), 14);
      c = mix3(c, hex('#5a2a0c'), flake * .28 * band);                             // laminated layers showing as fine lines
      o.c = c; o.h = band * .6 + m * .2 - flake * .15;
      o.r = clamp(.22 + .4 * (1 - band) + .3 * smooth(.2, -.6, t));
    }, { normal: 4, rough: true, h: 512 });
  });
}
function croissant(r) {
  const g = sweep('croissant', 220, 48, (s, th) => {
    const ph = (s - .5) * 2.4, A = 1.0;
    const px = A * Math.sin(ph), pz = A * (1 - Math.cos(ph)) - .3;
    const nx = Math.sin(ph), nz = -Math.cos(ph);
    const band = Math.pow(Math.sin(Math.PI * CK * s) ** 2, .6);
    const rad = Math.max(.02, .4 * Math.pow(Math.sin(Math.PI * s), .8)) * (.8 + .2 * band);
    const st = Math.sin(th), ct = Math.cos(th);
    const y = (st > 0 ? st * .92 : st * .3) * rad + rad * .3;
    const w = ct * rad * 1.12;
    return [px + nx * w, y, pz + nz * w];
  });
  const t = croissantTex();
  const m = M('croissantM', () => phys({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(1.2, 1.2), roughnessMap: t.roughnessMap, roughness: 1, clearcoat: .6, clearcoatRoughness: .25, sheen: .5, sheenColor: new THREE.Color('#ffcf8a') }));
  return mesh(g, m);
}
export function buildCroissant(rc) {
  const grp = new THREE.Group(), base = new THREE.Group(); grp.add(base); base.add(board());
  const c = croissant(); c.position.y = Y0; c.rotation.y = .2; c.scale.set(1.25, 1.45, 1.25); base.add(c);
  loadModel('assets/3d/croissant/croissant.gltf').then((scan) => {
    const s = scan.clone(true);
    s.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; const m = o.material; o.material = phys({ map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, roughness: 1, metalness: 0, clearcoat: .45, clearcoatRoughness: .3, sheen: .4, sheenColor: new THREE.Color('#ffcf8a') }); } });
    s.scale.setScalar(10); s.position.set(.05, Y0, .1); s.rotation.y = .3;
    base.remove(c); base.add(s);
    const two = s.clone(true); two.scale.setScalar(8); two.position.set(-.35, Y0, -.55); two.rotation.y = 2.4; base.add(two);
    s.position.set(.25, Y0, .35);
  }).catch(() => {});
  return item(grp, [{ obj: c, dir: new THREE.Vector3(0, .4, 0) }], 'bake', .8);
}

function muffinTop(seed) {
  return GC('muffinTop' + seed, () => {
    const W = worley(seed + 3), n = perlin(seed);
    const g = new THREE.SphereGeometry(.8, 128, 64);
    const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {   // lumpy dome with shallow cracks
      v.fromBufferAttribute(p, i); const d = v.clone().normalize();
      v.copy(d).multiplyScalar(.8 * (1 + .09 * fbm(n, d.x * 2.2 + d.z, d.y * 2.2 - d.z * .7, 4))); v.y *= .6; if (v.y < -.05) v.y = -.05;
      const [d1, d2] = W(d.x * 3.2 + 7, d.z * 3.2 + 3), crack = 1 - smooth(0, .07, d2 - d1);
      if (v.y > 0) v.y -= crack * .04 * smooth(.1, .6, d.y);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return paint(g, (v) => {
      const d = v.clone().normalize(), [d1, d2] = W(d.x * 3.2 + 7, d.z * 3.2 + 3), crack = 1 - smooth(0, .07, d2 - d1);
      const m = fbm(n, d.x * 6, d.z * 6 + d.y * 3, 4) * .5 + .5;
      let c = mix3(hex('#c98a3e'), hex('#8e4c18'), smooth(-.1, .9, d.y) * (.6 + .5 * m));
      c = mix3(c, hex('#f2d39a'), crack * .75 * smooth(0, .5, d.y));
      c = mix3(c, hex('#fff2dc'), (fbm(n, d.x * 40, d.z * 40, 2) > .45 ? 1 : 0) * .35 * smooth(.2, .8, d.y));   // sugar sparkle
      return lin(c);
    });
  });
}
export function buildMuffin(rc) {
  const grp = new THREE.Group(), base = new THREE.Group(); grp.add(base); base.add(board());
  const hold = new THREE.Group(); hold.position.y = Y0; base.add(hold);
  const liner = mesh(GC('liner', () => {
    const g = new THREE.LatheGeometry([[0, 0], [.5, 0], [.52, .02], [.64, .62], [.65, .64]].map(p => new THREE.Vector2(p[0], p[1])), 168);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + .035 * Math.cos(a * 30) * smooth(.01, .1, p.getY(i)); p.setX(i, x * k); p.setZ(i, z * k); }
    g.computeVertexNormals(); return g;
  }), M('linerM', () => phys({ color: '#f3ead9', roughness: .7, sheen: .3, side: THREE.DoubleSide })));
  hold.add(liner);
  const topM = M('muffinM', () => phys({ vertexColors: true, roughness: .62, clearcoat: .25, clearcoatRoughness: .5, sheen: .4, sheenColor: new THREE.Color('#ffd49a') }));
  const t = mesh(muffinTop(rc.seed || 7), topM); t.position.y = .6; hold.add(t);
  hold.scale.setScalar(1.15);
  return item(grp, [{ obj: hold, dir: new THREE.Vector3(0, .4, 0) }], 'bake', 1.2);
}

function cakeTex(key, base, dark, holes) {
  return cached('cake' + key, () => {
    const n = perlin(key.length * 9), W = worley(key.length * 9 + 1);
    return gen(512, (u, v, o) => {
      const [d1] = W(u * 40, v * 40), hole = 1 - smooth(.03, .16, d1), m = fbm(n, u * 8, v * 8, 4) * .5 + .5;
      o.c = mix3(mix3(hex(base), hex(dark), m * .35), hex(dark), hole * holes); o.h = (1 - hole) * .5 + m * .2; o.r = .8;
    }, { normal: 3, rough: true });
  });
}
export function buildCrumbCake(rc) {
  const grp = new THREE.Group(), base = new THREE.Group(); grp.add(base); base.add(board());
  const r = rng(rc.seed || 31), hold = new THREE.Group(); hold.position.y = Y0; base.add(hold);
  const t = cakeTex('crumbcake', '#f1d49a', '#c99a58', .5);
  const cake = mesh(GC('cakeSlab', () => { const g = new RoundedBoxGeometry(1.5, .5, 1.0, 3, .03); g.translate(0, .25, 0); return g; }),
    M('cakeM', () => new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: .85 })));
  hold.add(cake);
  // a thick layer of buttery crumbs, some dusted with powdered sugar
  const cg = GC('crumbBit', () => G.blob(.07, 2, .45, 17, .75));
  const N = 420, im = new THREE.InstancedMesh(cg, M('crumbBitM', () => phys({ roughness: .6, sheen: .4, sheenColor: new THREE.Color('#fff0d0') })), N);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), col = new THREE.Color();
  const shades = ['#b8742c', '#9c5a20', '#c98a3e', '#d9a052', '#f3ebe0'];
  for (let i = 0; i < N; i++) {
    const x = (r() - .5) * 1.45, z = (r() - .5) * .95, layer = r();
    e.set(r() * 6, r() * 6, r() * 6); q.setFromEuler(e); const s = .7 + r() * .9; sc.set(s, s * .8, s);
    mtx.compose(new THREE.Vector3(x, .52 + layer * .14 * (1 - Math.pow(Math.max(Math.abs(x) / .75, Math.abs(z) / .5), 6)), z), q, sc);
    im.setMatrixAt(i, mtx);
    col.set(shades[r() < .1 ? 4 : (r() * 4) | 0]); im.setColorAt(i, col);
  }
  im.castShadow = true; im.receiveShadow = true; hold.add(im);
  hold.rotation.y = .5;
  return item(grp, [{ obj: hold, dir: new THREE.Vector3(0, .4, 0) }], 'bake', .9);
}
function brownieTex() {
  return cached('brownieT', () => {
    const W = worley(411), n = perlin(412);
    return gen(512, (u, v, o) => {
      const [d1, d2] = W(u * 18 + n(u * 4, v * 4) * .8, v * 18), crack = 1 - smooth(0, .05, d2 - d1), m = fbm(n, u * 10, v * 10, 4) * .5 + .5;
      o.c = mix3(mix3(hex('#3b1d10'), hex('#24100a'), m * .6), hex('#5a3420'), crack * .4);
      o.h = (1 - crack) * .6 + m * .2; o.r = .22 + crack * .4 + m * .1;
    }, { normal: 4, rough: true });
  });
}
export function buildBrownie(rc) {
  const grp = new THREE.Group(), base = new THREE.Group(); grp.add(base); base.add(board());
  const t = brownieTex();
  const m = M('brownieM', () => phys({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(1.3, 1.3), roughnessMap: t.roughnessMap, roughness: 1, clearcoat: .5, clearcoatRoughness: .25, sheen: .3, sheenColor: new THREE.Color('#a0705a') }));
  const g = GC('brownie', () => { const b = new RoundedBoxGeometry(1.05, .42, 1.05, 4, .06); b.translate(0, .21, 0);
    const p = b.attributes.position, n = perlin(5); for (let i = 0; i < p.count; i++) if (p.getY(i) > .35) p.setY(i, p.getY(i) + .025 * n(p.getX(i) * 4, p.getZ(i) * 4)); b.computeVertexNormals(); return b; });
  const a = mesh(g, m); a.position.set(-.3, Y0, .15); a.rotation.y = .3; base.add(a);
  const b = mesh(g, m); b.position.set(.42, Y0 + .02, -.28); b.rotation.set(.0, -.5, .5); b.scale.setScalar(.85); b.position.y = Y0 + .25; base.add(b);
  return item(grp, [{ obj: a, dir: new THREE.Vector3(-.3, .3, 0) }, { obj: b, dir: new THREE.Vector3(.3, .5, 0) }], 'bake', .9);
}

/* ================= deli ================= */
const HL = 1.2, HW = .42, HH = .36;   // hero roll half-length, half-width, height
const heroE = (x) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / HL, 3)), .5);
function heroHalf(part) {
  return sweep('hero' + part, 120, 40, (s, th) => {
    const x = (s - .5) * 2 * HL, e = Math.max(.02, heroE(x));
    const a = part === 'top' ? th / 2 : Math.PI + th / 2;    // half of the cross-section
    const st = Math.sin(a), ct = Math.cos(a);
    const y = st > 0 ? HH * Math.pow(st, .8) * e : st * HH * .45 * e;
    return [x, y, ct * HW * e];
  });
}
function heroCut() {
  return GC('heroCut', () => {
    const sh = new THREE.Shape(), K = 60;
    for (let i = 0; i <= K; i++) { const x = (i / K - .5) * 2 * HL; const z = HW * heroE(x) * .97; i ? sh.lineTo(x, z) : sh.moveTo(x, z); }
    for (let i = K; i >= 0; i--) { const x = (i / K - .5) * 2 * HL; sh.lineTo(x, -HW * heroE(x) * .97); }
    const g = new THREE.ShapeGeometry(sh, 40); g.rotateX(Math.PI / 2);
    const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * .5 + .5, p.getZ(i) * .5 + .5);
    return g;
  });
}
function heroTex() {
  return cached('heroT', () => {
    const n = perlin(501);
    return gen(1024, (u, v, o) => {
      const t = Math.sin(v * TAU * .5);   // top half: v 0..1 is 0..PI
      const m = fbm(n, u * 10, v * 4, 5) * .5 + .5;
      let c = mix3(hex('#dcaa66'), hex('#a35a1e'), smooth(.1, .9, t) * (.7 + .5 * m));
      const slash = Math.pow(Math.max(0, Math.sin((u * 5 + v * .8) * Math.PI)), 60) * smooth(.5, .9, t);   // baker's scores
      c = mix3(c, hex('#f2d6a0'), slash * .8);
      o.c = c; o.h = m * .4 - slash * .4; o.r = .5 - .2 * t;
    }, { normal: 3, rough: true, h: 512 });
  });
}
function meatTex(key, base, fat, spots) {
  return cached('meat' + key, () => {
    const W = worley(key.length * 13), n = perlin(key.length * 13 + 1);
    return gen(256, (u, v, o) => {
      const [d1] = W(u * spots, v * spots), f = 1 - smooth(.08, .2, d1), m = fbm(n, u * 6, v * 6, 4) * .5 + .5;
      const rim = smooth(.42, .5, Math.hypot(u - .5, v - .5));
      o.c = mix3(mix3(mix3(hex(base), [255, 255, 255], m * .08), hex(fat), f * .85), hex(base).map(x => x * .7), rim * .6); o.h = m * .3 + f * .2;
    }, { normal: 1.5 });
  });
}
function disc(key, R, mBase, mFace) {
  const g = GC('disc' + key, () => new THREE.CylinderGeometry(R, R, .025, 40));
  const o = new THREE.Mesh(g, [mBase, mFace, mFace]); o.castShadow = o.receiveShadow = true; return o;
}
const HM = {
  hero: () => M('heroM', () => { const t = heroTex(); return phys({ map: t.map, normalMap: crustDetail(3), normalScale: new THREE.Vector2(1.2, 1.2), clearcoatNormalMap: crustDetail(3), roughnessMap: t.roughnessMap, roughness: 1, clearcoat: .35, clearcoatRoughness: .4, sheen: .4, sheenColor: new THREE.Color('#ffd09a') }); }),
  salami: () => M('salamiM', () => { const t = meatTex('salami', '#9a2a26', '#f2d8cc', 14); return phys({ map: t.map, normalMap: t.normalMap, roughness: .4, clearcoat: .4 }); }),
  pepperoni: () => M('pepM', () => { const t = meatTex('pepperoni', '#b8401e', '#e89a6a', 9); return phys({ map: t.map, normalMap: t.normalMap, roughness: .35, clearcoat: .5 }); }),
  meatSide: () => M('meatSide', () => phys({ color: '#7a2018', roughness: .5 })),
  ham: () => M('hamM', () => phys({ color: '#f0a7a0', roughness: .4, clearcoat: .4, sheen: .4, sheenColor: new THREE.Color('#ffd8d0'), side: THREE.DoubleSide })),
  provolone: () => M('provM', () => phys({ color: '#f4e7b8', roughness: .35, clearcoat: .4, sheen: .5, side: THREE.DoubleSide })),
};
export function buildHero(rc) {
  const grp = new THREE.Group(), base = new THREE.Group(); grp.add(base); base.add(board(1.45));
  const r = rng(rc.seed || 41), hold = new THREE.Group(); hold.position.y = Y0; base.add(hold);
  const bot = mesh(heroHalf('bottom'), HM.hero()); bot.position.y = HH * .45; hold.add(bot);
  const cutY = HH * .45, cf = mesh(heroCut(), BM.crumb(), false, true); cf.position.y = cutY + .002; hold.add(cf);
  let y = cutY + .01;
  const lay = (o, h) => { o.position.y += y; hold.add(o); y += h; };
  // the works: ham, salami, pepperoni, provolone, lettuce, tomato
  const ham = mesh(ribbon('heroHam', HL * 2.05, HW * 2.5, 5, .035, .5), HM.ham()); lay(ham, .05);
  for (let i = 0; i < 7; i++) { const o = disc('salami', .27, HM.meatSide(), HM.salami()); o.position.set((i - 3) * .32, .03 + (i % 2) * .02, (r() - .5) * .25 + (i % 2 ? .22 : -.2)); o.rotation.set((i % 2 ? -.35 : .35), r(), 0); lay(o, 0); }
  y += .06;
  for (let i = 0; i < 6; i++) { const o = disc('pep', .17, HM.meatSide(), HM.pepperoni()); o.position.set((i - 2.5) * .38, .02, (i % 2 ? .3 : -.3)); o.rotation.set(i % 2 ? -.5 : .5, 0, 0); lay(o, 0); }
  y += .03;
  const prov = mesh(ribbon('heroProv', HL * 1.9, HW * 2.3, 3, .02, .45), HM.provolone()); lay(prov, .03);
  const let1 = mesh(ribbon('heroLet', HL * 2.1, HW * 2.8, 9, .05, .55), BM.lettuce()); lay(let1, .05);
  for (let i = 0; i < 5; i++) { const o = T0.tomato(r); o.scale.set(1.5, 1, 1.5); o.position.set((i - 2) * .45, .02, (i % 2 ? .12 : -.12)); lay(o, 0); }
  y += .05;
  const lid = new THREE.Group(); lid.position.set(0, y, -HW); lid.rotation.x = -.42; hold.add(lid);
  const topH = mesh(heroHalf('top'), HM.hero()); topH.position.z = HW; lid.add(topH);
  const tcf = mesh(heroCut(), BM.crumb(), false, true); tcf.rotation.x = Math.PI; tcf.position.set(0, -.002, HW); lid.add(tcf);
  hold.rotation.y = .25;
  return item(grp, [{ obj: hold, dir: new THREE.Vector3(0, .5, 0) }], 'sandwich', 1.0);
}

const TS = 1.15;   // club: toast triangle leg length
function triGeo(key, s, depth, bevel) {
  return GC('tri' + key, () => {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(s, 0); sh.lineTo(0, s); sh.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4 });
    const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / s, p.getY(i) / s);
    g.translate(-s / 3, -s / 3, 0); g.rotateX(-Math.PI / 2);   // centroid at origin, extrusion goes up (+y)
    return g;
  });
}
function toastTex() {
  return cached('toastT', () => {
    const n = perlin(601), W = worley(602);
    return gen(512, (u, v, o) => {
      const d = Math.min(u, v, (1 - u - v) / 1.414), m = fbm(n, u * 6, v * 6, 4) * .5 + .5, [d1] = W(u * 50, v * 50);
      let c = mix3(hex('#efd29a'), hex('#c98a44'), m * .7);
      c = mix3(c, hex('#8a4a1c'), smooth(.07, .01, d));    // crust
      c = mix3(c, hex('#d8a868'), (1 - smooth(.02, .12, d1)) * .4);
      o.c = c; o.h = m * .4 + (1 - smooth(.02, .12, d1)) * -.2; o.r = .7;
    }, { normal: 2.5, rough: true });
  });
}
function clubWedge(r) {
  const w = new THREE.Group(); let y = 0;
  const tm = M('toastM', () => { const t = toastTex(); return [phys({ map: t.map, normalMap: t.normalMap, roughness: .75, sheen: .3 }), phys({ color: '#9a5a26', roughness: .7 })]; });
  const toast = () => { const o = new THREE.Mesh(triGeo('toast', TS, .12, .025), tm); o.castShadow = o.receiveShadow = true; o.position.y = y + .025; w.add(o); y += .17; };
  const layer = (mat, h, s = 1.06, key) => { const o = mesh(triGeo(key, TS * s, h, .012), mat); o.position.y = y + .012; o.scale.set(1, 1, 1); w.add(o); y += h + .02; };
  toast(); layer(BM.turkey(), .07, 1.05, 'ly1'); layer(BM.lettuce(), .025, 1.1, 'ly2'); toast();
  layer(BM.bacon(), .035, 1.08, 'ly3'); layer(mats.tomato(), .045, 1.04, 'ly4'); layer(BM.lettuce(), .025, 1.1, 'ly2'); toast();
  const pick = mesh(GC('pick', () => new THREE.CylinderGeometry(.012, .012, y + .25, 8)), mats.pick()); pick.position.y = (y + .25) / 2; w.add(pick);
  const frill = mesh(GC('frill', () => { const g = new THREE.SphereGeometry(.06, 16, 10); g.scale(1, 1.6, 1); return g; }), mats.flat('#c8322a', .4)); frill.position.y = y + .26; w.add(frill);
  return w;
}
export function buildClub(rc) {
  const grp = new THREE.Group(), base = new THREE.Group(); grp.add(base); base.add(board());
  const r = rng(rc.seed || 51);
  const a = clubWedge(r); a.position.set(-.35, Y0, .25); a.rotation.y = .5; base.add(a);
  const b = clubWedge(r); b.rotation.set(0, 0, 0); const bh = new THREE.Group(); bh.add(b); b.rotation.x = -1.05; b.position.set(0, .34, 0);
  bh.position.set(.45, Y0, -.35); bh.rotation.y = -2.4; base.add(bh);
  return item(grp, [{ obj: a, dir: new THREE.Vector3(-.4, .4, .2) }, { obj: bh, dir: new THREE.Vector3(.4, .5, -.2) }], 'sandwich', 1.1);
}

export function buildSalad(rc) {
  const grp = new THREE.Group(), base = new THREE.Group(); grp.add(base); base.add(board());
  const r = rng(rc.seed || 61), bowl = new THREE.Group(); bowl.position.y = Y0; base.add(bowl);
  const prof = [[0, 0], [.42, 0], [.46, .03], [.95, .32], [1.12, .44], [1.15, .47], [1.1, .47], [.92, .35], [.44, .08], [0, .08]];
  bowl.add(mesh(GC('sbowlO', () => new THREE.LatheGeometry(prof.slice(0, 6).map(p => new THREE.Vector2(p[0], p[1])), 112)), BM.bowl()));
  bowl.add(mesh(GC('sbowlI', () => new THREE.LatheGeometry(prof.slice(5).map(p => new THREE.Vector2(p[0], p[1])), 112)), BM.bowl()));
  const dome = (rr) => .2 + .28 * (1 - rr * rr);
  const rom = M('romaine', () => { const m = mats.spinach().clone(); m.color = new THREE.Color('#d8f0a0'); return m; });
  for (let i = 0; i < 46; i++) {   // romaine
    const a = r() * TAU, rr = Math.sqrt(r()) * .85, o = T0.leaf(r, 'spinach');
    o.traverse((c) => { if (c.isMesh) c.material = rom; });
    o.scale.multiplyScalar(1.5); o.position.set(Math.cos(a) * rr, dome(rr) - .04, Math.sin(a) * rr);
    o.rotation.set(-1.45 + r() * .5, a + Math.PI / 2 + (r() - .5), (r() - .5) * .6); bowl.add(o);
  }
  const put = (o, lift = .02) => { const a = r() * TAU, rr = Math.sqrt(r()) * .7; o.position.set(Math.cos(a) * rr, dome(rr) + lift, Math.sin(a) * rr); bowl.add(o); return o; };
  for (let i = 0; i < 6; i++) { const o = put(T0.tomato(r)); o.scale.set(1.3, 1.6, 1.3); o.rotation.x = .5 + r() * .5; }
  const cuc = [M('cucSkin', () => phys({ color: '#2f5a1e', roughness: .3, clearcoat: .6 })), M('cucFace', () => phys({ color: '#d6e8a8', roughness: .4, sheen: .4, clearcoat: .3 }))];
  for (let i = 0; i < 7; i++) { const o = new THREE.Mesh(GC('cuc', () => new THREE.CylinderGeometry(.14, .14, .04, 32)), [cuc[0], cuc[1], cuc[1]]); o.castShadow = o.receiveShadow = true; put(o, .03).rotation.set(r() - .5, r() * 6, r() - .5); }
  const olive = M('olive', () => phys({ color: '#2a1424', roughness: .15, clearcoat: 1, clearcoatRoughness: .08 }));
  for (let i = 0; i < 8; i++) { const o = mesh(GC('olive', () => { const g = new THREE.SphereGeometry(.07, 20, 14); g.scale(1, .75, .75); return g; }), olive); put(o, .05).rotation.y = r() * 6; }
  for (let i = 0; i < 4; i++) { const o = mesh(GC('onionRing', () => new THREE.TorusGeometry(.2, .018, 8, 40)), BM.onion()); put(o, .04).rotation.set(Math.PI / 2 + (r() - .5) * .6, 0, r()); }
  for (let i = 0; i < 12; i++) { const o = T0.feta(r); o.scale.multiplyScalar(1.9); put(o, .06); }
  for (let i = 0; i < 3; i++) { const o = mesh(GC('dolma', () => new THREE.CapsuleGeometry(.07, .2, 6, 14)), M('dolmaM', () => phys({ color: '#4c5a24', roughness: .35, clearcoat: .6 }))); put(o, .06).rotation.set(Math.PI / 2, r() * 6, 0); }
  return item(grp, [{ obj: bowl, dir: new THREE.Vector3(0, .3, 0) }], 'soup', .9);
}

/* ================= bottled drinks (unbranded) ================= */
const BOTTLES = {
  water: { prof: [[0, 0], [.27, 0], [.3, .03], [.3, 1.2], [.28, 1.32], [.16, 1.56], [.115, 1.66], [.115, 1.74]], fill: 1.55, cap: '#3c7fc9', label: [.5, 1.0] },
  juice: { prof: [[0, 0], [.3, 0], [.33, .04], [.34, .45], [.29, .58], [.34, .72], [.34, 1.0], [.24, 1.22], [.16, 1.32], [.16, 1.4]], fill: 1.25, cap: '#f08a1c', label: [.12, .45] },
  soda: { prof: [[0, 0], [.22, 0], [.27, .04], [.3, .25], [.28, .45], [.3, .62], [.3, 1.1], [.22, 1.4], [.12, 1.62], [.11, 1.72], [.11, 1.78]], fill: 1.5, cap: '#c9a03c', label: [.7, 1.08] },
};
function labelTex(kind) {
  return cached('label' + kind, () => {
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256; const c = cv.getContext('2d');
    if (kind === 'water') {
      const gr = c.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#e9f4fb'); gr.addColorStop(1, '#9fc8e6'); c.fillStyle = gr; c.fillRect(0, 0, 1024, 256);
      c.strokeStyle = 'rgba(40,110,180,.55)'; c.lineWidth = 6; for (let k = 0; k < 3; k++) { c.beginPath(); for (let x = 0; x <= 1024; x += 8) c.lineTo(x, 150 + k * 26 + Math.sin(x / 1024 * TAU * 4 + k) * 10); c.stroke(); }
    } else if (kind === 'juice') {
      c.fillStyle = '#f39a1e'; c.fillRect(0, 0, 1024, 256); c.fillStyle = '#fff7e6'; c.fillRect(0, 30, 1024, 14); c.fillRect(0, 212, 1024, 14);
      for (const cx of [256, 768]) { c.fillStyle = '#ffd36a'; c.beginPath(); c.arc(cx, 128, 70, 0, TAU); c.fill(); c.strokeStyle = '#fff3d6'; c.lineWidth = 7; c.stroke(); for (let k = 0; k < 8; k++) { c.beginPath(); c.moveTo(cx, 128); c.lineTo(cx + Math.cos(k / 8 * TAU) * 64, 128 + Math.sin(k / 8 * TAU) * 64); c.stroke(); } }
    } else {
      c.fillStyle = '#1d2a3a'; c.fillRect(0, 0, 1024, 256); c.fillStyle = '#d9b25a'; c.fillRect(0, 40, 1024, 8); c.fillRect(0, 208, 1024, 8);
      c.strokeStyle = 'rgba(217,178,90,.6)'; c.lineWidth = 3; for (let x = 0; x < 1024; x += 64) { c.beginPath(); c.arc(x + 32, 128, 30, 0, TAU); c.stroke(); }
    }
    return tex(cv, true, { repeat: true });
  });
}
export function buildBottle(rc) {
  const grp = new THREE.Group(), B = BOTTLES[rc.kind] || BOTTLES.water, hTop = B.prof[B.prof.length - 1][1];
  const shell = mesh(GC('bottle' + rc.kind, () => G.lathe(B.prof, 72)), mats.glass(), false, false); shell.renderOrder = 2; grp.add(shell);
  // liquid: the same profile pulled in a little, up to the fill line
  const inner = []; for (const [x, y] of B.prof) { if (y > B.fill) break; inner.push([Math.max(0, x - .018), Math.max(.015, y)]); }
  const rAt = (yy) => { for (let i = 1; i < B.prof.length; i++) { const [x0, y0] = B.prof[i - 1], [x1, y1] = B.prof[i]; if (yy <= y1) return x0 + (x1 - x0) * (yy - y0) / Math.max(1e-6, y1 - y0); } return .1; };
  inner.push([rAt(B.fill) - .018, B.fill], [0, B.fill]); inner.unshift([0, .015]);
  const lm = M('liq' + rc.kind, () => rc.kind === 'water' ? phys({ color: '#eaf6ff', roughness: .02, transmission: 1, thickness: .5, ior: 1.33, transparent: true })
    : rc.kind === 'juice' ? phys({ color: '#f59a14', roughness: .3, sheen: .5, sheenColor: new THREE.Color('#ffd27a'), clearcoat: .3 })
      : phys({ color: '#3a1408', roughness: .1, clearcoat: 1, clearcoatRoughness: .05, sheen: .3, sheenColor: new THREE.Color('#c0602a') }));
  const L = mesh(GC('bliq' + rc.kind, () => G.lathe(inner, 64)), lm, false, false); L.renderOrder = 1; grp.add(L);
  const [l0, l1] = B.label, lab = mesh(GC('blab' + rc.kind, () => new THREE.CylinderGeometry(rAt((l0 + l1) / 2) + .006, rAt((l0 + l1) / 2) + .006, l1 - l0, 72, 1, true)),
    M('labM' + rc.kind, () => phys({ map: labelTex(rc.kind), roughness: .35, clearcoat: .5, side: THREE.FrontSide })), false, false);
  lab.position.y = (l0 + l1) / 2; lab.renderOrder = 3; grp.add(lab);
  const capR = B.prof[B.prof.length - 1][0] + .015;
  const cap = mesh(GC('bcap' + rc.kind, () => { const g = new THREE.CylinderGeometry(capR, capR, .17, 48, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + .025 * Math.cos(a * 36); p.setX(i, x * k); p.setZ(i, z * k); } g.computeVertexNormals(); return g; }),
    M('capM' + rc.kind, () => phys({ color: B.cap, roughness: .35, clearcoat: .6 })));
  cap.position.y = hTop + .07; grp.add(cap);
  grp.scale.setScalar(rc.kind === 'juice' ? 1.05 : 1);
  return item(grp, [{ obj: shell, dir: new THREE.Vector3(0, 0, 0) }], 'drink', hTop + .2);
}

/* ================= combos ================= */
export function buildDozen(rc, opts = {}) {
  const grp = new THREE.Group(), base = new THREE.Group(); grp.add(base); base.add(board(1.42));
  const lite = true, s = .52, flav = ['everything', 'sesame', 'poppy', 'cinnamon', 'plain', 'everything'];
  const put = (f, i, x, y, z, rx, ry, rz) => { const b = bagelPart(f, 'full', 70 + i, lite); b.scale.setScalar(s); b.position.set(x, Y0 + y, z); b.rotation.set(rx, ry, rz); base.add(b); return b; };
  const ring = [];
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .4; ring.push(put(flav[i], i, Math.cos(a) * .62, 0, Math.sin(a) * .62, 0, a, 0)); }
  const t = put(flav[4], 4, 0, .2, 0, .05, 1, .04);
  const lean = put(flav[5], 5, .05, .3, .55, -1.05, .2, 0);
  return item(grp, [{ obj: t, dir: new THREE.Vector3(0, .6, 0) }, { obj: lean, dir: new THREE.Vector3(0, .3, .5) }], 'bagel', .9);
}
export function buildSpecial(rc, opts = {}) {
  const grp = new THREE.Group();
  const s = buildSandwich({ type: 'sandwich', bread: 'everything', seed: 11, fill: ['egg', 'bacon', 'cheese'] }, opts); s.scale.setScalar(.86); s.position.set(-.38, 0, .1); grp.add(s);
  const c = buildHotCoffee({ seed: 16 }, opts); c.scale.setScalar(.62); c.position.set(1.15, 0, -.45); grp.add(c);
  return item(grp, [{ obj: s, dir: new THREE.Vector3(-.4, .3, 0) }, { obj: c, dir: new THREE.Vector3(.5, .3, 0) }], 'sandwich', 1.1);
}

export const EXTRA = {
  croissant: buildCroissant, muffin: buildMuffin, crumbcake: buildCrumbCake, brownie: buildBrownie,
  hero: buildHero, club: buildClub, salad: buildSalad, bottle: buildBottle, dozen: buildDozen, special: buildSpecial,
};
