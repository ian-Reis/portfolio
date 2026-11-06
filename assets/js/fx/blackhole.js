/* An ASCII black hole in the hero, computed from scratch: no model, no textures, no images.
   Two passes on the GPU:
   1. physics at character resolution: one light ray per character cell (about 11k on a desktop
      instead of a million pixels) traced backwards through Schwarzschild spacetime (units of the
      Schwarzschild radius, photon orbit equation a = -1.5 h² r / |r|⁵). Crossing the accretion disk it
      picks up light coloured by temperature, shifted by Doppler beaming and gravitational redshift;
      escaping, it lands on a sky of dust, stars and a spiral of matter falling in, all bent by the lens.
   2. glyphs: each cell becomes a character from an atlas drawn with the site's own mono font.
      Brightness picks from " .:-=+*#%@"; along bright structures, strokes (- / | \) follow the light;
      stars are . + *, infalling matter · o, jets | !.

   What it does:
   - forms when the page opens and sends a gravitational wave through the sky and the title
   - click: drops a star; it orbits, is torn into an arc by tidal forces and flares at the photon ring
   - press and hold: feeds the hole; it grows and pulls the letters of the title towards it
     (spaghettification); on release they spring back, a wave goes out and jets fire from the poles
   - scroll: the camera falls towards the hole
   - the pointer tilts the view and works as a small lens of its own
   Reduced motion or software rendering: one still frame. Paused off screen, in hidden tabs and in the overview. */

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

