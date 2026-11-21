// Springfield Hot Bagels: procedural bagels, bagel sandwiches, a deli roll, a wrap, soup and coffee.
// Built in the same way as the Crepe Craft items (generated textures, physical materials, no downloaded models).
// Every item is a THREE.Group sitting on y = 0, about 2.4 units wide, on the engraved wooden board.
import * as THREE from 'three';
import { gen, cached } from './tex.js';
import { perlin, fbm, worley, smooth, mix3, hex, rng, clamp } from './noise.js';
import { mesh, GC, board, top as T0, buildDrink, getSticker } from './food.js';
import { mats } from './mats.js';
import { EXTRA } from './extra.js';

const TAU = Math.PI * 2;
const memo = new Map();
const M = (k, f) => { if (!memo.has(k)) memo.set(k, f()); return memo.get(k); };

/* ================= textures ================= */
// crust laid out on the torus: u around the ring (seamless), v around the tube (v .25 = top, .75 = bottom)
function crustTex(kind, size = 1024) {
  return cached('crust' + kind + size, () => {
    const n = perlin(kind.length * 17 + 3), n2 = perlin(91), W = worley(33);
    const top = hex(kind === 'cinnamon' ? '#6e3414' : kind === 'plain' ? '#8a4616' : '#7c3d12');
    const side = hex(kind === 'cinnamon' ? '#9c5a28' : '#b06a28');
    const under = hex('#d2a66c'), scorch = hex('#5a2c10'), swirl = hex('#5b2e14');
    return gen(size, (u, v, o) => {
      const a = u * TAU, cx = Math.cos(a) * 3, cy = Math.sin(a) * 3;
      const t = Math.sin(v * TAU);                           // 1 top, -1 bottom
      const m = fbm(n, cx + v * 5.1, cy + v * 3.7, 5) * .5 + .5;
      let c = mix3(side, top, smooth(-.1, .9, t) * (.75 + .5 * m));
      const fleck = fbm(n2, cx * 9 + v * 31, cy * 9 - v * 17, 3);
      c = mix3(c, hex('#4a200a'), smooth(.35, .7, fleck) * .25 * smooth(0, .9, t));   // darker toasted mottling
      c = mix3(c, hex('#e9b878'), smooth(.25, .55, -fleck) * .12);
      c = mix3(c, under, smooth(-.15, -.7, t));
      // oven-board marks and small scorches underneath, a darker ring where the top meets the side
      c = mix3(c, scorch, smooth(.62, .8, fbm(n2, cx * 2 + 9, cy * 2 + v * 8, 4) * .5 + .5) * smooth(-.3, -.8, t) * .6);
      c = mix3(c, scorch, Math.exp(-Math.pow((t - .2) / .12, 2)) * .12);
      if (kind === 'cinnamon') {
        const s = Math.sin(a * 5 + v * TAU * 2 + 2 * n(cx, cy)) * .5 + .5;
        c = mix3(c, swirl, smooth(.72, .95, s) * .75 * smooth(-.6, .2, t));
      }
      const [d1] = W(cx * 14 + v * 40, cy * 14 + v * 22);
      const blister = (1 - smooth(.0, .35, d1)) * smooth(0, .8, t);
      c = mix3(c, mix3(c, [255, 220, 170], .22), blister * .5);
      o.c = c;
      o.h = m * .55 + blister * .35;
      o.r = clamp(.24 + .42 * smooth(.6, -.6, t) + .12 * (1 - m));   // egg-washed top is glossy, the bottom is matte
    }, { normal: 3, rough: true, repeat: true, h: size / 2 });
  });
}
function crumbTex(size = 512) {
  return cached('crumb' + size, () => {
    const n = perlin(12), W = worley(14);
    return gen(size, (u, v, o) => {
      const [d1] = W(u * 46, v * 46);
      const hole = 1 - smooth(.04, .2, d1);
      const m = fbm(n, u * 6, v * 6, 4) * .5 + .5;
      let c = mix3(hex('#efdcb8'), hex('#e2c595'), m * .6);
      c = mix3(c, hex('#b98f5a'), hole * .55);
      o.c = c; o.h = (1 - hole) * .5 + m * .2; o.r = .8;
    }, { normal: 2.5, rough: true, repeat: true });
  });
}
function bunTex(size = 512) {   // kaiser roll: golden dome (v -> 1 at the top), pale at the cut
  return cached('bun' + size, () => {
    const n = perlin(41);
    return gen(size, (u, v, o) => {
      const a = u * TAU, m = fbm(n, Math.cos(a) * 3 + v * 4, Math.sin(a) * 3, 5) * .5 + .5;
      let c = mix3(hex('#d9a964'), hex('#9c5722'), smooth(.05, .7, v) * (.8 + .4 * m));
      o.c = c; o.h = m * .5; o.r = .45 + .3 * (1 - v);
    }, { normal: 2, rough: true, repeat: true });
  });
}
export function stripeTex(key, base, stripe, freq, size = 256, wavy = .3) {
  return cached('stripe' + key, () => {
    const n = perlin(key.length * 7 + 5);
    return gen(size, (u, v, o) => {
      const s = Math.sin((v * freq + wavy * n(u * 4, v * 3)) * TAU) * .5 + .5;
      const k = smooth(.55, .8, s);
      o.c = mix3(hex(base), hex(stripe), k); o.h = k * .4 + .2 * n(u * 12, v * 12); o.r = .45;
    }, { normal: 2, rough: true, repeat: true });
  });
}
export function spotsTex(key, base, spot, density, size = 512) {   // tortilla, soup broth
  return cached('spots' + key, () => {
    const n = perlin(key.length * 11), W = worley(key.length * 3 + 1);
    return gen(size, (u, v, o) => {
      const [d1] = W(u * 18, v * 18);
      const s = (1 - smooth(.02, .25, d1)) * (n(u * 7, v * 7) > density ? 1 : 0);
      const m = fbm(n, u * 5, v * 5, 4) * .5 + .5;
      o.c = mix3(mix3(hex(base), [255, 255, 255], m * .12), hex(spot), s * .7); o.h = m * .4; o.r = .55;
    }, { normal: 1.5, rough: true, repeat: true });
  });
}
function fillingTex(k = 'deli', size = 512) {   // cut face of the wrap: lettuce, tomato, turkey, cheese in a spiral
  return cached('wrapfill' + k, () => {
    const n = perlin(77), W = worley(78);
    const cols = (k === 'buffalo' ? ['#6f9d34', '#c8312a', '#d9642a', '#c4521e', '#8fbf4a', '#f4efe2', '#e07a3a'] : ['#6f9d34', '#c8312a', '#e9c2a6', '#f0b43a', '#8fbf4a', '#f4efe2']).map(hex);
    return gen(size, (u, v, o) => {
      const x = u - .5, y = v - .5, r = Math.hypot(x, y) * 2, a = Math.atan2(y, x);
      const [d1, id] = W(u * 10 + n(u * 3, v * 3) * .6, v * 10);
      let c = cols[Math.abs(Math.floor((id ?? d1 * 97) * 13)) % cols.length];
      const spiral = Math.sin(a + r * 18) * .5 + .5;
      c = mix3(c, hex('#efe1c4'), smooth(.8, .95, spiral) * .9);    // tortilla layers spiralling in
      o.c = mix3(c, hex('#e9d6b0'), smooth(.9, .98, r)); o.h = (1 - d1) * .3; o.r = .5;
    }, { normal: 2, rough: true });
  });
}

