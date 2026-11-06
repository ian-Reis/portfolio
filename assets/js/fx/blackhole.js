/* A black hole behind the hero, computed from scratch: no model, no textures.
   Every pixel traces a light ray backwards through Schwarzschild spacetime (units of the
   Schwarzschild radius, photon orbit equation a = -1.5 h² r / |r|⁵). Where the ray crosses the
   accretion disk it picks up light (Keplerian rotation, Doppler beaming, gravitational redshift);
   where it escapes it lands on the page's own dot grid, so the grid is lensed around the hole.
   Light theme: ink on paper. Dark theme: a glowing disk in the accent colour.
   Pointer tilts the view and pulls the hole a little; press and hold feeds it, release sends a
   gravitational wave through the grid. Paused off screen, in hidden tabs and in the overview. */

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;        // drawing buffer, px
uniform float uScale;     // drawing-buffer px per CSS px
uniform vec2 uHole;       // hole on screen, CSS px from the top left of the hero
uniform float uPx;        // CSS px per unit of tan(angle): the zoom (includes the mass)
uniform float uIncl;      // camera height above the disk plane, radians
uniform float uTime;
uniform float uDark;      // 0 light theme, 1 dark theme
uniform vec3 uInk, uAccent, uPaper;
uniform vec4 uDot;        // dot colour and alpha
uniform vec2 uMouse;      // CSS px
uniform vec2 uGrid;       // grid origin (the hero centre), CSS px
uniform vec3 uWave;       // wave origin (CSS px) and age in seconds (< 0: none)
out vec4 o;

const float RIN = 3.0;    // innermost stable orbit
const float ROUT = 11.0;
const float DIST = 22.0;  // camera distance
const float PLANE = 9.0;  // the dot grid sits on a plane this far behind the hole

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
vec2 rot(vec2 p, float a) { float c = cos(a); float s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }

// gas texture: each radius turns at its own Keplerian speed; two layers that reset in turn keep it from winding up
float gas(vec2 xz, float r) {
  float om = 2.6 * pow(r, -1.5);
  float T = 36.0;
  float p1 = fract(uTime / T); float p2 = fract(uTime / T + 0.5);
  float n1 = fbm(rot(xz, -om * p1 * T) * vec2(0.9, 0.9));
  float n2 = fbm(rot(xz, -om * p2 * T) * vec2(0.9, 0.9) + 31.7);
  float w1 = 1.0 - abs(2.0 * p1 - 1.0);
  float n = mix(n2, n1, w1);
  return n * (0.75 + 0.25 * sin(r * 5.0 + n * 6.0)); // faint lanes
}

