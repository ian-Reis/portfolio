/* Ian Reis — portfolio. Plain JavaScript, no dependencies.
   Modules: theme, language, header (progress + nav), hero (type + light), reveals, skill map
   (graph, scroll build, tracing, panel, packets), GitHub data (dates, languages, previews),
   games previews, email copy, command menu, inspect mode, print.
   Each module is isolated: if one fails, the rest of the page keeps working. */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const I = window.I18N || null;
  const t = (k) => (I ? I.t(k) : k);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const wide = matchMedia('(min-width: 1000px)');
  const isMac = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');
  const $ = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const EASE = 'cubic-bezier(0.215, 0.61, 0.355, 1)';
  const NS = 'http://www.w3.org/2000/svg';
  const EMAIL = 'erickian2007@gmail.com';
  const GITHUB = 'https://github.com/ian-Reis';
  const ITCH = 'https://ian-reis.itch.io/';

  window.__siteReady = true;

  const scrollHooks = [];
  const langHooks = [];
  const api = {}; // cross-module handles
  const safe = (name, fn) => { try { fn(); } catch (err) { if (window.console) console.warn(`[${name}]`, err); } };
  // non-critical modules start after the first paint, each in its own short task, so no single long task blocks the page
  const idle = (cb) => ('requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 800 }) : setTimeout(cb, 120));
  const later = (name, fn) => idle(() => safe(name, fn));
  const el = (tag, cls, text) => {
    const n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  /* ── toast ── */
  const toastEl = $('#toast');
  let toastTimer = 0;
  const toast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
  };

  /* ── View Transitions: one at a time (a second call would cancel the first) ── */
  let vtBusy = false;
  const startVT = (update) => {
    if (vtBusy || reduced || typeof doc.startViewTransition !== 'function') return null;
    vtBusy = true;
    const vt = doc.startViewTransition(update);
    vt.finished.finally(() => { vtBusy = false; });
    return vt;
  };
  const canAnimate = !reduced && typeof Element.prototype.animate === 'function';

  // numbers roll up when they first appear; render(p) receives progress 0..1
  const countUp = (render, duration = 1300) => {
    if (reduced) { render(1); return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      render(1 - (1 - p) ** 3);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // a wave of weight runs through a heading once, echoing the hero type
  const wave = (h) => {
    if (!canAnimate || !h || h.dataset.waved) return;
    h.dataset.waved = '1';
    const text = h.textContent;
    const spans = [...text].map((ch) => el('span', '', ch));
    h.replaceChildren(...spans);
    const anims = spans.map((s, i) => s.animate(
      [{ fontWeight: 400 }, { fontWeight: 640 }, { fontWeight: 400 }],
      { duration: 900, delay: 150 + i * 38, easing: 'ease-in-out' },
    ));
    Promise.all(anims.map((a) => a.finished)).then(() => {
      if (spans[0].isConnected) h.textContent = text; // back to plain text (translations replace it anyway)
    }).catch(() => {});
  };

  /* ── platform key labels ── */
  safe('keys', () => $$('.mod-key').forEach((k) => { k.textContent = isMac ? '⌘' : 'Ctrl'; }));

  /* ── Theme: light / dark, opened as a circle from wherever it was triggered ── */
  safe('theme', () => {
    const btn = $('#theme-toggle');
    const meta = $('meta[name="theme-color"]');
    const fav = $('link[rel="icon"]');
    // the tab icon follows the theme too: ink tile on light, paper tile on dark
    const icon = (tile, line, dot) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='${tile}'/><path d='M18 32L46 20M18 32L46 44' stroke='${line}' stroke-width='3' fill='none'/><circle cx='18' cy='32' r='6' fill='${dot}'/><circle cx='46' cy='20' r='6' fill='${dot}'/><circle cx='46' cy='44' r='6' fill='${dot}'/></svg>`)}`;
    const ICON_LIGHT = icon('#121A22', '#7FB5B0', '#F2F4F3');
    const ICON_DARK = icon('#E4EBE9', '#1B5E5A', '#0E1418');
    const current = () => (root.dataset.theme === 'dark' ? 'dark' : 'light');
    const sync = () => {
      const dark = current() === 'dark';
      btn.setAttribute('aria-checked', String(dark));
      btn.title = t(dark ? 'theme.toLight' : 'theme.toDark');
      if (meta) meta.setAttribute('content', dark ? '#0E1418' : '#F2F4F3');
      if (fav) fav.setAttribute('href', dark ? ICON_DARK : ICON_LIGHT);
    };
    const set = (next, origin) => {
      const apply = () => {
        root.dataset.theme = next;
        try { localStorage.setItem('ir:theme', next); } catch (e) { /* private mode */ }
        sync();
      };
      const r = origin ? origin.getBoundingClientRect() : null;
      const x = r ? r.left + r.width / 2 : window.innerWidth - 60;
      const y = r ? r.top + r.height / 2 : 32;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const vt = startVT(apply);
      if (!vt) { apply(); return; }
      vt.ready.then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 700, easing: EASE, pseudoElement: '::view-transition-new(root)' },
        );
      }).catch(() => {});
    };
    btn.addEventListener('click', () => set(current() === 'dark' ? 'light' : 'dark', btn));
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const follow = (e) => {
      let saved = null;
      try { saved = localStorage.getItem('ir:theme'); } catch (err) { /* ignore */ }
      if (!saved) { root.dataset.theme = e.matches ? 'dark' : 'light'; sync(); }
    };
    if (mq.addEventListener) mq.addEventListener('change', follow);
    sync();
    langHooks.push(sync);
    api.theme = { current, set, toggle: (origin) => set(current() === 'dark' ? 'light' : 'dark', origin) };
  });

  /* ── Language ── */
  safe('lang', () => {
    const btn = $('#lang-toggle');
    const sync = () => {
      if (!I) { btn.hidden = true; return; }
      btn.textContent = I.lang === 'pt' ? 'EN' : 'PT';
      btn.setAttribute('aria-label', t('lang.switch'));
      btn.setAttribute('title', t('lang.switch'));
    };
    // like a split-flap board: visible text slides up and out top to bottom, the new language slides in from below
    let switching = false;
    const switchLang = (next) => {
      if (!I || switching || I.lang === next) return;
      if (!canAnimate) { I.set(next); return; }
      switching = true;
      const vh = window.innerHeight;
      const all = $$('[data-i18n], [data-i18n-html]').filter((n) => {
        if (n.closest('.palette, .sr, [hidden], .inspect, .toast')) return false;
        const r = n.getBoundingClientRect();
        return r.width > 0 && r.bottom > 0 && r.top < vh;
      });
      const blocks = all.filter((n) => !all.some((o) => o !== n && o.contains(n)));
      const move = (n, out) => {
        const r = n.getBoundingClientRect();
        const lift = getComputedStyle(n).display !== 'inline';
        const shift = lift ? (out ? 'translateY(-0.45em)' : 'translateY(0.45em)') : 'none';
        const from = out ? { opacity: 1, transform: 'none' } : { opacity: 0, transform: shift };
        const to = out ? { opacity: 0, transform: shift } : { opacity: 1, transform: 'none' };
        // short exit, quick cascade: the page is never blank for more than a beat
        return n.animate([from, to], {
          duration: out ? 130 : 400, delay: clamp(r.top / vh, 0, 1) * (out ? 90 : 160), easing: EASE, fill: out ? 'forwards' : 'backwards',
        });
      };
      const outs = blocks.map((n) => move(n, true));
      Promise.all(outs.map((a) => a.finished)).catch(() => {}).then(() => {
        I.set(next);
        outs.forEach((a) => a.cancel());
        blocks.forEach((n) => { if (n.isConnected) move(n, false); });
        switching = false;
      });
    };
    btn.addEventListener('click', () => { if (I) switchLang(I.lang === 'pt' ? 'en' : 'pt'); });
    sync();
    langHooks.push(sync);
    api.lang = { toggle: () => I && switchLang(I.lang === 'pt' ? 'en' : 'pt') };
  });
  doc.addEventListener('langchange', () => langHooks.forEach((fn) => safe('langhook', fn)));

  /* ── Header: solid on scroll, reading progress, current section indicator ── */
  safe('header', () => {
    const bar = $('#bar');
    const prog = $('#progress');
    let queued = false;
    const frame = () => {
      queued = false;
      const y = window.scrollY;
      bar.classList.toggle('is-solid', y > 8);
      bar.classList.toggle('is-compact', y > 160);
      const max = root.scrollHeight - window.innerHeight;
      if (prog) prog.style.transform = `scaleX(${max > 0 ? (y / max).toFixed(4) : 0})`;
      scrollHooks.forEach((fn) => fn());
    };
    window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(frame); } }, { passive: true });
    window.addEventListener('resize', () => { if (!queued) { queued = true; requestAnimationFrame(frame); } });
    api.refreshScroll = frame;

    const links = $$('.nav > a');
    const ind = $('.nav__ind');
    let current = null;
    const move = () => {
      const a = links.find((l) => l.getAttribute('href') === `#${current}`);
      links.forEach((l) => { if (l === a) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
      if (!ind) return;
      if (!a || !a.offsetWidth) { ind.classList.remove('is-on'); return; }
      ind.style.setProperty('--x', `${a.offsetLeft}px`);
      ind.style.setProperty('--w', String(a.offsetWidth));
      ind.classList.add('is-on');
    };
    if ('IntersectionObserver' in window) {
      const watched = ['top', 'skills', 'work', 'games', 'contact'].map((id) => doc.getElementById(id)).filter(Boolean);
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { current = en.target.id; move(); } });
      }, { rootMargin: '-45% 0px -50% 0px' });
      watched.forEach((s) => io.observe(s));
    }
    window.addEventListener('resize', move);
    langHooks.push(move);
    // reading document.fonts forces a full style/layout pass: do it once the page has painted
    idle(() => { if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(move); });
  });

  /* ── Hero: letters gain weight near the pointer; a soft light follows it over the dot grid ── */
  safe('hero', () => {
    const hero = $('.hero');
    const bg = $('.hero__bg');
    const splitEls = $$('[data-split]');
    let letters = [];

    const split = () => {
      letters = [];
      splitEls.forEach((node) => {
        const text = node.textContent;
        node.textContent = '';
        for (const ch of text) {
          const s = el('span', 'ch', ch);
          node.appendChild(s);
          if (ch.trim()) letters.push({ el: s, w: 300 });
        }
      });
    };
    split();
    langHooks.push(split);

    if (!finePointer || reduced) return;

    let px = -9999;
    let py = -9999;
    let raf = 0;
    let armed = false;
    setTimeout(() => { armed = true; }, 1500); // after the entrance has settled

    const BASE = 300;
    const PEAK = 620;
    const RADIUS = 210;
    const tick = () => {
      raf = 0;
      if (!armed) return;
      const boxes = letters.map((L) => L.el.getBoundingClientRect()); // read everything, then write
      let moving = false;
      letters.forEach((L, i) => {
        const b = boxes[i];
        const d = Math.hypot(px - (b.left + b.width / 2), py - (b.top + b.height / 2));
        const f = Math.max(0, 1 - d / RADIUS);
        const target = BASE + (PEAK - BASE) * f * f;
        L.w += (target - L.w) * 0.2;
        if (Math.abs(target - L.w) > 0.6) moving = true;
        else L.w = target;
      });
      letters.forEach((L) => { L.el.style.fontWeight = L.w <= BASE + 0.5 ? '' : String(Math.round(L.w)); });
      if (moving) raf = requestAnimationFrame(tick);
    };

    let lightQueued = false;
    let lx = 0;
    let ly = 0;
    const light = () => {
      lightQueued = false;
      const r = hero.getBoundingClientRect();
      bg.style.setProperty('--mx', `${(lx - r.left).toFixed(0)}px`);
      bg.style.setProperty('--my', `${(ly - r.top).toFixed(0)}px`);
    };

    hero.addEventListener('pointermove', (e) => {
      px = e.clientX; py = e.clientY; lx = e.clientX; ly = e.clientY;
      if (!raf) raf = requestAnimationFrame(tick);
      if (!lightQueued) { lightQueued = true; requestAnimationFrame(light); }
    });
    hero.addEventListener('pointerleave', () => {
      px = -9999; py = -9999;
      if (!raf) raf = requestAnimationFrame(tick);
    });
  });

  /* ── Scroll reveals ── */
  safe('reveals', () => {
    if (!('IntersectionObserver' in window)) return;
    const heads = [...$$('.sec__head'), ...$$('.ix__head')];
    const items = [...$$('.repo'), ...$$('.insight'), ...$$('.ix__group'), $('.activity'), $('.contact')].filter(Boolean);
    items.forEach((n) => n.classList.add('reveal'));
    $$('.repos').forEach((list) => $$('.repo', list).forEach((li, i) => li.style.setProperty('--i', String(i))));
    $$('.insight').forEach((f, i) => f.style.setProperty('--i', String(i)));
    $$('.ix__group').forEach((g, i) => g.style.setProperty('--i', String(i % 3)));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
        if (heads.includes(en.target)) wave($('.sec__title, .ix__title', en.target));
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
    [...heads, ...items].forEach((n) => io.observe(n));
    api.revealAll = () => [...heads, ...items].forEach((n) => n.classList.add('is-in'));
    root.classList.add('js'); // only now may CSS hide things that wait for a reveal
  });

  /* ── Skill map ── */
  later('map', () => {
    const map = $('.map');
    if (!map) return;

    const rowEls = $$('.map__row', map);
    const nodes = $$('.node', map).map((node) => ({
      el: node,
      id: node.dataset.id,
      to: (node.dataset.to || '').split(/\s+/).filter(Boolean),
      stage: Number(node.dataset.stage) || 0,
      row: rowEls.indexOf(node.closest('.map__row')),
      games: node.closest('.map__row').dataset.row === 'games',
      up: [],
      down: [],
      v: -1,
    }));
    const nameOf = (n) => $('.node__name', n.el).textContent.trim();
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const edges = [];
    nodes.forEach((n) => n.to.forEach((id) => {
      const target = byId.get(id);
      if (!target) return;
      n.down.push(target);
      target.up.push(n);
      edges.push({ from: n, to: target, main: !n.games, path: null, len: 0, lit: false, v: -1 });
    }));

    // ports and plain-language relations for assistive tech (rebuilt when the language changes)
    const relations = () => {
      const list = (arr) => {
        const names = arr.map(nameOf);
        return names.length > 1 ? `${names.slice(0, -1).join(', ')} ${t('rel.and')} ${names[names.length - 1]}` : names[0];
      };
      nodes.forEach((n) => {
        n.el.classList.toggle('has-in', n.up.length > 0);
        n.el.classList.toggle('has-out', n.down.length > 0);
        $$('.sr', n.el).forEach((s) => s.remove());
        const parts = [];
        if (n.up.length) parts.push(`${t('rel.fed')} ${list(n.up)}.`);
        if (n.down.length) parts.push(`${t('rel.feeds')} ${list(n.down)}.`);
        if (parts.length) n.el.appendChild(el('span', 'sr', ` ${parts.join(' ')}`));
      });
    };
    relations();

    const svg = doc.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'map__edges');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const packetLayer = doc.createElementNS(NS, 'g');
    edges.forEach((e) => {
      e.path = doc.createElementNS(NS, 'path');
      e.path.setAttribute('class', 'edge');
      svg.appendChild(e.path);
    });
    svg.appendChild(packetLayer);
    map.prepend(svg);

    // geometry from offsets (unaffected by the reveal transforms), relative to the map
    const box = (n) => {
      let x = 0;
      let y = 0;
      let cur = n.el;
      while (cur && cur !== map) { x += cur.offsetLeft; y += cur.offsetTop; cur = cur.offsetParent; }
      return { x, y, w: n.el.offsetWidth, h: n.el.offsetHeight };
    };
    const layout = () => {
      if (!wide.matches) return;
      edges.forEach((e) => {
        const a = box(e.from);
        const b = box(e.to);
        const x1 = a.x + a.w;
        const y1 = a.y + a.h / 2;
        const x2 = b.x;
        const y2 = b.y + b.h / 2;
        const dx = Math.max(28, (x2 - x1) * 0.5);
        e.path.setAttribute('d', `M${x1.toFixed(1)} ${y1.toFixed(1)}C${(x1 + dx).toFixed(1)} ${y1.toFixed(1)} ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
        e.len = e.path.getTotalLength();
        e.v = -1; // force the reveal state to be re-applied with the new length
      });
      scrub();
    };

    /* scroll-driven build: stages appear in dependency order and go back if you scroll up */
    const scrubbing = root.classList.contains('motion') && !reduced;
    const order = (n) => n.stage + Math.max(0, n.row) * 0.5; // later rows start a little later
    const maxOrder = Math.max(...nodes.map(order)) + 1;
    const ease = (v) => 1 - (1 - v) * (1 - v);
    const setNode = (n, v) => {
      if (n.v === v) return;
      n.v = v;
      if (v >= 1) { n.el.style.opacity = ''; n.el.style.transform = ''; return; }
      const e = ease(v);
      n.el.style.opacity = e.toFixed(3);
      n.el.style.transform = `translateY(${((1 - e) * 16).toFixed(1)}px)`;
    };
    const setEdge = (e, v) => {
      if (e.v === v || !e.len) return;
      e.v = v;
      if (v >= 1) { e.path.style.strokeDasharray = ''; e.path.style.strokeDashoffset = ''; return; }
      e.path.style.strokeDasharray = String(e.len);
      e.path.style.strokeDashoffset = (e.len * (1 - ease(v))).toFixed(1);
    };
    function scrub() {
      if (!scrubbing) return;
      const vh = window.innerHeight;
      if (wide.matches) {
        const top = map.getBoundingClientRect().top;
        const p = clamp((vh * 0.94 - top) / (vh * 0.55), 0, 1);
        nodes.forEach((n) => setNode(n, clamp((p - (order(n) / maxOrder) * 0.72) / 0.28, 0, 1)));
        edges.forEach((e) => setEdge(e, clamp((p - (order(e.from) / maxOrder) * 0.72 - 0.14) / 0.28, 0, 1)));
      } else {
        // phones: each node enters whole (CSS transition), so it never rests half-transparent
        nodes.forEach((n) => setNode(n, n.el.getBoundingClientRect().top < vh * 0.9 ? 1 : 0));
      }
    }
    scrollHooks.push(scrub);
    map.classList.toggle('is-discrete', !wide.matches);
    scrub();
    map.classList.add('is-ready');

    /* tracing */
    let hoverId = null;
    let pinnedId = null;
    const walk = (n, dir, out) => n[dir].forEach((m) => { if (!out.has(m)) { out.add(m); walk(m, dir, out); } });
    const trace = () => {
      const id = pinnedId || hoverId;
      map.classList.toggle('is-tracing', !!id);
      nodes.forEach((n) => n.el.setAttribute('aria-pressed', String(n.id === pinnedId)));
      if (!id) {
        nodes.forEach((n) => n.el.classList.remove('is-lit', 'is-focus'));
        edges.forEach((e) => { e.lit = false; e.path.classList.remove('is-lit'); });
        return;
      }
      const origin = byId.get(id);
      const anc = new Set();
      const desc = new Set();
      walk(origin, 'up', anc);
      walk(origin, 'down', desc);
      nodes.forEach((n) => {
        n.el.classList.toggle('is-lit', n === origin || anc.has(n) || desc.has(n));
        n.el.classList.toggle('is-focus', n === origin);
      });
      edges.forEach((e) => {
        e.lit = e.to === origin || anc.has(e.to) || e.from === origin || desc.has(e.from);
        e.path.classList.toggle('is-lit', e.lit);
      });
    };

    /* panel */
    const panel = $('#panel');
    const pTitle = $('.panel__title', panel);
    const pLede = $('.panel__lede', panel);
    const pLinks = $('.panel__links', panel);
    const pChips = $('.panel__chips', panel);
    const gLinks = $('[data-group="links"]', panel);
    const gRel = $('[data-group="related"]', panel);
    panel.inert = true;
    let shown = null;

    const fill = (id) => {
      const n = byId.get(id);
      pTitle.textContent = nameOf(n);
      pLede.textContent = I ? I.skill(id) : '';
      const work = I ? I.work(id) : [];
      pLinks.replaceChildren(...work.map((w) => {
        const li = el('li');
        const a = el('a', 'link', w.label);
        a.href = w.href; a.target = '_blank'; a.rel = 'noopener';
        li.append(a, el('small', '', new URL(w.href).hostname.replace(/^www\./, '')));
        return li;
      }));
      gLinks.hidden = work.length === 0;
      const related = [...n.up, ...n.down];
      pChips.replaceChildren(...related.map((r) => {
        const li = el('li');
        const b = el('button', 'chip', nameOf(r));
        b.type = 'button';
        b.addEventListener('click', () => select(r.id, { fromChip: true }));
        li.appendChild(b);
        return li;
      }));
      gRel.hidden = related.length === 0;
    };

    const open = (id, opts = {}) => {
      const wasOpen = panel.classList.contains('is-open');
      fill(id);
      shown = id;
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      panel.inert = false;
      if (wasOpen && !reduced) {
        [pTitle, pLede, $('.panel__cols', panel)].forEach((n, i) => n.animate(
          [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
          { duration: 320, delay: i * 40, easing: EASE, fill: 'backwards' },
        ));
      }
      if (opts.keyboard || opts.fromChip) pTitle.focus({ preventScroll: true });
      if (!opts.fromChip && !opts.deferScroll) keepInView();
    };
    // keep the opened panel in view (desktop: it opens under the map)
    const keepInView = () => {
      if (!wide.matches) return;
      const top = panel.getBoundingClientRect().top;
      const h = $('.panel__inner', panel).scrollHeight + 44;
      const overflow = top + h - window.innerHeight + 24;
      if (overflow > 0) window.scrollBy({ top: Math.min(overflow, top - 96), behavior: reduced ? 'auto' : 'smooth' });
    };
    const close = () => {
      if (!panel.classList.contains('is-open')) return;
      const hadFocus = panel.contains(doc.activeElement);
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      panel.inert = true;
      if (hadFocus && shown && byId.get(shown)) byId.get(shown).el.focus({ preventScroll: true });
      shown = null;
    };

    // the card you clicked grows into the panel, and the panel shrinks back into its card
    const body = $('.panel__body', panel);
    const morph = (from, to, update) => {
      from.style.viewTransitionName = 'skill-morph';
      const vt = startVT(() => {
        from.style.viewTransitionName = '';
        panel.classList.add('no-anim'); // the new snapshot must be the panel at full size
        update();
        to.style.viewTransitionName = 'skill-morph';
      });
      if (!vt) { from.style.viewTransitionName = ''; return null; }
      vt.finished.finally(() => { to.style.viewTransitionName = ''; panel.classList.remove('no-anim'); });
      return vt;
    };

    function select(id, opts = {}) {
      const wasOpen = panel.classList.contains('is-open');
      const node = id ? byId.get(id).el : null;
      if (id && !wasOpen && !opts.fromChip) {
        const vt = morph(node, body, () => { pinnedId = id; trace(); open(id, { ...opts, deferScroll: true }); });
        // scroll only if the panel is still showing this skill (it may have been closed mid-transition)
        if (vt) { vt.finished.finally(() => { if (shown === id && panel.classList.contains('is-open')) keepInView(); }); return; }
      }
      if (!id && wasOpen && shown && byId.get(shown)) {
        const back = byId.get(shown).el;
        const vt = morph(body, back, () => { pinnedId = null; trace(); close(); });
        if (vt) return;
      }
      pinnedId = id;
      trace();
      if (id) open(id, opts); else close();
    }

    nodes.forEach((n) => {
      n.el.addEventListener('pointerenter', (ev) => { if (ev.pointerType === 'mouse') { hoverId = n.id; trace(); } });
      n.el.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse' && hoverId === n.id) { hoverId = null; trace(); } });
      n.el.addEventListener('focus', () => { if (n.el.matches(':focus-visible')) { hoverId = n.id; trace(); } });
      n.el.addEventListener('blur', () => { if (hoverId === n.id) { hoverId = null; trace(); } });
      n.el.addEventListener('click', (ev) => select(pinnedId === n.id ? null : n.id, { keyboard: ev.detail === 0 }));
    });
    $('.panel__close', panel).addEventListener('click', () => select(null));
    doc.addEventListener('click', (ev) => {
      if (!pinnedId) return;
      // composedPath() is captured at dispatch time, so it still knows where a click happened even if
      // the clicked element was replaced meanwhile (the chips are rebuilt when the panel changes skill)
      const inside = ev.composedPath().some((n) => n instanceof Element && n.matches('.node, .panel, .palette, .tools, .toast'));
      if (!inside) select(null);
    });
    api.map = { unpin: () => { if (pinnedId) { select(null); return true; } return false; } };

    /* packets: a dot drifts along each business connection; faster along a traced path */
    const SPEED = 62;
    const packets = edges.filter((e) => e.main).map((e, i) => {
      const c = doc.createElementNS(NS, 'circle');
      c.setAttribute('r', '3.2');
      c.setAttribute('class', 'packet');
      packetLayer.appendChild(c);
      return { e, c, u: (i * 0.29) % 1 };
    });
    let raf = 0;
    let running = false;
    let last = 0;
    let visible = false;
    const frame = (now) => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      const tracing = map.classList.contains('is-tracing');
      packets.forEach((p) => {
        const { e } = p;
        if (!e.len) return;
        const boost = tracing && e.lit ? 2.6 : 1;
        p.u = (p.u + (dt * SPEED * boost) / e.len) % 1;
        const pt = e.path.getPointAtLength(p.u * e.len);
        p.c.setAttribute('cx', pt.x.toFixed(1));
        p.c.setAttribute('cy', pt.y.toFixed(1));
        const fade = Math.min(1, p.u / 0.12, (1 - p.u) / 0.12);
        const built = e.v === -1 || e.v >= 1 || !scrubbing ? 1 : 0;
        const dim = tracing && !e.lit ? 0.18 : 1;
        p.c.style.opacity = (fade * dim * built * 0.9).toFixed(2);
      });
      raf = requestAnimationFrame(frame);
    };
    const sync = () => {
      const should = !reduced && visible && wide.matches && !doc.hidden && packets.length > 0;
      if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      if (!should && running) { running = false; cancelAnimationFrame(raf); packets.forEach((p) => { p.c.style.opacity = '0'; }); }
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; sync(); }).observe(map);
    } else { visible = true; }
    doc.addEventListener('visibilitychange', sync);

    layout();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(layout);
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(map);
    const onWide = () => {
      map.classList.toggle('is-discrete', !wide.matches);
      nodes.forEach((n) => { n.v = -1; });
      layout(); scrub(); sync();
    };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    langHooks.push(() => {
      relations();
      if (shown) fill(shown);
      requestAnimationFrame(layout);
    });
    sync();
  });

  /* ── Full index: counts, filter (all / in practice / studying), find-and-highlight ── */
  later('index', () => {
    const ix = $('#index');
    if (!ix) return;
    const items = $$('.ix__item', ix);
    const groups = $$('.ix__group', ix);
    const groupsEl = $('.ix__groups', ix);
    const btns = $$('.ix__btn', ix);
    const isStudy = (li) => li.dataset.status === 'study';
    const counts = { all: items.length, study: items.filter(isStudy).length };
    counts.practice = counts.all - counts.study;
    const paintCounts = (p = 1) => btns.forEach((b) => { $('b', b).textContent = String(Math.round(counts[b.dataset.filter] * p)); });
    paintCounts();
    // the counts roll up the first time the index header comes into view
    if ('IntersectionObserver' in window && !reduced) {
      paintCounts(0);
      const io = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) return;
        io.disconnect();
        countUp(paintCounts, 1100);
      }, { threshold: 0.4 });
      io.observe($('.ix__head', ix));
    }

    let current = 'all';
    const tally = () => groups.forEach((g) => {
      const visible = $$('.ix__item', g).filter((li) => !li.hidden).length;
      $('.ix__count', g).textContent = String(visible);
      g.hidden = visible === 0;
    });
    const apply = (f) => {
      current = f;
      items.forEach((li) => { li.hidden = f === 'all' ? false : (f === 'study' ? !isStudy(li) : isStudy(li)); });
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === f)));
      tally();
    };
    const setFilter = (f) => {
      if (f === current) return;
      // every entry and group gets its own name, so each one glides from its old place to its new one
      const named = [...groups, ...items];
      named.forEach((n, i) => { n.style.viewTransitionName = `ixm-${i}`; n.style.setProperty('view-transition-class', 'ixm'); });
      // hold the index height while entries glide, so the sections below don't jump under them;
      // afterwards the height eases to its new value and the page below slides up
      const h0 = groupsEl.offsetHeight;
      const vt = startVT(() => { groupsEl.style.minHeight = `${h0}px`; apply(f); });
      const clear = () => named.forEach((n) => { n.style.viewTransitionName = ''; n.style.removeProperty('view-transition-class'); });
      if (vt) {
        vt.finished.finally(() => {
          clear();
          groupsEl.style.minHeight = '';
          const h1 = groupsEl.offsetHeight;
          if (h1 < h0 - 1) groupsEl.animate([{ minHeight: `${h0}px` }, { minHeight: `${h1}px` }], { duration: 520, easing: EASE });
        });
        return;
      }
      clear();
      if (!canAnimate) { apply(f); return; }
      // fallback without View Transitions: a quick fade
      const out = groupsEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: EASE, fill: 'forwards' });
      out.onfinish = () => {
        apply(f);
        out.cancel();
        groupsEl.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: EASE });
      };
    };
    btns.forEach((b) => b.addEventListener('click', () => setFilter(b.dataset.filter)));
    $('.ix__filter', ix).hidden = false;
    tally();

    api.index = {
      items,
      show(li) {
        if (li.hidden) apply('all');
        if (api.revealAll) api.revealAll();
        li.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        li.classList.remove('is-flash');
        void li.offsetWidth; // restart the highlight animation
        li.classList.add('is-flash');
      },
      reset() { apply('all'); },
    };
  });

  /* ── GitHub data (one cached request feeds dates, languages and previews) ── */
  const GH = 'https://api.github.com';
  const cached = (key, ttl, loader) => {
    try {
      const c = JSON.parse(localStorage.getItem(key) || 'null');
      if (c && Date.now() - c.t < ttl && c.data) return Promise.resolve(c.data);
    } catch (e) { /* storage unavailable */ }
    return loader().then((data) => {
      try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), data })); } catch (e) { /* ignore */ }
      return data;
    });
  };
  let reposPromise = null;
  const getRepos = () => {
    if (!reposPromise) {
      reposPromise = cached('ir:repos:v2', 6 * 3600 * 1000, async () => {
        const res = await fetch(`${GH}/users/ian-Reis/repos?per_page=100&sort=pushed`, { headers: { Accept: 'application/vnd.github+json' } });
        if (!res.ok) throw new Error(`GitHub ${res.status}`);
        const raw = await res.json();
        if (!Array.isArray(raw)) throw new Error('Unexpected GitHub response');
        return raw
          .filter((r) => r && typeof r.name === 'string' && typeof r.html_url === 'string' && r.html_url.startsWith('https://github.com/'))
          .map((r) => ({
            name: r.name,
            fork: !!r.fork,
            lang: typeof r.language === 'string' ? r.language : null,
            stars: Number(r.stargazers_count) || 0,
            pushed: typeof r.pushed_at === 'string' ? r.pushed_at : null,
            url: r.html_url,
          }));
      });
    }
    return reposPromise;
  };
  const monthYear = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(I ? I.locale() : 'en-US', { month: 'short', year: 'numeric' }).format(d);
  };

  later('work', () => {
    const list = $('#repos');
    const insights = $('#insights');
    if (!list || !('IntersectionObserver' in window)) return;
    let repos = null;

    const dates = () => {
      const by = new Map(repos.map((r) => [r.name.toLowerCase(), r]));
      $$('.repo', list).forEach((li) => {
        const r = by.get((li.dataset.repo || '').toLowerCase());
        const when = $('.repo__when', li);
        if (r && r.pushed && when) when.textContent = `${t('updated')} ${monthYear(r.pushed)}`;
      });
    };

    const languages = () => {
      const own = repos.filter((r) => !r.fork && r.lang);
      const counts = new Map();
      own.forEach((r) => counts.set(r.lang, (counts.get(r.lang) || 0) + 1));
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      if (!sorted.length) return false;
      const top = sorted.slice(0, 4);
      const rest = sorted.slice(4).reduce((s, [, c]) => s + c, 0);
      if (rest) top.push([t('other'), rest]);
      const bar = $('#langbar');
      const legend = $('#langlegend');
      bar.replaceChildren(...top.map(([name, c], i) => {
        const s = el('span');
        s.style.flex = String(c);
        s.style.background = `var(--c${i + 1})`;
        s.style.setProperty('--i', String(i));
        s.title = `${name}: ${c}`;
        return s;
      }));
      legend.replaceChildren(...top.map(([name, c], i) => {
        const li = el('li');
        const dot = el('i');
        dot.style.background = `var(--c${i + 1})`;
        li.append(dot, el('b', '', name), doc.createTextNode(String(c)));
        return li;
      }));
      bar.setAttribute('role', 'img');
      bar.setAttribute('aria-label', top.map(([name, c]) => `${name} ${c}`).join(', '));
      return true;
    };

    const render = () => {
      if (!repos) return;
      dates();
      const hasLanguages = languages();
      if (insights) insights.hidden = !hasLanguages;
      if (api.refreshScroll) requestAnimationFrame(api.refreshScroll);
    };

    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      // a quiet shimmer stands in for the charts, but only if the data takes a moment (cache hits never flash it)
      const skeleton = setTimeout(() => {
        if (repos || !insights) return;
        insights.hidden = false;
        insights.classList.add('is-loading');
        $('#langbar').replaceChildren(el('span', 'sk'));
      }, 150);
      getRepos()
        .then((data) => {
          repos = data;
          const wasLoading = insights && insights.classList.contains('is-loading');
          if (insights) insights.classList.remove('is-loading');
          render();
          if (wasLoading && canAnimate) {
            $$('#langbar span').forEach((s, i) => s.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 900, delay: i * 90, easing: EASE, fill: 'backwards' }));
          }
        })
        .catch(() => { if (insights) { insights.classList.remove('is-loading'); insights.hidden = true; } })
        .finally(() => clearTimeout(skeleton));
    }, { rootMargin: '500px 0px' });
    io.observe(list);
    langHooks.push(render);
    api.repoByName = (name) => (repos ? repos.find((r) => r.name.toLowerCase() === name.toLowerCase()) : null);
  });

  /* ── Floating preview: last commit on repositories, cover on games ── */
  later('peek', () => {
    const peek = $('#peek');
    if (!peek || !finePointer) return;
    let x = 0;
    let y = 0;
    let raf = 0;
    let token = 0;
    const place = () => {
      raf = 0;
      const w = peek.offsetWidth || 300;
      const h = peek.offsetHeight || 120;
      let px = x + 20;
      let py = y + 20;
      if (px + w > window.innerWidth - 12) px = x - w - 16;
      if (py + h > window.innerHeight - 12) py = y - h - 16;
      peek.style.transform = `translate3d(${Math.round(px)}px, ${Math.round(py)}px, 0)`;
    };
    const follow = (e) => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(place); };
    const show = (content, cover) => {
      token += 1;
      const inner = el('div', 'peek__in');
      inner.append(...content);
      peek.classList.toggle('peek--cover', !!cover);
      peek.replaceChildren(inner);
      place();
      requestAnimationFrame(() => peek.classList.add('is-on'));
      return token;
    };
    const hide = () => { token += 1; peek.classList.remove('is-on'); };

    const commitCache = new Map();
    const lastCommit = (name) => {
      if (!commitCache.has(name)) {
        commitCache.set(name, cached(`ir:commit:${name.toLowerCase()}`, 6 * 3600 * 1000, async () => {
          const res = await fetch(`${GH}/repos/ian-Reis/${encodeURIComponent(name)}/commits?per_page=1`, { headers: { Accept: 'application/vnd.github+json' } });
          if (!res.ok) throw new Error(`GitHub ${res.status}`);
          const arr = await res.json();
          const c = Array.isArray(arr) && arr[0] && arr[0].commit;
          if (!c) throw new Error('No commit');
          return { msg: String(c.message || '').split('\n')[0].slice(0, 140), date: c.author && c.author.date ? String(c.author.date) : null };
        }));
      }
      return commitCache.get(name);
    };
    const metaLine = (name) => {
      const r = api.repoByName ? api.repoByName(name) : null;
      if (!r) return '';
      const bits = [];
      if (r.lang) bits.push(r.lang);
      if (r.stars > 0) bits.push(`${r.stars} ${r.stars === 1 ? t('stars.one') : t('stars.many')}`);
      return bits.join(' · ');
    };

    $$('#repos .repo').forEach((li) => {
      const name = li.dataset.repo;
      li.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        follow(e);
        const msg = el('p', 'peek__msg', t('commit.loading'));
        const meta = el('p', 'peek__meta', metaLine(name));
        const mine = show([el('p', 'peek__label', t('commit.last')), msg, meta]);
        lastCommit(name).then((c) => {
          if (mine !== token) return;
          msg.textContent = c.msg || t('commit.none');
          meta.textContent = [metaLine(name), c.date ? monthYear(c.date) : ''].filter(Boolean).join(' · ');
          place();
        }).catch(() => { if (mine === token) msg.textContent = t('commit.none'); });
      });
      li.addEventListener('pointermove', follow);
      li.addEventListener('pointerleave', hide);
    });

    const games = $$('#games-list .repo');
    let preloaded = false;
    games.forEach((li) => {
      li.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        if (!preloaded) { preloaded = true; games.forEach((g) => { const im = new Image(); im.src = g.dataset.cover; }); }
        follow(e);
        const img = el('img', 'peek__img');
        img.src = li.dataset.cover;
        img.alt = '';
        img.decoding = 'async';
        show([img], true);
      });
      li.addEventListener('pointermove', follow);
      li.addEventListener('pointerleave', hide);
    });

    window.addEventListener('scroll', hide, { passive: true });
    api.peek = { show, follow, hide };
  });

  /* ── Contribution heatmap (private repositories included; data file refreshed daily by an Action) ── */
  later('activity', () => {
    const fig = $('#activity');
    if (!fig || !('IntersectionObserver' in window)) return;
    const grid = $('.hm__grid', fig);
    const months = $('.hm__months', fig);
    const totalEl = $('#act-total');
    let data = null;
    let shownWeeks = 0;
    let byCol = [];
    let byRow = [];
    let monthTotals = new Map();
    let counted = false;

    const loc = () => (I ? I.locale() : 'en-US');
    const num = (n) => new Intl.NumberFormat(loc()).format(n);
    const fill = (tpl, map) => tpl.replace(/\{(\w)\}/g, (_, k) => (map[k] !== undefined ? map[k] : ''));
    const dayDate = (i) => { const d = new Date(`${data.start}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + i); return d; };
    const countLabel = (n) => (n === 0 ? t('act.none') : n === 1 ? t('act.one') : fill(t('act.many'), { n: num(n) }));

    // quartiles of the active days, so one huge day does not wash out the rest
    const thresholds = () => {
      const nz = data.counts.filter((n) => n > 0).sort((a, b) => a - b);
      const q = (p) => nz[Math.min(nz.length - 1, Math.floor(p * (nz.length - 1)))] || 1;
      return [q(0.25), q(0.5), q(0.75)];
    };
    const level = (n, th) => (n === 0 ? 0 : n <= th[0] ? 1 : n <= th[1] ? 2 : n <= th[2] ? 3 : 4);

    const render = () => {
      if (!data) return;
      const wanted = fig.clientWidth < 620 ? 26 : 53;
      const lead = dayDate(0).getUTCDay(); // columns are weeks starting on Sunday, like GitHub
      const slots = [...Array(lead).fill(-1), ...data.counts.map((_, i) => i)];
      const totalWeeks = Math.ceil(slots.length / 7);
      const first = Math.max(0, totalWeeks - wanted);
      const weeks = totalWeeks - first;
      const th = thresholds();
      const monthFmt = new Intl.DateTimeFormat(loc(), { month: 'short', timeZone: 'UTC' });
      const cells = [];
      const labels = [];
      byCol = Array.from({ length: weeks }, () => []);
      byRow = Array.from({ length: 7 }, () => []);
      for (let w = first; w < totalWeeks; w += 1) {
        const col = w - first;
        let firstDay = null;
        for (let d = 0; d < 7; d += 1) {
          const idx = slots[w * 7 + d];
          const c = el('i', 'hm__c');
          c.style.setProperty('--c', String(col));
          if (idx === undefined || idx < 0) c.dataset.l = 'x';
          else {
            c.dataset.l = String(level(data.counts[idx], th));
            c.dataset.i = String(idx);
            c.dataset.col = String(col);
            c.dataset.row = String(d);
            c.dataset.m = dayDate(idx).toISOString().slice(0, 7);
            byCol[col].push(c);
            byRow[d].push(c);
            if (firstDay === null) firstDay = dayDate(idx);
          }
          cells.push(c);
        }
        // label a month in the column where it begins
        if (firstDay && firstDay.getUTCDate() <= 7 && col < weeks - 1) {
          const s = el('span', '', monthFmt.format(firstDay));
          s.style.gridColumn = `${col + 1} / span 3`;
          s.dataset.m = firstDay.toISOString().slice(0, 7);
          labels.push(s);
        }
      }
      grid.style.setProperty('--weeks', String(weeks));
      months.style.setProperty('--weeks', String(weeks));
      grid.replaceChildren(...cells);
      months.replaceChildren(...labels);
      shownWeeks = wanted;

      const byMonth = new Map();
      data.counts.forEach((n, i) => { const k = dayDate(i).toISOString().slice(0, 7); byMonth.set(k, (byMonth.get(k) || 0) + n); });
      monthTotals = byMonth;
      const [bestKey] = [...byMonth.entries()].sort((a, b) => b[1] - a[1])[0] || [];
      const best = bestKey ? monthName(bestKey) : '';
      paintTotal(counted ? 1 : 0);
      grid.setAttribute('aria-label', fill(t('act.aria'), { n: num(data.total), d: num(data.activeDays), m: best }));
    };
    const monthName = (key) => new Intl.DateTimeFormat(loc(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${key}-01T00:00:00Z`));
    const paintTotal = (p) => {
      totalEl.textContent = fill(t('act.total'), { n: num(Math.round(data.total * p)), d: num(Math.round(data.activeDays * p)) });
    };

    // grey grid + shimmer while the file loads (only if it takes a moment)
    const skeleton = () => {
      const weeks = fig.clientWidth < 620 ? 26 : 53;
      grid.style.setProperty('--weeks', String(weeks));
      months.style.setProperty('--weeks', String(weeks));
      grid.replaceChildren(...Array.from({ length: weeks * 7 }, () => { const c = el('i', 'hm__c'); c.dataset.l = '0'; return c; }));
      months.replaceChildren();
      totalEl.textContent = '';
    };

    // the first time the heatmap is on screen: the total rolls up, then hovering becomes instant
    const onScreen = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting || !data) return;
      onScreen.disconnect();
      counted = true;
      countUp(paintTotal, 1400);
      setTimeout(() => fig.classList.add('is-done'), reduced ? 0 : 1500);
    }, { threshold: 0.3 });

    const valid = (d) => d && typeof d.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.start)
      && Array.isArray(d.counts) && d.counts.length >= 300 && d.counts.length <= 400
      && d.counts.every((n) => Number.isInteger(n) && n >= 0);

    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      const waiting = setTimeout(() => {
        if (data) return;
        fig.hidden = false;
        fig.classList.add('is-loading');
        skeleton();
      }, 150);
      fetch('assets/data/activity.json', { cache: 'no-cache' })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`activity ${r.status}`))))
        .then((d) => {
          if (!valid(d)) throw new Error('invalid activity data');
          data = {
            start: d.start,
            counts: d.counts,
            total: d.counts.reduce((a, b) => a + b, 0),
            activeDays: d.counts.filter((n) => n > 0).length,
          };
          fig.hidden = false; // visible first: render() measures the width to pick 26 or 53 weeks
          fig.classList.remove('is-loading');
          render();
          onScreen.observe(fig);
          if (api.refreshScroll) requestAnimationFrame(api.refreshScroll);
        })
        .catch(() => { fig.classList.remove('is-loading'); fig.hidden = true; /* no data: the heatmap stays out of the way */ })
        .finally(() => clearTimeout(waiting));
    }, { rootMargin: '600px 0px' });
    io.observe($('#work') || fig);

    window.addEventListener('resize', () => {
      if (data && (fig.clientWidth < 620 ? 26 : 53) !== shownWeeks) render();
    });
    langHooks.push(render);

    // day details in the shared floating preview
    if (finePointer) {
      const dayFmt = () => new Intl.DateTimeFormat(loc(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
      // crosshair: the whole week (column) and the same weekday (row) stay lit, the month label lights up
      let lit = [];
      const clearCross = () => {
        lit.forEach((c) => c.classList.remove('is-x'));
        lit = [];
        grid.classList.remove('is-cross');
        $$('span.is-on', months).forEach((s) => s.classList.remove('is-on'));
      };
      grid.addEventListener('pointerover', (e) => {
        const c = e.target.closest('.hm__c[data-i]');
        if (!c || !data) return;
        clearCross();
        lit = [...(byCol[Number(c.dataset.col)] || []), ...(byRow[Number(c.dataset.row)] || [])];
        lit.forEach((n) => n.classList.add('is-x'));
        grid.classList.add('is-cross');
        const label = $(`span[data-m="${c.dataset.m}"]`, months);
        if (label) label.classList.add('is-on');
        if (!api.peek) return;
        const i = Number(c.dataset.i);
        api.peek.follow(e);
        api.peek.show([
          el('p', 'peek__label', dayFmt().format(dayDate(i))),
          el('p', 'peek__msg', countLabel(data.counts[i])),
          el('p', 'peek__meta', fill(t('act.month'), { m: monthName(c.dataset.m), n: num(monthTotals.get(c.dataset.m) || 0) })),
        ]);
      });
      grid.addEventListener('pointerleave', clearCross);
      grid.addEventListener('pointermove', (e) => { if (api.peek) api.peek.follow(e); });
      grid.addEventListener('pointerleave', () => { if (api.peek) api.peek.hide(); });
    }
  });

  /* ── Copy email ── */
  const copyEmail = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(EMAIL);
      ok = true;
    } catch (e) {
      try {
        const ta = el('textarea');
        ta.value = EMAIL;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        doc.body.appendChild(ta);
        ta.select();
        ok = doc.execCommand('copy');
        ta.remove();
      } catch (err) { ok = false; }
    }
    toast(t(ok ? 'toast.copied' : 'toast.copyFail'));
    $$('[data-copy-email]').forEach((b) => {
      b.classList.toggle('is-done', ok);
      setTimeout(() => b.classList.remove('is-done'), 1800);
    });
  };
  safe('copy', () => $$('[data-copy-email]').forEach((b) => b.addEventListener('click', copyEmail)));

  /* ── Inspect mode ── */
  // a scan line sweeps down revealing the grid, and sweeps back up to take it away
  let sweeping = null;
  const inspect = (force) => {
    const isOn = root.classList.contains('inspecting');
    const on = typeof force === 'boolean' ? force : !isOn;
    if (on === isOn && !sweeping) return;
    const layer = $('#inspect');
    const scan = $('.inspect__scan');
    if (layer) layer.setAttribute('aria-hidden', String(!on));
    $$('[data-inspect]').forEach((b) => b.setAttribute('aria-pressed', String(on)));
    if (sweeping) { sweeping.forEach((a) => a.cancel()); sweeping = null; }
    if (!canAnimate || !layer || !scan) { root.classList.toggle('inspecting', on); return; }
    const h = window.innerHeight;
    const shown = 'inset(0 0 0% 0)';
    const hidden = 'inset(0 0 100% 0)';
    if (on) { layer.style.clipPath = ''; root.classList.add('inspecting'); }
    const reveal = layer.animate({ clipPath: on ? [hidden, shown] : [shown, hidden] }, { duration: on ? 900 : 650, easing: EASE, fill: 'forwards' });
    const line = scan.animate(
      on
        ? [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${h}px)`, opacity: 1, offset: 0.92 }, { transform: `translateY(${h}px)`, opacity: 0 }]
        : [{ transform: `translateY(${h}px)`, opacity: 1 }, { transform: 'translateY(0)', opacity: 1, offset: 0.9 }, { transform: 'translateY(0)', opacity: 0 }],
      { duration: on ? 900 : 650, easing: EASE },
    );
    sweeping = [reveal, line];
    reveal.finished.then(() => {
      if (!on) {
        layer.style.clipPath = hidden; // stays closed while the layer fades out (no flash of the grid)
        root.classList.remove('inspecting');
      }
      reveal.cancel();
      sweeping = null;
    }).catch(() => {});
  };
  safe('inspect', () => $$('[data-inspect]').forEach((b) => b.addEventListener('click', () => inspect())));

  /* ── Print résumé ── */
  const printResume = () => {
    if (api.revealAll) api.revealAll();
    setTimeout(() => window.print(), 60);
  };
  safe('print', () => {
    $$('[data-print]').forEach((b) => b.addEventListener('click', printResume));
    window.addEventListener('beforeprint', () => { if (api.revealAll) api.revealAll(); });
  });

  /* ── Command menu (Ctrl/⌘ K or /) ── */
  later('palette', () => {
    const palette = $('#palette');
    const input = $('#palette-input');
    const list = $('#palette-list');
    let items = [];
    let active = 0;
    let lastFocus = null;

    const go = (sel) => { const target = $(sel); if (target) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); };
    const openTab = (url) => window.open(url, '_blank', 'noopener');
    const commands = () => [
      { g: 'go', id: 'top', label: t('cmd.top'), kw: 'home inicio topo', run: () => go('#top') },
      { g: 'go', id: 'skills', label: t('cmd.skills'), kw: 'skills habilidades map mapa', run: () => go('#skills') },
      { g: 'go', id: 'index', label: t('cmd.index'), kw: 'index indice lista list skills habilidades', run: () => go('#index') },
      { g: 'go', id: 'work', label: t('cmd.work'), kw: 'work trabalho repositories repositorios', run: () => go('#work') },
      { g: 'go', id: 'games', label: t('cmd.games'), kw: 'games jogos itch', run: () => go('#games') },
      { g: 'go', id: 'contact', label: t('cmd.contact'), kw: 'contact contato email', run: () => go('#contact') },
      { g: 'do', id: 'theme', label: t('cmd.theme'), kw: 'theme tema dark escuro light claro', run: () => api.theme && api.theme.toggle(null) },
      { g: 'do', id: 'lang', label: t('cmd.lang'), kw: 'language idioma portugues english ingles', run: () => api.lang && api.lang.toggle() },
      { g: 'do', id: 'copy', label: t('cmd.copy'), kw: 'copy copiar email e-mail', run: copyEmail },
      { g: 'do', id: 'inspect', label: t('cmd.inspect'), kw: 'inspect inspecionar grid layout', run: () => inspect() },
      { g: 'do', id: 'print', label: t('cmd.print'), kw: 'print imprimir pdf resume curriculo cv', run: printResume },
      { g: 'do', id: 'keys', label: t('cmd.keys'), kw: 'shortcuts atalhos keyboard teclado help ajuda', run: null },
      { g: 'open', id: 'github', label: t('cmd.github'), kw: 'github code codigo', run: () => openTab(GITHUB) },
      { g: 'open', id: 'itch', label: t('cmd.itch'), kw: 'itch games jogos', run: () => openTab(ITCH) },
      { g: 'open', id: 'mail', label: t('cmd.mail'), kw: 'email e-mail mail', run: () => { window.location.href = `mailto:${EMAIL}`; } },
    ];
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    let mode = 'commands';
    const keyRows = () => [
      [[isMac ? '⌘' : 'Ctrl', 'K'], t('keys.palette')],
      [['/'], t('keys.slash')],
      [['?'], t('keys.help')],
      [['Esc'], t('keys.esc')],
      [['↑', '↓', 'Enter'], t('keys.nav')],
    ];
    const renderKeys = () => {
      items = [];
      const head = el('li', 'palette__group', t('cmd.keys'));
      head.setAttribute('role', 'presentation');
      const rows = keyRows().map(([keys, text]) => {
        const li = el('li', 'palette__key');
        li.setAttribute('role', 'presentation');
        const k = el('span');
        keys.forEach((x) => k.appendChild(el('kbd', '', x)));
        li.append(k, el('span', '', text));
        return li;
      });
      list.replaceChildren(head, ...rows);
      input.removeAttribute('aria-activedescendant');
    };

    const render = () => {
      if (mode === 'keys') { renderKeys(); return; }
      const q = norm(input.value.trim());
      const words = q.split(/\s+/).filter(Boolean);
      items = commands().filter((c) => {
        const hay = norm(`${c.label} ${c.kw}`);
        return words.every((w) => hay.includes(w));
      });
      // typing also searches every entry of the full skill index
      if (words.length && api.index) {
        const found = [];
        api.index.items.forEach((li, i) => {
          if (found.length >= 8) return;
          const name = $('.ix__name', li).textContent.trim();
          const detail = $('.ix__detail', li);
          const label = detail ? `${name} (${detail.textContent.trim()})` : name;
          if (words.every((w) => norm(label).includes(w))) {
            found.push({ g: 'skills', id: `ix-${i}`, label, kw: '', run: () => api.index.show(li) });
          }
        });
        items = items.concat(found);
      }
      active = clamp(active, 0, Math.max(0, items.length - 1));
      const out = [];
      let group = null;
      items.forEach((c, i) => {
        if (c.g !== group) {
          group = c.g;
          const h = el('li', 'palette__group', t(`cmd.group.${c.g}`));
          h.setAttribute('role', 'presentation');
          out.push(h);
        }
        const li = el('li', 'palette__item');
        li.id = `cmd-${c.id}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(i === active));
        li.append(el('span', 'palette__mark'), el('span', '', c.label));
        li.addEventListener('mousemove', () => { if (active !== i) { active = i; mark(); } });
        li.addEventListener('click', () => run(i));
        out.push(li);
      });
      if (!items.length) out.push(el('li', 'palette__empty', t('cmd.empty')));
      list.replaceChildren(...out);
      mark();
    };
    const mark = () => {
      $$('.palette__item', list).forEach((li, i) => li.setAttribute('aria-selected', String(i === active)));
      const cur = items[active] ? $(`#cmd-${items[active].id}`, list) : null;
      if (cur) { input.setAttribute('aria-activedescendant', cur.id); cur.scrollIntoView({ block: 'nearest' }); } else input.removeAttribute('aria-activedescendant');
    };
    // the box grows out of whatever opened it (the search button, the footer link) and folds back into it
    const box = $('.palette__box', palette);
    const scrim = $('.palette__scrim', palette);
    let origin = null;
    let closing = null;
    const delta = () => {
      const b = box.getBoundingClientRect();
      const ox = origin ? origin.x : b.left + b.width / 2;
      const oy = origin ? origin.y : b.top;
      return `translate(${(ox - (b.left + b.width / 2)).toFixed(0)}px, ${(oy - (b.top + b.height / 2)).toFixed(0)}px) scale(0.14)`;
    };
    const openPalette = (src = null, startMode = 'commands') => {
      if (!palette.hidden || closing) return;
      const r = src && src.getBoundingClientRect ? src.getBoundingClientRect() : null;
      origin = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
      lastFocus = doc.activeElement;
      mode = startMode;
      palette.hidden = false;
      input.value = '';
      active = 0;
      render();
      input.focus();
      if (canAnimate) {
        box.animate([{ opacity: 0, transform: delta() }, { opacity: 1, transform: 'none' }], { duration: 460, easing: EASE });
        scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: EASE });
      }
    };
    const closePalette = (restore = true) => {
      if (palette.hidden) return Promise.resolve();
      if (closing) return closing;
      if (restore && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      if (!canAnimate) { palette.hidden = true; return Promise.resolve(); }
      const a = box.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: delta() }], {
        duration: 240, easing: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)', fill: 'forwards',
      });
      const s = scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, fill: 'forwards' });
      closing = a.finished.catch(() => {}).then(() => {
        palette.hidden = true;
        a.cancel();
        s.cancel();
        closing = null;
      });
      return closing;
    };
    const run = (i) => {
      const c = items[i];
      if (!c) return;
      if (c.id === 'keys') { mode = 'keys'; input.value = ''; render(); return; }
      // navigation moves the reader, so focus stays put; actions run once the menu has folded away
      closePalette(c.g !== 'go' && c.g !== 'skills').then(() => c.run());
    };

    input.addEventListener('input', () => { mode = 'commands'; active = 0; render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); active = items.length ? (active + 1) % items.length : 0; mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = items.length ? (active - 1 + items.length) % items.length : 0; mark(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(active); }
      else if (e.key === 'Tab') { e.preventDefault(); }
    });
    $$('[data-close-palette]', palette).forEach((n) => n.addEventListener('click', () => closePalette()));
    $('#open-palette').addEventListener('click', (e) => openPalette(e.currentTarget));
    $$('[data-open-palette]').forEach((b) => b.addEventListener('click', (e) => openPalette(e.currentTarget)));
    langHooks.push(() => { if (!palette.hidden) render(); });

    doc.addEventListener('keydown', (e) => {
      const typing = e.target.closest && e.target.closest('input, textarea, [contenteditable="true"]');
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (palette.hidden) openPalette(); else closePalette();
        return;
      }
      if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && palette.hidden) {
        e.preventDefault();
        openPalette();
        return;
      }
      if (e.key === '?' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && palette.hidden) {
        e.preventDefault();
        openPalette(null, 'keys');
        return;
      }
      if (e.key === 'Escape') {
        if (!palette.hidden) { closePalette(); return; }
        if (root.classList.contains('inspecting')) { inspect(false); return; }
        if (api.map) api.map.unpin();
      }
    });
  });

  /* ── Thread: one line down the margin; each section heading is a port it lights up as you read ── */
  later('thread', () => {
    const roomy = matchMedia('(min-width: 1100px)');
    const anchor = $('.hero .wrap');
    const foot = $('.foot');
    if (!anchor || !foot) return;
    const thread = el('div', 'thread');
    thread.setAttribute('aria-hidden', 'true');
    const fillEl = el('i', 'thread__fill');
    const head = el('i', 'thread__head');
    thread.append(el('i', 'thread__track'), fillEl, head);
    doc.body.appendChild(thread);
    let ports = [];
    let top = 0;
    let height = 1;

    const update = () => {
      if (thread.hidden) return;
      const probe = window.scrollY + window.innerHeight * 0.55 - top;
      const p = clamp(probe / height, 0, 1);
      fillEl.style.transform = `scaleY(${p.toFixed(4)})`;
      head.style.transform = `translateY(${(p * height).toFixed(1)}px)`;
      head.classList.toggle('is-on', p > 0 && p < 1);
      ports.forEach((pt) => pt.el.classList.toggle('is-on', probe >= pt.y - 1));
    };
    const measure = () => {
      if (!roomy.matches) { thread.hidden = true; return; }
      thread.hidden = false;
      const a = anchor.getBoundingClientRect();
      const x = a.left + parseFloat(getComputedStyle(anchor).paddingLeft) - 28 + window.scrollX;
      const heads = [...$$('.sec__head'), ...$$('.ix__head')]
        .map((h) => h.getBoundingClientRect().top + window.scrollY)
        .sort((m, n) => m - n);
      if (!heads.length) return;
      top = heads[0];
      height = Math.max(1, foot.getBoundingClientRect().top + window.scrollY - 48 - top);
      thread.style.left = `${x.toFixed(1)}px`;
      thread.style.top = `${top.toFixed(1)}px`;
      thread.style.height = `${height.toFixed(1)}px`;
      ports.forEach((pt) => pt.el.remove());
      ports = heads.map((y) => {
        const p = el('i', 'thread__port');
        p.style.top = `${(y - top).toFixed(1)}px`;
        thread.appendChild(p);
        return { el: p, y: y - top };
      });
      update();
    };
    // the page changes height (panel, filter, heatmap): re-measure on the next frame
    let queued = false;
    const remeasure = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; measure(); }); } };
    if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe($('main'));
    window.addEventListener('resize', remeasure);
    if (roomy.addEventListener) roomy.addEventListener('change', remeasure);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(remeasure);
    scrollHooks.push(update);
    measure();
  });

  /* ── Click ring: a small echo of the theme circle, from the exact point pressed ── */
  later('ripple', () => {
    if (!canAnimate) return;
    doc.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const target = e.target.closest('.btn, .node, .tool, .chip, .ix__btn, .foot__btn, .panel__close');
      if (!target) return;
      const ring = el('i', 'ripple');
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
      doc.body.appendChild(ring);
      ring.animate(
        [{ transform: 'scale(0.1)', opacity: 0.55 }, { transform: 'scale(1)', opacity: 0 }],
        { duration: 650, easing: EASE },
      ).finished.then(() => ring.remove(), () => ring.remove());
    }, { passive: true });
  });

  /* ── Lines that follow the pointer: links grow from the side you came in, rows open from where you are ── */
  later('pointer-lines', () => {
    if (!finePointer) return;
    const side = (e, n) => { const r = n.getBoundingClientRect(); return e.clientX < r.left + r.width / 2 ? 'left' : 'right'; };
    doc.addEventListener('pointerover', (e) => {
      const link = e.target.closest('.link');
      if (link && !link.contains(e.relatedTarget)) link.style.setProperty('--from', side(e, link));
      const row = e.target.closest('.repo');
      if (row && !row.contains(e.relatedTarget)) row.style.setProperty('--ox', `${(e.clientX - row.getBoundingClientRect().left).toFixed(0)}px`);
    });
    doc.addEventListener('pointerout', (e) => {
      const link = e.target.closest('.link');
      if (link && !link.contains(e.relatedTarget)) link.style.setProperty('--from', side(e, link));
      const row = e.target.closest('.repo');
      if (row && !row.contains(e.relatedTarget)) row.style.setProperty('--ox', `${(e.clientX - row.getBoundingClientRect().left).toFixed(0)}px`);
    });
  });

  if (api.refreshScroll) api.refreshScroll();
})();
