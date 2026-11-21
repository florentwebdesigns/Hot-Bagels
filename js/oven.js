/* ==========================================================
   SPRINGFIELD HOT BAGELS — the deck oven + baker's peel
   Built entirely in code (no model downloads). Called by stage.js.
   ========================================================== */
window.HB_OVEN = function buildOven(THREE, h) {
  'use strict';
  const { RoundedBoxGeometry, mulberry, vnoise, fbm, TAU, lowTier } = h;
  const V3 = THREE.Vector3;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  const canvasTex = (w, hgt, draw, srgb = true) => {
    const c = document.createElement('canvas'); c.width = w; c.height = hgt;
    const ctx = c.getContext('2d');
    draw(ctx, w, hgt);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const pixels = (ctx, w, hgt, fn) => {
    const img = ctx.createImageData(w, hgt), d = img.data;
    for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; const v = fn(x, y); d[o] = v[0]; d[o + 1] = v[1]; d[o + 2] = v[2]; d[o + 3] = v[3] == null ? 255 : v[3]; }
    ctx.putImageData(img, 0, 0);
  };
  const R = lowTier ? 256 : 512;

  /* ---------- oven geometry (world units; board top is y = 0) ---------- */
  const O = {
    w: 7.4, y0: 0.55, y1: 4.9, zFront: -5.65, depth: 3.4,
    open: { x0: -2.2, x1: 2.2, y0: 1.45, y1: 3.05 },
  };
  O.cx = 0; O.cy = (O.y0 + O.y1) / 2; O.hgt = O.y1 - O.y0;
  const OW = O.open.x1 - O.open.x0, OH = O.open.y1 - O.open.y0, OCY = (O.open.y0 + O.open.y1) / 2;

  const group = new THREE.Group();

  // brushed steel, scuffs, and heat staining around the door
  const steelMap = canvasTex(R * 2, R, (ctx, w, hh) => {
    const ox = (O.open.x0 - -O.w / 2) / O.w, ox1 = (O.open.x1 - -O.w / 2) / O.w;
    const oy = 1 - (O.open.y1 - O.y0) / O.hgt, oy1 = 1 - (O.open.y0 - O.y0) / O.hgt;
    pixels(ctx, w, hh, (x, y) => {
      const u = x / w, v = y / hh;
      const brush = vnoise(x * 0.004, y * 0.9, 1) * 0.6 + vnoise(x * 0.02, y * 2.5, 4) * 0.4;
      let c = 150 + (brush - 0.5) * 26;
      // distance from the door opening for heat tint
      const dx = Math.max(ox - u, 0, u - ox1), dy = Math.max(oy - v, 0, v - oy1);
      const dist = Math.hypot(dx * 2, dy);
      const heat = Math.exp(-dist * 9) * (0.7 + 0.3 * fbm(u * 6, v * 6, 2, 3));
      let r = c, g = c * 0.985, b = c * 0.97;
      r = lerp(r, 118, heat * 0.55); g = lerp(g, 92, heat * 0.55); b = lerp(b, 74, heat * 0.55);
      const grime = sstep(0.62, 0.8, fbm(u * 3 + 9, v * 3, 1.5, 4)) * 0.18;
      r *= 1 - grime; g *= 1 - grime; b *= 1 - grime;
      return [r, g, b];
    });
    const rnd = mulberry(91);
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.03 + rnd() * 0.06})`; ctx.lineWidth = 0.5 + rnd();
      const x = rnd() * w, y = rnd() * hh, l = 6 + rnd() * 50, a = (rnd() - 0.5) * 0.8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
    }
  });
  const steelRough = canvasTex(R * 2, R, (ctx, w, hh) => pixels(ctx, w, hh, (x, y) => {
    const n = vnoise(x * 0.004, y * 0.9, 7) * 0.5 + vnoise(x * 0.03, y * 3, 2) * 0.5;
    const g = clamp(0.3 + (n - 0.5) * 0.2 + sstep(0.62, 0.8, fbm(x / w * 3 + 9, y / hh * 3, 1.5, 4)) * 0.25) * 255;
    return [g, g, g];
  }), false);
  // the front plate has the door opening cut out of it
  const frontAlpha = canvasTex(R * 2, R, (ctx, w, hh) => {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, hh);
    const x = (O.open.x0 + O.w / 2) / O.w * w, x1 = (O.open.x1 + O.w / 2) / O.w * w;
    const y = (1 - (O.open.y1 - O.y0) / O.hgt) * hh, y1 = (1 - (O.open.y0 - O.y0) / O.hgt) * hh;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.roundRect(x, y, x1 - x, y1 - y, 10); ctx.fill();
  }, false);

  const steel = new THREE.MeshPhysicalMaterial({ map: steelMap, roughnessMap: steelRough, roughness: 1, metalness: 1, color: 0xd8d4cf, envMapIntensity: 1.1, clearcoat: 0.15, clearcoatRoughness: 0.4 });
  const steelDark = new THREE.MeshPhysicalMaterial({ map: steelMap, roughnessMap: steelRough, roughness: 1, metalness: 1, color: 0x8a8580, envMapIntensity: 0.9 });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(O.w, O.hgt), new THREE.MeshPhysicalMaterial({ map: steelMap, roughnessMap: steelRough, alphaMap: frontAlpha, alphaTest: 0.5, roughness: 1, metalness: 1, color: 0xd8d4cf, envMapIntensity: 1.1, clearcoat: 0.15, clearcoatRoughness: 0.4 }));
  front.position.set(0, O.cy, O.zFront);
  front.receiveShadow = true;
  group.add(front);

  // shell behind the front plate
  const zb = O.zFront - O.depth / 2;
  const slab = (w, hh, d, x, y, z, mat = steelDark) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, hh, d, 3, 0.06), mat); m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = true; group.add(m); return m; };
  slab(O.w, O.open.y0 - O.y0, O.depth, 0, (O.y0 + O.open.y0) / 2, zb - 0.01);
  slab(O.w, O.y1 - O.open.y1, O.depth, 0, (O.open.y1 + O.y1) / 2, zb - 0.01);
  slab(O.open.x0 + O.w / 2, OH + 0.02, O.depth, (-O.w / 2 + O.open.x0) / 2, OCY, zb - 0.01);
  slab(O.w / 2 - O.open.x1, OH + 0.02, O.depth, (O.open.x1 + O.w / 2) / 2, OCY, zb - 0.01);
  // legs and a heavy bottom rail
  slab(O.w + 0.2, 0.18, O.depth + 0.2, 0, O.y0 - 0.09, zb, steel);
  [-1, 1].forEach((s) => slab(0.22, O.y0, 0.22, s * (O.w / 2 - 0.3), O.y0 / 2 - 0.09, O.zFront - 0.3, steel));
  // reveal: the thickness of the opening, so the cut looks solid
  const lip = new THREE.MeshPhysicalMaterial({ color: 0x3a2a20, metalness: 0.6, roughness: 0.55 });
  const lipT = 0.22;
  [[OW, 0.06, 0, O.open.y1], [OW, 0.06, 0, O.open.y0], [0.06, OH, O.open.x0, OCY], [0.06, OH, O.open.x1, OCY]].forEach(([w, hh, x, y]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, lipT), lip); m.position.set(x, y, O.zFront - lipT / 2); group.add(m);
  });

  /* ---------- the oven's inside: firebrick walls and a stone hearth ---------- */
  const brickMap = canvasTex(R * 2, R, (ctx, w, hh) => pixels(ctx, w, hh, (x, y) => {
    const by = Math.floor(y / (hh / 8)), bx = (x + (by % 2) * (w / 24)) % (w / 12);
    const mortar = (y % (hh / 8) < 3 || bx < 3) ? 0.55 : 1;
    const n = 0.75 + 0.35 * fbm(x * 0.03, y * 0.03, 3, 3);
    return [118 * n * mortar, 66 * n * mortar, 44 * n * mortar];
  }));
  // glowing elements along the back and top of the cavity (the hottest parts bloom)
  const glowMap = canvasTex(R * 2, R, (ctx, w, hh) => pixels(ctx, w, hh, (x, y) => {
    const v = y / hh;
    let g = sstep(0.55, 1, v) * 0.55 + Math.exp(-Math.pow((v - 0.18) / 0.03, 2)) * 1.0 + Math.exp(-Math.pow((v - 0.3) / 0.025, 2)) * 0.8;
    g *= 0.75 + 0.25 * vnoise(x * 0.05, y * 0.05, 5);
    return [255 * clamp(g), 150 * clamp(g), 60 * clamp(g)];
  }));
  const cavMat = new THREE.MeshStandardMaterial({ map: brickMap, roughness: 0.9, side: THREE.BackSide, emissive: 0xff7a2a, emissiveMap: glowMap, emissiveIntensity: 0 });
  const cavity = new THREE.Mesh(new THREE.BoxGeometry(OW - 0.02, OH - 0.02, O.depth - 0.25), cavMat);
  cavity.position.set(0, OCY, O.zFront - (O.depth - 0.25) / 2 - 0.02);
  group.add(cavity);
  const stoneMap = canvasTex(R, R, (ctx, w, hh) => pixels(ctx, w, hh, (x, y) => {
    const n = fbm(x * 0.02, y * 0.02, 1, 4), s = vnoise(x * 0.3, y * 0.3, 2);
    const c = 70 + n * 70 + (s - 0.5) * 18;
    return [c * 1.02, c * 0.86, c * 0.7];
  }));
  const hearthMat = new THREE.MeshStandardMaterial({ map: stoneMap, roughness: 0.95, emissive: 0xff6a20, emissiveIntensity: 0 });
  const hearth = new THREE.Mesh(new THREE.PlaneGeometry(OW - 0.05, O.depth - 0.3), hearthMat);
  hearth.rotation.x = -Math.PI / 2;
  hearth.position.set(0, O.open.y0 + 0.012, O.zFront - (O.depth - 0.3) / 2);
  hearth.receiveShadow = true;
  group.add(hearth);

  /* ---------- the door: hinged on the bottom edge ---------- */
  const door = new THREE.Group();
  door.position.set(0, O.open.y0 - 0.02, O.zFront + 0.005);
  const DW = OW + 0.22, DH = OH + 0.16, DT = 0.16;
  const panel = new THREE.Mesh(new RoundedBoxGeometry(DW, DH, DT, 4, 0.05), steel);
  panel.position.set(0, DH / 2, DT / 2);
  panel.castShadow = true; panel.receiveShadow = true;
  door.add(panel);
  // what you see through the smoked glass: a soft hot core and the glowing elements
  const glassGlow = canvasTex(512, 256, (ctx, w, hh) => pixels(ctx, w, hh, (x, y) => {
    const u = x / w - 0.5, v = y / hh - 0.5;
    let g = Math.exp(-(u * u * 3.2 + v * v * 7)) * 0.75;
    g += Math.exp(-Math.pow((v + 0.28) / 0.035, 2)) * 0.55 * (1 - Math.abs(u) * 1.4);
    g += Math.exp(-Math.pow((v - 0.3) / 0.05, 2)) * 0.35 * (1 - Math.abs(u) * 1.2);
    g *= 0.85 + 0.15 * vnoise(x * 0.05, y * 0.08, 3);
    g *= sstep(0.5, 0.42, Math.abs(u)) * sstep(0.5, 0.38, Math.abs(v));
    return [255 * clamp(g), 255 * clamp(g), 255 * clamp(g)];
  }));
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x080605, roughness: 0.05, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.04, emissive: 0x3a0800, emissiveMap: glassGlow, emissiveIntensity: 0, envMapIntensity: 1.8 });
  const glass = new THREE.Mesh(new RoundedBoxGeometry(DW * 0.72, DH * 0.5, 0.03, 3, 0.02), glassMat);
  glass.position.set(0, DH * 0.55, DT + 0.005);
  door.add(glass);
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(DW * 0.76, DH * 0.56, 0.02, 3, 0.03), new THREE.MeshPhysicalMaterial({ color: 0x1a1512, metalness: 0.8, roughness: 0.35 }));
  bezel.position.set(0, DH * 0.55, DT - 0.002);
  door.add(bezel);
  const handleMat = new THREE.MeshPhysicalMaterial({ color: 0x2a1a12, roughness: 0.4, metalness: 0.2, clearcoat: 0.6 });
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, DW * 0.68, 6, 16), handleMat);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0, DH * 0.9, DT + 0.24);
  handle.castShadow = true;
  door.add(handle);
  [-1, 1].forEach((s) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.26, 12), steel); p.rotation.x = Math.PI / 2; p.position.set(s * DW * 0.36, DH * 0.9, DT + 0.12); door.add(p); });
  group.add(door);

  // the ember line: light leaking around the closed door
  const seamMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 1, toneMapped: false });
  const seams = new THREE.Group();
  const st = 0.016, sw = DW + 0.03, sh = DH + 0.03;
  [[sw, st, 0, sh], [sw, st, 0, 0], [st, sh, -sw / 2, sh / 2], [st, sh, sw / 2, sh / 2]].forEach(([w, hh, x, y]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), seamMat); m.position.set(x, y, 0.004); seams.add(m);
  });
  seams.position.copy(door.position);
  group.add(seams);

  /* ---------- the temperature dial ---------- */
  const dialFace = canvasTex(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 118, 10, 128, 128, 128);
    g.addColorStop(0, '#F6EEDD'); g.addColorStop(1, '#D9CBB0');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(128, 128, 126, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a1d15'; ctx.lineWidth = 3;
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      const r0 = i % 5 === 0 ? 86 : 96;
      ctx.beginPath(); ctx.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0); ctx.lineTo(128 + Math.cos(a) * 110, 128 + Math.sin(a) * 110); ctx.stroke();
    }
    ctx.fillStyle = '#B5733A'; ctx.beginPath();
    ctx.arc(128, 128, 112, Math.PI * 1.95, Math.PI * 2.25); ctx.arc(128, 128, 100, Math.PI * 2.25, Math.PI * 1.95, true); ctx.fill();
    ctx.fillStyle = '#2a1d15'; ctx.font = '600 22px Manrope, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('500°', 128 + Math.cos(Math.PI * 2.25) * 64, 128 + Math.sin(Math.PI * 2.25) * 64 + 6);
    ctx.font = 'italic 26px "Instrument Serif", serif'; ctx.fillText('heat', 128, 186);
  });
  const dial = new THREE.Group();
  dial.position.set(O.w / 2 - 1.05, (O.open.y1 + O.y1) / 2, O.zFront + 0.02);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.46, 0.08, 40), steel);
  ring.rotation.x = Math.PI / 2; dial.add(ring);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.38, 48), new THREE.MeshPhysicalMaterial({ map: dialFace, roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.1 }));
  face.position.z = 0.045; dial.add(face);
  const needle = new THREE.Group();
  const nd = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.01), new THREE.MeshStandardMaterial({ color: 0x8a1e10, roughness: 0.4 }));
  nd.position.y = 0.13; needle.add(nd);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16), steel); hub.rotation.x = Math.PI / 2; needle.add(hub);
  needle.position.z = 0.06; dial.add(needle);
  group.add(dial);
  // a small pilot lamp next to the dial
  const lampMat = new THREE.MeshBasicMaterial({ color: 0x3a1206, toneMapped: false });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), lampMat);
  lamp.position.set(O.w / 2 - 1.95, dial.position.y, O.zFront + 0.04);
  group.add(lamp);
  // brushed name plate area (no brand, just a raised plate)
  const plate = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.5, 0.05, 3, 0.02), new THREE.MeshPhysicalMaterial({ color: 0x241a14, metalness: 0.7, roughness: 0.35, clearcoat: 0.6 }));
  plate.position.set(-O.w / 2 + 2.0, dial.position.y, O.zFront + 0.03);
  group.add(plate);

  /* ---------- lights that live in the oven ---------- */
  const inside = new THREE.PointLight(0xff8a3a, 0, 9, 1.6);
  inside.position.set(0, OCY + 0.2, O.zFront - 1.4);
  group.add(inside);
  let spill;
  if (h.RectAreaLight) {
    spill = new THREE.RectAreaLight(0xffa458, 0, OW, OH);
    spill.position.set(0, OCY, O.zFront + 0.05);
    spill.lookAt(0, OCY - 0.6, 6);
  } else {
    spill = new THREE.SpotLight(0xffa458, 0, 22, 0.9, 1, 1.4);
    spill.position.set(0, OCY, O.zFront + 0.1);
    spill.target.position.set(0, 0, 4);
    group.add(spill.target);
  }
  group.add(spill);

  /* ---------- the baker's peel ---------- */
  const woodMap = canvasTex(R, R, (ctx, w, hh) => pixels(ctx, w, hh, (x, y) => {
    const fx = x / w, fy = y / hh;
    const ring = Math.sin((fx * 22 + fbm(fx * 2, fy * 6, 3, 3) * 5) * Math.PI);
    const k = sstep(-0.4, 1, ring);
    let r = lerp(196, 222, k), g = lerp(152, 182, k), b = lerp(102, 128, k);
    const burn = sstep(0.62, 0.85, fbm(fx * 3 + 5, fy * 3, 2, 4)) * 0.35 + sstep(0.82, 0.98, fy) * 0.25;
    r *= 1 - burn; g *= 1 - burn * 1.1; b *= 1 - burn * 1.25;
    const f = 0.95 + 0.1 * vnoise(x * 0.8, y * 0.05, 1);
    return [r * f, g * f, b * f];
  }));
  const wood = new THREE.MeshStandardMaterial({ map: woodMap, roughness: 0.68 });
  const peel = new THREE.Group();
  const bs = new THREE.Shape();
  const PW = 2.1, PL = 2.0;
  bs.moveTo(-PW / 2, 0);
  bs.lineTo(-PW / 2, PL * 0.78);
  bs.quadraticCurveTo(-PW / 2, PL, 0, PL);
  bs.quadraticCurveTo(PW / 2, PL, PW / 2, PL * 0.78);
  bs.lineTo(PW / 2, 0);
  bs.quadraticCurveTo(0.35, -0.12, 0.22, -0.35);
  bs.lineTo(-0.22, -0.35);
  bs.quadraticCurveTo(-0.35, -0.12, -PW / 2, 0);
  const bladeG = new THREE.ExtrudeGeometry(bs, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.012, bevelSegments: 2, curveSegments: 16 });
  bladeG.rotateX(-Math.PI / 2);    // shape y → world -z (blade points into the oven), thickness → +y
  bladeG.translate(0, 0.01, 0);
  const uv = bladeG.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + PW / 2) / PW, uv.getY(i) / PL);
  const blade = new THREE.Mesh(bladeG, wood);
  blade.castShadow = true; blade.receiveShadow = true;
  peel.add(blade);
  const hg = new THREE.CylinderGeometry(0.07, 0.08, 4.2, 18); hg.rotateX(Math.PI / 2);
  const handleP = new THREE.Mesh(hg, wood);
  handleP.position.set(0, 0.06, 0.35 + 2.1);
  handleP.castShadow = true;
  peel.add(handleP);
  peel.userData.bladeCenter = new V3(0, 0.045, -PL / 2);   // where the bagel sits, relative to the peel
  peel.visible = false;

  /* ---------- per-frame controls ---------- */
  const deep = new THREE.Color(0x4a0a02), amber = new THREE.Color(0xff8a2a), tmp = new THREE.Color();
  const api = {
    O, group, door, peel, dial, needle, cavity, spill, inside, seams,
    openingTop: new V3(0, O.open.y1, O.zFront),
    openingCenter: new V3(0, OCY, O.zFront),
    // heat 0..1 (glass + elements), open 0..1 (door), dial 0..1, flicker 0.9..1.1, ember breath 0..1
    set({ heat, open, dialT, flicker, breath, dim }) {
      const hf = heat * flicker;
      door.rotation.x = open * 1.5;
      tmp.copy(deep).lerp(amber, sstep(0.15, 1, heat));
      glassMat.emissive.copy(tmp);
      glassMat.emissiveIntensity = (0.25 + hf * 2.4) * (1 - open * 0.6) * dim;
      seamMat.opacity = (0.35 + breath * 0.65) * (1 - sstep(0.02, 0.25, open)) * dim;
      seamMat.color.setRGB(1.6 + heat * 2.2, 0.55 + heat * 0.9, 0.12 + heat * 0.2);
      cavMat.emissiveIntensity = (0.6 + hf * 4.5) * dim;
      hearthMat.emissiveIntensity = (0.05 + hf * 0.5) * dim;
      inside.intensity = (2 + hf * 26) * (0.25 + open * 0.75) * dim;
      spill.intensity = (h.RectAreaLight ? 9 : 40) * open * hf * dim;
      lampMat.color.setRGB(0.25 + heat * 3, 0.05 + heat * 0.6, 0.02);
      needle.rotation.z = Math.PI * 0.75 - dialT * Math.PI * 1.5;
    },
  };
  return api;
};
