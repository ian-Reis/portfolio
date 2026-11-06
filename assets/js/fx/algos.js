/* Live algorithm lab: every entry of the "Algorithms and data structures" group runs as a small demo.
   Each demo is a generator that yields frames { draw(G), note, hold }; the runner paints them in a card.
   Real data where it exists: the skill graph, the index entries, the contribution counts. */

export function init(host) {
  const { $, $$, el, I, reduced, finePointer, cssVar, themeHooks, langHooks } = host;
  const items = $$('.ix__item[data-algo]');
  if (!items.length) return;
  const pt = () => !!I && I.lang === 'pt';
  const L = (en, ptText) => (pt() ? ptText : en);

  /* ── shared data ── */
  const data = { counts: null };
  fetch('assets/data/activity.json', { cache: 'force-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => { if (d && Array.isArray(d.counts)) data.counts = d.counts; })
    .catch(() => {});

  const skillGraph = () => {
    const nodes = $$('.node[data-id]').map((n) => ({
      id: n.dataset.id,
      name: $('.node__name', n).textContent.trim(),
      to: (n.dataset.to || '').split(/\s+/).filter(Boolean),
      stage: Number(n.dataset.stage) || 0,
      row: [...n.closest('.map').querySelectorAll('.map__row')].indexOf(n.closest('.map__row')),
    }));
    const adj = new Map(nodes.map((n) => [n.id, new Set()]));
    nodes.forEach((n) => n.to.forEach((t) => { if (adj.has(t)) { adj.get(n.id).add(t); adj.get(t).add(n.id); } }));
    return { nodes, adj };
  };

  /* ── drawing helpers ── */
  const card = el('div', 'lab');
  card.setAttribute('role', 'region');
  card.hidden = true;
  const head = el('div', 'lab__head');
  const title = el('span', 'lab__title');
  const replay = el('button', 'lab__btn');
  replay.type = 'button';
  replay.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.5 10a5.5 5.5 0 1 1-1.6-3.9M15.5 4v3.5H12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const close = el('button', 'lab__btn');
  close.type = 'button';
  close.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  head.append(title, replay, close);
  const canvas = el('canvas', 'lab__canvas');
  const note = el('p', 'lab__note');
  note.setAttribute('aria-live', 'polite');
  card.append(head, canvas, note);
  document.body.appendChild(card);
  const ctx = canvas.getContext('2d');
  const W = 340;
  const H = 210;

  let colors = {};
  const readColors = () => {
    colors = {
      ink: cssVar('--ink'), slate: cssVar('--slate'), line: cssVar('--hairline'), strong: cssVar('--hairline-strong'),
      accent: cssVar('--accent'), tint: cssVar('--accent-tint'), surface: cssVar('--surface'), paper: cssVar('--paper'),
    };
  };
  readColors();
  const sizeCanvas = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  sizeCanvas();

  const FONT = "'Geist', system-ui, sans-serif";
  const MONO = "'Geist Mono', ui-monospace, monospace";
  const G = {
    W, H,
    get c() { return colors; },
    text(x, y, s, o = {}) {
      ctx.fillStyle = o.color || colors.ink;
      ctx.font = `${o.weight || 400} ${o.size || 12}px ${o.mono ? MONO : FONT}`;
      ctx.textAlign = o.align || 'center';
      ctx.textBaseline = o.base || 'middle';
      ctx.fillText(String(s), x, y);
    },
    box(x, y, w, h, o = {}) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, o.r === undefined ? 5 : o.r);
      ctx.fillStyle = o.fill || colors.surface;
      ctx.fill();
      ctx.lineWidth = o.lw || 1;
      ctx.strokeStyle = o.stroke || colors.strong;
      ctx.stroke();
      if (o.text !== undefined) G.text(x + w / 2, y + h / 2 + 0.5, o.text, { color: o.textColor, size: o.size || 12, mono: o.mono, weight: o.weight });
    },
    circle(x, y, r, o = {}) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = o.fill || colors.surface;
      ctx.fill();
      ctx.lineWidth = o.lw || 1.2;
      ctx.strokeStyle = o.stroke || colors.strong;
      ctx.stroke();
      if (o.text !== undefined) G.text(x, y + 0.5, o.text, { color: o.textColor, size: o.size || 11, mono: o.mono, weight: o.weight });
    },
    line(x1, y1, x2, y2, o = {}) {
      ctx.beginPath();
      ctx.setLineDash(o.dash || []);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = o.lw || 1.2;
      ctx.strokeStyle = o.color || colors.strong;
      ctx.stroke();
      ctx.setLineDash([]);
    },
    arrow(x1, y1, x2, y2, o = {}) {
      G.line(x1, y1, x2, y2, o);
      const a = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 7 * Math.cos(a - 0.45), y2 - 7 * Math.sin(a - 0.45));
      ctx.lineTo(x2 - 7 * Math.cos(a + 0.45), y2 - 7 * Math.sin(a + 0.45));
      ctx.closePath();
      ctx.fillStyle = o.color || colors.strong;
      ctx.fill();
    },
  };
  const hot = () => ({ fill: colors.tint, stroke: colors.accent, textColor: colors.ink });
  const solid = () => ({ fill: colors.accent, stroke: colors.accent, textColor: colors.paper });

  /* tree layout shared by heap / AVL: in-order x, depth y */
  const drawTree = (rootNode, highlight = new Set(), top = 26, gap = 34) => {
    const order = [];
    const walk = (n, d) => { if (!n) return; walk(n.l, d + 1); order.push([n, d]); walk(n.r, d + 1); };
    walk(rootNode, 0);
    const pos = new Map();
    const step = (W - 40) / Math.max(order.length, 1);
    order.forEach(([n, d], i) => pos.set(n, [20 + step * (i + 0.5), top + d * gap]));
    const edges = (n) => { if (!n) return; [n.l, n.r].forEach((c) => { if (c) { const a = pos.get(n); const b = pos.get(c); G.line(a[0], a[1], b[0], b[1]); edges(c); } }); };
    edges(rootNode);
    order.forEach(([n]) => { const [x, y] = pos.get(n); G.circle(x, y, 12, highlight.has(n.k) ? hot() : {}); G.text(x, y + 0.5, n.k, { size: 11, mono: true }); });
  };

  /* ── demos ── */
  const DEMOS = {
    *queues() {
      const stack = [];
      const queue = [];
      const buckets = [[], [], [], [], []];
      const hash = (k) => [...k].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 5;
      const ops = [
        ['s', 'push', 'A'], ['q', 'enq', '1'], ['s', 'push', 'B'], ['h', 'put', 'godot'], ['q', 'enq', '2'],
        ['s', 'push', 'C'], ['h', 'put', 'luau'], ['q', 'enq', '3'], ['s', 'pop'], ['q', 'deq'], ['h', 'put', 'redis'], ['h', 'get', 'godot'],
      ];
      const frame = (hl, noteText) => ({
        note: noteText,
        draw() {
          G.text(52, 14, L('Stack (LIFO)', 'Pilha (LIFO)'), { size: 11, color: colors.slate });
          G.text(160, 14, L('Queue (FIFO)', 'Fila (FIFO)'), { size: 11, color: colors.slate });
          G.text(276, 14, 'Hash map', { size: 11, color: colors.slate });
          G.line(22, 186, 82, 186, { color: colors.strong });
          stack.forEach((v, i) => G.box(27, 160 - i * 28, 50, 24, { text: v, mono: true, ...(hl === `s${i}` ? hot() : {}) }));
          queue.forEach((v, i) => G.box(112 + i * 33, 92, 30, 26, { text: v, mono: true, ...(hl === `q${i}` ? hot() : {}) }));
          G.text(110, 132, L('out', 'saída'), { size: 10, color: colors.slate, align: 'left' });
          G.text(210, 132, L('in', 'entrada'), { size: 10, color: colors.slate, align: 'right' });
          buckets.forEach((b, i) => {
            G.text(226, 40 + i * 30, i, { mono: true, size: 10, color: colors.slate });
            G.box(236, 30 + i * 30, 90, 22, { r: 4, ...(hl === `h${i}` ? hot() : {}) });
            G.text(242, 41 + i * 30, b.join(', '), { mono: true, size: 10, align: 'left' });
          });
        },
      });
      yield frame(null, L('Three ways to keep things in order.', 'Três jeitos de guardar coisas em ordem.'));
      for (const [ds, op, v] of ops) {
        if (ds === 's' && op === 'push') { stack.push(v); yield frame(`s${stack.length - 1}`, L(`push(${v}): goes on top`, `push(${v}): vai para o topo`)); }
        if (ds === 's' && op === 'pop') { const top = stack.length - 1; yield frame(`s${top}`, L(`pop(): ${stack[top]} leaves first, it came last`, `pop(): ${stack[top]} sai primeiro, chegou por último`)); stack.pop(); }
        if (ds === 'q' && op === 'enq') { queue.push(v); yield frame(`q${queue.length - 1}`, L(`enqueue(${v}): joins at the back`, `enqueue(${v}): entra no fim`)); }
        if (ds === 'q' && op === 'deq') { yield frame('q0', L(`dequeue(): ${queue[0]} leaves first, it came first`, `dequeue(): ${queue[0]} sai primeiro, chegou primeiro`)); queue.shift(); }
        if (ds === 'h') {
          const b = hash(v);
          if (op === 'put') buckets[b].push(v);
          yield frame(`h${b}`, op === 'put'
            ? L(`put("${v}"): hash → bucket ${b}`, `put("${v}"): hash → balde ${b}`)
            : L(`get("${v}"): straight to bucket ${b}, O(1)`, `get("${v}"): direto no balde ${b}, O(1)`));
        }
      }
      yield { ...frame(null, L('Done. Same data, three access patterns.', 'Pronto. Mesmos dados, três padrões de acesso.')), hold: 1400 };
    },

    *linked() {
      const draw = (list, opts = {}) => () => {
        const xs = list.map((_, i) => 30 + i * 74);
        list.forEach((v, i) => {
          const x = xs[i];
          const y = opts.lift === v ? 50 : 100;
          G.box(x, y, 46, 30, { text: v, mono: true, ...(opts.hl === v ? hot() : {}) });
          if (i < list.length - 1 && !(opts.cut === v)) {
            const ny = opts.lift === list[i + 1] ? 50 : 100;
            G.arrow(x + 46, y + 15, xs[i + 1] - 2, ny + 15, { color: opts.hl === v ? colors.accent : colors.strong });
          }
        });
        G.text(xs[xs.length - 1] + 70, 115, 'null', { mono: true, size: 11, color: colors.slate });
        G.text(30, 160, 'head', { mono: true, size: 11, color: colors.slate, align: 'left' });
        G.arrow(42, 150, 50, 132, { color: colors.slate });
      };
      yield { draw: draw([3, 7, 9]), note: L('A list where each node points to the next.', 'Uma lista em que cada nó aponta para o próximo.') };
      yield { draw: draw([3, 5, 7, 9], { lift: 5, hl: 5, cut: 3 }), note: L('New node 5 first points to 7…', 'O nó novo 5 primeiro aponta para o 7…') };
      yield { draw: draw([3, 5, 7, 9], { lift: 5, hl: 3 }), note: L('…then 3 points to 5. No shifting, O(1).', '…depois o 3 aponta para o 5. Sem deslocar nada, O(1).') };
      yield { draw: draw([3, 5, 7, 9], { hl: 5 }), note: L('Inserted.', 'Inserido.') };
      yield { draw: draw([3, 5, 7, 9], { hl: 7, cut: 7 }), note: L('Delete 9: 7 now points to null.', 'Remover o 9: o 7 passa a apontar para null.') };
      yield { draw: draw([3, 5, 7]), note: L('Done.', 'Pronto.'), hold: 1400 };
    },

    *heap() {
      const a = [];
      const toTree = (arr, i = 0) => (i < arr.length ? { k: arr[i], l: toTree(arr, 2 * i + 1), r: toTree(arr, 2 * i + 2) } : null);
      const frame = (hl, noteText, hold) => ({
        hold,
        note: noteText,
        draw() {
          drawTree(toTree(a), new Set(hl), 24, 36);
          a.forEach((v, i) => G.box(20 + i * 34, 168, 30, 26, { text: v, mono: true, ...(hl.includes(v) ? hot() : {}) }));
        },
      });
      for (const v of [8, 3, 10, 1, 6, 2]) {
        a.push(v);
        let i = a.length - 1;
        yield frame([v], L(`insert ${v} at the end`, `inserir ${v} no fim`));
        while (i > 0) {
          const p = (i - 1) >> 1;
          if (a[p] <= a[i]) break;
          [a[p], a[i]] = [a[i], a[p]];
          yield frame([a[p], a[i]], L(`${a[p]} < ${a[i]}: swap with parent (sift up)`, `${a[p]} < ${a[i]}: troca com o pai (sift up)`));
          i = p;
        }
      }
      yield frame([a[0]], L(`Min-heap: the smallest (${a[0]}) is always on top`, `Min-heap: o menor (${a[0]}) fica sempre no topo`), 1500);
    },

    *trees() {
      const h = (n) => (n ? n.h : 0);
      const fix = (n) => { n.h = 1 + Math.max(h(n.l), h(n.r)); return n; };
      const rotR = (y) => { const x = y.l; y.l = x.r; x.r = y; fix(y); return fix(x); };
      const rotL = (x) => { const y = x.r; x.r = y.l; y.l = x; fix(x); return fix(y); };
      const snaps = [];
      let root = null;
      const insert = (n, k) => {
        if (!n) return { k, h: 1, l: null, r: null };
        if (k < n.k) n.l = insert(n.l, k); else n.r = insert(n.r, k);
        fix(n);
        const bal = h(n.l) - h(n.r);
        if (bal > 1 || bal < -1) {
          const kind = bal > 1 ? (k < n.l.k ? 'LL' : 'LR') : (k > n.r.k ? 'RR' : 'RL');
          snaps.push({ pre: true, k: n.k, kind });
          if (kind === 'LL') return rotR(n);
          if (kind === 'RR') return rotL(n);
          if (kind === 'LR') { n.l = rotL(n.l); return rotR(n); }
          n.r = rotR(n.r); return rotL(n);
        }
        return n;
      };
      const clone = (n) => (n ? { k: n.k, l: clone(n.l), r: clone(n.r) } : null);
      for (const k of [10, 20, 30, 40, 50, 25]) {
        snaps.length = 0;
        const before = clone(insertPlain(clone(root), k));
        root = insert(root, k);
        const rot = snaps[0];
        if (rot) {
          yield { draw: () => drawTree(before, new Set([k, rot.k])), note: L(`insert ${k}: node ${rot.k} is out of balance`, `inserir ${k}: o nó ${rot.k} ficou desbalanceado`) };
          yield { draw: () => drawTree(clone(root), new Set([k])), note: L(`${rot.kind === 'LR' || rot.kind === 'RL' ? 'double' : 'single'} rotation (${rot.kind}): height restored`, `rotação ${rot.kind === 'LR' || rot.kind === 'RL' ? 'dupla' : 'simples'} (${rot.kind}): altura restaurada`) };
        } else {
          yield { draw: () => drawTree(clone(root), new Set([k])), note: L(`insert ${k}`, `inserir ${k}`) };
        }
      }
      yield { draw: () => drawTree(clone(root)), note: L('AVL tree: every search stays O(log n)', 'Árvore AVL: toda busca continua O(log n)'), hold: 1500 };
      function insertPlain(n, k) { if (!n) return { k, l: null, r: null }; if (k < n.k) n.l = insertPlain(n.l, k); else n.r = insertPlain(n.r, k); return n; }
    },

    *btree() {
      // order 3: at most 2 keys per node
      let root = { keys: [], kids: [] };
      const snap = () => JSON.parse(JSON.stringify(root));
      const drawB = (tree, hl) => () => {
        const levels = [];
        const walk = (n, d) => { (levels[d] = levels[d] || []).push(n); n.kids.forEach((c) => walk(c, d + 1)); };
        walk(tree, 0);
        const pos = new Map();
        levels.forEach((lv, d) => lv.forEach((n, i) => {
          const w = 18 + n.keys.length * 22;
          const x = (W / (lv.length + 1)) * (i + 1) - w / 2;
          pos.set(n, [x, 30 + d * 62, w]);
        }));
        levels.forEach((lv) => lv.forEach((n) => {
          const [x, y, w] = pos.get(n);
          n.kids.forEach((c) => { const [cx, cy, cw] = pos.get(c); G.line(x + w / 2, y + 24, cx + cw / 2, cy); });
        }));
        levels.forEach((lv) => lv.forEach((n) => {
          const [x, y, w] = pos.get(n);
          const isHot = n.keys.includes(hl);
          G.box(x, y, w, 24, isHot ? hot() : {});
          n.keys.forEach((k, j) => G.text(x + 20 + j * 22, y + 12.5, k, { mono: true, size: 11 }));
        }));
      };
      const split = (parent, i) => {
        const c = parent.kids[i];
        const mid = c.keys[1];
        const right = { keys: c.keys.slice(2), kids: c.kids.slice(2) };
        c.keys = c.keys.slice(0, 1);
        c.kids = c.kids.slice(0, 2);
        parent.keys.splice(i, 0, mid);
        parent.kids.splice(i + 1, 0, right);
        return mid;
      };
      const insertRec = (n, k, events) => {
        if (!n.kids.length) { n.keys.push(k); n.keys.sort((a, b) => a - b); return; }
        let i = n.keys.findIndex((x) => k < x);
        if (i < 0) i = n.keys.length;
        insertRec(n.kids[i], k, events);
        if (n.kids[i].keys.length > 2) events.push(split(n, i));
      };
      for (let k = 1; k <= 7; k += 1) {
        const events = [];
        insertRec(root, k, events);
        if (root.keys.length > 2) { const old = root; root = { keys: [], kids: [old] }; events.push(split(root, 0)); }
        yield { draw: drawB(snap(), k), note: events.length
          ? L(`insert ${k}: node overflowed, ${events.join(', ')} moves up (split)`, `inserir ${k}: o nó estourou, ${events.join(', ')} sobe (split)`)
          : L(`insert ${k}`, `inserir ${k}`), hold: events.length ? 1100 : 600 };
      }
      yield { draw: drawB(snap()), note: L('B-tree: wide and shallow, made for disks and databases', 'B-tree: larga e rasa, feita para disco e bancos de dados'), hold: 1500 };
    },

    *graphs() {
      const { nodes, adj } = skillGraph();
      if (!nodes.length) return;
      const rows = Math.max(...nodes.map((n) => n.row)) + 1;
      const pos = new Map();
      const groups = new Map();
      nodes.forEach((n) => { const key = `${n.row}:${n.stage}`; groups.set(key, [...(groups.get(key) || []), n]); });
      groups.forEach((list) => list.forEach((n, i) => {
        const bandH = (H - 30) / rows;
        const y = 16 + n.row * bandH + (bandH / (list.length + 1)) * (i + 1);
        pos.set(n.id, [26 + n.stage * 80, y]);
      }));
      const short = (n) => (n.name.length > 9 ? `${n.name.slice(0, 8)}…` : n.name);
      const nameOf = (id) => { const n = nodes.find((x) => x.id === id); return n ? n.name : id; };
      const frame = (visited, frontier, current, noteText, label) => ({
        note: noteText,
        draw() {
          nodes.forEach((n) => n.to.forEach((t) => { const a = pos.get(n.id); const b = pos.get(t); if (b) G.line(a[0], a[1], b[0], b[1], { color: visited.has(n.id) && visited.has(t) ? colors.accent : colors.line }); }));
          nodes.forEach((n) => {
            const [x, y] = pos.get(n.id);
            const st = n.id === current ? solid() : visited.has(n.id) ? hot() : frontier.includes(n.id) ? { stroke: colors.accent } : {};
            G.circle(x, y, 6, st);
            G.text(x + 9, y, short(n), { size: 9.5, align: 'left', color: visited.has(n.id) ? colors.ink : colors.slate });
          });
          G.text(W - 8, H - 10, `${label}: [${frontier.join(', ')}]`, { mono: true, size: 9.5, align: 'right', color: colors.slate });
        },
      });
      // BFS over the business systems, from RESTful APIs
      let visited = new Set(['api']);
      let q = ['api'];
      yield frame(visited, q, null, L('BFS from "RESTful APIs" on the real skill map', 'BFS a partir de "APIs RESTful" no mapa real de skills'), 'queue');
      while (q.length) {
        const cur = q.shift();
        for (const nb of adj.get(cur)) if (!visited.has(nb)) { visited.add(nb); q.push(nb); }
        yield frame(visited, q, cur, L(`visit ${nameOf(cur)}, enqueue its neighbours`, `visita ${nameOf(cur)}, enfileira os vizinhos`), 'queue');
      }
      // DFS over the games track, from GDScript
      const v2 = new Set(visited);
      const stack = ['gdscript'];
      yield frame(v2, stack, null, L('DFS from "GDScript": goes deep before going wide', 'DFS a partir de "GDScript": vai fundo antes de ir para os lados'), 'stack');
      while (stack.length) {
        const cur = stack.pop();
        if (v2.has(cur)) continue;
        v2.add(cur);
        [...adj.get(cur)].reverse().forEach((nb) => { if (!v2.has(nb)) stack.push(nb); });
        yield frame(v2, stack, cur, L(`visit ${nameOf(cur)}, push neighbours on the stack`, `visita ${nameOf(cur)}, empilha os vizinhos`), 'stack');
      }
      yield { ...frame(v2, [], null, L('Each search stays inside its connected component', 'Cada busca fica dentro do seu componente conexo'), 'done'), hold: 1600 };
    },

    *bigo() {
      const curves = [
        ['O(1)', () => 1], ['O(log n)', (n) => Math.log2(n + 1)], ['O(n)', (n) => n],
        ['O(n log n)', (n) => n * Math.log2(n + 1)], ['O(n²)', (n) => n * n],
      ];
      const N = 16;
      const max = 100; // n² leaves the chart on purpose
      const labelY = [];
      curves.forEach(([, f], ci) => {
        const natural = Math.max(y0Of() - (Math.min(f(N), max) / max) * phOf(), 12);
        labelY[ci] = ci ? Math.min(natural, labelY[ci - 1] - 13) : natural;
      });
      function y0Of() { return H - 24; }
      function phOf() { return H - 44; }
      const x0 = 34; const y0 = H - 24; const pw = W - 120; const ph = H - 44;
      const px = (n) => x0 + (n / N) * pw;
      const py = (v) => y0 - (Math.min(v, max) / max) * ph;
      const frame = (upto, part, noteText) => ({
        note: noteText,
        draw() {
          G.line(x0, y0, x0 + pw, y0, { color: colors.strong });
          G.line(x0, y0, x0, y0 - ph, { color: colors.strong });
          G.text(x0 + pw, y0 + 12, 'n', { mono: true, size: 10, color: colors.slate });
          G.text(x0 - 8, y0 - ph, L('ops', 'ops'), { mono: true, size: 10, color: colors.slate, align: 'right' });
          curves.forEach(([name, f], ci) => {
            if (ci > upto) return;
            const lim = ci === upto ? part : 1;
            ctx.beginPath();
            for (let s = 0; s <= 60 * lim; s += 1) { const n = (s / 60) * N; const X = px(n); const Y = py(f(n)); if (s === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
            ctx.lineWidth = ci === upto ? 2 : 1.4;
            ctx.strokeStyle = ci === upto ? colors.accent : colors.strong;
            ctx.stroke();
            if (lim === 1) G.text(ci === 4 ? px(Math.sqrt(max)) + 6 : px(N) + 6, labelY[ci], name, { mono: true, size: 10, align: 'left', color: ci === upto ? colors.accent : colors.slate });
          });
        },
      });
      for (let ci = 0; ci < curves.length; ci += 1) {
        for (let p = 1; p <= 6; p += 1) yield { ...frame(ci, p / 6, L(`${curves[ci][0]}: how the work grows with n`, `${curves[ci][0]}: como o trabalho cresce com n`)), hold: 90 };
        yield { ...frame(ci, 1, L(`${curves[ci][0]}: how the work grows with n`, `${curves[ci][0]}: como o trabalho cresce com n`)), hold: 700 };
      }
      yield { ...frame(4, 1, L('At n = 16: 1 vs 4 vs 16 vs 64 vs 256 operations', 'Com n = 16: 1 vs 4 vs 16 vs 64 vs 256 operações')), hold: 1700 };
    },

    *sorting() {
      // 16 active days spread across the year, in calendar order
      const active = data.counts ? data.counts.filter((n) => n > 0) : [];
      const src = active.length >= 16 ? active : null;
      const a = [];
      for (let i = 0; i < 16; i += 1) a.push(src ? src[Math.floor((i + 0.5) * (src.length / 16))] : Math.round(5 + Math.random() * 90));
      const real = !!src;
      const max = Math.max(...a, 1);
      const bw = (W - 40) / a.length;
      const frame = (o, noteText, hold = 240) => ({
        hold,
        note: noteText,
        draw() {
          a.forEach((v, i) => {
            const h = 8 + (Math.sqrt(v) / Math.sqrt(max)) * (H - 50);
            const st = i === o.pivot ? solid() : (o.cmp && o.cmp.includes(i)) ? hot() : (o.done && o.done.has(i)) ? { fill: colors.tint, stroke: colors.strong } : {};
            G.box(20 + i * bw + 2, H - 24 - h, bw - 4, h, { r: 3, ...st });
          });
          G.text(20, H - 10, real ? L('real contributions on 16 active days of the year', 'contribuições reais em 16 dias ativos do ano') : L('sample data', 'dados de exemplo'), { size: 9.5, align: 'left', color: colors.slate });
        },
      });
      yield frame({}, L('Quicksort on real data', 'Quicksort com dados reais'), 900);
      const done = new Set();
      function* qs(lo, hi) {
        if (lo > hi) return;
        if (lo === hi) { done.add(lo); return; }
        const pivot = a[hi];
        let i = lo;
        for (let j = lo; j < hi; j += 1) {
          yield frame({ pivot: hi, cmp: [j, i], done }, L(`compare ${a[j]} with pivot ${pivot}`, `compara ${a[j]} com o pivô ${pivot}`));
          if (a[j] < pivot) { [a[i], a[j]] = [a[j], a[i]]; i += 1; }
        }
        [a[i], a[hi]] = [a[hi], a[i]];
        done.add(i);
        yield frame({ pivot: i, done }, L(`pivot ${pivot} is in its final place`, `o pivô ${pivot} está na posição final`), 420);
        yield* qs(lo, i - 1);
        yield* qs(i + 1, hi);
      }
      yield* qs(0, a.length - 1);
      a.forEach((_, i) => done.add(i));
      yield frame({ done }, L('Sorted. Average O(n log n)', 'Ordenado. Em média O(n log n)'), 1600);
    },

    *bsearch() {
      const names = [...new Set($$('.ix__item .ix__name').map((n) => n.textContent.trim().split(/[\s/,(]+/)[0]).filter((w) => w.length > 1))]
        .sort((x, y) => x.localeCompare(y)).slice(0, 15);
      if (names.length < 4) return;
      const target = names[Math.floor(names.length * 0.7)];
      let lo = 0; let hi = names.length - 1;
      const cw = (W - 20) / names.length;
      const frame = (mid, noteText, found) => ({
        note: noteText,
        hold: 950,
        draw() {
          G.text(W / 2, 22, L(`looking for "${target}"`, `procurando "${target}"`), { size: 12, weight: 500 });
          names.forEach((n, i) => {
            const inRange = i >= lo && i <= hi;
            const st = i === mid ? (found ? solid() : hot()) : inRange ? {} : { fill: colors.paper, stroke: colors.line, textColor: colors.line };
            ctx.save();
            ctx.translate(10 + i * cw + cw / 2, 120);
            ctx.rotate(-Math.PI / 2);
            G.box(-60, -cw / 2 + 1, 120, cw - 2, { r: 3, ...st });
            G.text(0, 0.5, n.length > 13 ? `${n.slice(0, 12)}…` : n, { size: 9.5, color: st.textColor || (inRange ? colors.ink : colors.line) });
            ctx.restore();
          });
          G.text(10 + lo * cw + cw / 2, 194, 'lo', { mono: true, size: 10, color: colors.slate });
          G.text(10 + hi * cw + cw / 2, 194, 'hi', { mono: true, size: 10, color: colors.slate });
        },
      });
      yield frame(-1, L('Index entries, sorted alphabetically', 'Itens do índice, em ordem alfabética'));
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const cmp = names[mid].localeCompare(target);
        if (cmp === 0) { yield frame(mid, L(`found in ${Math.ceil(Math.log2(names.length))} steps at most, O(log n)`, `achado em no máximo ${Math.ceil(Math.log2(names.length))} passos, O(log n)`), true); return; }
        yield frame(mid, cmp < 0 ? L(`"${names[mid]}" < target: discard the left half`, `"${names[mid]}" < alvo: descarta a metade esquerda`) : L(`"${names[mid]}" > target: discard the right half`, `"${names[mid]}" > alvo: descarta a metade direita`));
        if (cmp < 0) lo = mid + 1; else hi = mid - 1;
      }
    },

    *dp() {
      const A = 'GODOT';
      const B = 'GOBOT';
      const T = Array.from({ length: A.length + 1 }, () => Array(B.length + 1).fill(0));
      const cs = 26; const x0 = 70; const y0 = 30;
      const frame = (cur, path, noteText, hold = 170) => ({
        hold,
        note: noteText,
        draw() {
          [...B].forEach((ch, j) => G.text(x0 + (j + 1) * cs + cs / 2, y0 - 10, ch, { mono: true, size: 12, weight: 500 }));
          [...A].forEach((ch, i) => G.text(x0 - 12, y0 + (i + 1) * cs + cs / 2, ch, { mono: true, size: 12, weight: 500 }));
          for (let i = 0; i <= A.length; i += 1) {
            for (let j = 0; j <= B.length; j += 1) {
              const isCur = cur && cur[0] === i && cur[1] === j;
              const onPath = path && path.some(([pi, pj]) => pi === i && pj === j);
              const filled = !cur || i < cur[0] || (i === cur[0] && j <= cur[1]);
              G.box(x0 + j * cs, y0 + i * cs, cs - 2, cs - 2, { r: 3, ...(isCur ? hot() : onPath ? solid() : {}), text: filled ? T[i][j] : '', mono: true, size: 11 });
            }
          }
        },
      });
      yield frame([0, 0], null, L('Longest common subsequence of GODOT and GOBOT', 'Maior subsequência comum de GODOT e GOBOT'), 900);
      for (let i = 1; i <= A.length; i += 1) {
        for (let j = 1; j <= B.length; j += 1) {
          T[i][j] = A[i - 1] === B[j - 1] ? T[i - 1][j - 1] + 1 : Math.max(T[i - 1][j], T[i][j - 1]);
          yield frame([i, j], null, A[i - 1] === B[j - 1]
            ? L(`${A[i - 1]} = ${B[j - 1]}: diagonal + 1`, `${A[i - 1]} = ${B[j - 1]}: diagonal + 1`)
            : L('no match: best of top and left', 'sem par: o melhor entre cima e esquerda'));
        }
      }
      const path = [];
      let i = A.length; let j = B.length; let lcs = '';
      while (i > 0 && j > 0) {
        if (A[i - 1] === B[j - 1]) { path.push([i, j]); lcs = A[i - 1] + lcs; i -= 1; j -= 1; } else if (T[i - 1][j] >= T[i][j - 1]) i -= 1; else j -= 1;
      }
      yield frame(null, path, L(`Walk back: "${lcs}", length ${lcs.length}. Each cell solved once`, `Volta pelo caminho: "${lcs}", tamanho ${lcs.length}. Cada célula resolvida uma vez`), 1800);
    },

    *recursion() {
      const N = 5;
      const qs = [];
      const cs = 30; const x0 = (W - N * cs) / 2; const y0 = 18;
      const safe = (r, c) => qs.every((qc, qr) => qc !== c && Math.abs(qc - c) !== Math.abs(qr - r));
      const frame = (bad, noteText, hold = 260) => ({
        hold,
        note: noteText,
        draw() {
          for (let r = 0; r < N; r += 1) {
            for (let c = 0; c < N; c += 1) {
              const isBad = bad && bad[0] === r && bad[1] === c;
              G.box(x0 + c * cs, y0 + r * cs, cs - 2, cs - 2, { r: 3, fill: isBad ? colors.tint : ((r + c) % 2 ? colors.surface : colors.paper), stroke: isBad ? colors.accent : colors.line });
              if (qs[r] === c) G.circle(x0 + c * cs + cs / 2 - 1, y0 + r * cs + cs / 2 - 1, 8, solid());
            }
          }
        },
      });
      yield frame(null, L(`${N} queens, none attacking another`, `${N} rainhas, nenhuma atacando outra`), 800);
      function* place(r) {
        if (r === N) return true;
        for (let c = 0; c < N; c += 1) {
          if (!safe(r, c)) { yield frame([r, c], L(`row ${r + 1}, col ${c + 1}: attacked, skip`, `linha ${r + 1}, coluna ${c + 1}: atacada, pula`), 140); continue; }
          qs[r] = c;
          yield frame(null, L(`place in row ${r + 1}, col ${c + 1}, recurse`, `coloca na linha ${r + 1}, coluna ${c + 1}, recursão`));
          if (yield* place(r + 1)) return true;
          qs.length = r;
          yield frame([r, c], L(`dead end: backtrack from row ${r + 1}`, `beco sem saída: volta da linha ${r + 1}`), 360);
        }
        return false;
      }
      yield* place(0);
      yield frame(null, L('Solved by trying, failing and backing up', 'Resolvido tentando, falhando e voltando'), 1700);
    },

    *concurrency() {
      const lanes = [{ name: 'T1', y: 70 }, { name: 'T2', y: 130 }];
      const frame = (counter, events, noteText, locked, hold = 760) => ({
        hold,
        note: noteText,
        draw() {
          G.text(W / 2, 20, `counter = ${counter}`, { mono: true, size: 13, weight: 500, color: colors.ink });
          if (locked) G.box(W / 2 - 34, 30, 68, 18, { r: 9, fill: colors.tint, stroke: colors.accent, text: `lock: ${locked}`, size: 9.5, mono: true });
          lanes.forEach((l) => { G.text(20, l.y, l.name, { mono: true, size: 11, align: 'left', color: colors.slate }); G.line(46, l.y, W - 12, l.y, { color: colors.line }); });
          events.forEach((e, i) => {
            const l = lanes[e.t];
            const last = i === events.length - 1;
            G.box(52 + i * 37, l.y - 13, 34, 26, { r: 4, text: e.label, mono: true, size: 9.5, ...(last ? hot() : {}), ...(e.bad ? { stroke: colors.accent } : {}) });
          });
        },
      });
      const ev = [];
      let c = 0;
      yield frame(c, ev, L('Two threads, one counter, no lock', 'Duas threads, um contador, sem lock'));
      ev.push({ t: 0, label: 'r 0' }); yield frame(c, ev, L('T1 reads 0', 'T1 lê 0'));
      ev.push({ t: 1, label: 'r 0' }); yield frame(c, ev, L('T2 reads 0 before T1 writes', 'T2 lê 0 antes de T1 escrever'));
      ev.push({ t: 0, label: 'w 1' }); c = 1; yield frame(c, ev, L('T1 writes 1', 'T1 escreve 1'));
      ev.push({ t: 1, label: 'w 1', bad: true }); yield frame(c, ev, L('T2 writes 1: an update is lost. Race condition!', 'T2 escreve 1: um incremento se perdeu. Race condition!'), null, 1500);
      ev.length = 0; c = 0;
      yield frame(c, ev, L('Same work, now with a lock', 'O mesmo trabalho, agora com lock'));
      ev.push({ t: 0, label: 'lock' }); yield frame(c, ev, L('T1 takes the lock', 'T1 pega o lock'), 'T1');
      ev.push({ t: 1, label: 'wait' }); yield frame(c, ev, L('T2 has to wait', 'T2 precisa esperar'), 'T1');
      ev.push({ t: 0, label: 'r 0' }); yield frame(c, ev, L('T1 reads 0', 'T1 lê 0'), 'T1');
      ev.push({ t: 0, label: 'w 1' }); c = 1; yield frame(c, ev, L('T1 writes 1 and releases', 'T1 escreve 1 e libera'), 'T1');
      ev.push({ t: 1, label: 'r 1' }); yield frame(c, ev, L('T2 gets the lock, reads 1', 'T2 pega o lock, lê 1'), 'T2');
      ev.push({ t: 1, label: 'w 2' }); c = 2; yield frame(c, ev, L('T2 writes 2. Correct', 'T2 escreve 2. Correto'), null, 1700);
    },
  };

  /* ── runner ── */
  let run = null;
  let pinned = false;
  let current = null;
  const paint = (fr) => {
    ctx.clearRect(0, 0, W, H);
    if (fr && fr.draw) fr.draw(G);
    note.textContent = fr && fr.note ? fr.note : '';
  };
  const stop = () => { if (run) clearTimeout(run.timer); run = null; };
  const start = (algo) => {
    stop();
    const make = DEMOS[algo];
    if (!make) return;
    run = { algo, gen: make() };
    tick();
  };
  const tick = () => {
    if (!run) return;
    let res;
    try { res = run.gen.next(); } catch (e) { stop(); return; }
    if (res.done) { const algo = run.algo; run.timer = setTimeout(() => start(algo), 1400); return; }
    paint(res.value);
    run.timer = setTimeout(tick, (res.value.hold || 520) * (reduced ? 1.6 : 1));
  };

  const place = (li) => {
    const r = li.getBoundingClientRect();
    const cw = W + 26;
    const ch = card.offsetHeight || H + 80;
    if (window.innerWidth < 720) { card.style.left = '16px'; card.style.top = ''; card.classList.add('is-sheet'); return; }
    card.classList.remove('is-sheet');
    let x = r.right + 18;
    if (x + cw > window.innerWidth - 12) x = Math.max(12, r.left - cw - 18);
    if (x < 12) x = Math.min(window.innerWidth - cw - 12, r.left);
    let y = r.top + r.height / 2 - ch / 2;
    y = Math.max(76, Math.min(y, window.innerHeight - ch - 12));
    card.style.left = `${Math.round(x)}px`;
    card.style.top = `${Math.round(y)}px`;
  };
  const show = (li, pin) => {
    const algo = li.dataset.algo;
    pinned = pin;
    card.classList.toggle('is-pinned', pin);
    if (current !== li || card.hidden) {
      current = li;
      title.textContent = $('.ix__name', li).textContent.trim();
      card.setAttribute('aria-label', title.textContent);
      readColors();
      card.hidden = false;
      place(li);
      if (!reduced && card.animate) card.animate([{ opacity: 0, transform: 'translateY(6px) scale(0.98)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: host.EASE });
      start(algo);
    }
    items.forEach((it) => it.classList.toggle('is-running', it === li));
  };
  const hide = () => {
    stop();
    card.hidden = true;
    pinned = false;
    if (current) current.classList.remove('is-running');
    current = null;
  };

  // a small play button on each entry; hover previews, the button pins the demo open
  items.forEach((li) => {
    const b = el('button', 'ix__run');
    b.type = 'button';
    b.setAttribute('aria-label', L(`Run demo: ${$('.ix__name', li).textContent.trim()}`, `Rodar demo: ${$('.ix__name', li).textContent.trim()}`));
    b.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 2.2v7.6L9.8 6z" fill="currentColor"/></svg>';
    li.appendChild(b);
    b.addEventListener('click', (e) => { e.stopPropagation(); if (current === li && pinned) hide(); else show(li, true); });
    if (finePointer) {
      let timer = 0;
      li.addEventListener('pointerenter', () => { clearTimeout(timer); timer = setTimeout(() => { if (!pinned) show(li, false); }, 220); });
      li.addEventListener('pointerleave', () => { clearTimeout(timer); if (!pinned && current === li) hide(); });
    }
  });
  replay.addEventListener('click', () => { if (current) start(current.dataset.algo); });
  close.addEventListener('click', hide);
  replay.setAttribute('aria-label', L('Replay', 'Repetir'));
  close.setAttribute('aria-label', L('Close', 'Fechar'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !card.hidden) hide(); });
  document.addEventListener('click', (e) => { if (pinned && !card.contains(e.target) && !e.target.closest('.ix__run')) hide(); });
  window.addEventListener('scroll', () => { if (!card.hidden) { if (pinned && current) place(current); else hide(); } }, { passive: true });
  window.addEventListener('resize', () => { sizeCanvas(); if (current) place(current); });
  themeHooks.push(() => { readColors(); });
  langHooks.push(() => {
    items.forEach((li) => { const b = $('.ix__run', li); if (b) b.setAttribute('aria-label', L(`Run demo: ${$('.ix__name', li).textContent.trim()}`, `Rodar demo: ${$('.ix__name', li).textContent.trim()}`)); });
    replay.setAttribute('aria-label', L('Replay', 'Repetir'));
    close.setAttribute('aria-label', L('Close', 'Fechar'));
    if (current) { title.textContent = $('.ix__name', current).textContent.trim(); start(current.dataset.algo); }
  });
}
