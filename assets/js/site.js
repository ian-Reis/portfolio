/* Ian Reis — portfolio. Plain JavaScript, no dependencies.
   Modules: theme, language, header (progress + nav), hero (type + light), reveals, skill map
   (graph, scroll build, tracing, panel, packets), GitHub data (dates, languages, timeline, previews),
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

  /* ── platform key labels ── */
  safe('keys', () => $$('.mod-key').forEach((k) => { k.textContent = isMac ? '⌘' : 'Ctrl'; }));

  /* ── Theme: light / dark, opened as a circle from wherever it was triggered ── */
  safe('theme', () => {
    const btn = $('#theme-toggle');
    const meta = $('meta[name="theme-color"]');
    const current = () => (root.dataset.theme === 'dark' ? 'dark' : 'light');
    const sync = () => {
      const dark = current() === 'dark';
      btn.setAttribute('aria-checked', String(dark));
      btn.title = t(dark ? 'theme.toLight' : 'theme.toDark');
      if (meta) meta.setAttribute('content', dark ? '#0E1418' : '#F2F4F3');
    };
    const set = (next, origin) => {
      const apply = () => {
        root.dataset.theme = next;
        try { localStorage.setItem('ir:theme', next); } catch (e) { /* private mode */ }
        sync();
      };
      if (!doc.startViewTransition || reduced) { apply(); return; }
      const r = origin ? origin.getBoundingClientRect() : null;
      const x = r ? r.left + r.width / 2 : window.innerWidth - 60;
      const y = r ? r.top + r.height / 2 : 32;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const vt = doc.startViewTransition(apply);
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
    btn.addEventListener('click', () => { if (I) I.set(I.lang === 'pt' ? 'en' : 'pt'); });
    sync();
    langHooks.push(sync);
    api.lang = { toggle: () => I && I.set(I.lang === 'pt' ? 'en' : 'pt') };
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
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(move);
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
    const heads = $$('.sec__head');
    const items = [...$$('.repo'), ...$$('.insight'), $('.contact')].filter(Boolean);
    items.forEach((n) => n.classList.add('reveal'));
    $$('.repos').forEach((list) => $$('.repo', list).forEach((li, i) => li.style.setProperty('--i', String(i))));
    $$('.insight').forEach((f, i) => f.style.setProperty('--i', String(i)));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
    [...heads, ...items].forEach((n) => io.observe(n));
    api.revealAll = () => [...heads, ...items].forEach((n) => n.classList.add('is-in'));
    root.classList.add('js'); // only now may CSS hide things that wait for a reveal
  });

  /* ── Skill map ── */
  safe('map', () => {
    const map = $('.map');
    if (!map) return;

    const nodes = $$('.node', map).map((node) => ({
      el: node,
      id: node.dataset.id,
      to: (node.dataset.to || '').split(/\s+/).filter(Boolean),
      stage: Number(node.dataset.stage) || 0,
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
    const order = (n) => n.stage + (n.games ? 0.6 : 0);
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
      if (wide.matches && !opts.fromChip) {
        // keep the opened panel in view
        const top = panel.getBoundingClientRect().top;
        const h = $('.panel__inner', panel).scrollHeight + 44;
        const overflow = top + h - window.innerHeight + 24;
        if (overflow > 0) window.scrollBy({ top: Math.min(overflow, top - 96), behavior: reduced ? 'auto' : 'smooth' });
      }
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

    function select(id, opts = {}) {
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

  /* ── GitHub data (one cached request feeds dates, languages, timeline and previews) ── */
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

  safe('work', () => {
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

    const timeline = () => {
      const tl = $('#timeline');
      const own = repos.filter((r) => !r.fork && r.pushed).map((r) => ({ ...r, d: new Date(r.pushed) })).filter((r) => !Number.isNaN(r.d.getTime()));
      if (own.length < 2) return false;
      own.sort((a, b) => a.d - b.d);
      const firstYear = own[0].d.getFullYear();
      const start = new Date(firstYear, 0, 1).getTime();
      const now = Date.now();
      const end = Math.max(now, own[own.length - 1].d.getTime()) + 1000 * 3600 * 24 * 20;
      const pos = (time) => ((time - start) / (end - start)) * 100;
      const parts = [el('div', 'timeline__axis')];
      for (let y = firstYear; y <= new Date(end).getFullYear(); y += 1) {
        const x = pos(new Date(y, 0, 1).getTime());
        if (x < 0 || x > 100) continue;
        const tick = el('span', 'timeline__tick');
        tick.style.left = `${x}%`;
        const label = el('span', 'timeline__year', String(y));
        label.style.left = `${Math.max(2, x)}%`;
        parts.push(tick, label);
      }
      const lanes = [-99, -99, -99];
      own.forEach((r, i) => {
        const x = pos(r.d.getTime());
        let lane = lanes.findIndex((lx) => x - lx > 2.2);
        if (lane === -1) lane = 0;
        lanes[lane] = x;
        const a = el('a', 'timeline__dot');
        a.href = r.url; a.target = '_blank'; a.rel = 'noopener';
        a.tabIndex = -1;
        a.setAttribute('aria-hidden', 'true');
        a.style.left = `${x}%`;
        a.style.top = `${40 - lane * 14}px`;
        a.style.setProperty('--i', String(i));
        a.dataset.name = r.name;
        a.dataset.when = r.pushed;
        parts.push(a);
      });
      const years = `${firstYear}–${own[own.length - 1].d.getFullYear()}`;
      parts.push(el('p', 'sr', `${own.length} ${t('timeline.repos')}, ${years}.`));
      tl.replaceChildren(...parts);
      return true;
    };

    const render = () => {
      if (!repos) return;
      dates();
      const a = languages();
      const b = timeline();
      if (insights) insights.hidden = !(a && b);
      if (api.refreshScroll) requestAnimationFrame(api.refreshScroll);
    };

    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      getRepos().then((data) => { repos = data; render(); }).catch(() => { /* static list stays */ });
    }, { rootMargin: '500px 0px' });
    io.observe(list);
    langHooks.push(render);
    api.repoByName = (name) => (repos ? repos.find((r) => r.name.toLowerCase() === name.toLowerCase()) : null);
  });

  /* ── Floating preview: last commit on repositories, cover on games, name on timeline dots ── */
  safe('peek', () => {
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

    const tl = $('#timeline');
    if (tl) {
      tl.addEventListener('pointerover', (e) => {
        const dot = e.target.closest('.timeline__dot');
        if (!dot) return;
        follow(e);
        show([el('p', 'peek__label', monthYear(dot.dataset.when)), el('p', 'peek__msg', dot.dataset.name)]);
      });
      tl.addEventListener('pointermove', follow);
      tl.addEventListener('pointerout', (e) => { if (e.target.closest('.timeline__dot')) hide(); });
    }
    window.addEventListener('scroll', hide, { passive: true });
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
  const inspect = (force) => {
    const on = typeof force === 'boolean' ? force : !root.classList.contains('inspecting');
    root.classList.toggle('inspecting', on);
    const layer = $('#inspect');
    if (layer) layer.setAttribute('aria-hidden', String(!on));
    $$('[data-inspect]').forEach((b) => b.setAttribute('aria-pressed', String(on)));
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
  safe('palette', () => {
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
      { g: 'go', id: 'work', label: t('cmd.work'), kw: 'work trabalho repositories repositorios', run: () => go('#work') },
      { g: 'go', id: 'games', label: t('cmd.games'), kw: 'games jogos itch', run: () => go('#games') },
      { g: 'go', id: 'contact', label: t('cmd.contact'), kw: 'contact contato email', run: () => go('#contact') },
      { g: 'do', id: 'theme', label: t('cmd.theme'), kw: 'theme tema dark escuro light claro', run: () => api.theme && api.theme.toggle(null) },
      { g: 'do', id: 'lang', label: t('cmd.lang'), kw: 'language idioma portugues english ingles', run: () => api.lang && api.lang.toggle() },
      { g: 'do', id: 'copy', label: t('cmd.copy'), kw: 'copy copiar email e-mail', run: copyEmail },
      { g: 'do', id: 'inspect', label: t('cmd.inspect'), kw: 'inspect inspecionar grid layout', run: () => inspect() },
      { g: 'do', id: 'print', label: t('cmd.print'), kw: 'print imprimir pdf resume curriculo cv', run: printResume },
      { g: 'open', id: 'github', label: t('cmd.github'), kw: 'github code codigo', run: () => openTab(GITHUB) },
      { g: 'open', id: 'itch', label: t('cmd.itch'), kw: 'itch games jogos', run: () => openTab(ITCH) },
      { g: 'open', id: 'mail', label: t('cmd.mail'), kw: 'email e-mail mail', run: () => { window.location.href = `mailto:${EMAIL}`; } },
    ];
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    const render = () => {
      const q = norm(input.value.trim());
      const words = q.split(/\s+/).filter(Boolean);
      items = commands().filter((c) => {
        const hay = norm(`${c.label} ${c.kw}`);
        return words.every((w) => hay.includes(w));
      });
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
    const openPalette = () => {
      if (!palette.hidden) return;
      lastFocus = doc.activeElement;
      palette.hidden = false;
      input.value = '';
      active = 0;
      render();
      input.focus();
    };
    const closePalette = (restore = true) => {
      if (palette.hidden) return;
      palette.hidden = true;
      if (restore && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    const run = (i) => {
      const c = items[i];
      if (!c) return;
      closePalette(c.g !== 'go');
      setTimeout(c.run, 30);
    };

    input.addEventListener('input', () => { active = 0; render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); active = items.length ? (active + 1) % items.length : 0; mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = items.length ? (active - 1 + items.length) % items.length : 0; mark(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(active); }
      else if (e.key === 'Tab') { e.preventDefault(); }
    });
    $$('[data-close-palette]', palette).forEach((n) => n.addEventListener('click', () => closePalette()));
    $('#open-palette').addEventListener('click', openPalette);
    $$('[data-open-palette]').forEach((b) => b.addEventListener('click', openPalette));
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
      if (e.key === 'Escape') {
        if (!palette.hidden) { closePalette(); return; }
        if (root.classList.contains('inspecting')) { inspect(false); return; }
        if (api.map) api.map.unpin();
      }
    });
  });

  if (api.refreshScroll) api.refreshScroll();
})();
