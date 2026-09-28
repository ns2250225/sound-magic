'use strict';
// 渲染核心：低分辨率画布 + 像素绘制原语 + 粒子 / 特效 / 计时器 / 魔法阵
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');
let G = ctx; // 当前绘制目标（构建背景时临时切换）
let W = 168, H = 320, S = 1, portrait = true, groundY = 210;

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t;
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

// 元素色板（亮 → 暗）
const COL = {
  fire:    ['#ffffff', '#fff3a0', '#ffd23f', '#ff9a1f', '#ff5a1a', '#c42a1a', '#5a1a1a'],
  smoke:   ['#7a6a80', '#5a4f66', '#40384d', '#2a2436'],
  ice:     ['#ffffff', '#e0f8ff', '#a8eaff', '#5cc2f2', '#2f7fd0'],
  elec:    ['#ffffff', '#e8fdff', '#8ff4ff', '#3fb8ff', '#6a4bff'],
  arc:     ['#ffffff', '#ffd6ff', '#ff85f2', '#c04bff', '#6a2bd0'],
  void:    ['#ffffff', '#e6c2ff', '#a65bff', '#6a1fd0', '#2e0b66'],
  holy:    ['#ffffff', '#fffbd6', '#ffe680', '#ffc83f', '#e0901f'],
  wind:    ['#ffffff', '#dcfff0', '#8affc8', '#3fd6a0', '#1f8f70'],
  missile: ['#ffffff', '#d6ecff', '#8abaff', '#4a6aff', '#2a2ab0'],
  azure:   ['#ffffff', '#ccfff9', '#6ff0e8', '#2fc0d8', '#1f6ab0'],
  rock:    ['#8a6a50', '#6a4a36', '#4a3226'],
  star:    ['#ffffff', '#fff6c0', '#ffd6ff', '#b0a0ff', '#6a5aff'],
};

// ---------- 像素原语 ----------
function rect(x, y, w, h, c) { G.fillStyle = c; G.fillRect(Math.round(x), Math.round(y), w, h); }

function line(x0, y0, x1, y1, c, w = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  G.fillStyle = c;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  const o = (w - 1) >> 1;
  let err = dx + dy, guard = 0;
  while (guard++ < 3000) {
    G.fillRect(x0 - o, y0 - o, w, w);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

function ringPts(cx, cy, rx, ry, c, a0 = 0, every = 1) {
  if (rx < 0.5 && ry < 0.5) return;
  G.fillStyle = c;
  const n = Math.max(8, Math.ceil(TAU * Math.max(rx, ry) * 1.25));
  for (let i = 0; i < n; i += every) {
    const a = a0 + (i / n) * TAU;
    G.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1);
  }
}

function disc(cx, cy, r, c) {
  G.fillStyle = c;
  cx = Math.round(cx); cy = Math.round(cy);
  if (r < 0.8) { G.fillRect(cx, cy, 1, 1); return; }
  const R = Math.ceil(r);
  for (let y = -R; y <= R; y++) {
    const q = r * r - y * y;
    if (q < 0) continue;
    const hw = Math.floor(Math.sqrt(q));
    G.fillRect(cx - hw, cy + y, hw * 2 + 1, 1);
  }
}

function shadow(cx, y, rx) {
  G.globalAlpha = 0.35; G.fillStyle = '#000';
  const ry = Math.max(1, rx * 0.25);
  for (let yy = -Math.ceil(ry); yy <= Math.ceil(ry); yy++) {
    const q = 1 - (yy / (ry + 0.5)) ** 2;
    if (q <= 0) continue;
    const hw = Math.round(rx * Math.sqrt(q));
    G.fillRect(Math.round(cx - hw), y + yy, hw * 2, 1);
  }
  G.globalAlpha = 1;
}

// 预渲染径向光晕贴图，最近邻放大后呈现像素化的色阶光晕
const glowCache = {};
function glowTex(h) {
  let c = glowCache[h];
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'), [r, gg, b] = hexRgb(h);
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, `rgba(${r},${gg},${b},1)`);
  gr.addColorStop(0.35, `rgba(${r},${gg},${b},0.45)`);
  gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return (glowCache[h] = c);
}
function glow(x, y, r, h, a = 1, sy = 1) {
  if (r < 1 || a <= 0) return;
  G.globalCompositeOperation = 'lighter';
  G.globalAlpha = Math.min(1, a);
  G.drawImage(glowTex(h), Math.round(x - r), Math.round(y - r * sy), Math.round(r * 2), Math.round(r * 2 * sy));
  G.globalAlpha = 1;
  G.globalCompositeOperation = 'source-over';
}

