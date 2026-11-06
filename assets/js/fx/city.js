/* Contribution city: the heatmap as a small 3D city, one building per day, height = contributions.
   It lives on the same data as the grid and is switched on from the heatmap header.
   Day in the light theme, night in the dark one: switching the theme runs a short sunset
   (or sunrise) and the windows light up with the work of each day. Renders only on demand. */

const VERT = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNor;
layout(location = 2) in vec4 aInst;   // col, row, height, level
layout(location = 3) in float aId;
uniform mat4 uVP;
uniform float uGrow;
uniform vec2 uGrid;
out vec3 vNor;
out vec3 vLocal;
flat out float vLevel;
flat out float vId;
void main() {
  float delay = (aInst.x / uGrid.x) * 0.55 + (aInst.y / uGrid.y) * 0.08;
  float g = clamp((uGrow - delay) / 0.45, 0.0, 1.0);
  g = 1.0 - pow(1.0 - g, 3.0);
  float h = max(aInst.z * g, 0.06);
  vec3 p = vec3(aInst.x - uGrid.x * 0.5 + 0.1 + aPos.x * 0.8, aPos.y * h, aInst.y - uGrid.y * 0.5 + 0.1 + aPos.z * 0.8);
  vNor = aNor;
  vLocal = vec3(aPos.x * 0.8, aPos.y * h, aPos.z * 0.8);
  vLevel = aInst.w;
  vId = aId;
  gl_Position = uVP * vec4(p, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec3 vNor;
in vec3 vLocal;
flat in float vLevel;
flat in float vId;
uniform vec3 uSun, uSunCol, uAmb, uTile, uLow, uHigh, uWin, uHotCol;
uniform float uNight, uHot;
out vec4 o;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 n = normalize(vNor);
  vec3 base = vLevel < 0.5 ? uTile : mix(uLow, uHigh, (vLevel - 1.0) / 3.0);
  float diff = max(dot(n, uSun), 0.0);
  vec3 col = base * (uAmb + diff * uSunCol);
  // the top face catches a little more light, the bottom of each wall a little less (cheap occlusion)
  if (n.y < 0.5) col *= mix(0.78, 1.0, clamp(vLocal.y * 1.6, 0.0, 1.0));
  if (abs(n.y) < 0.5 && vLevel > 0.5) {
    vec2 f = abs(n.x) > 0.5 ? vec2(vLocal.z, vLocal.y) : vec2(vLocal.x, vLocal.y);
    vec2 cell = f * vec2(3.75, 5.0);
    vec2 c = fract(cell);
    vec2 id = floor(cell);
    float win = step(0.22, c.x) * step(c.x, 0.78) * step(0.28, c.y) * step(c.y, 0.78) * step(0.3, vLocal.y);
    float on = step(1.0 - (0.18 + vLevel * 0.17), hash(id + vec2(vId * 7.13, vId * 1.7)));
    col = mix(col, uWin, win * on * uNight);
    col = mix(col, col * 0.82, win * (1.0 - uNight) * 0.7);
  }
  if (abs(vId - uHot) < 0.5) col = mix(col, uHotCol, 0.5);
  o = vec4(col, 1.0);
}`;

/* minimal column-major mat4 helpers */
const M = {
  persp(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2); const nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  },
  look(eye, at, up) {
    const z = norm(sub(eye, at)); const x = norm(cross(up, z)); const y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1];
  },
  mul(a, b) {
    const o = new Array(16);
    for (let c = 0; c < 4; c += 1) for (let r = 0; r < 4; r += 1) { let s = 0; for (let k = 0; k < 4; k += 1) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
    return o;
  },
  inv(m) {
    const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
    const b00 = a00 * a11 - a01 * a10; const b01 = a00 * a12 - a02 * a10; const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11; const b04 = a01 * a13 - a03 * a11; const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30; const b07 = a20 * a32 - a22 * a30; const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31; const b10 = a21 * a33 - a23 * a31; const b11 = a22 * a33 - a23 * a32;
    const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return null;
    const d = 1 / det;
    return [
      (a11 * b11 - a12 * b10 + a13 * b09) * d, (a02 * b10 - a01 * b11 - a03 * b09) * d, (a31 * b05 - a32 * b04 + a33 * b03) * d, (a22 * b04 - a21 * b05 - a23 * b03) * d,
      (a12 * b08 - a10 * b11 - a13 * b07) * d, (a00 * b11 - a02 * b08 + a03 * b07) * d, (a32 * b02 - a30 * b05 - a33 * b01) * d, (a20 * b05 - a22 * b02 + a23 * b01) * d,
      (a10 * b10 - a11 * b08 + a13 * b06) * d, (a01 * b08 - a00 * b10 - a03 * b06) * d, (a30 * b04 - a31 * b02 + a33 * b00) * d, (a21 * b02 - a20 * b04 - a23 * b00) * d,
      (a11 * b07 - a10 * b09 - a12 * b06) * d, (a00 * b09 - a01 * b07 + a02 * b06) * d, (a31 * b01 - a30 * b03 - a32 * b00) * d, (a20 * b03 - a21 * b01 + a22 * b00) * d,
    ];
  },
  apply(m, v) {
    const [x, y, z, w] = v;
    return [0, 1, 2, 3].map((r) => m[r] * x + m[4 + r] * y + m[8 + r] * z + m[12 + r] * w);
  },
};
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
const lerp = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

export function init(host) {
  const { root, $, el, t, I, api, reduced, finePointer, themeHooks, langHooks, cssVar, EASE } = host;
  const fig = $('#activity');
  const head = fig && $('.activity__head', fig);
  if (!fig || !head) return;

  /* ── data: the same file as the grid ── */
  let data = null;
  const ready = fetch('assets/data/activity.json', { cache: 'force-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d || !Array.isArray(d.counts) || !/^\d{4}-\d{2}-\d{2}$/.test(d.start || '')) return false;
      data = { start: d.start, counts: d.counts };
      return true;
    })
    .catch(() => false);

  /* ── UI: a two-way switch in the heatmap header ── */
  const seg = el('div', 'seg');
  seg.setAttribute('role', 'group');
  const bGrid = el('button', 'seg__b');
  const bCity = el('button', 'seg__b');
  [bGrid, bCity].forEach((b) => { b.type = 'button'; seg.appendChild(b); });
  const box = el('div', 'city');
  box.hidden = true;
  const canvas = el('canvas', 'city__canvas');
  canvas.setAttribute('role', 'img');
  const hint = el('p', 'city__hint');
  box.append(canvas, hint);
  const labels = () => {
    bGrid.textContent = t('city.grid');
    bCity.textContent = t('city.city');
    seg.setAttribute('aria-label', t('city.toggle'));
    hint.textContent = t('city.hint');
    canvas.setAttribute('aria-label', t('city.aria'));
  };
  labels();
  langHooks.push(labels);

  let mode = 'grid';
  const syncSeg = () => { bGrid.setAttribute('aria-pressed', String(mode === 'grid')); bCity.setAttribute('aria-pressed', String(mode === 'city')); };
  syncSeg();

  // wait for the grid to be on screen with its data, then offer the city
  const mount = () => {
    if (seg.isConnected || fig.hidden || fig.classList.contains('is-loading')) return;
    ready.then((ok) => {
      if (!ok || seg.isConnected) return;
      head.appendChild(seg);
      $('.hm', fig).after(box);
      let saved = null;
      try { saved = localStorage.getItem('ir:city'); } catch (e) { /* private mode */ }
      if (saved === 'city') setMode('city', false);
    });
  };
  new MutationObserver(mount).observe(fig, { attributes: true, attributeFilter: ['hidden', 'class'] });
  mount();

  /* ── GL ── */
  let gl = null;
  let prog = null;
  let U = {};
  let count = 0;
  let instances = []; // { col, row, h, level, idx }
  let grid = [53, 7];
  let maxH = 4;

  const setup = () => {
    gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true });
    if (!gl) return false;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i += 1) { const info = gl.getActiveUniform(prog, i); U[info.name] = gl.getUniformLocation(prog, info.name); }

    // unit box 0..1, five faces (no bottom)
    const faces = [
      [[0, 1, 0], [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]]],
      [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]],
      [[0, 0, -1], [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]]],
      [[1, 0, 0], [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]]],
      [[-1, 0, 0], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]]],
    ];
    const verts = [];
    faces.forEach(([nn, q]) => [0, 1, 2, 0, 2, 3].forEach((i) => verts.push(...q[i], ...nn)));
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);

    // instances from the real counts, laid out like the grid (weeks × weekdays)
    const lead = new Date(`${data.start}T00:00:00Z`).getUTCDay();
    const nz = data.counts.filter((v) => v > 0).sort((a, b) => a - b);
    const q = (p) => nz[Math.min(nz.length - 1, Math.floor(p * (nz.length - 1)))] || 1;
    const th = [q(0.25), q(0.5), q(0.75)];
    const level = (v) => (v === 0 ? 0 : v <= th[0] ? 1 : v <= th[1] ? 2 : v <= th[2] ? 3 : 4);
    const top = Math.sqrt(Math.max(...data.counts, 1));
    instances = data.counts.map((v, i) => {
      const slot = lead + i;
      return { col: Math.floor(slot / 7), row: slot % 7, h: v ? 0.25 + (Math.sqrt(v) / top) * maxH : 0, level: level(v), idx: i };
    });
    grid = [Math.max(...instances.map((s) => s.col)) + 1, 7];
    const inst = new Float32Array(instances.length * 5);
    instances.forEach((s, i) => inst.set([s.col, s.row, s.h, s.level, i], i * 5));
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ib);
    gl.bufferData(gl.ARRAY_BUFFER, inst, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 20, 0);
    gl.vertexAttribDivisor(2, 1);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 20, 16);
    gl.vertexAttribDivisor(3, 1);
    count = verts.length / 6;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); gl = null; setMode('grid', false); seg.remove(); });
    return true;
  };

  /* ── palette and light: day for the light theme, night for the dark one ── */
  const rgb = (v) => {
    const s = v.trim();
    if (s.startsWith('#')) { const h = s.slice(1, 7); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); }
    const m = s.match(/[\d.]+/g);
    return m ? m.slice(0, 3).map((x) => Number(x) / 255) : [0.5, 0.5, 0.5];
  };
  const mix = (a, b, k) => lerp3(a, b, k);
  const readPalette = () => {
    const paper = rgb(cssVar('--paper'));
    const accent = rgb(cssVar('--accent'));
    const ink = rgb(cssVar('--ink'));
    const night = root.dataset.theme === 'dark';
    return {
      tile: night ? mix(paper, ink, 0.12) : mix(paper, ink, 0.1),
      low: night ? mix(paper, accent, 0.28) : mix(paper, accent, 0.3),
      high: night ? mix(paper, accent, 0.62) : accent,
      win: night ? [1.0, 0.86, 0.55] : [1, 1, 1],
      hot: night ? [1, 1, 1] : ink,
      night: night ? 1 : 0,
    };
  };
  let pal = readPalette();
  let palFrom = pal;
  let palTo = pal;
  let tod = { k: 1, t0: 0, dir: 0 }; // time of day transition

  const light = (nightAmt, sweep) => {
    // the sun sweeps across the sky during a change; warm near the horizon
    const ang = lerp(1.05, -0.25, nightAmt);
    const sun = norm([Math.cos(ang) * 0.6 + 0.2, Math.max(Math.sin(ang), 0.15) * 1.0, 0.45]);
    const horizon = Math.max(0, 1 - Math.abs(ang - 0.25) / 0.6);
    const warm = Math.sin(sweep * Math.PI) * horizon;
    const sunCol = mix(mix([0.78, 0.78, 0.76], [0.22, 0.26, 0.34], nightAmt), [1.0, 0.62, 0.38], warm * 0.8);
    const amb = mix([0.56, 0.57, 0.58], [0.58, 0.62, 0.72], nightAmt);
    return { sun, sunCol, amb };
  };

  /* ── camera ── */
  const cam0 = { yaw: -0.3, pitch: 0.7 };
  const cam = { ...cam0 };
  let vp = null;
  const view = (d, aspect, fov) => {
    const target = [0, maxH * 0.25, 0];
    const eye = [target[0] + Math.sin(cam.yaw) * Math.cos(cam.pitch) * d, target[1] + Math.sin(cam.pitch) * d, target[2] + Math.cos(cam.yaw) * Math.cos(cam.pitch) * d];
    return M.mul(M.persp(fov, aspect, 0.5, d * 4), M.look(eye, target, [0, 1, 0]));
  };
  const matrices = () => {
    const aspect = canvas.width / canvas.height;
    const fov = 0.5;
    // the closest distance at which every corner of the city stays inside the frame
    const hx = grid[0] * 0.5; const hz = grid[1] * 0.5;
    const corners = [];
    [-hx, hx].forEach((x) => [-hz, hz].forEach((z) => [0, maxH + 0.3].forEach((y) => corners.push([x, y, z, 1]))));
    const fits = (d) => {
      const m = view(d, aspect, fov);
      return corners.every((c) => { const p = M.apply(m, c); if (p[3] <= 0) return false; return Math.abs(p[0] / p[3]) < 0.94 && Math.abs(p[1] / p[3]) < 0.86; });
    };
    let lo = 5; let hi = 400;
    for (let i = 0; i < 22; i += 1) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
    vp = view(hi, aspect, fov);
  };

  /* ── render on demand ── */
  let hot = -1;
  let grow = 0;
  let growT0 = 0;
  let raf = 0;
  const draw = (now) => {
    raf = 0;
    if (!gl || mode !== 'city') return;
    let again = false;
    if (grow < 1.2) { grow = reduced ? 1.2 : Math.min(1.2, (now - growT0) / 1500); again = true; }
    if (tod.k < 1) {
      tod.k = reduced ? 1 : Math.min(1, (now - tod.t0) / 1700);
      const e = tod.k < 0.5 ? 4 * tod.k ** 3 : 1 - (-2 * tod.k + 2) ** 3 / 2;
      pal = {
        tile: mix(palFrom.tile, palTo.tile, e), low: mix(palFrom.low, palTo.low, e), high: mix(palFrom.high, palTo.high, e),
        win: mix(palFrom.win, palTo.win, e), hot: palTo.hot, night: lerp(palFrom.night, palTo.night, e),
      };
      again = true;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr); const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    matrices();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(prog);
    const L = light(pal.night, tod.k < 1 ? tod.k : 0);
    gl.uniformMatrix4fv(U.uVP, false, new Float32Array(vp));
    gl.uniform1f(U.uGrow, grow);
    gl.uniform2f(U.uGrid, grid[0], grid[1]);
    gl.uniform3fv(U.uSun, L.sun);
    gl.uniform3fv(U.uSunCol, L.sunCol);
    gl.uniform3fv(U.uAmb, L.amb);
    gl.uniform3fv(U.uTile, pal.tile);
    gl.uniform3fv(U.uLow, pal.low);
    gl.uniform3fv(U.uHigh, pal.high);
    gl.uniform3fv(U.uWin, pal.win);
    gl.uniform3fv(U.uHotCol, pal.hot);
    gl.uniform1f(U.uNight, pal.night);
    gl.uniform1f(U.uHot, hot);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, count, instances.length);
    if (again) raf = requestAnimationFrame(draw);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(draw); };

  themeHooks.push(() => {
    const next = readPalette();
    palFrom = pal;
    palTo = next;
    tod = { k: 0, t0: performance.now() };
    if (mode === 'city') kick(); else { pal = next; tod.k = 1; }
  });

  /* ── switching ── */
  function setMode(next, animate = true) {
    if (next === mode) return;
    if (next === 'city' && !gl) {
      let ok = false;
      try { ok = setup(); } catch (e) { if (window.console) console.warn('[city]', e); }
      if (!ok) return;
    }
    mode = next;
    try { localStorage.setItem('ir:city', mode); } catch (e) { /* private mode */ }
    syncSeg();
    const hm = $('.hm', fig);
    const legend = $('.hm__legend', fig);
    const toCity = mode === 'city';
    const show = toCity ? box : hm;
    const hideEl = toCity ? hm : box;
    if (hm) box.style.minHeight = `${Math.max(hm.offsetHeight + (legend ? legend.offsetHeight : 0), 0)}px`;
    hideEl.hidden = true;
    show.hidden = false;
    if (legend) legend.hidden = toCity;
    fig.classList.toggle('is-city', toCity);
    if (animate && !reduced && show.animate) show.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: EASE });
    if (toCity) { grow = animate ? 0 : 1.2; growT0 = performance.now(); pal = readPalette(); tod.k = 1; kick(); }
    if (api.refreshScroll) requestAnimationFrame(api.refreshScroll);
  }
  bGrid.addEventListener('click', () => setMode('grid'));
  bCity.addEventListener('click', () => setMode('city'));

  /* ── orbit and pick ── */
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, yaw: cam.yaw, pitch: cam.pitch };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-drag');
  });
  const end = () => { drag = null; canvas.classList.remove('is-drag'); };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('dblclick', () => {
    if (reduced || !canvas.animate) { Object.assign(cam, cam0); kick(); return; }
    const from = { ...cam }; const t0 = performance.now();
    const go = (now) => { const k = Math.min(1, (now - t0) / 600); const e = 1 - (1 - k) ** 3; cam.yaw = lerp(from.yaw, cam0.yaw, e); cam.pitch = lerp(from.pitch, cam0.pitch, e); kick(); if (k < 1) requestAnimationFrame(go); };
    requestAnimationFrame(go);
  });

  const pick = (cx, cy) => {
    if (!vp) return -1;
    const r = canvas.getBoundingClientRect();
    const nx = ((cx - r.left) / r.width) * 2 - 1;
    const ny = 1 - ((cy - r.top) / r.height) * 2;
    const inv = M.inv(vp);
    if (!inv) return -1;
    const a = M.apply(inv, [nx, ny, -1, 1]); const b = M.apply(inv, [nx, ny, 1, 1]);
    const o = [a[0] / a[3], a[1] / a[3], a[2] / a[3]];
    const dir = norm(sub([b[0] / b[3], b[1] / b[3], b[2] / b[3]], o));
    let best = -1; let bestT = Infinity;
    const g = Math.min(1, grow / 1.0);
    instances.forEach((s, i) => {
      const x0 = s.col - grid[0] * 0.5 + 0.1; const z0 = s.row - grid[1] * 0.5 + 0.1;
      const lo = [x0, 0, z0]; const hi = [x0 + 0.8, Math.max(s.h * g, 0.06), z0 + 0.8];
      let tmin = 0; let tmax = Infinity;
      for (let k = 0; k < 3; k += 1) {
        if (Math.abs(dir[k]) < 1e-8) { if (o[k] < lo[k] || o[k] > hi[k]) return; continue; }
        let t1 = (lo[k] - o[k]) / dir[k]; let t2 = (hi[k] - o[k]) / dir[k];
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
        if (tmin > tmax) return;
      }
      if (tmin < bestT) { bestT = tmin; best = i; }
    });
    return best;
  };

  const loc = () => (I ? I.locale() : 'en-US');
  const num = (n) => new Intl.NumberFormat(loc()).format(n);
  const dayLabel = (i) => { const d = new Date(`${data.start}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + i); return new Intl.DateTimeFormat(loc(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d); };
  const countLabel = (n) => (n === 0 ? t('act.none') : n === 1 ? t('act.one') : t('act.many').replace('{n}', num(n)));

  canvas.addEventListener('pointermove', (e) => {
    if (drag) {
      cam.yaw = drag.yaw - (e.clientX - drag.x) * 0.008;
      cam.pitch = Math.min(1.25, Math.max(0.18, drag.pitch + (e.clientY - drag.y) * 0.006));
      if (api.peek) api.peek.hide();
      kick();
      return;
    }
    if (!finePointer) return;
    const i = pick(e.clientX, e.clientY);
    if (i !== hot) { hot = i; kick(); }
    if (!api.peek) return;
    if (i < 0) { api.peek.hide(); return; }
    api.peek.follow(e);
    api.peek.show([el('p', 'peek__label', dayLabel(instances[i].idx)), el('p', 'peek__msg', countLabel(data.counts[instances[i].idx]))]);
  });
  canvas.addEventListener('pointerleave', () => { if (hot !== -1) { hot = -1; kick(); } if (api.peek) api.peek.hide(); });

  new ResizeObserver(() => { if (mode === 'city') kick(); }).observe(box);
}