function creamTex(k, size = 512) {   // spread with a knife: soft swirl ridges (and scallion flecks)
  return cached('cream' + k, () => {
    const n = perlin(k.length * 5 + 61), W = worley(62);
    return gen(size, (u, v, o) => {
      const x = u - .5, y = v - .5, r = Math.hypot(x, y), a = Math.atan2(y, x);
      const ridge = Math.sin(a * 3 + r * 26 + 2.5 * n(u * 3, v * 3)) * .5 + .5;
      const m = fbm(n, u * 9, v * 9, 4) * .5 + .5;
      let c = mix3(hex('#fbf7ef'), hex('#ece3d2'), (1 - ridge) * .35 + m * .2);
      if (k === 'scallion') { const [d1] = W(u * 40, v * 40); const f = (1 - smooth(.02, .1, d1)) * (n(u * 30, v * 30) > .1 ? 1 : 0); c = mix3(c, hex('#4f8a2a'), f * .9); }
      o.c = c; o.h = smooth(.3, .9, ridge) * .5 + m * .25;
    }, { normal: 3 });
  });
}
function lettuceTex(size = 512) {   // iceberg / green leaf: pale ribs fanning out from the middle
  return cached('lettuceT', () => {
    const n = perlin(88);
    return gen(size, (u, v, o) => {
      const x = u - .5, y = v - .5, r = Math.hypot(x, y) * 2, a = Math.atan2(y, x);
      const vein = Math.pow(Math.abs(Math.sin(a * 7 + n(u * 4, v * 4) * .8)), 18) * smooth(.05, .3, r);
      const m = fbm(n, u * 8, v * 8, 4) * .5 + .5;
      let c = mix3(hex('#5f9a2e'), hex('#a9cf5a'), m * .6 + r * .25);
      c = mix3(c, hex('#e4f2b8'), vein * .8);
      o.c = c; o.h = m * .5 - vein * .4 + Math.sin(r * 40 + m * 6) * .05;
    }, { normal: 3 });
  });
}
function taylorTex(size = 512) {   // pork roll: pink centre, browned seared rim and grill marks
  return cached('taylorT', () => {
    const n = perlin(31);
    return gen(size, (u, v, o) => {
      const r = Math.hypot(u - .5, v - .5) * 2, m = fbm(n, u * 7, v * 7, 4) * .5 + .5;
      let c = mix3(hex('#e39a8a'), hex('#c9725e'), m * .5);
      c = mix3(c, hex('#7a3a1e'), smooth(.7, .98, r) * .85 + smooth(.55, .8, m) * .25);
      o.c = c; o.h = m * .4;
    }, { normal: 2 });
  });
}
function pastramiTex(size = 512) {   // deep red slices with a peppery, dark edge and white fat seams
  return cached('pastramiT', () => {
    const n = perlin(51), W = worley(52);
    return gen(size, (u, v, o) => {
      const m = fbm(n, u * 6, v * 3, 5) * .5 + .5;
      let c = mix3(hex('#8e2a22'), hex('#c4554a'), m * .6);
      const seam = Math.pow(Math.abs(Math.sin((v * 3 + n(u * 3, v * 2) * .6) * Math.PI)), 30);
      c = mix3(c, hex('#f0d2c0'), seam * .7);
      const edge = smooth(.78, .97, Math.abs(v - .5) * 2);
      const [d1] = W(u * 60, v * 60); const pep = (1 - smooth(.03, .12, d1)) * edge;
      c = mix3(c, hex('#3a1a10'), edge * .7); c = mix3(c, hex('#0e0806'), pep);
      o.c = c; o.h = m * .4 + pep * .5 - seam * .2; o.r = .45;
    }, { normal: 2.5, rough: true, repeat: true });
  });
}

