/* Ink in the hero: a small stable-fluids simulation (WebGL2) behind the title.
   The letters of the title are solid, so the ink flows around them. The pointer stirs it,
   a few slow currents keep it alive, and switching the theme pours a ring of ink from the switch.
   Paused whenever the hero is off screen or the tab is hidden. */

const VERT = `#version 300 es
in vec2 aPos;
uniform vec2 uTexel;
out vec2 vUv, vL, vR, vT, vB;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vL = vUv - vec2(uTexel.x, 0.0); vR = vUv + vec2(uTexel.x, 0.0);
  vT = vUv + vec2(0.0, uTexel.y); vB = vUv - vec2(0.0, uTexel.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const HEAD = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv, vL, vR, vT, vB;
out vec4 o;
`;

const FRAG = {
  splat: `${HEAD}
uniform sampler2D uTarget, uObs;
uniform float uAspect, uRadius;
uniform vec3 uColor;
uniform vec2 uPoint;
void main() {
  vec2 p = vUv - uPoint; p.x *= uAspect;
  vec3 s = exp(-dot(p, p) / uRadius) * uColor;
  float solid = step(0.5, texture(uObs, vUv).r);
  o = vec4((texture(uTarget, vUv).xyz + s) * (1.0 - solid), 1.0);
}`,
  advect: `${HEAD}
uniform sampler2D uVelocity, uSource, uObs;
uniform vec2 uSimTexel;
uniform float uDt, uDiss;
void main() {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uSimTexel;
  vec4 r = texture(uSource, coord) / (1.0 + uDiss * uDt);
  o = r * (1.0 - smoothstep(0.3, 0.7, texture(uObs, vUv).r));
}`,
  divergence: `${HEAD}
uniform sampler2D uVelocity, uObs;
float solid(vec2 p) { return step(0.5, texture(uObs, p).r); }
void main() {
  vec2 C = texture(uVelocity, vUv).xy;
  float L = texture(uVelocity, vL).x * (1.0 - solid(vL));
  float R = texture(uVelocity, vR).x * (1.0 - solid(vR));
  float T = texture(uVelocity, vT).y * (1.0 - solid(vT));
  float B = texture(uVelocity, vB).y * (1.0 - solid(vB));
  if (vL.x < 0.0) L = -C.x;
  if (vR.x > 1.0) R = -C.x;
  if (vT.y > 1.0) T = -C.y;
  if (vB.y < 0.0) B = -C.y;
  o = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`,
  curl: `${HEAD}
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).y; float R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x; float B = texture(uVelocity, vB).x;
  o = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`,
  vorticity: `${HEAD}
uniform sampler2D uVelocity, uCurl;
uniform float uStrength, uDt;
void main() {
  float L = texture(uCurl, vL).x; float R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x; float B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;
  vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  f /= length(f) + 0.0001;
  f *= uStrength * C; f.y *= -1.0;
  vec2 v = texture(uVelocity, vUv).xy + f * uDt;
  o = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
}`,
  pressure: `${HEAD}
uniform sampler2D uPressure, uDivergence, uObs;
void main() {
  float C = texture(uPressure, vUv).x;
  float L = texture(uObs, vL).r > 0.5 ? C : texture(uPressure, vL).x;
  float R = texture(uObs, vR).r > 0.5 ? C : texture(uPressure, vR).x;
  float T = texture(uObs, vT).r > 0.5 ? C : texture(uPressure, vT).x;
  float B = texture(uObs, vB).r > 0.5 ? C : texture(uPressure, vB).x;
  o = vec4((L + R + B + T - texture(uDivergence, vUv).x) * 0.25, 0.0, 0.0, 1.0);
}`,
  gradient: `${HEAD}
uniform sampler2D uPressure, uVelocity, uObs;
void main() {
  float C = texture(uPressure, vUv).x;
  float L = texture(uObs, vL).r > 0.5 ? C : texture(uPressure, vL).x;
  float R = texture(uObs, vR).r > 0.5 ? C : texture(uPressure, vR).x;
  float T = texture(uObs, vT).r > 0.5 ? C : texture(uPressure, vT).x;
  float B = texture(uObs, vB).r > 0.5 ? C : texture(uPressure, vB).x;
  vec2 v = texture(uVelocity, vUv).xy - vec2(R - L, T - B);
  o = vec4(v * (1.0 - step(0.5, texture(uObs, vUv).r)), 0.0, 1.0);
}`,
  scale: `${HEAD}
uniform sampler2D uTex;
uniform float uValue;
void main() { o = uValue * texture(uTex, vUv); }`,
  display: `${HEAD}
uniform sampler2D uDye;
uniform vec3 uA, uB;
uniform float uAlpha;
void main() {
  vec2 d = max(texture(uDye, vUv).rg, 0.0);
  float a = d.r + d.g;
  float k = 1.0 - exp(-a * 2.2);
  vec3 col = mix(uA, uB, d.g / (a + 0.0001));
  float alpha = k * uAlpha;
  o = vec4(col * alpha, alpha);
}`,
};

