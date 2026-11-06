/* Overview: the camera pulls back and every section becomes an artboard on one canvas,
   joined by the same thread that runs down the page. Click one to zoom back into it.
   Shift+O, the command menu or the footer button. Desktop only; Esc returns. */

export function init(host) {
  const { doc, root, $, $$, el, t, api, reduced, EASE, langHooks } = host;
  const sections = $$('main > section');
  if (sections.length < 2) return;
  const DUR = reduced ? 0 : 720;

  const label = (s) => {
    if (s.id === 'top') return t('ov.top');
    const h = $('.sec__title, h2', s);
    return h ? h.textContent.trim() : (s.dataset.c || s.id);
  };
  const fmt = (key, s) => t(key).replace('{s}', s);

  /* overlay: hit areas with labels, plus the connectors */
  const layer = el('div', 'ov');
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'true');
  layer.hidden = true;
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ov__lines');
  svg.setAttribute('aria-hidden', 'true');
  const hint = el('p', 'ov__hint');
  layer.append(svg, hint);
  doc.body.appendChild(layer);

  let open = false;
  let busy = false;
  let boards = []; // { s, hit, rect: {x,y,w,h} (document coords), to: {x,y} (viewport), }
  let scale = 1;
  let scrollAtOpen = 0;

  /* pick the column count that gives the largest scale: sections stay in reading order,
     split into contiguous columns with balanced heights */
  const layout = (sizes, vw, vh) => {
    const padX = 64; const top = 92; const bottom = 72; const gapX = 56; const gapY = 44;
    let best = null;
    for (let cols = 2; cols <= Math.min(5, sizes.length); cols += 1) {
      // contiguous partition minimising the tallest column (n is tiny, brute force the cuts)
      const n = sizes.length;
      let bestCut = null;
      const tryCuts = (start, left, cuts) => {
        if (left === 1) {
          const all = [...cuts, n];
          let prev = 0; let maxH = 0;
          for (const c of all) { const h = sizes.slice(prev, c).reduce((a, s) => a + s.h, 0) + gapY * (c - prev - 1); maxH = Math.max(maxH, h); prev = c; }
          if (!bestCut || maxH < bestCut.maxH) bestCut = { cuts: all, maxH };
          return;
        }
        for (let c = start + 1; c <= n - left + 1; c += 1) tryCuts(c, left - 1, [...cuts, c]);
      };
      tryCuts(0, cols, []);
      const w = sizes[0].w;
      const sx = (vw - padX * 2 - gapX * (cols - 1)) / (cols * w);
      // gaps are drawn at screen size, so take them out of the available height before scaling
      const colsH = bestCut.cuts.map((c, i) => {
        const from = i ? bestCut.cuts[i - 1] : 0;
        return { from, to: c, raw: sizes.slice(from, c).reduce((a, s) => a + s.h, 0), count: c - from };
      });
      const sy = Math.min(...colsH.map((c) => (vh - top - bottom - gapY * (c.count - 1)) / c.raw));
      const s = Math.min(sx, sy);
      if (!best || s > best.s) best = { s, cols, colsH };
    }
    const { s, cols, colsH } = best;
    const colW = sizes[0].w * s;
    const totalW = cols * colW + gapX * (cols - 1);
    const x0 = (vw - totalW) / 2;
    const out = [];
    colsH.forEach((c, ci) => {
      const h = c.raw * s + gapY * (c.count - 1);
      let y = top + Math.max(0, (vh - top - bottom - h) / 2);
      for (let i = c.from; i < c.to; i += 1) { out[i] = { x: x0 + ci * (colW + gapX), y }; y += sizes[i].h * s + gapY; }
    });
    return { s, pos: out };
  };

  // layout geometry in document coordinates; offset* ignores transforms, so this is safe mid-animation
  const measure = () => sections.map((s) => {
    let x = 0; let y = 0;
    for (let n = s; n; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
    return { x, y, w: s.offsetWidth, h: s.offsetHeight };
  });

  // transform that moves a section from its place in the page (at the current scroll) to its artboard
  const tf = (b, sy) => `translate(${b.to.x - b.rect.x}px, ${b.to.y - (b.rect.y - sy)}px) scale(${scale})`;

  const drawLines = () => {
    const vw = window.innerWidth; const vh = window.innerHeight;
    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
    svg.innerHTML = '';
    for (let i = 0; i < boards.length - 1; i += 1) {
      const a = boards[i]; const b = boards[i + 1];
      const aw = a.rect.w * scale; const ah = a.rect.h * scale;
      let d;
      if (Math.abs(a.to.x - b.to.x) < 2) {
        // same column: straight down, clear of the labels on the left
        const x = a.to.x + aw - 28;
        d = `M${x} ${a.to.y + ah} L${x} ${b.to.y}`;
      } else {
        // next column: out of the right edge, along the gutter, into the left edge (rounded corners, like a trace)
        const x1 = a.to.x + aw; const y1 = a.to.y + Math.min(40, ah / 2);
        const x2 = b.to.x; const y2 = b.to.y + Math.min(40, b.rect.h * scale / 2);
        const gx = (x1 + x2) / 2;
        const r = Math.min(10, Math.abs(y2 - y1) / 2, (x2 - x1) / 4);
        const dir = y2 > y1 ? 1 : -1;
        d = Math.abs(y2 - y1) < 1
          ? `M${x1} ${y1} L${x2} ${y2}`
          : `M${x1} ${y1} L${gx - r} ${y1} Q${gx} ${y1} ${gx} ${y1 + r * dir} L${gx} ${y2 - r * dir} Q${gx} ${y2} ${gx + r} ${y2} L${x2} ${y2}`;
      }
      const p = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', 'ov__line');
      svg.appendChild(p);
      const port = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const end = d.split(/[\s,LQMS]+/).filter(Boolean).slice(-2).map(Number);
      port.setAttribute('cx', end[0]); port.setAttribute('cy', end[1]); port.setAttribute('r', 3.5);
      port.setAttribute('class', 'ov__port');
      svg.appendChild(port);
      if (!reduced && p.animate) {
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.animate({ strokeDashoffset: [len, 0] }, { duration: 620, delay: 380 + i * 90, easing: EASE, fill: 'backwards' });
        port.animate({ opacity: [0, 1], scale: [0, 1] }, { duration: 300, delay: 820 + i * 90, easing: EASE, fill: 'backwards' });
      }
    }
  };

  const buildHits = () => {
    $$('.ov__hit', layer).forEach((h) => h.remove());
    boards.forEach((b, i) => {
      const hit = el('button', 'ov__hit');
      hit.type = 'button';
      hit.style.left = `${b.to.x}px`;
      hit.style.top = `${b.to.y}px`;
      hit.style.width = `${b.rect.w * scale}px`;
      hit.style.height = `${b.rect.h * scale}px`;
      const name = label(b.s);
      hit.setAttribute('aria-label', fmt('ov.go', name));
      const tag = el('span', 'ov__tag');
      tag.innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b> ${name}`;
      hit.appendChild(tag);
      hit.addEventListener('click', () => close(i));
      hit.addEventListener('pointerenter', () => b.s.classList.add('is-ov-hot'));
      hit.addEventListener('pointerleave', () => b.s.classList.remove('is-ov-hot'));
      hit.addEventListener('focus', () => b.s.classList.add('is-ov-hot'));
      hit.addEventListener('blur', () => b.s.classList.remove('is-ov-hot'));
      layer.appendChild(hit);
      b.hit = hit;
      if (!reduced && tag.animate) tag.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 400, delay: 300 + i * 60, easing: EASE, fill: 'backwards' });
    });
  };

  const place = () => {
    const rects = measure();
    const { s, pos } = layout(rects.map((r) => ({ w: r.w, h: r.h })), window.innerWidth, window.innerHeight);
    scale = s;
    boards = sections.map((sec, i) => ({ s: sec, rect: rects[i], to: pos[i] }));
  };

  // the section nearest the middle of the screen when the overview opened
  const currentIndex = () => {
    const mid = window.innerHeight * 0.4;
    let best = 0; let dist = Infinity;
    sections.forEach((s, i) => { const r = s.getBoundingClientRect(); const d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid)); if (d < dist) { dist = d; best = i; } });
    return best;
  };

  const openOv = () => {
    if (open || busy) return;
    if (!host.wide.matches) return;
    busy = true;
    if (api.revealAll) api.revealAll();
    doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); // close menus, panels and demos first
    const from = currentIndex();
    scrollAtOpen = window.scrollY;
    root.classList.add('overview'); // before measuring: it hides the scrollbar but keeps its gutter
    place();
    root.style.setProperty('--ov-px', `${(1 / scale).toFixed(3)}px`);
    $('main').inert = true;
    ['.bar', '.foot'].forEach((sel) => { const n = $(sel); if (n) n.inert = true; });
    hint.textContent = t('ov.hint');
    layer.setAttribute('aria-label', t('ov.label'));
    layer.hidden = false;
    const sy = window.scrollY;
    boards.forEach((b, i) => {
      b.s.style.transformOrigin = '0 0';
      const to = tf(b, sy);
      if (DUR) {
        b.s.animate({ transform: ['none', to] }, { duration: DUR, delay: Math.abs(i - from) * 35, easing: EASE, fill: 'backwards' });
      }
      b.s.style.transform = to;
    });
    if (DUR) layer.animate({ opacity: [0, 1] }, { duration: 420, delay: 200, easing: EASE, fill: 'backwards' });
    buildHits();
    drawLines();
    open = true;
    setTimeout(() => {
      busy = false;
      if (pending !== undefined) { const i = pending; pending = undefined; close(i); return; }
      const h = boards[from] && boards[from].hit;
      if (h) h.focus({ preventScroll: true });
    }, DUR ? DUR * 0.6 : 0);
  };

  let pending; // a close requested while the overview was still opening
  const close = (index = null) => {
    if (open && busy && pending === undefined && !root.classList.contains('ov-leaving')) { pending = index; return; }
    if (!open || busy) return;
    busy = true;
    const target = index === null ? null : boards[index];
    const before = window.scrollY;
    // land at the start of the chosen section (or where the reader was), then fly every board home
    let next = before;
    if (target) next = Math.max(0, Math.min(target.rect.y - (target.s.id === 'top' ? 0 : 64), doc.documentElement.scrollHeight - window.innerHeight));
    else next = scrollAtOpen;
    boards.forEach((b) => b.s.classList.remove('is-ov-hot'));
    root.classList.add('ov-leaving');
    window.scrollTo({ top: next, behavior: 'instant' });
    const sy = window.scrollY;
    boards.forEach((b) => { b.s.style.transform = tf(b, sy); }); // same picture, new scroll position
    const done = () => {
      boards.forEach((b) => { b.s.style.transform = ''; b.s.style.transformOrigin = ''; b.s.classList.remove('is-ov-hot'); });
      root.classList.remove('overview', 'ov-leaving');
      layer.hidden = true;
      $('main').inert = false;
      ['.bar', '.foot'].forEach((sel) => { const n = $(sel); if (n) n.inert = false; });
      open = false;
      busy = false;
      if (target) {
        const focusable = target.s.querySelector('h1, h2, [tabindex], a, button');
        if (focusable) { if (!focusable.matches('a, button, [tabindex]')) focusable.setAttribute('tabindex', '-1'); focusable.focus({ preventScroll: true }); }
      }
      window.dispatchEvent(new Event('scroll'));
    };
    if (!DUR) { done(); return; }
    const anims = boards.map((b, i) => {
      const from = b.s.style.transform;
      const far = target ? Math.abs(i - index) : 0;
      return b.s.animate({ transform: [from, 'none'] }, { duration: DUR, delay: far * 30, easing: EASE, fill: 'forwards' });
    });
    const fade = layer.animate({ opacity: [1, 0] }, { duration: 260, easing: EASE, fill: 'forwards' });
    const finish = () => { done(); anims.forEach((a) => a.cancel()); fade.cancel(); };
    Promise.all(anims.map((a) => a.finished)).then(finish, finish);
  };

  const toggle = () => (open ? close(null) : openOv());

  /* triggers */
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) { e.preventDefault(); close(null); return; }
    if (!(e.shiftKey && (e.key === 'O' || e.key === 'o')) || e.ctrlKey || e.metaKey || e.altKey) return;
    const tgt = e.target;
    if (tgt && (tgt.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tgt.tagName))) return;
    e.preventDefault();
    toggle();
  });
  // arrows move between boards while the overview is open
  layer.addEventListener('keydown', (e) => {
    if (!open || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const i = boards.findIndex((b) => b.hit === doc.activeElement);
    const step = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
    const n = boards[(Math.max(i, 0) + step + boards.length) % boards.length];
    if (n && n.hit) { e.preventDefault(); n.hit.focus(); }
  });
  layer.addEventListener('click', (e) => { if (e.target === layer || e.target === svg) close(null); });
  layer.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });

  const footBtn = $('[data-overview]');
  const sync = () => { if (footBtn) footBtn.hidden = !host.wide.matches; };
  sync();
  if (host.wide.addEventListener) host.wide.addEventListener('change', () => { sync(); if (open && !host.wide.matches) close(null); });
  if (footBtn) footBtn.addEventListener('click', () => openOv());

  // re-lay the boards if the window changes or a section grows while open (e.g. the heatmap finishes loading)
  let resizeT = 0;
  const relayout = () => {
    if (!open) return;
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (!open) return;
      if (busy) { relayout(); return; }
      const sy = window.scrollY;
      const focusedIndex = boards.findIndex((b) => b.hit === doc.activeElement);
      const old = boards.map((b) => b.s.style.transform);
      boards.forEach((b) => { b.s.style.transform = ''; });
      place();
      root.style.setProperty('--ov-px', `${(1 / scale).toFixed(3)}px`);
      boards.forEach((b, i) => {
        const to = tf(b, sy);
        if (DUR && old[i] && old[i] !== to) b.s.animate({ transform: [old[i], to] }, { duration: 420, easing: EASE });
        b.s.style.transform = to;
      });
      buildHits();
      drawLines();
      if (focusedIndex >= 0 && boards[focusedIndex].hit) boards[focusedIndex].hit.focus({ preventScroll: true });
    }, 120);
  };
  window.addEventListener('resize', relayout);
  if ('ResizeObserver' in window) {
    // remember each section's height so the first (initial) notification and no-op changes are ignored
    const heights = new Map();
    const ro = new ResizeObserver((entries) => {
      let changed = false;
      entries.forEach((e) => {
        const h = Math.round(e.contentRect.height);
        if (heights.has(e.target) && heights.get(e.target) !== h) changed = true;
        heights.set(e.target, h);
      });
      if (changed) relayout();
    });
    sections.forEach((s) => ro.observe(s));
  }
  langHooks.push(() => { if (open) { hint.textContent = t('ov.hint'); buildHits(); } });

  (api.commands = api.commands || []).push(() => (host.wide.matches
    ? { g: 'do', id: 'overview', label: t('cmd.overview'), kw: 'overview visao geral zoom canvas mapa map artboards', run: () => setTimeout(openOv, 260) }
    : null));
  (api.keys = api.keys || []).push(() => [['Shift', 'O'], t('keys.overview')]);
  api.overview = { open: openOv, close, toggle, get isOpen() { return open; } };
}