/* ================= materials ================= */
export const BM = {
  crust: (kind) => M('crust' + kind, () => { const t = crustTex(kind); return new THREE.MeshPhysicalMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(1.1, 1.1), roughnessMap: t.roughnessMap, roughness: 1, clearcoat: .55, clearcoatRoughness: .28, sheen: .45, sheenRoughness: .5, sheenColor: new THREE.Color('#ffc98a') }); }),
  crumb: () => M('crumb', () => { const t = crumbTex(); t.map.repeat.set(2, 2); t.normalMap.repeat.set(2, 2); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: .85 }); }),
  bun: () => M('bun', () => { const t = bunTex(); return new THREE.MeshPhysicalMaterial({ map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1, clearcoat: .3, clearcoatRoughness: .4, sheen: .3, sheenColor: new THREE.Color('#ffd09a') }); }),
  creamCheese: (k = 'plain') => M('cc' + k, () => { const t = creamTex(k); return new THREE.MeshPhysicalMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(1.3, 1.3), roughness: .38, sheen: .6, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: .5, clearcoat: .25, clearcoatRoughness: .3 }); }),
  lox: () => M('lox', () => { const t = stripeTex('lox', '#f07a4c', '#ffd2b8', 9, 256, .5); return new THREE.MeshPhysicalMaterial({ map: t.map, normalMap: t.normalMap, roughness: .3, clearcoat: .7, clearcoatRoughness: .15, sheen: .4, sheenColor: new THREE.Color('#ffb08a'), side: THREE.DoubleSide, transmission: .0 }); }),
  bacon: () => M('bacon', () => { const t = stripeTex('bacon', '#8e2a16', '#e8b48a', 6, 256, .9); return new THREE.MeshPhysicalMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(1.6, 1.6), roughness: .38, clearcoat: .6, clearcoatRoughness: .25, side: THREE.DoubleSide }); }),
  american: () => M('american', () => new THREE.MeshPhysicalMaterial({ color: '#f2a634', roughness: .3, clearcoat: .6, clearcoatRoughness: .2, sheen: .4, sheenColor: new THREE.Color('#ffd27a'), side: THREE.DoubleSide })),
  lettuce: () => M('lettuce', () => { const t = lettuceTex(); return new THREE.MeshPhysicalMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(1.5, 1.5), roughness: .4, clearcoat: .5, clearcoatRoughness: .3, sheen: .4, sheenColor: new THREE.Color('#d8ff9a'), side: THREE.DoubleSide }); }),
  taylor: () => M('taylor', () => { const t = taylorTex(); return new THREE.MeshPhysicalMaterial({ map: t.map, normalMap: t.normalMap, roughness: .42, clearcoat: .45, clearcoatRoughness: .3, sheen: .3, side: THREE.DoubleSide }); }),
  pastrami: () => M('pastrami', () => { const t = pastramiTex(); return new THREE.MeshPhysicalMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(1.4, 1.4), roughness: .4, clearcoat: .4, clearcoatRoughness: .3, sheen: .3, sheenColor: new THREE.Color('#ff9a8a'), side: THREE.DoubleSide }); }),
  turkey: () => M('turkey', () => { const t = stripeTex('turkey', '#e9c5a8', '#d9a98a', 3, 256, .8); return new THREE.MeshPhysicalMaterial({ map: t.map, normalMap: t.normalMap, roughness: .5, sheen: .3, side: THREE.DoubleSide }); }),
  onion: () => M('onion', () => new THREE.MeshPhysicalMaterial({ color: '#a2477e', roughness: .25, clearcoat: .8, transmission: .2, thickness: .05 })),
  tortilla: () => M('tortilla', () => { const t = spotsTex('tortilla', '#e2c48c', '#8a5528', -.2); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: .7, side: THREE.DoubleSide }); }),
  wrapFill: (k = 'deli') => M('wrapfill' + k, () => { const t = fillingTex(k); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: .55 }); }),
  bowl: () => M('bowl', () => new THREE.MeshPhysicalMaterial({ color: '#efe6d6', roughness: .22, clearcoat: 1, clearcoatRoughness: .06 })),
  bowlOut: () => M('bowlOut', () => new THREE.MeshPhysicalMaterial({ color: '#2d2621', roughness: .4, clearcoat: .8, clearcoatRoughness: .2 })),
  broth: () => M('broth', () => { const t = spotsTex('broth', '#d69a3c', '#f2d27a', .1); return new THREE.MeshPhysicalMaterial({ map: t.map, normalMap: t.normalMap, roughness: .08, clearcoat: 1, clearcoatRoughness: .02 }); }),
  paper: () => M('cupPaper', () => new THREE.MeshPhysicalMaterial({ color: '#f6f1e8', roughness: .55, sheen: .2 })),
  sleeve: () => M('sleeve', () => { const t = spotsTex('kraft', '#b88a58', '#8a6034', .45, 256); t.map.repeat.set(4, 1); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: .85, side: THREE.DoubleSide }); }),
  lid: () => M('cupLid', () => new THREE.MeshPhysicalMaterial({ color: '#f3f0ea', roughness: .3, clearcoat: .6, side: THREE.DoubleSide })),
  coffee: () => M('coffeeTop', () => new THREE.MeshPhysicalMaterial({ color: '#3a1d0e', roughness: .06, clearcoat: 1 })),
};

