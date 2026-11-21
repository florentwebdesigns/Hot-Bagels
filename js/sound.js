/* ==========================================================
   SPRINGFIELD HOT BAGELS — optional oven sound (off by default)
   All generated live with the Web Audio API: no audio files.
   ========================================================== */
(() => {
  'use strict';
  const btn = document.querySelector('[data-sound]');
  if (!btn || !(window.AudioContext || window.webkitAudioContext)) { if (btn) btn.hidden = true; return; }
  const KEY = 'hb-sound';
  let on = false;
  try { on = localStorage.getItem(KEY) === 'on'; } catch (e) { /* storage blocked */ }
  let ctx = null, master, humGain, crackleGain, crackleTimer = null;
  let heat = 0, open = 0, active = true;

  const brownNoise = (c, seconds) => {
    const b = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    return b;
  };
  const start = () => {
    if (ctx) return ctx.resume();
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.0; master.connect(ctx.destination);
    // low oven hum: filtered brown noise plus a faint 60 Hz body
    const src = ctx.createBufferSource(); src.buffer = brownNoise(ctx, 4); src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    humGain = ctx.createGain(); humGain.gain.value = 0;
    src.connect(lp).connect(humGain).connect(master); src.start();
    const osc = ctx.createOscillator(); osc.frequency.value = 60; const og = ctx.createGain(); og.gain.value = 0.05;
    osc.connect(og).connect(humGain); osc.start();
    crackleGain = ctx.createGain(); crackleGain.gain.value = 0; crackleGain.connect(master);
    const crackle = () => {
      if (!ctx) return;
      if (active && open > 0.05) {
        const n = ctx.createBufferSource(), len = 0.004 + Math.random() * 0.01;
        const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        n.buffer = b;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500 + Math.random() * 3500; bp.Q.value = 2;
        const g = ctx.createGain(); g.gain.value = 0.15 + Math.random() * 0.35;
        n.connect(bp).connect(g).connect(crackleGain); n.start();
      }
      crackleTimer = setTimeout(crackle, 40 + Math.random() * 260);
    };
    crackle();
    master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 0.6);
    return ctx.resume();
  };
  const stop = () => { if (ctx) { master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3); setTimeout(() => ctx && ctx.suspend(), 350); } };
  const paint = () => {
    btn.setAttribute('aria-pressed', String(on));
    btn.querySelector('span').textContent = on ? 'Sound on' : 'Sound off';
  };
  btn.addEventListener('click', () => {
    on = !on;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* storage blocked */ }
    paint();
    if (on) start(); else stop();
  });
  paint();
  // browsers only allow sound after a tap or click, so a remembered "on" waits for one
  if (on) addEventListener('pointerdown', () => { if (on) start(); }, { once: true });

  window.HB_SOUND = {
    update(s) {
      heat = s.heat; open = s.open; active = s.active;
      if (!ctx || !on) return;
      const t = ctx.currentTime;
      humGain.gain.setTargetAtTime(active ? 0.08 + heat * 0.35 + open * 0.2 : 0, t, 0.2);
      crackleGain.gain.setTargetAtTime(active ? open * heat : 0, t, 0.2);
    },
    thunk() {
      if (!ctx || !on) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.35);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(master); o.start(t); o.stop(t + 0.55);
      const n = ctx.createBufferSource(); n.buffer = brownNoise(ctx, 0.3);
      const ng = ctx.createGain(); ng.gain.setValueAtTime(0.6, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      n.connect(ng).connect(master); n.start(t);
    },
  };
})();