/* pass 1: one ray per character cell; rgb = light (tone-mapped), a = what kind of cell it is */
const CELLS = `#version 300 es
precision highp float;
uniform vec2 uRes;        // grid size, cells
uniform vec2 uCellPx;     // cell size, CSS px
uniform vec2 uHole;       // hole on screen, CSS px from the top left of the hero
uniform float uPx;        // CSS px per unit of tan(angle)
uniform float uDist;      // camera distance (the scroll dive brings it closer)
uniform float uShadowPx;  // apparent shadow radius, CSS px
uniform float uIncl;      // camera height above the disk plane, radians
uniform float uTime;
uniform float uForm;      // 0 → 1 while the hole forms
uniform float uHeat;      // brightness of the disk (feeding raises it)
uniform float uJet;       // relativistic jets, 0 → 1
uniform float uFlash;     // photon ring flash
uniform vec2 uMouse;      // CSS px
uniform vec3 uWave;       // wave origin (CSS px) and age in seconds (< 0: none)
uniform vec4 uSpot[4];    // falling stars: radius, angle, arc length, brightness
out vec4 o;

const float RIN = 3.0;    // innermost stable orbit
const float ROUT = 12.0;
const float PLANE = 26.0; // the sky sits on a plane this far behind the hole
const float TAU = 6.2831853;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
vec2 rot(vec2 p, float a) { float c = cos(a); float s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }

// blackbody-like ramp: deep red, orange, gold, white, then blue-white for the hottest (Doppler-boosted) gas
vec3 bb(float t) {
  t = clamp(t, 0.0, 1.7);
  vec3 c = mix(vec3(0.42, 0.03, 0.0), vec3(1.0, 0.3, 0.03), smoothstep(0.0, 0.35, t));
  c = mix(c, vec3(1.0, 0.68, 0.28), smoothstep(0.3, 0.68, t));
  c = mix(c, vec3(1.0, 0.95, 0.86), smoothstep(0.62, 1.02, t));
  return mix(c, vec3(0.75, 0.86, 1.0), smoothstep(1.1, 1.7, t));
}

// gas texture: each radius turns at its own Keplerian speed; two layers that reset in turn keep it from winding up
float gas(vec2 xz, float r) {
  float om = 2.6 * pow(r, -1.5);
  float T = 36.0;
  float p1 = fract(uTime / T); float p2 = fract(uTime / T + 0.5);
  float n1 = fbm(rot(xz, -om * p1 * T) * 0.85);
  float n2 = fbm(rot(xz, -om * p2 * T) * 0.85 + 31.7);
  float n = mix(n2, n1, 1.0 - abs(2.0 * p1 - 1.0));
  return n * (0.7 + 0.3 * sin(r * 5.5 + n * 6.0)); // lanes
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) * uCellPx; // the centre of this cell, CSS px

  float ci = cos(uIncl); float si = sin(uIncl);
  vec3 cam = vec3(0.0, si, ci) * uDist;
  vec3 fwd = normalize(-cam);
  vec3 right = vec3(1.0, 0.0, 0.0);
  vec3 up = cross(right, fwd);

  vec2 s = (frag - uHole) / uPx; s.y = -s.y;
  vec3 dir = normalize(fwd + right * s.x + up * s.y);
  vec3 p = cam; vec3 v = dir;
  vec3 hv = cross(p, v); float h2 = dot(hv, hv); float b = sqrt(h2);

  vec3 em = vec3(0.0); float a = 0.0;
  float rmin = 1e9;
  bool captured = false;

  // weak field: one kick of 2/b radians at closest approach (also blends the edge of the marched zone)
  vec3 cA = cam + dir * dot(-cam, dir);
  float defl = 2.0 / max(b, 1.0);
  vec3 vA = normalize(dir * cos(defl) + normalize(-cA) * sin(defl));
  vec3 pA = cA;

  float near = 1.0 - smoothstep(14.5, 17.5, b);
  if (near > 0.0) {
    for (int i = 0; i < 190; i++) {
      float r2 = dot(p, p); float r = sqrt(r2);
      rmin = min(rmin, r);
      if (r < 1.0) { captured = true; break; }
      if (dot(p, fwd) > PLANE && dot(v, fwd) > 0.0) break;
      if (r > 40.0 && dot(p, v) > 0.0) break;
      float dt = clamp((r - 1.0) * 0.15, 0.03, 2.2);
      v += -1.5 * h2 * p / (r2 * r2 * r) * dt;
      vec3 np = p + v * dt;

      // a thin glowing atmosphere around the disk
      float rx = length(p.xz);
      float hz = exp(-abs(p.y) * 2.0) * smoothstep(ROUT + 4.0, RIN + 1.0, rx) * smoothstep(RIN * 0.7, RIN * 1.3, rx) * pow(RIN / max(rx, RIN), 1.4);
      em += (1.0 - a) * vec3(1.0, 0.55, 0.2) * hz * dt * 0.045 * uHeat * uForm;

      if (p.y * np.y < 0.0) {
        vec3 hit = mix(p, np, p.y / (p.y - np.y));
        float rr = length(hit.xz);
        if (rr > RIN * 0.92 && rr < ROUT) {
          float prof = pow(RIN / rr, 1.2) * smoothstep(RIN * 0.92, RIN + 0.8, rr) * smoothstep(ROUT, ROUT - 5.0, rr);
          float n = gas(hit.xz, rr);
          vec3 vel = normalize(vec3(-hit.z, 0.0, hit.x));
          float beta = sqrt(0.5 / rr);
          float gam = 1.0 / sqrt(1.0 - beta * beta);
          float dop = 1.0 / (gam * (1.0 - beta * dot(vel, -normalize(v))));
          float g = dop * sqrt(max(1.0 - 1.0 / rr, 0.0));
          float temp = pow(RIN / rr, 0.75) * (0.78 + 0.45 * n) * (0.8 + 0.3 * uHeat);
          float I = prof * (0.3 + 1.35 * n * n) * pow(g, 3.5) * 2.0 * uHeat;
          // falling stars, torn into arcs (longer behind than ahead)
          float phi = atan(hit.z, hit.x);
          for (int k = 0; k < 4; k++) {
            vec4 sp = uSpot[k];
            if (sp.w <= 0.0) continue;
            float dphi = mod(phi - sp.y + 3.14159265, TAU) - 3.14159265;
            float along = dphi * rr;
            float sig = along < 0.0 ? sp.z * 2.4 : sp.z;
            float rad = rr - sp.x;
            float spot = exp(-along * along / (2.0 * sig * sig) - rad * rad / 0.16) * sp.w;
            I += spot * pow(g, 3.0) * 3.0;
            temp = mix(temp, 1.3, clamp(spot, 0.0, 1.0));
          }
          float al = clamp(prof * (0.5 + n) * 1.6, 0.0, 1.0);
          em += (1.0 - a) * bb(temp * g) * I * uForm;
          a += (1.0 - a) * al * uForm;
        }
      }
      p = np;
      if (a > 0.985) break;
    }
    if (!captured && length(p) < 4.0 && dot(p, fwd) < PLANE) captured = true;
  }

  // the shadow: rays with an impact parameter below √27/2 fall in
  float bw = uDist / uPx * uCellPx.x * 0.5;
  float sa = 1.0 - smoothstep(2.598 - bw, 2.598 + bw, b);
  a += (1.0 - a) * sa;

  float kind = 0.0; // 0 light, 1 star, 2 infalling matter, 3 jet
  vec3 bg = vec3(0.0);
  if (!captured) {
    vec3 vE = near > 0.0 ? normalize(mix(vA, v, near)) : vA;
    vec3 pE = near > 0.0 ? mix(pA, p, near) : pA;

    // photon ring: rays that skimmed the photon sphere (r = 1.5); flares when a star falls in
    float ring = exp(-max(rmin - 1.5, 0.0) * 6.0) * near;
    em += (1.0 - a) * bb(1.0) * ring * (0.4 + 3.0 * uFlash) * uForm;

    float fw = dot(vE, fwd);
    if (fw > 0.02) {
      float t = (PLANE - dot(pE, fwd)) / fw;
      vec3 X = pE + vE * t;
      vec3 rel = X - cam;
      vec2 q = uHole + uPx * vec2(dot(rel, right), -dot(rel, up)) / dot(rel, fwd);
      // gravitational wave
      if (uWave.z >= 0.0) {
        vec2 dv = q - uWave.xy; float dd = length(dv);
        float R = uWave.z * 620.0;
        float k = exp(-pow((dd - R) / 90.0, 2.0)) * exp(-uWave.z * 0.7);
        q += (dv / max(dd, 1.0)) * sin((dd - R) * 0.08) * 22.0 * k;
      }
      // the pointer is a small lens of its own
      vec2 dm = q - uMouse;
      q -= dm * 900.0 / (dot(dm, dm) + 1400.0);

      // dust: warm and cool clouds, faint
      float neb = fbm(q * 0.0021 + vec2(11.3, 4.1));
      vec3 nebC = mix(vec3(0.24, 0.1, 0.04), vec3(0.06, 0.08, 0.15), fbm(q * 0.0012 + 3.7));
      bg += nebC * pow(neb, 3.0) * 1.1;

      // stars: at most one per block of 5 × 3 cells
      vec2 sg = uCellPx * vec2(5.0, 3.0);
      vec2 sc = floor(q / sg);
      float h1 = hash(sc + 0.37);
      if (h1 > 0.66) {
        vec2 sp = (sc + 0.15 + 0.7 * vec2(hash(sc + 3.1), hash(sc + 7.7))) * sg;
        vec2 d = abs(q - sp) / uCellPx;
        if (d.x < 0.5 && d.y < 0.5) {
          float tw = 0.55 + 0.45 * sin(uTime * (0.8 + h1) + h1 * 60.0);
          bg += mix(vec3(1.0, 0.82, 0.62), vec3(0.75, 0.85, 1.0), hash(sc + 1.9)) * (0.22 + 0.7 * (h1 - 0.66) / 0.34) * tw;
          kind = 1.0;
        }
      }

      // matter falling in: rings spaced in free-fall time, sliding along a fixed spiral, heating up
      vec2 dh = q - uHole;
      float dl = length(dh);
      float rho = dl / uShadowPx;
      if (rho > 1.3 && kind < 0.5) {
        float u = pow(rho, 1.5) * 1.6 + uTime * 0.55;
        float rid = floor(u);
        float th = atan(dh.y, dh.x) / TAU + 0.42 / sqrt(rho);
        float M = 40.0;
        float gc = th * M + hash(vec2(rid, 1.7)) * 7.0;
        float cell = floor(gc);
        float keep = step(0.8, hash(vec2(rid, cell))) * step(rho, 6.0);
        vec2 ctr = vec2(0.5 + (hash(vec2(cell, rid + 3.0)) - 0.5) * 0.5, 0.5 + (hash(vec2(rid, cell + 9.0)) - 0.5) * 0.6);
        float du = 2.4 * sqrt(rho) / uShadowPx;
        float dg = M / (TAU * max(dl, 1.0));
        float dd = length(vec2((fract(u) - ctr.x) / du, (fract(gc) - ctr.y) / dg)); // CSS px
        if (keep > 0.5 && dd < uCellPx.x * 0.75) {
          float heat = smoothstep(8.0, 1.6, rho);
          vec3 pc = mix(vec3(0.8, 0.76, 0.7), bb(0.45 + heat * 0.55), heat);
          bg += pc * (0.2 + heat * 0.9) * smoothstep(1.3, 2.2, rho) * uForm;
          kind = 2.0;
        }
      }
    }
  }

  // relativistic jets along the spin axis (after feeding): a straight-line march is enough this far out
  if (uJet > 0.002) {
    float jc = 0.0;
    float t0 = uDist - 30.0; float stepT = 60.0 / 48.0;
    for (int i = 0; i < 48; i++) {
      vec3 x = cam + dir * (t0 + (float(i) + 0.5) * stepT);
      float hgt = abs(x.y);
      float rx = length(x.xz);
      float w = 0.45 + hgt * 0.09;
      float d = exp(-rx * rx / (w * w)) * exp(-hgt / 15.0) * smoothstep(1.4, 3.5, hgt);
      d *= 0.55 + 0.45 * sin(hgt * 1.1 - uTime * 11.0); // knots travelling outwards
      d *= x.y > 0.0 ? 1.0 : 0.35;                     // the jet pointing away is dimmer (beaming)
      jc += d;
    }
    vec3 jet = vec3(0.55, 0.72, 1.0) * jc * stepT * 0.75 * uJet * (1.0 - sa);
    if (max(jet.b, 0.0) > 0.12) kind = 3.0;
    em += jet;
  }

  vec3 col = em + (1.0 - a) * bg;
  col = 1.0 - exp(-col * 1.35); // soft tone curve
  o = vec4(col, kind / 255.0);
}`;