/* ================= the bagel shape ================= */
// tube cross-section: puffy round top, flatter base; R ring radius, a tube half-width, b top height
const SHAPE = { R: .68, a: .4, b: .34, base: .6 };
function section(th, a, b) {
  const s = Math.sin(th), c = Math.cos(th);
  const y = s >= 0 ? b * Math.pow(s, .85) : -b * SHAPE.base * Math.pow(-s, .55);
  return [a * c * (1 + .05 * s), y];
}
// part: 'full' | 'top' | 'bottom'
export function bagelGeo(part = 'full', seed = 1, seg = 128, rings = 48) {
  return GC('bagel' + part + seed + seg, () => {
    const n = perlin(seed * 13 + 1);
    const t0 = part === 'bottom' ? Math.PI : 0, t1 = part === 'top' ? Math.PI : part === 'bottom' ? TAU : TAU;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const u = i / seg, ang = u * TAU, ca = Math.cos(ang), sa = Math.sin(ang);
      const puff = 1 + .07 * n(ca * 1.6 + 3, sa * 1.6), lean = .04 * n(ca * 1.2 + 9, sa * 1.2);
      for (let j = 0; j <= rings; j++) {
        const th = t0 + (t1 - t0) * j / rings;
        const [dr, y] = section(th, SHAPE.a * puff, SHAPE.b * puff);
        const r = SHAPE.R + dr + lean * SHAPE.a;
        pos.push(ca * r, y + SHAPE.b * SHAPE.base, sa * r);
        uv.push(u * 3, ((th / TAU) % 1 + 1) % 1);
      }
    }
    const W = rings + 1;
    for (let i = 0; i < seg; i++) for (let j = 0; j < rings; j++) {
      const a = i * W + j, b = (i + 1) * W + j;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    // weld normals across the u seam
    const N = g.attributes.normal;
    for (let j = 0; j <= rings; j++) { const a = j, b = seg * W + j; const x = (N.getX(a) + N.getX(b)) / 2, y = (N.getY(a) + N.getY(b)) / 2, z = (N.getZ(a) + N.getZ(b)) / 2; N.setXYZ(a, x, y, z); N.setXYZ(b, x, y, z); }
    return g;
  });
}
// flat ring at the cut (y = cut height), crumb texture
function cutFace(up) {
  return GC('cut' + up, () => {
    const g = new THREE.RingGeometry(SHAPE.R - SHAPE.a * 1.02, SHAPE.R + SHAPE.a * 1.05, 128, 1);
    g.rotateX(up ? -Math.PI / 2 : Math.PI / 2);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * .8 + .5, p.getZ(i) * .8 + .5);
    return g;
  });
}
export const CUT_Y = SHAPE.b * SHAPE.base;
// a point on the top of the crust (for seeds): returns position and normal in bagel space
function crustPoint(u, th) {
  const e = .002, P = (uu, tt) => { const [dr, y] = section(tt, SHAPE.a, SHAPE.b); const r = SHAPE.R + dr; return new THREE.Vector3(Math.cos(uu * TAU) * r, y + CUT_Y, Math.sin(uu * TAU) * r); };
  const p = P(u, th), du = P(u + e, th).sub(p), dt = P(u, th + e).sub(p);
  return [p, du.cross(dt).normalize().negate()];
}

