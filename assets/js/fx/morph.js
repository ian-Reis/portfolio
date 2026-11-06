/* Language switch: the hero title melts from one language into the other.
   Both titles are turned into signed distance fields (exact Euclidean distance transform in JS),
   and a shader blends one field into the other while a few columns drip like wet ink.
   site.js calls capture() before the text changes and play(job) right after. */

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uA, uB;
uniform float uK, uSpread, uPx, uSeed;
uniform vec3 uCol;
out vec4 o;
float hash(float x) { return fract(sin(x * 91.17 + uSeed) * 43758.5453); }
float noise(float x) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(i), hash(i + 1.0), f); }
float sd(sampler2D t, vec2 uv) { return (texture(t, uv).r - 0.5) * 2.0 * uSpread; }
void main() {
  float m = sin(uK * 3.14159265);
  // a few columns sag: the lower part of the column samples from higher up, so the ink stretches down
  float drip = pow(noise(vUv.x * 16.0), 3.0) * 0.75 + pow(noise(vUv.x * 5.0 + 3.0), 2.0) * 0.25;
  vec2 uv = vUv;
  uv.y += m * m * drip * 0.16 * (1.0 - vUv.y);
  float e = smoothstep(0.15, 0.85, uK);
  float dA = sd(uA, uv); float dB = sd(uB, uv);
  float d = mix(dA, dB, e);
  float soft = uPx * (1.0 + m * 5.0);
  float a = (1.0 - smoothstep(-soft, soft, d)) * (1.0 - 0.25 * m);
  o = vec4(uCol * a, a);
}`;

const INF = 1e20;
function edt1(f, n, d, v, z) {
  let k = 0;
  v[0] = 0; z[0] = -INF; z[1] = INF;
  for (let q = 1; q < n; q += 1) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k -= 1; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k += 1; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q += 1) { while (z[k + 1] < q) k += 1; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
}
function edt(grid, w, h) {
  const n = Math.max(w, h);
  const f = new Float64Array(n); const d = new Float64Array(n); const v = new Int32Array(n); const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x += 1) {
    for (let y = 0; y < h; y += 1) f[y] = grid[y * w + x];
    edt1(f, h, d, v, z);
    for (let y = 0; y < h; y += 1) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) f[x] = grid[y * w + x];
    edt1(f, w, d, v, z);
    for (let x = 0; x < w; x += 1) grid[y * w + x] = d[x];
  }
}

export function init(host) {
  const { doc, $, $$, api, EASE } = host;
  const hero = $('.hero');
  const title = $('.hero__title');
  if (!hero || !title) return;

  const canvas = doc.createElement('canvas');
  canvas.className = 'hero__morph';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.bindAttribLocation(prog, 0, 'aPos');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  const U = {};
  ['uA', 'uB', 'uK', 'uSpread', 'uPx', 'uSeed', 'uCol'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const tex = () => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const texA = tex();
  const texB = tex();

  const SCALE = 0.6; // field resolution relative to CSS pixels
  const SPREAD = 26; // CSS px encoded in the 8-bit field
  const mask = doc.createElement('canvas');
  const mctx = mask.getContext('2d', { willReadFrequently: true });

  const region = () => {
    const hr = hero.getBoundingClientRect();
    const tr = title.getBoundingClientRect();
    const top = Math.max(0, tr.top - hr.top - 40);
    return { hr, x: 0, y: top, w: hero.offsetWidth, h: Math.min(hero.offsetHeight - top, tr.height + 150) };
  };

  // draw the title exactly as laid out (each letter at its own position and weight), then build its distance field
  const field = (reg) => {
    const w = Math.max(2, Math.round(reg.w * SCALE));
    const h = Math.max(2, Math.round(reg.h * SCALE));
    mask.width = w; mask.height = h;
    mctx.clearRect(0, 0, w, h);
    mctx.fillStyle = '#fff';
    mctx.textBaseline = 'alphabetic';
    const cs = getComputedStyle(title);
    const fs = parseFloat(cs.fontSize) * SCALE;
    mctx.font = `300 ${fs}px ${cs.fontFamily}`;
    const m = mctx.measureText('Hg');
    const fa = m.fontBoundingBoxAscent || fs * 0.92;
    const fd = m.fontBoundingBoxDescent || fs * 0.24;
    $$('.ch', title).forEach((ch) => {
      const c = ch.textContent;
      if (!c.trim()) return;
      const r = ch.getBoundingClientRect();
      const wt = ch.style.fontWeight || getComputedStyle(ch).fontWeight || '300';
      mctx.font = `${wt} ${fs}px ${cs.fontFamily}`;
      const x = (r.left - reg.hr.left - reg.x) * SCALE;
      const top = (r.top - reg.hr.top - reg.y) * SCALE;
      const hh = r.height * SCALE;
      mctx.fillText(c, x, top + fa * (hh / (fa + fd)));
    });
    const px = mctx.getImageData(0, 0, w, h).data;
    const outside = new Float64Array(w * h);
    const inside = new Float64Array(w * h);
    // partial coverage seeds sub-pixel distances, so edges stay smooth at this resolution (as in Mapbox tiny-sdf)
    for (let i = 0; i < w * h; i += 1) {
      const a = px[i * 4 + 3] / 255;
      if (a >= 1) { outside[i] = 0; inside[i] = INF; } else if (a <= 0) { outside[i] = INF; inside[i] = 0; } else {
        const dd = 0.5 - a;
        outside[i] = dd > 0 ? dd * dd : 0;
        inside[i] = dd < 0 ? dd * dd : 0;
      }
    }
    edt(outside, w, h);
    edt(inside, w, h);
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = y * w + x;
        const d = (Math.sqrt(outside[i]) - Math.sqrt(inside[i])) / SCALE; // CSS px, positive outside
        out[(h - 1 - y) * w + x] = Math.max(0, Math.min(255, Math.round((0.5 + d / (2 * SPREAD)) * 255)));
      }
    }
    return { w, h, data: out };
  };
  const upload = (t, f) => {
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, f.w, f.h, 0, gl.RED, gl.UNSIGNED_BYTE, f.data);
  };

  const onScreen = () => {
    const r = title.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && !doc.documentElement.classList.contains('overview');
  };
  const rgb = (c) => { const m = c.match(/[\d.]+/g); return m ? m.slice(0, 3).map((n) => Number(n) / 255) : [0, 0, 0]; };

  let playing = false;
  api.morph = {
    ready: () => !playing && onScreen(),
    capture() {
      try {
        const reg = region();
        return { reg, a: field(reg) };
      } catch (e) { return null; }
    },
    play(job) {
      if (!job) return;
      playing = true;
      const lines = $$('.hero__line', title);
      const restore = () => { lines.forEach((l) => { l.style.opacity = ''; }); canvas.remove(); playing = false; };
      try {
        const reg = { ...job.reg, hr: hero.getBoundingClientRect() };
        const b = field(reg);
        upload(texA, job.a);
        upload(texB, b);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.style.left = `${reg.x}px`;
        canvas.style.top = `${reg.y}px`;
        canvas.style.width = `${reg.w}px`;
        canvas.style.height = `${reg.h}px`;
        canvas.width = Math.round(reg.w * dpr);
        canvas.height = Math.round(reg.h * dpr);
        hero.appendChild(canvas);
        lines.forEach((l) => { l.style.opacity = '0'; });
        const col = rgb(getComputedStyle(title).color);
        const seed = Math.random() * 100;
        const DUR = 950;
        const t0 = performance.now();
        const frame = (now) => {
          const k = Math.min(1, (now - t0) / DUR);
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.useProgram(prog);
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA); gl.uniform1i(U.uA, 0);
          gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB); gl.uniform1i(U.uB, 1);
          gl.uniform1f(U.uK, k);
          gl.uniform1f(U.uSpread, SPREAD);
          gl.uniform1f(U.uPx, 0.75);
          gl.uniform1f(U.uSeed, seed);
          gl.uniform3fv(U.uCol, col);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          if (k < 1) { requestAnimationFrame(frame); return; }
          // hand back to the real text without a seam
          lines.forEach((l) => { l.style.opacity = ''; });
          if (canvas.animate) canvas.animate({ opacity: [1, 0] }, { duration: 160, easing: EASE }).finished.then(restore, restore);
          else restore();
        };
        requestAnimationFrame(frame);
      } catch (e) {
        restore();
      }
    },
  };
}
