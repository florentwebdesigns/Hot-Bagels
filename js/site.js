/* ==========================================================
   SPRINGFIELD HOT BAGELS — page behavior
   (hours, menu, gallery, catering form, reveals, phone bar)
   The 3D opening lives in stage.js.
   ========================================================== */
(() => {
  'use strict';
  const D = window.HB_DETAILS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search);

  /* ---------- Decide: live 3D opening, or a still image ---------- */
  const decideStageMode = () => {
    if (params.get('stage') === 'live') return 'live';
    if (params.get('stage') === 'still') return 'still';
    if (RM) return 'still';
    if (navigator.connection && navigator.connection.saveData) return 'still';
    if (navigator.deviceMemory && navigator.deviceMemory < 3) return 'still';
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return 'still';
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2');
      if (!gl) return 'still';
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const r = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
      if (/swiftshader|llvmpipe|software/i.test(r)) return 'still';
    } catch (e) { return 'still'; }
    return 'live';
  };
  const mode = decideStageMode();
  window.HB_STAGE = { mode };
  if (mode === 'still') root.classList.add('stage-still');

  /* ---------- Smooth scrolling: Lenis + GSAP ScrollTrigger, one source of truth ---------- */
  let lenis = null;
  const G = window.gsap, ST = window.ScrollTrigger;
  if (G && ST) G.registerPlugin(ST);
  if (!RM && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 3), smoothWheel: true });
    if (G && ST) {
      lenis.on('scroll', ST.update);
      G.ticker.add((t) => lenis.raf(t * 1000));
      G.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  // the oven film plays by itself: scrolling is paused until it reaches "Fresh out of the oven"
  let locked = false;
  window.HB_LOCK = (on) => {
    if (on === locked) return;
    locked = on;
    root.classList.toggle('is-locked', on);
    if (lenis) { on ? lenis.stop() : lenis.start(); }
    if (on) window.scrollTo(0, 0);
  };
  // safety net: never keep the page locked for long, whatever happens
  setTimeout(() => window.HB_LOCK(false), 25000);
  if (mode === 'live' && window.scrollY < 40) window.HB_LOCK(true);
  // the intro reads its scroll progress from here
  const stageEl = $('[data-stage]');
  stageEl.classList.add('is-lit');
  if (ST) {
    ST.create({ trigger: stageEl, start: 'top top', end: 'bottom bottom', onUpdate: (self) => { window.HB_PROGRESS = self.progress; }, onRefresh: (self) => { window.HB_PROGRESS = self.progress; } });
    new ResizeObserver(() => ST.refresh()).observe(stageEl);
  }
  window.HB_SCROLL_TO = (target, opts = {}) => {
    if (lenis) lenis.scrollTo(target, { duration: opts.immediate ? 0 : 1.6, immediate: !!opts.immediate });
    else {
      const y = typeof target === 'number' ? target : (typeof target === 'string' ? $(target) : target).getBoundingClientRect().top + scrollY;
      scrollTo({ top: y, behavior: RM || opts.immediate ? 'auto' : 'smooth' });
    }
  };
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2 || !$(id)) return;
    e.preventDefault();
    window.HB_SCROLL_TO(id === '#top' ? 0 : id);
    // move keyboard focus with the jump (Skip intro -> hero)
    const t = $(id);
    if (t && id !== '#top') setTimeout(() => { if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }, RM ? 0 : 900);
  }));

  /* ---------- Hours & the "Open now" pill ---------- */
  const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const fmt = (m) => {
    const h = Math.floor(m / 60), mm = m % 60;
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}${mm ? ':' + String(mm).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`;
  };
  const nowInShop = () => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: D.timeZone, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value;
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { dow, min: (+get('hour') % 24) * 60 + +get('minute') };
  };
  const status = () => {
    const n = nowInShop();
    const h = D.hours[n.dow];
    if (h && n.min >= h[0] && n.min < h[1]) return { open: true, text: `Open now · until ${fmt(h[1])}` };
    if (h && n.min < h[0]) return { open: false, text: `Opens at ${fmt(h[0])}` };
    for (let i = 1; i <= 7; i++) {
      const d = (n.dow + i) % 7, hh = D.hours[d];
      if (hh) return { open: false, text: `Opens ${i === 1 ? 'tomorrow' : DOW[d]} at ${fmt(hh[0])}` };
    }
    return { open: false, text: 'Closed' };
  };
  const paintStatus = () => {
    const s = status();
    $$('[data-status-pill]').forEach((el) => {
      el.classList.toggle('is-open', s.open);
      el.classList.toggle('is-closed', !s.open);
      el.querySelector('span').textContent = s.text;
    });
    const n = nowInShop();
    const tb = $('[data-hours] tbody');
    if (tb) {
      const order = [1, 2, 3, 4, 5, 6, 0];
      tb.innerHTML = order.map((d) => {
        const h = D.hours[d];
        return `<tr class="${d === n.dow ? 'is-today' : ''}"><td>${DOW[d]}</td><td>${h ? `${fmt(h[0])} – ${fmt(h[1])}` : 'Closed'}</td></tr>`;
      }).join('');
    }
  };
  paintStatus();
  setInterval(paintStatus, 60000);
  if (D.hoursArePlaceholder) $('[data-hours-note]').hidden = false;

  /* ---------- Menu ---------- */
  const menuEl = $('[data-menu]');
  if (menuEl) {
    menuEl.innerHTML = D.menu.map((cat, ci) => `
      <div class="mcat reveal">
        <div class="mcat__head"><h3 class="mcat__title">${esc(cat.title)}</h3><span class="mcat__n">${String(ci + 1).padStart(2, '0')}</span></div>
        <ul class="mitems">${cat.items.map((it) => `
          <li class="mitem">
            <svg class="mitem__ico" aria-hidden="true"><use href="#i-${esc(it.icon || 'bagel')}"/></svg>
            <span class="mitem__name${it.italic ? ' is-italic' : ''}">${esc(it.name)}${it.note ? `<span class="mitem__note">${esc(it.note)}</span>` : ''}</span>
            ${it.price ? `<span class="mitem__price">${esc(it.price)}</span>` : '<span class="mitem__price is-tbd" title="Price to be confirmed">Price</span>'}
          </li>`).join('')}
        </ul>
      </div>`).join('');
    if (D.menuIsPlaceholder) $('[data-menu-note]').hidden = false;
  }

  /* ---------- Catering list ---------- */
  const cl = $('[data-catering]');
  if (cl) {
    cl.innerHTML = D.catering.map((c) => `<li class="reveal"><b>${esc(c.name)}</b><span>${esc(c.note || '')}</span></li>`).join('');
    $('[data-cater-note]').hidden = false;
  }

  /* ---------- Marquee: duplicate the row for a seamless loop ---------- */
  const mq = $('[data-marquee]');
  if (mq) mq.appendChild(mq.firstElementChild.cloneNode(true)).setAttribute('aria-hidden', 'true');

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((ents) => ents.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  $$('.reveal, .reveal-lines').forEach((el) => io.observe(el));

  /* ---------- Nav + phone bar ---------- */
  const nav = $('#nav'), stage = $('[data-stage]'), mbar = $('[data-mbar]');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    const stageEnd = stage.offsetTop + stage.offsetHeight;
    const overStage = y + 60 < stageEnd;
    nav.classList.toggle('is-dark', overStage);
    nav.classList.toggle('is-solid', !overStage);
    nav.classList.toggle('is-hidden', !overStage && y > lastY + 4 && y > stageEnd + 400);
    if (y < lastY - 4) nav.classList.remove('is-hidden');
    mbar.classList.toggle('is-on', true);
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  addEventListener('load', onScroll);
  requestAnimationFrame(onScroll);

  /* ---------- Still-mode opening (phones, slow devices) ---------- */
  // Still version: the three film frames play by themselves, then scrolling shows the flavors.
  let stillOn = false;
  const initStill = () => {
    if (stillOn) return;
    stillOn = true;
    const loadRest = () => document.querySelectorAll('[data-stage-still] [data-srcset], [data-stage-still] [data-src]').forEach((el) => {
      if (el.dataset.srcset) { el.srcset = el.dataset.srcset; delete el.dataset.srcset; }
      if (el.dataset.src) { el.src = el.dataset.src; delete el.dataset.src; }
    });
    loadRest();
    const tabs = $$('[data-tab]'), imgs = $$('[data-still]');
    const hero = $('[data-stage-hero]'), lines = hero ? $$('.ln', hero) : [], ctas = hero ? $('.stage__ctas', hero) : null;
    const tabsEl = $('[data-tabs]'), intro = $('[data-intro]'), prog = $('[data-stage-progress]');
    const flavors = D.flavors.map((f) => f.id);
    stage.classList.add('is-lit');
    const range = () => Math.max(1, stage.offsetHeight - innerHeight);
    const at = (i) => stage.offsetTop + range() * (0.12 + (i + 0.5) * 0.29);
    tabs.forEach((t, i) => t.addEventListener('click', () => { if (!stage.classList.contains('is-live')) window.HB_SCROLL_TO(at(i)); }));
    const show = (key) => imgs.forEach((im) => im.classList.toggle('is-on', im.dataset.still === key));
    const caps = (id) => $$('.cap[data-cap]').forEach((c) => c.classList.toggle('is-on', c.dataset.cap === id));
    const heroOn = (on) => { if (!hero) return; hero.classList.toggle('is-on', on); lines.forEach((l) => l.classList.toggle('is-in', on)); if (ctas) ctas.classList.toggle('is-in', on); };
    let auto = !RM && mode === 'still';
    const paint = () => {
      if (stage.classList.contains('is-live') || auto) return;
      const p = Math.min(1, Math.max(0, (scrollY - stage.offsetTop) / range()));
      const flav = p < 0.12 ? -1 : Math.min(2, Math.floor((p - 0.12) / 0.29));
      show(flav < 0 ? 'oven3' : flavors[flav]);
      caps(flav < 0 ? '' : String(flav));
      heroOn(flav < 0);
      tabs.forEach((t, i) => t.setAttribute('aria-selected', String(i === flav)));
      if (tabsEl) tabsEl.classList.toggle('is-away', false);
      if (intro) intro.style.opacity = '0';
      if (prog) prog.style.transform = `scaleX(${p.toFixed(4)})`;
    };
    addEventListener('scroll', paint, { passive: true });
    if (auto) {
      // a short slideshow of the film, then hand over to scrolling
      window.HB_LOCK(true);
      const steps = [['oven1', 'heat', 2600], ['oven2', 'door', 2600], ['oven3', 'peel', 2600]];
      let i = 0;
      const next = () => {
        if (!auto) return;
        if (i < steps.length) { const [k, c, ms] = steps[i++]; show(k); caps(c); if (intro) intro.style.opacity = i === 1 ? '1' : '0'; setTimeout(next, ms); return; }
        auto = false; caps(''); heroOn(true); window.HB_LOCK(false); paint();
      };
      const skip = () => { if (!auto) return; auto = false; caps(''); heroOn(true); window.HB_LOCK(false); paint(); };
      ['wheel', 'touchmove'].forEach((ev) => addEventListener(ev, skip, { passive: true, once: true }));
      $('[data-skip]')?.addEventListener('click', skip, { capture: true });
      next();
    } else if (mode === 'still') {
      paint();
    }
  };
  window.HB_FALLBACK_STILL = () => window.HB_LOCK(false);
  // the stills also play while the live film is still loading
  initStill();

  /* ---------- Gallery lightbox ---------- */
  const lb = $('[data-lb]'), lbImg = $('[data-lb-img]'), lbCap = $('[data-lb-cap]');
  const shots = $$('[data-gallery] .g');
  let cur = 0, lastFocus = null;
  const openLb = (i) => {
    cur = (i + shots.length) % shots.length;
    const b = shots[cur];
    lbImg.src = b.dataset.full;
    lbImg.alt = b.querySelector('img').alt;
    lbCap.textContent = b.querySelector('span').textContent;
    if (lb.hidden) {
      lastFocus = document.activeElement;
      lb.hidden = false;
      requestAnimationFrame(() => lb.classList.add('is-open'));
      lenis?.stop();
      $('[data-lb-close]').focus();
    }
  };
  const closeLb = () => {
    lb.classList.remove('is-open');
    lenis?.start();
    setTimeout(() => { lb.hidden = true; lastFocus?.focus(); }, 400);
  };
  shots.forEach((b, i) => b.addEventListener('click', () => openLb(i)));
  $('[data-lb-close]').addEventListener('click', closeLb);
  $('[data-lb-prev]').addEventListener('click', () => openLb(cur - 1));
  $('[data-lb-next]').addEventListener('click', () => openLb(cur + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb__fig')) closeLb(); });
  addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') openLb(cur - 1);
    if (e.key === 'ArrowRight') openLb(cur + 1);
  });
  let tx = null;
  lb.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (tx == null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) openLb(cur + (dx < 0 ? 1 : -1));
    tx = null;
  });

  /* ---------- Catering form → paper ticket ----------
     NOTE: the form is not connected to an inbox yet. When the site
     goes online, connect it to a form service so requests reach you. */
  const form = $('[data-cform]'), ticket = $('[data-ticket]'), err = $('[data-cform-err]');
  const dateIn = $('#cf-date');
  if (dateIn) dateIn.min = new Date().toISOString().slice(0, 10);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const req = ['name', 'phone', 'email', 'date', 'headcount', 'want'];
    let bad = [];
    req.forEach((n) => {
      const el = form.elements[n];
      const ok = el.value.trim() && el.checkValidity();
      el.closest('.field').classList.toggle('is-bad', !ok);
      if (!ok) bad.push(el);
    });
    if (bad.length) {
      err.textContent = 'Please fill in the highlighted fields so we can reach you.';
      bad[0].focus();
      return;
    }
    err.textContent = '';
    const v = (n) => form.elements[n].value.trim();
    const d = new Date(v('date') + 'T12:00:00');
    const rows = [
      ['Name', v('name')], ['Phone', v('phone')], ['Email', v('email')],
      ['Date', d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })],
      ['Guests', v('headcount')], ['Order', v('want')],
    ];
    if (v('notes')) rows.push(['Notes', v('notes')]);
    $('[data-t-rows]').innerHTML = rows.map(([k, val]) => `<dt>${k}</dt><dd>${esc(val)}</dd>`).join('');
    $('[data-t-no]').textContent = 'No. ' + String(Math.floor(1000 + Math.random() * 9000));
    form.hidden = true;
    ticket.hidden = false;
    ticket.focus({ preventScroll: true });
  });
  form.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('is-bad'));
  $('[data-t-new]').addEventListener('click', () => { form.reset(); ticket.hidden = true; form.hidden = false; });

  /* ---------- Tell a neighbor (word of mouth) ---------- */
  const shareBtn = $('[data-share]'), toast = $('[data-share-toast]');
  if (shareBtn) shareBtn.addEventListener('click', async () => {
    const data = { title: 'Springfield Hot Bagels', text: 'Fresh bagels every morning at Springfield Hot Bagels, 207 Morris Ave, Springfield NJ.', url: location.href.split('#')[0] };
    try {
      if (navigator.share) { await navigator.share(data); toast.textContent = 'Thanks for spreading the word.'; return; }
      await navigator.clipboard.writeText(`${data.text} ${data.url}`);
      toast.textContent = 'Link copied. Send it to a neighbor.';
    } catch (e) { if (e && e.name !== 'AbortError') toast.textContent = 'Share this page: ' + data.url; }
  });

  /* ---------- Map: live Google map where it's allowed, the street map otherwise ---------- */
  const mapBox = $('[data-map]');
  if (mapBox) {
    const useStatic = () => mapBox.classList.add('is-static');
    document.addEventListener('securitypolicyviolation', (e) => { if (/frame/.test(e.violatedDirective || e.effectiveDirective || '')) useStatic(); });
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (!local && /claude|anthropic|usercontent/i.test(location.hostname)) useStatic();
    if (params.get('map') === 'static') useStatic();
  }

  $('[data-year]').textContent = new Date().getFullYear();
})();