/* pass 2: every pixel finds its cell and draws that cell's character from the atlas */
const GLYPHS = `#version 300 es
precision highp float;
uniform sampler2D uCells;
uniform sampler2D uAtlas;
uniform vec2 uRes;       // drawing buffer, px
uniform ivec2 uCell;     // cell size, drawing-buffer px
uniform ivec2 uGrid;     // cols, rows
uniform vec3 uPaper;
uniform float uTime;
uniform float uLight;    // 0 dark theme (light on space), 1 light theme (ink on paper)
out vec4 o;
// atlas: 0-9 " .:-=+*#%@" · 10-13 "|\\-/" · 14-16 ".+*" (stars) · 17-18 "·o" (infall) · 19-20 "|!" (jets)
float lum(vec3 c) { return max(c.r, max(c.g, c.b)); }
vec4 cellAt(ivec2 c) { return texelFetch(uCells, clamp(c, ivec2(0), uGrid - 1), 0); }
// brightness of a neighbour for the stroke direction; stars, grains and jets are not edges of the light
float edgeL(ivec2 c, float self) { vec4 n = cellAt(c); return n.a > 0.5 / 255.0 ? self : lum(n.rgb); }
void main() {
  ivec2 pix = ivec2(int(gl_FragCoord.x), int(uRes.y - gl_FragCoord.y));
  ivec2 cell = pix / uCell;
  ivec2 inCell = pix - cell * uCell;
  ivec2 ci = ivec2(cell.x, uGrid.y - 1 - cell.y);
  vec4 c = cellAt(ci);
  float L = lum(c.rgb);
  int kind = int(c.a * 255.0 + 0.5);
  int idx;
  if (kind == 1) idx = L > 0.55 ? 16 : (L > 0.3 ? 15 : 14);
  else if (kind == 2) idx = L > 0.75 ? 18 : 17;
  else if (kind == 3) idx = 19 + int(step(0.5, fract(float(cell.y) * 0.37 - uTime * 3.0)));
  else {
    idx = int(floor(clamp(pow(L, 0.75), 0.0, 0.999) * 10.0));
    // strokes along bright structures: the gradient of the light gives their direction
    float gx = edgeL(ci + ivec2(1, 0), L) - edgeL(ci - ivec2(1, 0), L);
    float gy = edgeL(ci + ivec2(0, 1), L) - edgeL(ci - ivec2(0, 1), L);
    if (length(vec2(gx, gy)) > 0.24 && L > 0.1 && L < 0.82) {
      float ang = mod(atan(gy, gx) + 3.14159265 / 8.0, 3.14159265);
      idx = 10 + int(ang / (3.14159265 / 4.0));
    }
  }
  if (idx == 0) { o = vec4(uPaper, 1.0); return; }
  float m = texelFetch(uAtlas, ivec2(idx * uCell.x + inCell.x, inCell.y), 0).a;
  vec3 hue = c.rgb / max(L, 0.001);
  float k = clamp(L * 1.25, 0.0, 1.0);
  vec3 glow = hue * (0.42 + 0.58 * k);                       // dark theme: brighter light, brighter character
  vec3 ink = pow(hue, vec3(1.7)) * (0.6 - 0.24 * k);          // light theme: brighter light, deeper ink
  o = vec4(mix(uPaper, mix(glow, ink, uLight), m), 1.0);
}`;