// the cursor light of the original background, plus a permanent one around the hole
float spot(vec2 p, vec2 c, float rad) {
  float d = length(p - c) / rad;
  return d < 0.45 ? mix(1.0, 0.35, d / 0.45) : d < 0.8 ? mix(0.35, 0.12, (d - 0.45) / 0.35) : 0.12;
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale;

  float ci = cos(uIncl); float si = sin(uIncl);
  vec3 cam = vec3(0.0, si, ci) * DIST;
  vec3 fwd = normalize(-cam);
  vec3 right = vec3(1.0, 0.0, 0.0);
  vec3 up = cross(right, fwd);

  vec2 s = (frag - uHole) / uPx; s.y = -s.y;
  vec3 dir = normalize(fwd + right * s.x + up * s.y);
  vec3 p = cam; vec3 v = dir;
  vec3 hv = cross(p, v); float h2 = dot(hv, hv); float b = sqrt(h2);

  vec3 col = vec3(0.0); float a = 0.0;
  float rmin = 1e9;
  bool captured = false;

  // weak field: one kick of 2/b radians at closest approach (also used to blend the edge of the marched zone)
  vec3 cA = cam + dir * dot(-cam, dir);
  vec3 toward = normalize(-cA);
  float defl = 2.0 / max(b, 1.0);
  vec3 vA = normalize(dir * cos(defl) + toward * sin(defl));
  vec3 pA = cA;

  // rays that pass farther than this never reach the disk: they get the cheap weak-field bend
  float near = 1.0 - smoothstep(13.5, 16.5, b);
  if (near > 0.0) {
    for (int i = 0; i < 180; i++) {
      float r2 = dot(p, p); float r = sqrt(r2);
      rmin = min(rmin, r);
      if (r < 1.0) { captured = true; break; }
      if (dot(p, fwd) > PLANE && dot(v, fwd) > 0.0) break; // reached the grid
      if (r > 34.0 && dot(p, v) > 0.0) break;
      float dt = clamp((r - 1.0) * 0.16, 0.035, 2.2);
      v += -1.5 * h2 * p / (r2 * r2 * r) * dt;
      vec3 np = p + v * dt;
      if (p.y * np.y < 0.0) {
        vec3 hit = mix(p, np, p.y / (p.y - np.y));
        float rr = length(hit.xz);
        if (rr > RIN * 0.92 && rr < ROUT) {
          float prof = pow(RIN / rr, 2.0) * smoothstep(RIN * 0.92, RIN + 0.7, rr) * smoothstep(ROUT, ROUT - 4.0, rr);
          float n = gas(hit.xz, rr);
          // Doppler beaming and gravitational redshift
          vec3 vel = normalize(vec3(-hit.z, 0.0, hit.x));
          float beta = sqrt(0.5 / rr);
          float gam = 1.0 / sqrt(1.0 - beta * beta);
          float dop = 1.0 / (gam * (1.0 - beta * dot(vel, -normalize(v))));
          float boost = clamp(pow(dop, 3.0) * sqrt(max(1.0 - 1.0 / rr, 0.0)), 0.15, 3.5);
          float dens = prof * (0.3 + 1.1 * n * n);
          // dark: light that glows from accent to near white; light: ink laid on paper
          float e = dens * boost;
          vec3 hot = mix(uAccent, vec3(0.94, 0.98, 0.97), clamp(e * 0.55, 0.0, 1.0));
          vec3 cDark = hot * clamp(e * 1.25, 0.0, 1.6);
          float aDark = clamp(e * 1.1, 0.0, 1.0);
          vec3 cLight = mix(uAccent, uInk, clamp(e * 0.6, 0.0, 1.0));
          float aLight = clamp(dens * (0.55 + 0.45 * boost) * 1.4, 0.0, 0.94);
          vec3 c = mix(cLight * aLight, cDark, uDark);
          float al = mix(aLight, aDark, uDark);
          col += (1.0 - a) * c;
          a += (1.0 - a) * al;
        }
      }
      p = np;
      if (a > 0.985) break;
    }
    // still circling the photon sphere when the steps ran out: it would fall in or orbit for ever
    if (!captured && length(p) < 4.0 && dot(p, fwd) < PLANE) captured = true;
  }

  // the shadow's edge is exactly the critical impact parameter √27/2: anti-alias it over one pixel
  float bw = DIST / (uPx * uScale) * 0.9;
  float sa = 1.0 - smoothstep(2.598 - bw, 2.598 + bw, b);
  vec3 shadow = mix(uInk, vec3(0.0), uDark);
  col += (1.0 - a) * shadow * sa; a += (1.0 - a) * sa;
  if (!captured) {
    // blend marched and weak-field rays at the edge of the zone
    vec3 vE = near > 0.0 ? normalize(mix(vA, v, near)) : vA;
    vec3 pE = near > 0.0 ? mix(pA, p, near) : pA;

    // photon ring: rays that skimmed the photon sphere (r = 1.5)
    float ring = exp(-max(rmin - 1.5, 0.0) * 5.0) * near;
    vec3 ringC = mix(uInk * 0.9, mix(uAccent, vec3(1.0), 0.5), uDark);
    float ringA = ring * mix(0.55, 0.65, uDark);
    col += (1.0 - a) * ringC * ringA; a += (1.0 - a) * ringA;

    // the page's dot grid, seen through the lens
    float fw = dot(vE, fwd);
    if (fw > 0.02) {
      float t = (PLANE - dot(pE, fwd)) / fw;
      vec3 X = pE + vE * t;
      vec3 rel = X - cam;
      vec2 q = uHole + uPx * vec2(dot(rel, right), -dot(rel, up)) / dot(rel, fwd);
      if (uWave.z >= 0.0) {
        vec2 dv = q - uWave.xy; float dd = length(dv);
        float R = uWave.z * 560.0;
        float k = exp(-pow((dd - R) / 80.0, 2.0)) * exp(-uWave.z * 0.9);
        q += (dv / max(dd, 1.0)) * sin((dd - R) * 0.09) * 7.0 * k;
      }
      vec2 cell = mod(q - uGrid + 12.0, 24.0) - 12.0;
      float px = length(fwidth(q));
      float d = length(cell);
      float dotA = (1.0 - smoothstep(1.0, 1.6 + px * 0.5, d)) / max(1.0, px * 0.6);
      float lit = max(spot(frag, uMouse, 340.0), spot(frag, uHole, 420.0));
      // where the lens squeezes many cells into one pixel (next to the shadow), let the grid fade instead of sparkle
      float ga = uDot.a * dotA * lit * (1.0 - smoothstep(3.0, 8.0, px));
      col += (1.0 - a) * uDot.rgb * ga; a += (1.0 - a) * ga;

      // a few faint stars in the dark theme, on the same lensed plane
      vec2 sc = floor(q / 37.0);
      float h1 = hash(sc + 0.37);
      if (h1 > 0.9 && uDark > 0.0) {
        vec2 sp = (sc + 0.2 + 0.6 * vec2(hash(sc + 3.1), hash(sc + 7.7))) * 37.0;
        float sdist = length(q - sp);
        float star = (1.0 - smoothstep(0.35, 1.2 + px * 0.5, sdist)) / max(1.0, px * 0.6);
        star *= uDark * (0.3 + 0.25 * sin(uTime * 1.1 + h1 * 60.0));
        col += (1.0 - a) * vec3(0.9, 0.97, 0.96) * star; a += (1.0 - a) * star;
      }
    }
  }

  o = vec4(col, a);
}`;

export function init(host) {
  const { doc, root, $, themeHooks, cssVar } = host;
  const hero = $('.hero');
  if (!hero) return null;

  const canvas = doc.createElement('canvas');
  canvas.className = 'hero__ink hero__hole';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  // compile without blocking the page: the driver works in the background and we poll until it is done
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const vs = sh(gl.VERTEX_SHADER, VERT);
  const fs = sh(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, 'aPos');
  gl.linkProgram(prog);
  const U = {};
  let linked = false;
  const finishLink = () => {
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      if (window.console) console.warn('[fx/blackhole]', gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(prog));
      return false;
    }
    const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i += 1) { const info = gl.getActiveUniform(prog, i); U[info.name] = gl.getUniformLocation(prog, info.name); }
    linked = true;
    return true;
  };
  gl.bindVertexArray(gl.createVertexArray());
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  /* ── colours from the theme tokens ── */
  const parse = (v) => {
    const s = v.trim();
    if (s.startsWith('#')) { const h = s.slice(1, 7); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).concat(1); }
    const m = s.match(/[\d.]+/g) || [0, 0, 0, 1];
    return [Number(m[0]) / 255, Number(m[1]) / 255, Number(m[2]) / 255, m[3] !== undefined ? Number(m[3]) : 1];
  };
  let pal = {};
  const readPal = () => {
    pal = { ink: parse(cssVar('--ink')), accent: parse(cssVar('--accent')), paper: parse(cssVar('--paper')), dot: parse(cssVar('--dot')) };
  };
  readPal();
  const isDark = () => root.dataset.theme === 'dark';
  let dark = isDark() ? 1 : 0;
  let darkFrom = dark;
  let darkTo = dark;
  let darkT0 = 0;

  /* ── size and placement ── */
  let W = 0; let H = 0; let scale = Math.min(window.devicePixelRatio || 1, 1.25);
  const home = { x: 0, y: 0 };
  let basePx = 400;
  const resize = () => {
    W = hero.offsetWidth; H = hero.offsetHeight;
    canvas.width = Math.max(1, Math.round(W * scale));
    canvas.height = Math.max(1, Math.round(H * scale));
    // between the two columns, above the text: the title and the lead stay readable
    home.x = W * (W < 1100 ? 0.6 : 0.47);
    home.y = Math.max(128, H * 0.27);
    const shadowPx = Math.max(40, Math.min(70, H * 0.1));
    basePx = shadowPx / (Math.sqrt(27) / 2 / 22); // apparent shadow radius = √27/2 rs at distance 22
  };

  /* ── interaction ── */
  const state = { hx: 0, hy: 0, incl: 0.16, mass: 1, massV: 0, massTo: 1, mx: -9999, my: -9999, pmx: 0.5, pmy: 0.5, wave: { x: 0, y: 0, t0: -1 } };
  const ac = new AbortController();
  const local = (e) => { const r = hero.getBoundingClientRect(); const k = r.width / W || 1; return [(e.clientX - r.left) / k, (e.clientY - r.top) / k]; };
  hero.addEventListener('pointermove', (e) => {
    const [x, y] = local(e);
    state.mx = x; state.my = y;
    state.pmx = x / W; state.pmy = y / H;
  }, { signal: ac.signal });
  hero.addEventListener('pointerleave', () => { state.mx = -9999; state.my = -9999; state.pmx = 0.5; state.pmy = 0.5; }, { signal: ac.signal });
  // press and hold on the background (not on links or buttons) feeds the hole; release sends a wave
  hero.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('a, button, input, .hero__lead, .status')) return;
    state.massTo = 1.45;
  }, { signal: ac.signal });
  const release = () => {
    if (state.massTo === 1) return;
    state.massTo = 1;
    state.wave = { x: state.hx, y: state.hy, t0: performance.now() };
  };
  window.addEventListener('pointerup', release, { signal: ac.signal });
  window.addEventListener('pointercancel', release, { signal: ac.signal });

  const onTheme = () => {
    readPal();
    darkFrom = dark; darkTo = isDark() ? 1 : 0; darkT0 = performance.now();
    state.wave = { x: state.hx, y: state.hy, t0: performance.now() };
  };
  themeHooks.push(onTheme);

  /* ── loop ── */
  let running = false; let visible = false; let raf = 0; let dead = false;
  const t0 = performance.now();
  let slow = 0; let frames = 0; let last = 0;
  const frame = (now) => {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    // adaptive quality: drop the resolution if frames are slow
    if (last) { frames += 1; if (now - last > 21) slow += 1; }
    last = now;
    if (frames >= 40) {
      if (slow > 24 && scale > 0.5) { scale = Math.max(0.5, scale * 0.75); resize(); }
      frames = 0; slow = 0;
    }
    // springs
    const tx = home.x + (state.mx > -999 ? (state.mx - home.x) * 0.06 : 0);
    const ty = home.y + (state.my > -999 ? (state.my - home.y) * 0.05 : 0);
    state.hx += (tx - state.hx) * Math.min(1, dt * 2.2);
    state.hy += (ty - state.hy) * Math.min(1, dt * 2.2);
    const inclTo = 0.15 + (state.pmy - 0.5) * 0.2;
    state.incl += (inclTo - state.incl) * Math.min(1, dt * 2.5);
    state.massV += ((state.massTo - state.mass) * 40 - state.massV * 9) * dt;
    state.mass += state.massV * dt;
    if (darkFrom !== darkTo) {
      const k = Math.min(1, (now - darkT0) / 900);
      dark = darkFrom + (darkTo - darkFrom) * (1 - (1 - k) ** 3);
      if (k >= 1) darkFrom = darkTo;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uScale, canvas.width / W);
    gl.uniform2f(U.uHole, state.hx, state.hy);
    gl.uniform1f(U.uPx, basePx * state.mass);
    gl.uniform1f(U.uIncl, state.incl);
    gl.uniform1f(U.uTime, (now - t0) / 1000);
    gl.uniform1f(U.uDark, dark);
    gl.uniform3fv(U.uInk, pal.ink.slice(0, 3));
    gl.uniform3fv(U.uAccent, pal.accent.slice(0, 3));
    gl.uniform3fv(U.uPaper, pal.paper.slice(0, 3));
    gl.uniform4fv(U.uDot, pal.dot);
    gl.uniform2f(U.uMouse, state.mx, state.my);
    gl.uniform2f(U.uGrid, W / 2, H / 2);
    const age = state.wave.t0 < 0 ? -1 : (now - state.wave.t0) / 1000;
    gl.uniform3f(U.uWave, state.wave.x, state.wave.y, age > 4 ? -1 : age);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(frame);
  };
  const update = () => {
    const should = !dead && linked && visible && !doc.hidden && !root.classList.contains('overview');
    if (should && !running) { running = true; last = 0; raf = requestAnimationFrame(frame); }
    if (!should && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  };
  const io = new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; update(); });
  const ro = new ResizeObserver(() => { if (!root.classList.contains('overview')) resize(); });
  const mo = new MutationObserver(update);
  doc.addEventListener('visibilitychange', update, { signal: ac.signal });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); destroy(); }, { signal: ac.signal });

  // show it only once the program is ready, so the page never waits on the shader compiler
  const ready = new Promise((resolve) => {
    if (!parallel) { setTimeout(() => resolve(finishLink()), 0); return; }
    const poll = () => {
      if (dead) { resolve(false); return; }
      if (gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)) resolve(finishLink());
      else setTimeout(poll, 60);
    };
    poll();
  });
  ready.then((ok) => {
    if (!ok || dead) { destroy(); return; }
    resize();
    state.hx = home.x; state.hy = home.y;
    const bg = $('.hero__bg', hero);
    if (bg) bg.after(canvas); else hero.prepend(canvas);
    hero.classList.add('has-hole'); // the shader draws the dot grid itself (lensed)
    io.observe(hero);
    ro.observe(hero);
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
  });

  function destroy() {
    if (dead) return;
    dead = true;
    update();
    io.disconnect(); ro.disconnect(); mo.disconnect(); ac.abort();
    const i = themeHooks.indexOf(onTheme);
    if (i >= 0) themeHooks.splice(i, 1);
    hero.classList.remove('has-hole');
    canvas.remove();
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  }
  return { destroy };
}
