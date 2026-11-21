/* Full menu page: renders js/menu-data.js into sections, with sticky section links and search. */
(() => {
  const M = window.HB_MENU; if (!M) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const groupsEl = $('[data-mp-groups]'), catsEl = $('[data-mp-cats]');
  if (M.hoursLine) $('[data-mp-hours]').textContent = M.hoursLine;

  groupsEl.innerHTML = M.groups.map((g, gi) => `
    <section class="mp__group" id="${g.id}" data-mp-group aria-labelledby="h-${g.id}">
      <header class="mp__ghead">
        <span class="mp__gn">${String(gi + 1).padStart(2, '0')}</span>
        <h2 id="h-${g.id}">${esc(g.title)}</h2>
        ${g.note ? `<p>${esc(g.note)}</p>` : ''}
      </header>
      <ul class="mp__items">${g.items.map((it) => {
        const m = it.n.match(/^([A-Z]\d+)\. (.*)$/);
        return `<li class="mp__item${it.fav ? ' is-fav' : ''}" data-mp-item data-q="${esc((it.n + ' ' + (it.d || '') + ' ' + g.title).toLowerCase())}">
          <div class="mp__row">
            <h3>${m ? `<span class="mp__code">${m[1]}</span>` : ''}${esc(m ? m[2] : it.n)}${it.fav ? '<span class="mp__fav">Favorite</span>' : ''}</h3>
            <span class="mp__dots" aria-hidden="true"></span>
            <span class="mp__price">$${esc(it.p)}</span>
          </div>
          ${it.d ? `<p>${esc(it.d)}</p>` : ''}
        </li>`;
      }).join('')}</ul>
    </section>`).join('');

  catsEl.innerHTML = `<div class="mp__catsIn">${M.groups.map((g) => `<a href="#${g.id}" data-mp-cat="${g.id}">${esc(g.title)}</a>`).join('')}</div>`;

  // highlight the section in view and keep its link visible in the scrolling strip
  const links = Object.fromEntries($$('[data-mp-cat]').map((a) => [a.dataset.mpCat, a]));
  let current = '';
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting || e.target.id === current) return;
      if (links[current]) links[current].classList.remove('is-on');
      current = e.target.id; const a = links[current]; if (!a) return;
      a.classList.add('is-on');
      const strip = a.parentElement; strip.scrollTo({ left: a.offsetLeft - strip.clientWidth / 2 + a.clientWidth / 2, behavior: 'smooth' });
    });
  }, { rootMargin: '-35% 0px -60% 0px' });
  $$('[data-mp-group]').forEach((s) => io.observe(s));

  // search
  const q = $('[data-mp-q]'), none = $('[data-mp-none]');
  q.addEventListener('input', () => {
    const v = q.value.trim().toLowerCase(); let shown = 0;
    $$('[data-mp-group]').forEach((sec) => {
      let n = 0;
      $$('[data-mp-item]', sec).forEach((li) => { const ok = !v || li.dataset.q.includes(v); li.hidden = !ok; if (ok) n++; });
      sec.hidden = n === 0; shown += n;
      if (links[sec.id]) links[sec.id].hidden = n === 0;
    });
    none.hidden = shown > 0;
  });

  const y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();
})();