export function init(host) {
  const { doc, $, $$, themeHooks, langHooks, cssVar } = host;
  const hero = $('.hero');
  const title = $('.hero__title');
  if (!hero || !title) return;

  const canvas = doc.createElement('canvas');
  canvas.className = 'hero__ink';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) return;

  /* ── programs ── */
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const P = {};
  Object.entries(FRAG).forEach(([name, src]) => {
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, src));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i += 1) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
    P[name] = { p, u };
  });
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.BLEND);

  /* ── render targets ── */
  const target = (w, h, internal, format, type) => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb, w, h, texel: [1 / w, 1 / h], free() { gl.deleteTexture(tex); gl.deleteFramebuffer(fb); } };
  };
  const pair = (w, h, i, f, t) => {
    let a = target(w, h, i, f, t);
    let b = target(w, h, i, f, t);
    return { get read() { return a; }, get write() { return b; }, swap() { [a, b] = [b, a]; }, free() { a.free(); b.free(); } };
  };
  const maskTex = () => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 1, 1, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array([0]));
    return tex;
  };
  const obsSim = maskTex();
  const obsDye = maskTex();

  let S = null; // { vel, dye, div, curl, pres, sw, sh, dw, dh }
  let cssW = 0;
  let cssH = 0;

  const HALF = gl.HALF_FLOAT;
  const build = () => {
    cssW = hero.offsetWidth;
    cssH = hero.offsetHeight;
    if (!cssW || !cssH) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const sw = Math.max(64, Math.round(cssW / 5));
    const sh = Math.max(32, Math.round(cssH / 5));
    const dw = Math.round(cssW / 2);
    const dh = Math.round(cssH / 2);
    if (S) Object.values(S).forEach((v) => v && v.free && v.free());
    S = {
      vel: pair(sw, sh, gl.RG16F, gl.RG, HALF),
      dye: pair(dw, dh, gl.RG16F, gl.RG, HALF),
      pres: pair(sw, sh, gl.R16F, gl.RED, HALF),
      div: target(sw, sh, gl.R16F, gl.RED, HALF),
      curl: target(sw, sh, gl.R16F, gl.RED, HALF),
      sw, sh, dw, dh,
    };
    buildMask();
    return true;
  };

  /* the title, drawn white on black: once dilated at sim size (walls), once crisp at dye size */
  const maskCanvas = doc.createElement('canvas');
  const mctx = maskCanvas.getContext('2d');
  const drawMask = (w, h, grow) => {
    maskCanvas.width = w;
    maskCanvas.height = h;
    mctx.fillStyle = '#000';
    mctx.fillRect(0, 0, w, h);
    const hr = hero.getBoundingClientRect();
    const k = hr.width / cssW || 1; // the overview scales the hero; measure in its own pixels
    const cs = getComputedStyle(title);
    const fs = parseFloat(cs.fontSize);
    const sx = w / cssW;
    const sy = h / cssH;
    mctx.fillStyle = '#fff';
    mctx.strokeStyle = '#fff';
    mctx.lineJoin = 'round';
    mctx.lineWidth = grow;
    mctx.font = `300 ${fs * sx}px ${cs.fontFamily}`;
    mctx.textBaseline = 'alphabetic';
    const m = mctx.measureText('Hg');
    const fa = m.fontBoundingBoxAscent || fs * sx * 0.92;
    const fd = m.fontBoundingBoxDescent || fs * sx * 0.24;
    $$('.ch', title).forEach((ch) => {
      const c = ch.textContent;
      if (!c.trim()) return;
      const r = ch.getBoundingClientRect();
      const x = ((r.left - hr.left) / k) * sx;
      const top = ((r.top - hr.top) / k) * sy;
      const hgt = (r.height / k) * sy;
      const y = top + fa * (hgt / (fa + fd));
      mctx.fillText(c, x, y);
      if (grow) mctx.strokeText(c, x, y);
    });
  };
  const upload = (tex) => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, maskCanvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  };
  function buildMask() {
    if (!S) return;
    drawMask(S.sw, S.sh, 1.6);
    upload(obsSim);
    drawMask(S.dw, S.dh, 1);
    upload(obsDye);
  }

  /* ── colours ── */
  const rgb = (value) => {
    const v = value.trim();
    if (v.startsWith('#')) {
      const h = v.length === 4 ? v.slice(1).split('').map((c) => c + c).join('') : v.slice(1, 7);
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    }
    const m = v.match(/[\d.]+/g);
    return m ? m.slice(0, 3).map((n) => Number(n) / 255) : [0.1, 0.4, 0.4];
  };
  let colA = [0, 0, 0];
  let colB = [0, 0, 0];
  let alpha = 0.3;
  const readColors = () => {
    // the hero is always dark (space), so read its own tokens
    colA = rgb(cssVar('--accent', hero));
    colB = rgb(cssVar('--slate', hero));
    alpha = 0.42;
  };
  readColors();

  /* ── passes ── */
  const bindTex = (unit, tex) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); return unit; };
  const use = (prog, texel) => { gl.useProgram(prog.p); if (prog.u.uTexel) gl.uniform2fv(prog.u.uTexel, texel); return prog.u; };
  const blit = (out) => {
    if (out) { gl.viewport(0, 0, out.w, out.h); gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb); } else { gl.viewport(0, 0, canvas.width, canvas.height); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const splat = (x, y, dx, dy, ink, tone, radius = 0.0012) => {
    if (!S) return;
    const aspect = cssW / cssH;
    let u = use(P.splat, S.vel.read.texel);
    gl.uniform1i(u.uTarget, bindTex(0, S.vel.read.tex));
    gl.uniform1i(u.uObs, bindTex(1, obsSim));
    gl.uniform1f(u.uAspect, aspect);
    gl.uniform2f(u.uPoint, x, y);
    gl.uniform3f(u.uColor, dx, dy, 0);
    gl.uniform1f(u.uRadius, radius);
    blit(S.vel.write);
    S.vel.swap();
    if (!ink) return;
    u = use(P.splat, S.dye.read.texel);
    gl.uniform1i(u.uTarget, bindTex(0, S.dye.read.tex));
    gl.uniform1i(u.uObs, bindTex(1, obsDye));
    gl.uniform1f(u.uAspect, aspect);
    gl.uniform2f(u.uPoint, x, y);
    gl.uniform3f(u.uColor, tone ? 0 : ink, tone ? ink : 0, 0);
    gl.uniform1f(u.uRadius, radius * 1.4);
    blit(S.dye.write);
    S.dye.swap();
  };

  const step = (dt) => {
    const st = S.vel.read.texel;
    let u = use(P.curl, st);
    gl.uniform1i(u.uVelocity, bindTex(0, S.vel.read.tex));
    blit(S.curl);

    u = use(P.vorticity, st);
    gl.uniform1i(u.uVelocity, bindTex(0, S.vel.read.tex));
    gl.uniform1i(u.uCurl, bindTex(1, S.curl.tex));
    gl.uniform1f(u.uStrength, 14);
    gl.uniform1f(u.uDt, dt);
    blit(S.vel.write);
    S.vel.swap();

    u = use(P.divergence, st);
    gl.uniform1i(u.uVelocity, bindTex(0, S.vel.read.tex));
    gl.uniform1i(u.uObs, bindTex(1, obsSim));
    blit(S.div);

    u = use(P.scale, st);
    gl.uniform1i(u.uTex, bindTex(0, S.pres.read.tex));
    gl.uniform1f(u.uValue, 0.8);
    blit(S.pres.write);
    S.pres.swap();

    u = use(P.pressure, st);
    gl.uniform1i(u.uDivergence, bindTex(1, S.div.tex));
    gl.uniform1i(u.uObs, bindTex(2, obsSim));
    for (let i = 0; i < 20; i += 1) {
      gl.uniform1i(u.uPressure, bindTex(0, S.pres.read.tex));
      blit(S.pres.write);
      S.pres.swap();
    }

    u = use(P.gradient, st);
    gl.uniform1i(u.uPressure, bindTex(0, S.pres.read.tex));
    gl.uniform1i(u.uVelocity, bindTex(1, S.vel.read.tex));
    gl.uniform1i(u.uObs, bindTex(2, obsSim));
    blit(S.vel.write);
    S.vel.swap();

    u = use(P.advect, st);
    gl.uniform2fv(u.uSimTexel, st);
    gl.uniform1i(u.uVelocity, bindTex(0, S.vel.read.tex));
    gl.uniform1i(u.uSource, bindTex(0, S.vel.read.tex));
    gl.uniform1i(u.uObs, bindTex(1, obsSim));
    gl.uniform1f(u.uDt, dt);
    gl.uniform1f(u.uDiss, 0.5);
    blit(S.vel.write);
    S.vel.swap();

    u = use(P.advect, S.dye.read.texel);
    gl.uniform2fv(u.uSimTexel, st);
    gl.uniform1i(u.uVelocity, bindTex(0, S.vel.read.tex));
    gl.uniform1i(u.uSource, bindTex(1, S.dye.read.tex));
    gl.uniform1i(u.uObs, bindTex(2, obsDye));
    gl.uniform1f(u.uDt, dt);
    gl.uniform1f(u.uDiss, 0.32);
    blit(S.dye.write);
    S.dye.swap();
  };

  const render = () => {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const u = use(P.display, [1 / canvas.width, 1 / canvas.height]);
    gl.uniform1i(u.uDye, bindTex(0, S.dye.read.tex));
    gl.uniform3fv(u.uA, colA);
    gl.uniform3fv(u.uB, colB);
    gl.uniform1f(u.uAlpha, alpha);
    blit(null);
    gl.disable(gl.BLEND);
  };

  /* ── input: the pointer stirs, slow currents keep it moving ── */
  const toUv = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    return [(cx - r.left) / r.width, 1 - (cy - r.top) / r.height, r];
  };
  let last = null;
  const queue = [];
  const ac = new AbortController(); // every listener goes away with destroy()
  hero.addEventListener('pointermove', (e) => {
    if (!S || (e.pointerType !== 'mouse' && e.pointerType !== 'pen')) return;
    const [x, y] = toUv(e.clientX, e.clientY);
    const now = performance.now();
    if (last) {
      const dt = Math.max(8, now - last.t) / 1000;
      const vx = ((x - last.x) * S.sw) / dt;
      const vy = ((y - last.y) * S.sh) / dt;
      const speed = Math.hypot(vx, vy);
      const k = Math.min(1, 160 / (speed + 1)); // keep fast flicks calm
      queue.push([x, y, vx * k * 0.6, vy * k * 0.6, Math.min(0.12, speed * 0.0009), 0]);
    }
    last = { x, y, t: now };
  }, { signal: ac.signal });
  hero.addEventListener('pointerleave', () => { last = null; }, { signal: ac.signal });

  let ambientT = 0;
  const ambient = (dt) => {
    ambientT -= dt;
    if (ambientT > 0) return;
    ambientT = 1.4 + Math.random() * 1.4;
    // currents rise from the lower edge and the far corners, never from the middle of the text
    const side = Math.random();
    const x = side < 0.5 ? 0.05 + Math.random() * 0.25 : 0.7 + Math.random() * 0.28;
    const y = 0.02 + Math.random() * 0.12;
    const ang = Math.PI / 2 + (Math.random() - 0.5) * 1.1;
    const f = 36 + Math.random() * 30;
    queue.push([x, y, Math.cos(ang) * f, Math.sin(ang) * f, 0.22, Math.random() < 0.5 ? 1 : 0, 0.004]);
  };

  /* theme switch: a ring of ink pours out from where it was pressed */
  const onTheme = (theme, at) => {
    readColors();
    if (!S || !running) return;
    const [x, y, r] = toUv(at.x, at.y);
    const inside = at.x >= r.left - 200 && at.x <= r.right + 200 && at.y >= r.top - 200 && at.y <= r.bottom;
    if (!inside) return;
    const cx = Math.min(0.98, Math.max(0.02, x));
    const cy = Math.min(0.98, Math.max(0.02, y));
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.2;
      queue.push([cx + Math.cos(a) * 0.01, cy + Math.sin(a) * 0.018, Math.cos(a) * 260, Math.sin(a) * 260, 0.5, i % 3 === 0 ? 1 : 0, 0.0022]);
    }
  };
  themeHooks.push(onTheme);

  /* ── loop ── */
  let running = false;
  let visible = false;
  let raf = 0;
  let prev = 0;
  let dead = false;
  const frame = (now) => {
    raf = 0;
    if (!running) return;
    const dt = Math.min(1 / 30, (now - prev) / 1000 || 1 / 60);
    prev = now;
    ambient(dt);
    while (queue.length) { const q = queue.shift(); splat(q[0], q[1], q[2], q[3], q[4], q[5], q[6]); }
    step(dt);
    render();
    raf = requestAnimationFrame(frame);
  };
  const update = () => {
    const should = !dead && visible && !doc.hidden && !!S && !doc.documentElement.classList.contains('overview');
    if (should && !running) { running = true; prev = performance.now(); raf = requestAnimationFrame(frame); }
    if (!should && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  };
  const io = new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; update(); });
  io.observe(hero);
  doc.addEventListener('visibilitychange', update, { signal: ac.signal });
  const mo = new MutationObserver(update); // pauses during the overview
  mo.observe(doc.documentElement, { attributes: true, attributeFilter: ['class'] });

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); running = false; S = null; canvas.remove(); }, { signal: ac.signal });

  let rt = 0;
  const rebuild = () => { clearTimeout(rt); rt = setTimeout(() => { if (doc.documentElement.classList.contains('overview')) return; if (build()) update(); }, 160); };
  const ro = new ResizeObserver(rebuild);
  ro.observe(hero);
  const onLang = () => setTimeout(() => { if (!dead) buildMask(); }, 900); // after the letters have settled into the new language
  langHooks.push(onLang);

  // first frame after the title has finished its entrance
  const startT = setTimeout(() => {
    const bg = $('.hero__bg', hero);
    if (bg) bg.after(canvas); else hero.prepend(canvas);
    if (build()) {
      // a first slow breath of ink so the effect is discoverable without touching anything
      for (let i = 0; i < 3; i += 1) queue.push([0.12 + i * 0.36, 0.04, (Math.random() - 0.5) * 30, 70, 0.3, i % 2, 0.005]);
      update();
    }
  }, 1500);

  return {
    destroy() {
      if (dead) return;
      dead = true;
      update();
      clearTimeout(startT); clearTimeout(rt);
      io.disconnect(); ro.disconnect(); mo.disconnect(); ac.abort();
      [[themeHooks, onTheme], [langHooks, onLang]].forEach(([list, fn]) => { const i = list.indexOf(fn); if (i >= 0) list.splice(i, 1); });
      canvas.remove();
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    },
  };
}