const ATLAS = [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@', '|', '\\', '-', '/', '.', '+', '*', '·', 'o', '|', '!'];

export function init(host) {
  const { doc, root, $, $$, themeHooks, langHooks, cssVar, t, finePointer } = host;
  const hero = $('.hero');
  if (!hero) return null;

  const canvas = doc.createElement('canvas');
  canvas.className = 'hero__ink hero__hole';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
  if (!gl) return null;
  // without a GPU (software rendering) animate nothing: one still frame, as under reduced motion
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  const software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
  const reduced = host.reduced || software;

  // compile without blocking the page: the driver works in the background and we poll until it is done
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const vs = sh(gl.VERTEX_SHADER, VERT);
  const make = (src) => {
    const fs = sh(gl.FRAGMENT_SHADER, src);
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    return { p, fs, U: {} };
  };
  const P1 = make(CELLS);
  const P2 = make(GLYPHS);
  let linked = false;
  const finishLink = () => {
    for (const P of [P1, P2]) {
      if (!gl.getProgramParameter(P.p, gl.LINK_STATUS)) {
        if (window.console) console.warn('[fx/blackhole]', gl.getShaderInfoLog(P.fs) || gl.getProgramInfoLog(P.p));
        return false;
      }
      const count = gl.getProgramParameter(P.p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < count; i += 1) { const u = gl.getActiveUniform(P.p, i); P.U[u.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(P.p, u.name); }
    }
    linked = true;
    return true;
  };
  gl.bindVertexArray(gl.createVertexArray());
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const texture = (filter) => {
    const tx = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tx;
  };
  const cellTex = texture(gl.NEAREST);
  const atlasTex = texture(gl.NEAREST);
  const fb = gl.createFramebuffer();

  /* ── the background, as the hero's own token ── */
  let paper = [0, 0, 0];
  let light = 0;
  const readPaper = () => {
    paper = (cssVar('--paper', hero).match(/[\da-f]{2}/gi) || ['07', '08', '0b']).slice(0, 3).map((h) => parseInt(h, 16) / 255);
    light = root.dataset.theme === 'dark' ? 0 : 1;
  };
  readPaper();

  /* ── grid, atlas and placement ── */
  let W = 0; let H = 0; let dpr = 1;
  let cellCss = [8, 15]; let cellBuf = [8, 15]; let cols = 1; let rows = 1;
  const home = { x: 0, y: 0 };
  let basePx = 900;
  const DIST0 = 22;
  const mono = getComputedStyle(root).getPropertyValue('--mono').trim() || 'monospace';
  const buildAtlas = () => {
    const fontPx = W < 600 ? 11 : 13;
    const m = doc.createElement('canvas').getContext('2d');
    m.font = `500 ${fontPx}px ${mono}`;
    const adv = m.measureText('M').width || fontPx * 0.6;
    cellBuf = [Math.max(4, Math.round(adv * dpr)), Math.max(8, Math.round(fontPx * 1.18 * dpr))];
    cellCss = [cellBuf[0] / dpr, cellBuf[1] / dpr];
    const a = doc.createElement('canvas');
    a.width = cellBuf[0] * ATLAS.length;
    a.height = cellBuf[1];
    const x = a.getContext('2d');
    x.fillStyle = '#fff';
    x.font = `500 ${fontPx * dpr}px ${mono}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    ATLAS.forEach((ch, i) => x.fillText(ch, (i + 0.5) * cellBuf[0], cellBuf[1] * 0.54));
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, a);
  };
  const resize = () => {
    W = hero.offsetWidth; H = hero.offsetHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    buildAtlas();
    cols = Math.ceil(canvas.width / cellBuf[0]);
    rows = Math.ceil(canvas.height / cellBuf[1]);
    gl.bindTexture(gl.TEXTURE_2D, cellTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, cellTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // big and high in the hero; the words sit below it on a dark floor
    const wide = W >= 1000;
    home.x = W * 0.5;
    home.y = H * (wide ? 0.33 : 0.27);
    const shadowPx = wide ? Math.min(H * 0.115, W * 0.08) : Math.min(W * 0.11, H * 0.06);
    basePx = shadowPx / (Math.sqrt(27) / 2 / DIST0);
    measureWords();
  };

  /* ── state ── */
  const st = {
    hx: 0, hy: 0, incl: 0.3, mass: 1, massV: 0, massTo: 1, mx: -9999, my: -9999, pmy: 0.5,
    form: reduced ? 1 : 0, heat: 1, jet: 0, flash: 0, hold: 0, holding: false, dive: 0,
    wave: { x: 0, y: 0, t0: -1 }, spots: [],
  };
  const t0 = performance.now();
  const now = () => performance.now();
  const emitWave = () => { if (reduced) return; st.wave = { x: st.hx, y: st.hy, t0: now() }; kickWords(); };

  /* ── the words of the hero: they feel the waves, the pull and the dive ── */
  let words = []; // { el, cx, cy, k, px, py, vx, vy }
  let wordsActive = false;
  function collectWords() {
    words = [
      ...$$('.hero__title .ch').filter((c) => c.textContent.trim()).map((el) => ({ el, k: 1 })),
      ...$$('.hero__side > *').map((el) => ({ el, k: 0.45 })),
    ].map((w) => ({ ...w, cx: 0, cy: 0, px: 0, py: 0, vx: 0, vy: 0 }));
    measureWords();
  }
  function measureWords() {
    if (!words.length || !W) return;
    const hr = hero.getBoundingClientRect();
    const k = hr.width / W || 1;
    words.forEach((w) => {
      const prev = w.el.style.transform;
      w.el.style.transform = '';
      const r = w.el.getBoundingClientRect();
      w.cx = (r.left + r.width / 2 - hr.left) / k;
      w.cy = (r.top + r.height / 2 - hr.top) / k;
      w.el.style.transform = prev;
    });
  }
  function kickWords() { wordsActive = true; }
  const wordsTick = (dt, tnow) => {
    if (reduced || !words.length) return;
    const age = st.wave.t0 < 0 ? 99 : (tnow - st.wave.t0) / 1000;
    const waving = age < 3.5;
    const pullAll = st.hold * 0.95 + st.dive * 0.55;
    if (!wordsActive && !waving && pullAll < 0.001) return;
    let moving = waving || pullAll > 0.001;
    words.forEach((w) => {
      const dx = st.hx - w.cx; const dy = st.hy - w.cy;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d; const uy = dy / d;
      // pull towards the hole, stronger for what is closer
      const pull = pullAll * Math.max(0.2, 1 - d / 1500) * w.k;
      const reach = Math.min(d * 0.42, 190) * pull;
      const tx = ux * reach; const ty = uy * reach;
      // a spring, so letters overshoot when they are let go
      w.vx += ((tx - w.px) * 90 - w.vx * 11) * dt;
      w.vy += ((ty - w.py) * 90 - w.vy * 11) * dt;
      w.px += w.vx * dt; w.py += w.vy * dt;
      if (Math.abs(w.vx) + Math.abs(w.vy) > 0.5 || Math.abs(w.px - tx) + Math.abs(w.py - ty) > 0.3) moving = true;
      // the wave passing through, the same packet as in the shader
      let ox = 0; let oy = 0;
      if (waving) {
        const R = age * 620;
        const kk = Math.exp(-(((d - R) / 90) ** 2)) * Math.exp(-age * 0.7);
        const amp = Math.sin((d - R) * 0.08) * 14 * kk * (0.6 + 0.4 * w.k);
        ox = -ux * amp; oy = -uy * amp;
      }
      const stretch = Math.max(0, Math.hypot(w.px, w.py) / 190) * 1.1 * w.k;
      const ang = Math.atan2(uy, ux) * 57.29578;
      w.el.style.transform = `translate(${(w.px + ox).toFixed(2)}px, ${(w.py + oy).toFixed(2)}px)`
        + (stretch > 0.01 ? ` rotate(${ang.toFixed(1)}deg) scale(${(1 + stretch).toFixed(3)}, ${(1 - stretch * 0.38).toFixed(3)}) rotate(${(-ang).toFixed(1)}deg)` : '');
      w.el.style.opacity = st.dive > 0.01 ? String(Math.max(0.15, 1 - st.dive * 0.9 * w.k)) : '';
    });
    if (!moving) {
      wordsActive = false;
      words.forEach((w) => { w.el.style.transform = ''; w.el.style.opacity = ''; w.px = 0; w.py = 0; w.vx = 0; w.vy = 0; });
    } else wordsActive = true;
  };
  const onLang = () => setTimeout(() => { if (!dead) collectWords(); }, 950);
  langHooks.push(onLang);

  /* ── a discreet hint, until the first time someone plays with it ── */
  const hint = doc.createElement('p');
  hint.className = 'hole__hint';
  hint.setAttribute('aria-hidden', 'true');
  const hintText = () => { hint.textContent = t(finePointer ? 'hole.hint' : 'hole.hintTouch'); };
  hintText();
  let hintSeen = false;
  try { hintSeen = localStorage.getItem('ir:hole') === '1'; } catch (e) { /* private mode */ }
  const dismissHint = () => {
    if (hintSeen) return;
    hintSeen = true;
    hint.classList.remove('is-on');
    try { localStorage.setItem('ir:hole', '1'); } catch (e) { /* private mode */ }
  };
  langHooks.push(hintText);

  /* ── input ── */
  const ac = new AbortController();
  let press = null;
  let holdTimer = 0;
  const local = (e) => { const r = hero.getBoundingClientRect(); const k = r.width / W || 1; return [(e.clientX - r.left) / k, (e.clientY - r.top) / k]; };
  hero.addEventListener('pointermove', (e) => {
    if (reduced) return;
    const [x, y] = local(e);
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') { st.mx = x; st.my = y; st.pmy = y / H; }
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8 && !st.holding) press = null; // a scroll or a drag
  }, { signal: ac.signal });
  hero.addEventListener('pointerleave', () => { st.mx = -9999; st.my = -9999; st.pmy = 0.5; }, { signal: ac.signal });

  // short press: drop a star; long press: feed
  hero.addEventListener('pointerdown', (e) => {
    if (reduced || e.button !== 0 || e.target.closest('a, button, input, .hero__lead, .status')) return;
    press = { x: e.clientX, y: e.clientY, t: now() };
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      if (!press) return;
      st.holding = true; st.massTo = 1.38;
      measureWords(); kickWords(); dismissHint();
    }, 230);
  }, { signal: ac.signal });
  const release = () => {
    clearTimeout(holdTimer);
    if (st.holding) {
      st.holding = false; st.massTo = 1;
      st.jet = Math.max(st.jet, 0.4 + st.hold * 0.6); // fed → it fires
      st.flash = Math.max(st.flash, 0.6);
      emitWave();
    } else if (press && now() - press.t < 400) {
      dropStar(); dismissHint();
    }
    press = null;
  };
  window.addEventListener('pointerup', release, { signal: ac.signal });
  window.addEventListener('pointercancel', () => { press = null; release(); }, { signal: ac.signal });

  function dropStar() {
    if (st.spots.length >= 4) st.spots.shift();
    // enters on the near side, a little ahead of the front, so it is seen orbiting before it sinks
    st.spots.push({ r0: 7 + Math.random() * 4, phi0: 0.4 + Math.random() * 1.1, t0: now() });
  }

  const onTheme = () => { readPaper(); st.flash = 1; emitWave(); if (reduced) still(); };
  themeHooks.push(onTheme);

  /* ── loop ── */
  let running = false; let visible = false; let raf = 0; let dead = false; let last = 0;
  let formT0 = 0;
  const spotData = new Float32Array(16);
  const frame = (tnow) => {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (tnow - (last || tnow)) / 1000);
    last = tnow;

    if (!reduced) {
      // forming: the hole grows out of nothing, then rings
      if (st.form < 1) {
        const before = st.form;
        st.form = Math.min(1, (tnow - formT0) / 2600);
        if (before < 1 && st.form >= 1) { emitWave(); if (!hintSeen) hint.classList.add('is-on'); }
      }
      const tx = home.x + (st.mx > -999 ? (st.mx - home.x) * 0.04 : 0);
      const ty = home.y + (st.my > -999 ? (st.my - home.y) * 0.03 : 0);
      st.hx += (tx - st.hx) * Math.min(1, dt * 2.2);
      st.hy += (ty - st.hy) * Math.min(1, dt * 2.2);
      st.incl += ((0.3 + (st.pmy - 0.5) * 0.18 - st.dive * 0.14) - st.incl) * Math.min(1, dt * 2.5);
      st.massV += ((st.massTo - st.mass) * 40 - st.massV * 9) * dt;
      st.mass += st.massV * dt;
      st.hold += ((st.holding ? 1 : 0) - st.hold) * Math.min(1, dt * (st.holding ? 1.2 : 4));
      st.heat = 1 + st.hold * 0.9 + st.jet * 0.3;
      st.jet = Math.max(0, st.jet - dt * 0.32);
      st.flash = Math.max(0, st.flash - dt * 1.4);
      // the camera falls in as the hero scrolls away
      const hr = hero.getBoundingClientRect();
      st.dive = Math.min(1, Math.max(0, -hr.top / Math.max(1, hr.height)));
    } else {
      st.hx = home.x; st.hy = home.y;
    }

    // falling stars: sink faster and faster, turn faster as they sink, get torn longer
    spotData.fill(0);
    st.spots = st.spots.filter((sp, i) => {
      const age = (tnow - sp.t0) / 1000;
      const r = sp.r0 - age * 0.32 - age * age * 0.07;
      if (r < 3) { st.flash = Math.max(st.flash, 1); return false; }
      sp.phi = sp.phi0 + 6.0 * age * Math.pow((sp.r0 + r) / 2, -1.5);
      spotData.set([r, sp.phi, 0.35 + age * 0.55, Math.min(1, age * 3) * (0.6 + 0.4 * Math.min(1, (r - 3) * 2))], i * 4);
      return true;
    });

    const ease = 1 - (1 - st.form) ** 3;
    const dist = DIST0 - st.dive * 9;
    const px = basePx * st.mass * (0.12 + 0.88 * ease);
    const shadowPx = (Math.sqrt(27) / 2 / dist) * px;
    const time = reduced ? 14 : (tnow - t0) / 1000;

    // pass 1: the physics, one ray per character cell
    let U = P1.U;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.viewport(0, 0, cols, rows);
    gl.useProgram(P1.p);
    gl.uniform2f(U.uRes, cols, rows);
    gl.uniform2f(U.uCellPx, cellCss[0], cellCss[1]);
    gl.uniform2f(U.uHole, st.hx, st.hy);
    gl.uniform1f(U.uPx, px);
    gl.uniform1f(U.uDist, dist);
    gl.uniform1f(U.uShadowPx, shadowPx);
    gl.uniform1f(U.uIncl, st.incl);
    gl.uniform1f(U.uTime, time);
    gl.uniform1f(U.uForm, st.form);
    gl.uniform1f(U.uHeat, st.heat);
    gl.uniform1f(U.uJet, st.jet);
    gl.uniform1f(U.uFlash, st.flash);
    gl.uniform2f(U.uMouse, st.mx, st.my);
    const wage = st.wave.t0 < 0 ? -1 : (tnow - st.wave.t0) / 1000;
    gl.uniform3f(U.uWave, st.wave.x, st.wave.y, wage > 5 ? -1 : wage);
    gl.uniform4fv(U.uSpot, spotData);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // pass 2: characters
    U = P2.U;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(P2.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, cellTex); gl.uniform1i(U.uCells, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, atlasTex); gl.uniform1i(U.uAtlas, 1);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform2i(U.uCell, cellBuf[0], cellBuf[1]);
    gl.uniform2i(U.uGrid, cols, rows);
    gl.uniform3fv(U.uPaper, paper);
    gl.uniform1f(U.uTime, time);
    gl.uniform1f(U.uLight, light);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    wordsTick(dt, tnow);

    if (reduced) { running = false; return; } // one frame is enough
    raf = requestAnimationFrame(frame);
  };
  function still() {
    if (!reduced || dead || !linked) return;
    update();
  }
  const update = () => {
    const should = !dead && linked && visible && !doc.hidden && !root.classList.contains('overview');
    if (should && !running) { running = true; last = 0; raf = requestAnimationFrame(frame); }
    if (!should && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  };
  const io = new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; update(); });
  const ro = new ResizeObserver(() => { if (!root.classList.contains('overview')) { resize(); still(); } });
  const mo = new MutationObserver(update);
  doc.addEventListener('visibilitychange', update, { signal: ac.signal });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); destroy(); }, { signal: ac.signal });

  // show it only once the programs are ready and the mono font is in, so the page never waits
  const compiled = new Promise((resolve) => {
    if (!parallel) { setTimeout(() => resolve(finishLink()), 0); return; }
    const poll = () => {
      if (dead) { resolve(false); return; }
      const done = [P1, P2].every((P) => gl.getProgramParameter(P.p, parallel.COMPLETION_STATUS_KHR));
      if (done) resolve(finishLink()); else setTimeout(poll, 60);
    };
    poll();
  });
  const fontReady = doc.fonts && doc.fonts.load ? doc.fonts.load(`500 13px ${mono}`).catch(() => null) : Promise.resolve();
  Promise.all([compiled, fontReady]).then(([ok]) => {
    if (!ok || dead) { destroy(); return; }
    const bg = $('.hero__bg', hero);
    if (bg) bg.after(canvas); else hero.prepend(canvas);
    hero.appendChild(hint);
    hero.classList.add('has-hole');
    // the entrance of the title is over: the letters may now leave their lines (pulled by the hole)
    setTimeout(() => { hero.classList.add('is-free'); collectWords(); resize(); }, Math.max(0, 1700 - performance.now()));
    resize();
    collectWords();
    st.hx = home.x; st.hy = home.y;
    formT0 = now();
    io.observe(hero);
    ro.observe(hero);
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
  });

  function destroy() {
    if (dead) return;
    dead = true;
    update();
    clearTimeout(holdTimer);
    io.disconnect(); ro.disconnect(); mo.disconnect(); ac.abort();
    [[themeHooks, onTheme], [langHooks, onLang], [langHooks, hintText]].forEach(([list, fn]) => { const i = list.indexOf(fn); if (i >= 0) list.splice(i, 1); });
    words.forEach((w) => { w.el.style.transform = ''; w.el.style.opacity = ''; });
    hero.classList.remove('has-hole', 'is-free');
    canvas.remove();
    hint.remove();
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  }
  return { destroy };
}
