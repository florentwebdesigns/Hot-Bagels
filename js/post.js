/* ==========================================================
   SPRINGFIELD HOT BAGELS — film look for the 3D intro
   Heat haze → bloom → depth of field → vignette, grain and
   lens fringing → ACES tone mapping. Plus embers and flour.
   ========================================================== */
window.HB_POST = function buildPost(THREE, A, renderer, scene, camera, cfg) {
  'use strict';
  const { EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, BokehPass, OutputPass } = A;
  const size = new THREE.Vector2();
  renderer.getSize(size);
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: cfg.msaa });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.addPass(new RenderPass(scene, camera));

  const NOISE = `
    float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float nn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hh(i),hh(i+vec2(1,0)),f.x), mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x), f.y); }
    float fb(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*nn(p); p*=2.07; a*=0.5; } return s; }`;

  // heat shimmer rising out of the open door
  const haze = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uStrength: { value: 0 }, uOrigin: { value: new THREE.Vector2(0.5, 0.5) }, uWidth: { value: 0.3 }, uAspect: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uTime; uniform float uStrength; uniform vec2 uOrigin; uniform float uWidth; uniform float uAspect;
      varying vec2 vUv; ${NOISE}
      void main(){
        vec2 d = vUv - uOrigin;
        float above = smoothstep(-0.04, 0.05, d.y) * smoothstep(0.75, 0.05, d.y);
        float side = exp(-pow(d.x * uAspect / max(uWidth, 0.01), 2.0) * 1.6);
        float m = above * side * uStrength;
        vec2 q = vec2(vUv.x * 9.0, vUv.y * 5.0 - uTime * 1.6);
        vec2 off = (vec2(fb(q), fb(q + 7.3)) - 0.5) * 0.012 * m;
        gl_FragColor = texture2D(tDiffuse, vUv + off);
      }`,
  });
  composer.addPass(haze);

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), cfg.bloomStrength, 0.55, cfg.bloomThreshold);
  composer.addPass(bloom);

  let bokeh = null;
  if (cfg.dof) {
    bokeh = new BokehPass(scene, camera, { focus: 6, aperture: 0.0016, maxblur: 0.008 });
    composer.addPass(bokeh);
  }

  // vignette, animated grain and a touch of lens fringing at the edges
  const finish = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.9 }, uGrain: { value: 0.045 }, uCA: { value: 0.0025 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uTime; uniform float uVignette; uniform float uGrain; uniform float uCA;
      varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec2 c = vUv - 0.5;
        float r2 = dot(c, c);
        vec2 off = c * r2 * uCA * 4.0;
        vec4 col = texture2D(tDiffuse, vUv);
        col.r = texture2D(tDiffuse, vUv + off).r;
        col.b = texture2D(tDiffuse, vUv - off).b;
        float v = smoothstep(0.85, 0.18, r2 * uVignette * 1.6);
        col.rgb *= mix(0.55, 1.0, v);
        float g = h(vUv * vec2(1920.0, 1080.0) + fract(uTime * 7.0) * 100.0) - 0.5;
        col.rgb += g * uGrain * (0.4 + col.rgb);
        gl_FragColor = col;
      }`,
  });
  composer.addPass(finish);
  composer.addPass(new OutputPass());

  /* ---------- embers + flour in one Points system ---------- */
  const N = cfg.particles;
  const g = new THREE.BufferGeometry();
  const seed = new Float32Array(N * 4);
  const rnd = (() => { let a = 12345; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
  for (let i = 0; i < N; i++) { seed[i * 4] = rnd(); seed[i * 4 + 1] = rnd(); seed[i * 4 + 2] = rnd(); seed[i * 4 + 3] = rnd() < 0.42 ? 1 : 0; }
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uAmount: { value: 0 }, uOrigin: { value: new THREE.Vector3() }, uSpan: { value: new THREE.Vector3(4.2, 1.4, 0.8) }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute vec4 aSeed; uniform float uTime; uniform vec3 uOrigin; uniform vec3 uSpan; uniform float uPx;
      varying float vLife; varying float vEmber;
      void main(){
        float speed = mix(0.06, 0.16, aSeed.y);
        float life = fract(uTime * speed + aSeed.x);
        vLife = life; vEmber = aSeed.w;
        vec3 p = uOrigin + vec3((aSeed.x - 0.5) * uSpan.x, (aSeed.z - 0.5) * uSpan.y, (aSeed.y - 0.5) * uSpan.z);
        float t = life * 6.0;
        // buoyancy plus a lazy curl-like swirl
        p.y += t * mix(0.35, 0.8, aSeed.z) * (vEmber > 0.5 ? 1.0 : 0.6);
        p.z += t * 0.55;
        p.x += sin(t * 1.3 + aSeed.y * 31.0) * 0.35 * life + cos(t * 0.7 + aSeed.z * 17.0) * 0.2;
        p.z += cos(t * 1.1 + aSeed.x * 23.0) * 0.25 * life;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float s = vEmber > 0.5 ? mix(2.5, 5.5, aSeed.y) : mix(1.5, 3.5, aSeed.z);
        gl_PointSize = s * uPx * (6.0 / -mv.z);
      }`,
    fragmentShader: `
      uniform float uAmount; varying float vLife; varying float vEmber;
      void main(){
        vec2 c = gl_PointCoord - 0.5; float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        float fade = smoothstep(0.0, 0.12, vLife) * smoothstep(1.0, 0.55, vLife);
        vec3 col = vEmber > 0.5 ? mix(vec3(4.0, 1.3, 0.25), vec3(1.6, 0.35, 0.05), vLife) : vec3(0.9, 0.82, 0.7) * 0.55;
        gl_FragColor = vec4(col, a * fade * uAmount * (vEmber > 0.5 ? 1.0 : 0.5));
      }`,
  });
  const points = new THREE.Points(g, pMat);
  points.frustumCulled = false;
  scene.add(points);

  const proj = new THREE.Vector3();
  return {
    composer, bloom, bokeh, haze, finish, points,
    setSize(w, hgt, pr) {
      composer.setPixelRatio(pr); composer.setSize(w, hgt);
      pMat.uniforms.uPx.value = pr;
      haze.uniforms.uAspect.value = w / hgt;
    },
    setParticles(frac) { g.setDrawRange(0, Math.floor(N * frac)); },
    update({ time, hazeAmt, hazeAt, emberAmt, emberAt, focus, aperture }) {
      haze.uniforms.uTime.value = time;
      haze.uniforms.uStrength.value = hazeAmt;
      if (hazeAt) { proj.copy(hazeAt).project(camera); haze.uniforms.uOrigin.value.set(proj.x * 0.5 + 0.5, proj.y * 0.5 + 0.5); }
      haze.enabled = hazeAmt > 0.002;
      pMat.uniforms.uTime.value = time;
      pMat.uniforms.uAmount.value = emberAmt;
      if (emberAt) pMat.uniforms.uOrigin.value.copy(emberAt);
      points.visible = emberAmt > 0.002;
      finish.uniforms.uTime.value = time;
      if (bokeh && bokeh.enabled) { bokeh.uniforms.focus.value = focus; bokeh.uniforms.aperture.value = aperture; }
    },
    render() { composer.render(); },
  };
};