// ---------- 闪电 ----------
function boltPath(x0, y0, x1, y1, jit = 6, seg = 7) {
  const pts = [[x0, y0]];
  const d = Math.hypot(x1 - x0, y1 - y0) || 1;
  const n = Math.max(2, Math.ceil(d / seg));
  const nx = -(y1 - y0) / d, ny = (x1 - x0) / d;
  for (let i = 1; i < n; i++) {
    const t = i / n, off = rand(-jit, jit);
    pts.push([lerp(x0, x1, t) + nx * off, lerp(y0, y1, t) + ny * off]);
  }
  pts.push([x1, y1]);
  return pts;
}
function drawBolt(pts, cols, w) {
  G.globalCompositeOperation = 'lighter';
  for (let i = 0; i < pts.length - 1; i++) line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], cols[4], w + 2);
  for (let i = 0; i < pts.length - 1; i++) line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], cols[2], w);
  for (let i = 0; i < pts.length - 1; i++) line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#ffffff', 1);
  G.globalCompositeOperation = 'source-over';
}

// ---------- 粒子 ----------
const parts = [];
const MAXP = 2800;
function spawn(p) {
  if (parts.length >= MAXP) return null;
  p.t = 0;
  parts.push(p);
  return p;
}
function burst(x, y, n, cols, o = {}) {
  const [s0, s1] = o.spd || [30, 120], [l0, l1] = o.life || [0.3, 0.8], [z0, z1] = o.size || [1, 3];
  const r = o.r || 0;
  for (let i = 0; i < n; i++) {
    const a = o.ang !== undefined ? o.ang + rand(-o.spread, o.spread) : rand(0, TAU);
    const sp = rand(s0, s1);
    spawn({
      x: x + rand(-r, r), y: y + rand(-r, r),
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * (o.sy || 1) + (o.vy || 0),
      life: rand(l0, l1), size: randi(z0, z1), cols,
      grav: o.grav || 0, drag: o.drag ?? 2, add: o.add ?? true,
      type: o.type, ground: o.ground, shrink: o.shrink,
    });
  }
}
function updateParticles(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.t += dt;
    if (p.t >= p.life) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
    if (p.attr) {
      const dx = p.attr.x - p.x, dy = p.attr.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d < 3) { p.t = p.life; continue; }
      p.vx += (dx / d) * p.attr.k * dt; p.vy += (dy / d) * p.attr.k * dt;
    }
    if (p.drag) { const f = Math.max(0, 1 - p.drag * dt); p.vx *= f; p.vy *= f; }
    p.vy += (p.grav || 0) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.ground && p.y > groundY) { p.y = groundY; p.vy *= -0.35; p.vx *= 0.6; }
  }
}
function drawParticles() {
  for (let pass = 0; pass < 2; pass++) {
    G.globalCompositeOperation = pass ? 'lighter' : 'source-over';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (!p.add !== !pass) continue;
      const k = p.t / p.life;
      const c = p.cols[Math.min(p.cols.length - 1, (k * p.cols.length) | 0)];
      if (p.type === 'streak') {
        const L = p.len || 0.04;
        line(p.x, p.y, p.x - p.vx * L, p.y - p.vy * L, c);
        continue;
      }
      const s = p.shrink === false ? p.size : Math.max(1, Math.round(p.size * (1 - k * 0.8)));
      G.fillStyle = c;
      G.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    }
  }
  G.globalCompositeOperation = 'source-over';
}

// ---------- 特效实体 & 计时器 ----------
// 实体：{ layer: 0 在角色后 / 1 在角色前, dur?, update(dt) 返回 false 结束, draw() }
const fx = [];
function addFx(e) { e.t = 0; if (e.layer === undefined) e.layer = 1; fx.push(e); return e; }
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const e = fx[i];
    e.t += dt;
    const alive = e.update ? e.update(dt) !== false : true;
    if (!alive || (e.dur && e.t >= e.dur)) fx.splice(i, 1);
  }
}
function drawFx(layer) {
  for (let i = 0; i < fx.length; i++) if (fx[i].layer === layer && fx[i].draw) fx[i].draw();
  G.globalAlpha = 1; G.globalCompositeOperation = 'source-over';
}