/* ================= toppings on the crust ================= */
const SEEDS = {
  sesame: { geo: () => { const g = new THREE.SphereGeometry(.03, 8, 6); g.scale(1, .32, .6); return g; }, mat: () => mats.flat('#efdcae', .45), n: 340 },
  poppy: { geo: () => new THREE.IcosahedronGeometry(.011, 0), mat: () => mats.flat('#1d1a20', .5), n: 900 },
  onion: { geo: () => { const g = new THREE.BoxGeometry(.06, .012, .035); return g; }, mat: () => mats.flat('#b8792e', .55), n: 70 },
  garlic: { geo: () => { const g = new THREE.BoxGeometry(.035, .012, .03); return g; }, mat: () => mats.flat('#e8d2a0', .5), n: 60 },
  salt: { geo: () => new THREE.BoxGeometry(.016, .016, .016), mat: () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .15, transmission: .4, thickness: .02 }), n: 60 },
};
function seeds(grp, kind, r, n, part) {
  const S = SEEDS[kind]; n = n ?? S.n;
  const g = GC('seed' + kind, S.geo), m = M('seedmat' + kind, S.mat);
  const im = new THREE.InstancedMesh(g, m, n); im.castShadow = false; im.receiveShadow = true;
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), spin = new THREE.Quaternion(), mtx = new THREE.Matrix4(), sc = new THREE.Vector3();
  let k = 0;
  while (k < n) {
    const u = r(), th = (part === 'bottom' ? .02 : .08) * Math.PI + r() * .84 * Math.PI;
    if (r() > Math.pow(Math.sin(th), .6)) continue;          // denser on the very top
    const [p, nr] = crustPoint(u, th);
    q.setFromUnitVectors(up, nr); spin.setFromAxisAngle(up, r() * TAU); q.multiply(spin);
    p.addScaledVector(nr, .006);
    const s = .8 + r() * .5; sc.set(s, s, s);
    mtx.compose(p, q, sc); im.setMatrixAt(k++, mtx);
  }
  grp.add(im);
  return im;
}
function raisins(grp, r, n = 12) {
  const g = GC('raisin', () => { const b = new THREE.IcosahedronGeometry(.05, 2); const p = b.attributes.position, nn = perlin(5), v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(1 + .3 * nn(v.x * 40, v.z * 40 + v.y * 30)); v.y *= .6; p.setXYZ(i, v.x, v.y, v.z); } b.computeVertexNormals(); return b; });
  const m = M('raisinMat', () => new THREE.MeshPhysicalMaterial({ color: '#3a1410', roughness: .3, clearcoat: .7, sheen: .3, sheenColor: new THREE.Color('#8a3a2a') }));
  for (let i = 0; i < n; i++) {
    const [p, nr] = crustPoint(r(), (.05 + r() * .9) * Math.PI);
    const o = mesh(g, m); o.position.copy(p).addScaledVector(nr, -.012); o.lookAt(p.clone().add(nr)); o.rotateX(Math.PI / 2); o.scale.setScalar(.8 + r() * .5); grp.add(o);
  }
}
const TOPPINGS = {
  everything: [['sesame', 160], ['poppy', 420], ['onion', 50], ['garlic', 40], ['salt', 40]],
  sesame: [['sesame', 420]],
  poppy: [['poppy', 1500]],
  cinnamon: [],
  plain: [],
};

// one bagel half or whole, crust + seeds (+ crumb face for halves)
export function bagelPart(flavor, part, seed, lite) {
  const g = new THREE.Group(), r = rng(seed);
  const kind = flavor === 'cinnamon' ? 'cinnamon' : flavor === 'plain' ? 'plain' : 'seeded';
  const body = mesh(bagelGeo(part, seed, lite ? 96 : 128, lite ? 36 : 48), BM.crust(kind)); g.add(body);
  if (part !== 'full') { const f = mesh(cutFace(part === 'bottom'), BM.crumb(), false, true); f.position.y = CUT_Y + (part === 'bottom' ? .001 : -.001); g.add(f); }
  if (part !== 'bottom') for (const [k, n] of TOPPINGS[flavor] || []) seeds(g, k, r, Math.round(n * (lite ? .6 : 1)), part);
  if (flavor === 'cinnamon') raisins(g, r, part === 'full' ? 14 : 8);
  return g;
}

/* ================= fillings ================= */
// a soft disc with a wavy, slightly drooping edge (egg, cream cheese, lettuce, turkey)
export function softDisc(key, R, thick, amp, freq, droop = 0, seed = 1) {
  return GC('disc' + key, () => {
    const g = new THREE.CylinderGeometry(R, R, thick, 96, 2, false), p = g.attributes.position, n = perlin(seed), v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const rr = Math.hypot(v.x, v.z); if (rr < 1e-4) continue;
      const a = Math.atan2(v.z, v.x), k = 1 + amp * (Math.sin(a * freq + 2 * n(Math.cos(a) * 2, Math.sin(a) * 2)) * .5 + .5 * n(Math.cos(a) * 4, Math.sin(a) * 4));
      const t = rr / R;
      v.x *= 1 + (k - 1) * t; v.z *= 1 + (k - 1) * t;
      v.y += -droop * Math.pow(t, 3) * (1 + .5 * n(Math.cos(a) * 3, Math.sin(a) * 3)) + amp * .25 * Math.sin(a * freq * 1.7) * t * t;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals(); return g;
  });
}
function cheeseSlice() {
  return GC('american', () => {
    const g = new THREE.PlaneGeometry(1.75, 1.75, 30, 30); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z); p.setY(i, -Math.pow(Math.max(0, d - .95), 1.6) * .55); }
    g.computeVertexNormals(); return g;
  });
}
export function ribbon(key, L, Wd, waves, amp, curl = 0) {
  return GC('ribbon' + key, () => {
    const g = new THREE.PlaneGeometry(L, Wd, 80, 6); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, Math.sin(x / L * TAU * waves) * amp + curl * z * z); }
    g.computeVertexNormals(); return g;
  });
}
function addLayer(stack, obj, h) { obj.position.y += stack.y + h / 2; stack.g.add(obj); stack.y += h; return obj; }

