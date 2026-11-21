// Entry for the 3D menu (loaded with import() by site.js once the oven film is over).
// Same stage as the Crepe Craft menu: one sticky stage, the page's scroll picks the item, arrows/keys/swipe/tabs
// scroll for you, drag spins with inertia, each newcomer spins in with a bounce.
import * as THREE from 'three';
import { createMenu } from './menu3d.js';
import { setSticker } from './food.js';
import { ITEMS, CATS } from './menu.js';
import { clamp01 } from './anim.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
function sectionProgress(sec) {
  const top = sec.getBoundingClientRect().top, len = sec.offsetHeight - innerHeight;
  return len > 0 ? clamp01(-top / len) : 0;
}

export async function boot({ reduce = false } = {}) {
  const root = document.documentElement;
  const menuSec = $('[data-menu3d]');
  if (!menuSec) return;
  const phone = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  const shot = /[?&]shot\b/.test(location.search);
  await new Promise(res => {
    const to = setTimeout(res, 2500);
    new THREE.TextureLoader().load('assets/logo-sticker.webp', tx => { tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; setSticker(tx); clearTimeout(to); res(); }, undefined, () => { clearTimeout(to); res(); });
  });

  const N = ITEMS.length;
  const ui = {
    cat: $('[data-m-cat]'), count: $('[data-m-count]'), name: $('[data-m-name]'), ing: $('[data-m-ing]'), price: $('[data-m-price]'),
    note: $('[data-m-note]'), item: $('[data-m-item]'), tabs: $$('[data-m-tab]'), add: $('[data-m-add]'),
  };
  const catStart = Object.fromEntries(CATS.map(c => [c.id, ITEMS.findIndex(i => i.cat === c.id)]));
  const catLen = Object.fromEntries(CATS.map(c => [c.id, ITEMS.filter(i => i.cat === c.id).length]));
  const indexTop = i => menuSec.offsetTop + (i + .02) / (N - 1) * (menuSec.offsetHeight - innerHeight);
  let curIndex = 0;
  const go = i => { i = Math.max(0, Math.min(N - 1, i)); const y = indexTop(i); if (window.HB_SCROLL_TO) window.HB_SCROLL_TO(y); else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); };
  const menuUI = {
    go,
    onItem(i, it, cat) {
      curIndex = i;
      const k = i - catStart[cat.id] + 1;
      ui.item.classList.remove('is-in'); void ui.item.offsetWidth;
      ui.cat.textContent = cat.name;
      ui.count.textContent = `${String(k).padStart(2, '0')} / ${String(catLen[cat.id]).padStart(2, '0')}`;
      ui.name.textContent = it.name; ui.ing.textContent = it.ing;
      ui.price.textContent = it.price || 'Price to be confirmed';
      ui.price.classList.toggle('is-tbd', !it.price);
      ui.note.textContent = cat.note;
      if (ui.add) { ui.add.dataset.item = it.order || it.name; ui.add.setAttribute('aria-label', `Add ${it.name} to your order`); }
      ui.item.classList.add('is-in');
      ui.tabs.forEach(t => { const on = t.dataset.mTab === cat.id; t.classList.toggle('is-on', on); if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); t.style.setProperty('--p', on ? (k / catLen[cat.id]).toFixed(3) : (CATS.findIndex(c => c.id === t.dataset.mTab) < CATS.findIndex(c => c.id === cat.id) ? 1 : 0)); });
      menuSec.style.setProperty('--mood', cat.mood[1]);
    },
  };
  ui.tabs.forEach(t => t.addEventListener('click', () => go(catStart[t.dataset.mTab])));
  $('[data-m-prev]').addEventListener('click', () => go(curIndex - 1));
  $('[data-m-next]').addEventListener('click', () => go(curIndex + 1));
  let menuOn = false, menu = null, scrolling = 0;
  addEventListener('keydown', e => {
    if (!menuOn || e.altKey || e.metaKey || e.ctrlKey || /input|select|textarea/i.test((document.activeElement || {}).tagName || '')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(curIndex + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(curIndex - 1); }
  });
  addEventListener('scroll', () => { scrolling = performance.now(); }, { passive: true });
  const makeMenu = () => { if (!menu) menu = createMenu($('[data-menu-gl]'), menuUI, { phone, reduce, instant: shot, fixedPR: shot ? 1 : undefined }); };

  new IntersectionObserver(es => es.forEach(e => { menuOn = e.isIntersecting; if (menuOn) makeMenu(); }), { rootMargin: '300px 0px' }).observe(menuSec);
  let lastT = performance.now(), hidden = false;
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; lastT = performance.now(); });
  addEventListener('resize', () => { if (menu) menu.resize(); });
  const t0 = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    if (hidden) return;
    const dt = Math.min(.05, (now - lastT) / 1000); lastT = now; const t = (now - t0) / 1000;
    if (menu && menuOn) { menu.resize(); menu.frame(dt, t, sectionProgress(menuSec)); root.classList.add('menu-ready'); }
  }
  requestAnimationFrame(loop);
  // build the stage while the browser is idle and the visitor is not scrolling, then warm up the items a few at a time
  const ric = window.requestIdleCallback || (f => setTimeout(() => f({ timeRemaining: () => 8 }), 120));
  const idle = () => {
    if (performance.now() - scrolling < 400) { setTimeout(() => ric(idle), 300); return; }
    makeMenu(); if (menu.warm()) ric(idle);
  };
  setTimeout(() => ric(idle), 1200);
  window.__hbMenu = { get menu() { return menu; }, go };
}