const timers = [];
function after(t, fn) { timers.push({ t, fn }); }
function updateTimers(dt) {
  for (let i = timers.length - 1; i >= 0; i--) {
    const tm = timers[i];
    tm.t -= dt;
    if (tm.t <= 0) { timers.splice(i, 1); tm.fn(); }
  }
}

// ---------- 屏幕效果 ----------
const screen = { shake: 0, flash: 0, flashCol: '#ffffff', dark: 0, darkReq: [], hitstop: 0 };
function shake(a) { screen.shake = Math.max(screen.shake, a); }
function flash(a, c = '#ffffff') { if (a >= screen.flash * 0.7) { screen.flash = Math.max(a, screen.flash); screen.flashCol = c; } }
function darken(a, dur) { screen.darkReq.push({ a, t: dur }); }
function hitstop(t) { screen.hitstop = Math.max(screen.hitstop, t); }
function updateScreen(dt) {
  screen.shake = Math.max(0, screen.shake * Math.exp(-dt * 6) - dt * 4);
  screen.flash = Math.max(0, screen.flash - dt * 3);
  let target = 0;
  for (let i = screen.darkReq.length - 1; i >= 0; i--) {
    const r = screen.darkReq[i];
    r.t -= dt;
    if (r.t <= 0) screen.darkReq.splice(i, 1); else target = Math.max(target, r.a);
  }
  screen.dark = lerp(screen.dark, target, Math.min(1, dt * 5));
}

// ---------- 通用特效 ----------
function addRing(x, y, r1, col, dur = 0.45, sy = 1, col2) {
  addFx({ layer: 1, dur, draw() {
    const k = this.t / dur, r = r1 * easeOut(k);
    G.globalAlpha = 1 - k; G.globalCompositeOperation = 'lighter';
    ringPts(x, y, r, r * sy, col);
    ringPts(x, y, Math.max(0, r - 1), Math.max(0, r - 1) * sy, col2 || col);
    G.globalAlpha = 1; G.globalCompositeOperation = 'source-over';
  } });
}
function addFlashGlow(x, y, r, col, dur = 0.3) {
  addFx({ layer: 1, dur, draw() { const k = this.t / dur; glow(x, y, r * (0.6 + 0.4 * k), col, 1 - k); } });
}
function addScorch(x, y, rx) {
  const dur = 4;
  addFx({ layer: 0, dur, draw() {
    const k = this.t / dur, ry = Math.max(1, rx * 0.22);
    G.globalAlpha = 0.6 * (1 - k); G.fillStyle = '#120806';
    for (let yy = -Math.ceil(ry); yy <= Math.ceil(ry); yy++) {
      const q = 1 - (yy / (ry + 0.5)) ** 2;
      if (q <= 0) continue;
      const hw = Math.round(rx * Math.sqrt(q));
      G.fillRect(Math.round(x - hw), y + yy, hw * 2, 1);
    }
    G.globalAlpha = 1;
    if (k < 0.4) glow(x, y, rx * 0.8, '#ff5a1a', (0.4 - k) * 1.5, 0.3);
  } });
}