export const FILL = {
  cream(st, r) { const o = mesh(softDisc('cc2', 1.0, .09, .045, 5, .03, 4), BM.creamCheese()); o.rotation.y = r() * 6; addLayer(st, o, .08); },
  creamScallion(st, r) { const o = mesh(softDisc('ccs2', 1.0, .09, .045, 5, .03, 5), BM.creamCheese('scallion')); o.rotation.y = r() * 6; addLayer(st, o, .08); },
  taylor(st, r) {
    for (let i = 0; i < 2; i++) { const o = mesh(GC('taylorG', () => { const g = softDisc('tay', .78, .05, .05, 4, .015, 33).clone(); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k), rr = Math.hypot(x, z), a = Math.atan2(z, x); if (rr > .6) { const notch = Math.pow(Math.abs(Math.cos(a * 2)), 40); p.setX(k, x * (1 - notch * .14)); p.setZ(k, z * (1 - notch * .14)); } } g.computeVertexNormals(); return g; }), BM.taylor()); o.position.set((i - .5) * .45, st.y + .03 + i * .045, (i - .5) * .2); o.rotation.set((i - .5) * .1, i * .8, 0); st.g.add(o); }
    st.y += .1;
  },
  pastrami(st, r) {
    for (let i = 0; i < 9; i++) { const o = mesh(ribbon('pastrami' + (i % 3), 1.9, .5, 1.6 + (i % 3) * .5, .09, .5), BM.pastrami()); o.rotation.y = i * .7 + r() * .3; o.position.set((r() - .5) * .25, st.y + .05 + i * .045, (r() - .5) * .25); st.g.add(o); }
    st.y += .42;
  },
  creamThin(st, r) { const o = mesh(softDisc('cct2', .98, .06, .04, 6, .02, 6), BM.creamCheese()); o.rotation.y = r() * 6; addLayer(st, o, .05); },
  lox(st, r) {
    for (let i = 0; i < 3; i++) {
      const o = mesh(ribbon('lox', 1.45, .5, 2.2, .05, .3), BM.lox()); o.rotation.y = i * .8 + r() * .4; const a = i * 1.6; o.position.set(Math.cos(a) * .3, st.y + .05 + i * .03, Math.sin(a) * .3); st.g.add(o);
    }
    st.y += .13;
  },
  egg(st, r) { const o = mesh(softDisc('egg', .98, .14, .1, 5, .04, 9), mats.egg()); addLayer(st, o, .13); },
  cheese(st, r) { const o = mesh(cheeseSlice(), BM.american()); o.rotation.y = .4 + r() * .3; addLayer(st, o, .02); },
  bacon(st, r) {
    for (let i = 0; i < 3; i++) { const o = mesh(ribbon('bacon' + (i % 2), 2.4, .3, 4, .05), BM.bacon()); o.rotation.y = -.5 + i * .5 + (r() - .5) * .2; o.position.set(0, st.y + .04 + i * .018, (i - 1) * .2); st.g.add(o); }
    st.y += .09;
  },
  lettuce(st, r) { const o = mesh(softDisc('lettuce', 1.16, .02, .16, 13, .08, 15), BM.lettuce()); addLayer(st, o, .04); },
  tomato(st, r) {
    for (let i = 0; i < 3; i++) { const o = T0.tomato(r); o.scale.set(2.6, 1.2, 2.6); const a = i * TAU / 3 + .3; o.position.set(Math.cos(a) * .4, st.y + .03, Math.sin(a) * .4); st.g.add(o); }
    st.y += .06;
  },
  turkey(st, r) {
    for (let i = 0; i < 3; i++) { const o = mesh(softDisc('turkey' + i, 1.05, .03, .2, 6 + i, .1, 21 + i), BM.turkey()); o.rotation.y = i; o.position.y = st.y + .03 + i * .04; st.g.add(o); }
    st.y += .14;
  },
  onion(st, r) {
    for (let i = 0; i < 4; i++) { const o = mesh(GC('onionRing', () => new THREE.TorusGeometry(.2, .018, 8, 40)), BM.onion()); o.rotation.x = Math.PI / 2; o.position.set((r() - .5) * .9, st.y + .02, (r() - .5) * .9); o.scale.setScalar(.8 + r() * .5); st.g.add(o); }
    st.y += .03;
  },
};