// ---------- 魔法阵 ----------
const RUNES = ['010111010', '101010101', '111101111', '110010011', '011110010', '100111001', '111010010', '010101111', '101111101', '001111100'];
function glyph(x, y, g, c) {
  G.fillStyle = c;
  x = Math.round(x) - 1; y = Math.round(y) - 1;
  for (let i = 0; i < 9; i++) if (g[i] === '1') G.fillRect(x + (i % 3), y + ((i / 3) | 0), 1, 1);
}
// o: { x, y, r, rot, sx, sy, col, col2, alpha, sides, seed }  sx/sy 用于压扁成地面椭圆或侧向竖圆
function magicCircle(o) {
  const { x, y, r, rot, sx, sy, col, col2, alpha } = o;
  if (r < 1.5 || alpha <= 0) return;
  glow(x, y, r * 1.7 * sx, col, 0.6 * alpha, sy / sx);
  G.globalCompositeOperation = 'lighter';
  G.globalAlpha = alpha;
  const P = (u, v) => [x + u * sx, y + v * sy];

  ringPts(x, y, r * sx, r * sy, col);
  ringPts(x, y, (r - 1) * sx, (r - 1) * sy, col2, rot, 2);
  ringPts(x, y, r * 0.72 * sx, r * 0.72 * sy, col2);
  ringPts(x, y, r * 0.42 * sx, r * 0.42 * sy, col, -rot * 2, 2);
  ringPts(x, y, (r + 2.5) * sx, (r + 2.5) * sy, col2, rot * 0.5, 4);

  // 星芒多边形
  const n = o.sides || 6, k = n >= 7 ? 3 : 2, R1 = r * 0.72, R2 = r * 0.42;
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i / n) * TAU, a1 = rot + (((i + k) % n) / n) * TAU;
    const [x0, y0] = P(Math.cos(a0) * R1, Math.sin(a0) * R1);
    const [x1, y1] = P(Math.cos(a1) * R1, Math.sin(a1) * R1);
    line(x0, y0, x1, y1, col);
  }
  // 反向旋转的内多边形
  for (let i = 0; i < n; i++) {
    const a0 = -rot * 1.6 + (i / n) * TAU, a1 = -rot * 1.6 + ((i + 1) / n) * TAU;
    const [x0, y0] = P(Math.cos(a0) * R2, Math.sin(a0) * R2);
    const [x1, y1] = P(Math.cos(a1) * R2, Math.sin(a1) * R2);
    line(x0, y0, x1, y1, col2);
  }
  // 符文带
  const flat = Math.min(sx, sy) < 0.6 || r < 12;
  const m = Math.max(6, Math.floor((TAU * r * 0.86) / 5));
  for (let i = 0; i < m; i++) {
    const a = -rot * 0.6 + (i / m) * TAU;
    const [gx, gy] = P(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86);
    if (flat) {
      G.fillStyle = i % 2 ? col : col2;
      G.fillRect(Math.round(gx), Math.round(gy), 1, 1);
      if (i % 3 === 0) G.fillRect(Math.round(gx) + 1, Math.round(gy), 1, 1);
    } else glyph(gx, gy, RUNES[(i * 7 + (o.seed || 0)) % RUNES.length], col2);
  }
  // 圆心
  if (!flat) glyph(x, y, RUNES[(o.seed || 0) % RUNES.length], '#ffffff');
  else rect(x, y, 1, 1, '#ffffff');

  G.globalAlpha = 1; G.globalCompositeOperation = 'source-over';
}

function addCircle(o) {
  o.seed = randi(0, 9);
  if (o.spin === undefined) o.spin = 3;
  if (o.sx === undefined) o.sx = 1;
  if (o.sy === undefined) o.sy = 1;
  return addFx({
    layer: o.layer ?? 0, dur: o.dur,
    update() {
      // 魔法阵上飘散的光点
      if (Math.random() < 0.7 * (o.r / 20)) {
        const a = rand(0, TAU), rr = rand(0.3, 1) * o.r;
        const flatGround = o.sy < 0.6;
        spawn({
          x: o.x + Math.cos(a) * rr * o.sx, y: o.y + Math.sin(a) * rr * o.sy,
          vx: flatGround ? rand(-4, 4) : rand(10, 30), vy: flatGround ? rand(-40, -15) : rand(-8, 8),
          life: rand(0.4, 0.8), size: 1, cols: ['#ffffff', o.col2, o.col], add: true,
        });
      }
    },
    draw() {
      const t = this.t, k = t / o.dur;
      const g = easeOutBack(Math.min(1, t / 0.28));
      const fade = k > 0.72 ? 1 - (k - 0.72) / 0.28 : 1;
      magicCircle({ ...o, r: o.r * g, rot: t * o.spin, alpha: fade });
    },
  });
}

// ---------- 像素数字字体 ----------
const FONT = {
  '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'],
  '!': ['1', '1', '1', '0', '1'],
};
function textWidth(str) {
  let w = 0;
  for (const ch of str) w += (FONT[ch] ? FONT[ch][0].length : 3) + 1;
  return w - 1;
}
function drawText(str, x, y, sc, col, outline = '#1a0a1a') {
  const x0 = Math.round(x - (textWidth(str) * sc) / 2);
  y = Math.round(y);
  for (let pass = 0; pass < 2; pass++) {
    G.fillStyle = pass ? col : outline;
    let px = x0;
    for (const ch of str) {
      const gl = FONT[ch];
      if (!gl) { px += 4 * sc; continue; }
      for (let r = 0; r < 5; r++) for (let c = 0; c < gl[r].length; c++) {
        if (gl[r][c] !== '1') continue;
        if (pass) G.fillRect(px + c * sc, y + r * sc, sc, sc);
        else G.fillRect(px + c * sc - 1, y + r * sc - 1, sc + 2, sc + 2);
      }
      px += (gl[0].length + 1) * sc;
    }
  }
}