/* ================= items ================= */
export function buildBagel(rc, opts = {}) {
  const grp = new THREE.Group(), base = new THREE.Group(), parts = []; grp.add(base);
  const B = board(); base.add(B); const Y0 = .085;
  const b = bagelPart(rc.flavor, 'full', rc.seed || 3, opts.lite);
  b.position.y = Y0; b.rotation.set(.08, rc.turn ?? .5, -.04); base.add(b);
  parts.push({ obj: b, dir: new THREE.Vector3(0, .4, 0) });
  grp.userData = { parts, kind: 'bagel', H: .9 };
  return grp;
}
export function buildSandwich(rc, opts = {}) {
  const grp = new THREE.Group(), base = new THREE.Group(), parts = []; grp.add(base);
  const B = board(); base.add(B); const Y0 = .085;
  const r = rng(rc.seed || 5);
  const bread = rc.bread || 'everything';
  if (rc.open && bread !== 'roll') {
    const hold = new THREE.Group(); hold.position.y = Y0; base.add(hold);
    const S = .64;
    [0, 1].forEach((k) => {
      const half = new THREE.Group(); half.scale.setScalar(S);
      let h;
      if (k === 0) { h = bagelPart(bread, 'bottom', rc.seed || 5, opts.lite); half.add(h); }
      else { h = bagelPart(bread, 'top', rc.seed || 5, opts.lite); h.rotation.x = Math.PI; h.position.y = CUT_Y + SHAPE.b; half.add(h); }
      const cut = k === 0 ? CUT_Y : SHAPE.b;
      const st = { g: new THREE.Group(), y: 0 }; st.g.position.y = cut; half.add(st.g);
      const rr = rng((rc.seed || 5) * 7 + k);
      for (const f of rc.fill || []) FILL[f](st, rr);
      half.position.set(k ? .66 : -.66, 0, k ? -.18 : .18); half.rotation.y = k ? 2.1 : .3;
      hold.add(half);
    });
    hold.rotation.y = rc.turn ?? .25;
    parts.push({ obj: hold, dir: new THREE.Vector3(0, .5, 0) });
    grp.userData = { parts, kind: 'sandwich', H: .9 };
    return grp;
  }
  let bottom, topHalf, cutY;
  if (bread === 'roll') {
    bottom = mesh(GC('rollBot', () => rollGeo(false)), BM.bun()); topHalf = mesh(GC('rollTop', () => rollGeo(true)), BM.bun());
    const cf = mesh(GC('rollCut', () => { const g = new THREE.CircleGeometry(.99, 64); g.rotateX(-Math.PI / 2); return g; }), BM.crumb(), false, true); cf.position.y = .3; bottom.add(cf);
    cutY = .3;
  } else {
    bottom = bagelPart(bread, 'bottom', rc.seed || 5, opts.lite); topHalf = bagelPart(bread, 'top', rc.seed || 5, opts.lite);
    bottom.position.y = -CUT_Y + .34 * SHAPE.base * 0; cutY = CUT_Y;
  }
  const hold = new THREE.Group(); hold.position.y = Y0; base.add(hold);
  hold.add(bottom);
  const st = { g: new THREE.Group(), y: 0 }; st.g.position.y = cutY; hold.add(st.g);
  for (const f of rc.fill || []) FILL[f](st, r);
  // the top half rests on the fillings, tipped back a little so the layers show
  const lid = new THREE.Group(); lid.add(topHalf); lid.position.set(0, st.y + (rc.open ? .12 : 0), rc.open ? -.38 : 0); lid.rotation.x = rc.open ? -.5 : -.05; lid.rotation.z = .03;
  hold.add(lid);
  topHalf.position.y = bread === 'roll' ? cutY : 0;   // bagel halves keep their cut at CUT_Y; the roll top starts at 0
  hold.rotation.y = rc.turn ?? .6;
  parts.push({ obj: hold, dir: new THREE.Vector3(0, .5, 0) });
  grp.userData = { parts, kind: 'sandwich', H: 1.1 };
  return grp;
}
function rollGeo(isTop) {
  const pts = [];
  if (isTop) { for (let i = 0; i <= 20; i++) { const f = i / 20 * Math.PI / 2; pts.push([Math.max(.001, 1.02 * Math.cos(f) * (1 - .04 * Math.sin(f * 6))), .02 + .5 * Math.sin(f)]); } pts.unshift([0, 0], [1.0, 0]); }
  else { pts.push([0, 0], [.85, 0], [.97, .05], [1.0, .16], [.99, .3], [0, .3]); }
  const g = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 96);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setY(i, isTop ? clamp(p.getY(i) / .52) : .02);
  return g;
}
export function buildWrap(rc, opts = {}) {
  const grp = new THREE.Group(), base = new THREE.Group(), parts = []; grp.add(base);
  const B = board(); base.add(B); const Y0 = .085;
  const half = (angle) => {
    const h = new THREE.Group();
    const tube = mesh(GC('wrapTube', () => new THREE.CylinderGeometry(.34, .34, 1.15, 56, 1, true)), BM.tortilla()); h.add(tube);
    const cap = mesh(GC('wrapCap', () => { const g = new THREE.CircleGeometry(.335, 56); g.rotateX(-Math.PI / 2); return g; }), BM.wrapFill(rc.fillKind || 'deli')); cap.position.y = .575; h.add(cap);
    const end = mesh(GC('wrapEnd', () => { const g = new THREE.SphereGeometry(.34, 40, 16, 0, TAU, Math.PI / 2, Math.PI / 2); return g; }), BM.tortilla()); end.position.y = -.575; h.add(end);
    return h;
  };
  const a = half(); a.rotation.set(Math.PI / 2, 0, .2); a.position.set(-.25, Y0 + .34, .35); base.add(a);   // one half lying down
  const b = half(); b.rotation.set(-.55, 0, -.25); b.position.set(.42, Y0 + .62, -.25); base.add(b);           // the other leaning, cut face up
  parts.push({ obj: a, dir: new THREE.Vector3(-.5, .4, .3) }, { obj: b, dir: new THREE.Vector3(.5, .6, -.3) });
  grp.userData = { parts, kind: 'wrap', H: 1.1 };
  return grp;
}
export function buildSoup(rc, opts = {}) {
  const grp = new THREE.Group(), base = new THREE.Group(), parts = []; grp.add(base);
  const B = board(); base.add(B); const Y0 = .085;
  const prof = [[0, 0], [.45, 0], [.5, .04], [.82, .3], [1.0, .62], [1.04, .66], [1.0, .68], [.96, .64], [.78, .36], [.46, .1], [0, .1]];
  const bowl = new THREE.Group(); bowl.position.y = Y0; base.add(bowl);
  const outer = mesh(GC('bowl', () => new THREE.LatheGeometry(prof.slice(0, 6).map(p => new THREE.Vector2(p[0], p[1])), 96)), BM.bowlOut()); bowl.add(outer);
  const inner = mesh(GC('bowlIn', () => new THREE.LatheGeometry(prof.slice(5).map(p => new THREE.Vector2(p[0], p[1])), 96)), BM.bowl()); bowl.add(inner);
  const soup = mesh(GC('soupTop', () => { const g = new THREE.CircleGeometry(.9, 64); g.rotateX(-Math.PI / 2); return g; }), BM.broth(), false, true); soup.position.y = .52; bowl.add(soup);
  const r = rng(rc.seed || 9);
  const bits = [['#e8762a', .06], ['#7fae3a', .045], ['#f1e2b8', .07]];
  for (let i = 0; i < 26; i++) {
    const [c, s] = bits[i % 3]; const g = GC('bit' + i % 3, () => i % 3 === 2 ? new THREE.CapsuleGeometry(.02, .22, 4, 8) : new THREE.BoxGeometry(s, s * .8, s, 2, 2, 2));
    const o = mesh(g, mats.flat(c, .35), false, true); const a = r() * TAU, rr = Math.sqrt(r()) * .72;
    o.position.set(Math.cos(a) * rr, .53, Math.sin(a) * rr); o.rotation.set(i % 3 === 2 ? Math.PI / 2 : r(), r() * 6, r() * .5); bowl.add(o);
  }
  parts.push({ obj: bowl, dir: new THREE.Vector3(0, .3, 0) });
  grp.userData = { parts, kind: 'soup', H: .9 };
  return grp;
}
export function buildHotCoffee(rc, opts = {}) {
  const grp = new THREE.Group(), parts = [];
  const rb = .34, rt = .5, h = 1.5;
  const cup = mesh(GC('paperCup', () => new THREE.LatheGeometry([[0, 0], [rb - .01, 0], [rb, .02], [rt, h], [rt + .015, h + .01], [rt - .005, h + .015]].map(p => new THREE.Vector2(p[0], p[1])), 72)), BM.paper()); grp.add(cup);
  const sy = h * .46, sh = .55, R = (y) => rb + (rt - rb) * (y / h);
  const sleeve = mesh(GC('sleeve', () => new THREE.CylinderGeometry(R(sy + sh / 2) + .012, R(sy - sh / 2) + .012, sh, 64, 1, true)), BM.sleeve()); sleeve.position.y = sy; grp.add(sleeve);
  const stk = getSticker();
  if (stk) {
    const sg = new THREE.CylinderGeometry(R(sy + .21) + .016, R(sy - .21) + .016, .42, 48, 1, true, -.5, 1.0);
    const s = mesh(sg, new THREE.MeshPhysicalMaterial({ map: stk, alphaTest: .4, roughness: .45, clearcoat: .3 }), false, false); s.position.y = sy; grp.add(s);
  }
  const lidProf = [[rt + .03, 0], [rt + .035, .05], [rt - .02, .08], [rt - .06, .14], [.12, .16], [0, .16]];
  const lid = mesh(GC('cupLid', () => new THREE.LatheGeometry(lidProf.map(p => new THREE.Vector2(p[0], p[1])), 72)), BM.lid()); lid.position.y = h; grp.add(lid);
  const hole = mesh(GC('sip', () => new THREE.CapsuleGeometry(.03, .1, 4, 8)), mats.flat('#2a1a10', .5)); hole.rotation.z = Math.PI / 2; hole.position.set(0, h + .165, .3); grp.add(hole);
  parts.push({ obj: cup, dir: new THREE.Vector3(0, 0, 0) });
  grp.userData = { parts, kind: 'drink', H: h + .2 };
  return grp;
}
export function buildBagelItem(rc, opts) {
  if (EXTRA[rc.type]) return EXTRA[rc.type](rc, opts);
  if (rc.type === 'bagel') return buildBagel(rc, opts);
  if (rc.type === 'sandwich') return buildSandwich(rc, opts);
  if (rc.type === 'wrap') return buildWrap(rc, opts);
  if (rc.type === 'soup') return buildSoup(rc, opts);
  if (rc.type === 'hotcoffee') return buildHotCoffee(rc, opts);
  return buildDrink(rc, opts);
}
