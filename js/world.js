'use strict';
// 场景：背景、魔法师、稻草人、伤害数字、环境粒子
const bg = document.createElement('canvas');
let stars = [], worldT = 0;

const mage = { x: 0, y: 0, cast: 0, pose: 0, recoil: 0, gem: '#8ff4ff', blink: 0, blinkCd: 3 };
const dummy = {
  baseX: 0, a: 0, v: 0, flash: 0, lift: 0, liftTarget: 0, jit: 0, cx: 0, cy: 0,
  status: { burn: 0, freeze: 0, shock: 0, arcane: 0, void: 0 },
};
const nums = [];
const stats = { total: 0, casts: 0, maxHit: 0 };

// ---------- 背景 ----------
function buildBg() {
  bg.width = W; bg.height = H;
  const b = bg.getContext('2d');
  b.imageSmoothingEnabled = false;
  const prev = G; G = b;

  // 夜空（Bayer 抖动渐变）
  const sky = ['#06051a', '#0b0a26', '#120f33', '#1a1442', '#241a52', '#321f60', '#452566', '#5c2c6a', '#76366a'].map(hexRgb);
  let img = b.createImageData(W, groundY), d = img.data;
  for (let y = 0; y < groundY; y++) {
    const f = Math.pow(y / groundY, 1.6) * (sky.length - 1), i0 = Math.floor(f), fr = f - i0;
    for (let x = 0; x < W; x++) {
      const c = sky[Math.min(sky.length - 1, fr > BAYER[(y & 3) * 4 + (x & 3)] / 16 ? i0 + 1 : i0)];
      const p = (y * W + x) * 4;
      d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255;
    }
  }
  b.putImageData(img, 0, 0);

  // 月亮
  const mx = Math.round(portrait ? W * 0.76 : W * 0.82), my = Math.round(portrait ? groundY * 0.2 : groundY * 0.24);
  glow(mx, my, 40, '#5a4aa0', 0.55);
  glow(mx, my, 20, '#c8c0ff', 0.35);
  disc(mx, my, 10, '#f3edd2');
  disc(mx + 3, my - 3, 3, '#e9e0bd');
  [[3, -2, 2], [-4, 3, 1.5], [-1, -5, 1], [4, 4, 1], [-5, -2, 1]].forEach(([ox, oy, r]) => disc(mx + ox, my + oy, r, '#d9cfa9'));

  // 远山
  const far = x => groundY - 30 - (Math.sin(x * 0.045 + 1.7) * 10 + Math.sin(x * 0.11 + 2) * 5 + Math.sin(x * 0.019) * 9);
  for (let x = 0; x < W; x++) {
    const h = Math.round(far(x));
    b.fillStyle = '#251c48'; b.fillRect(x, h, 1, groundY - h);
    b.fillStyle = '#3a2c66'; b.fillRect(x, h, 1, 1);
  }
  // 远处的法师塔
  const tx = Math.round(W * 0.5), tTop = Math.round(far(tx)) - 26;
  b.fillStyle = '#1c1538'; b.fillRect(tx - 3, tTop, 7, 30);
  for (let i = 0; i < 9; i++) b.fillRect(tx - Math.floor(i / 2) - 1, tTop - 9 + i, Math.floor(i / 2) * 2 + 3, 1);
  b.fillRect(tx - 5, tTop, 11, 2);
  b.fillStyle = '#ffcf6a'; b.fillRect(tx, tTop + 6, 1, 2); b.fillRect(tx - 1, tTop + 14, 1, 2);
  glow(tx, tTop + 7, 6, '#ffcf6a', 0.5);
  b.fillStyle = '#ff6ff0'; b.fillRect(tx, tTop - 11, 1, 1);

  // 近丘 + 松树
  const near = x => groundY - 8 - (Math.sin(x * 0.07 + 4) * 4 + Math.sin(x * 0.023 + 1) * 5 + 5);
  for (let x = 0; x < W; x++) {
    const h = Math.round(near(x));
    b.fillStyle = '#161230'; b.fillRect(x, h, 1, groundY - h);
    b.fillStyle = '#231c44'; b.fillRect(x, h, 1, 1);
  }
  const trees = Math.round(W / 12);
  for (let i = 0; i < trees; i++) {
    const px = randi(0, W - 1), base = Math.round(near(px)) + 3, th = randi(8, 17);
    b.fillStyle = '#0e0b20';
    for (let r = 0; r < th; r++) {
      const hw = Math.floor((r % 4) * 0.5 + r * 0.3);
      b.fillRect(px - hw, base - th + r, hw * 2 + 1, 1);
    }
    b.fillRect(px, base, 1, 2);
  }

  // 地面（草 + 抖动泥土）
  const soil = ['#2f6e2f', '#3a2a22', '#30221b', '#261a14', '#1c130f', '#140d0a'].map(hexRgb);
  const depth = [0, 3, 10, 26, 60, 120];
  const gh = H - groundY;
  img = b.createImageData(W, gh); d = img.data;
  for (let y = 0; y < gh; y++) {
    let bi = 0;
    while (bi < depth.length - 2 && y >= depth[bi + 1]) bi++;
    const fr = clamp((y - depth[bi]) / (depth[bi + 1] - depth[bi]), 0, 1);
    for (let x = 0; x < W; x++) {
      const c = soil[fr > BAYER[(y & 3) * 4 + (x & 3)] / 16 ? bi + 1 : bi];
      const p = (y * W + x) * 4;
      d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255;
    }
  }
  b.putImageData(img, 0, groundY);
  b.fillStyle = '#5fb84a'; b.fillRect(0, groundY, W, 1);
  b.fillStyle = '#3f8f3a'; b.fillRect(0, groundY + 1, W, 1);
  for (let x = 0; x < W; x++) {
    if (Math.random() < 0.35) { b.fillStyle = Math.random() < 0.5 ? '#78d05a' : '#5fb84a'; b.fillRect(x, groundY - randi(1, 2), 1, 2); }
    if (Math.random() < 0.025) { b.fillStyle = pick(['#ff8ab0', '#ffe680', '#9ad0ff']); b.fillRect(x, groundY - 2, 1, 1); }
  }
  for (let i = 0; i < W * gh / 90; i++) {
    const px = randi(0, W - 3), py = randi(groundY + 4, H - 2);
    b.fillStyle = '#4d3b30'; b.fillRect(px, py, 2, 1);
    b.fillStyle = '#6a5444'; b.fillRect(px, py - 1, 1, 1);
  }

  G = prev;

  stars = [];
  const n = Math.round((W * groundY) / 360);
  for (let i = 0; i < n; i++) {
    const s = { x: randi(0, W - 1), y: randi(0, Math.round(groundY * 0.72)), ph: rand(0, TAU), sp: rand(1, 3), big: Math.random() < 0.1, c: pick(['#ffffff', '#cfd4ff', '#ffe9c4', '#b8c0ff']) };
    if (Math.hypot(s.x - mx, s.y - my) > 16) stars.push(s);
  }
}

function drawStars() {
  for (const s of stars) {
    const b = Math.sin(worldT * s.sp + s.ph);
    if (b < -0.4) continue;
    G.globalAlpha = 0.45 + 0.55 * Math.max(0, b);
    G.fillStyle = s.c;
    G.fillRect(s.x, s.y, 1, 1);
    if (s.big && b > 0.6) { G.globalAlpha = 0.5; G.fillRect(s.x - 1, s.y, 3, 1); G.fillRect(s.x, s.y - 1, 1, 3); }
  }
  G.globalAlpha = 1;
}

// ---------- 魔法师 ----------
function staffTip(pose) {
  const px = mage.x + 19 - Math.round(mage.recoil * 2), py = mage.y + 21;
  const ang = pose * 0.8, dx = Math.sin(ang), dy = -Math.cos(ang);
  return { px, py, dx, dy, x: px + dx * 16, y: py + dy * 16 };
}

function updateMage(dt, combo) {
  mage.cast -= dt;
  const target = mage.cast > 0 ? 1 : 0;
  mage.pose += (target - mage.pose) * Math.min(1, dt * (target ? 20 : 6));
  mage.recoil = Math.max(0, mage.recoil - dt * 5);
  mage.blinkCd -= dt;
  if (mage.blinkCd <= 0) { mage.blink = 0.12; mage.blinkCd = rand(2, 5); }
  mage.blink -= dt;
  // 连击越高，法师身上的光环越旺
  if (combo >= 5 && Math.random() < Math.min(1, combo / 20)) {
    spawn({ x: mage.x + rand(4, 18), y: groundY - rand(0, 4), vx: rand(-4, 4), vy: rand(-45, -20), life: rand(0.4, 0.9), size: randi(1, 2), cols: ['#ffffff', mage.gem, mage.gem], add: true });
  }
}

function drawMage() {
  const bob = Math.sin(worldT * 2.4) > 0.3 ? 1 : 0;
  const ox = mage.x - Math.round(mage.recoil * 2), oy = mage.y + bob;
  shadow(mage.x + 11, groundY + 1, 10);

  const st = staffTip(mage.pose);
  const x0 = st.px - st.dx * 9, y0 = st.py - st.dy * 9 + bob, x1 = st.px + st.dx * 14, y1 = st.py + st.dy * 14 + bob;
  line(x0 + 1, y0, x1 + 1, y1, '#4a2e18');
  line(x0, y0, x1, y1, '#9a6a3a');
  const hx = st.x, hy = st.y + bob, pulse = 0.5 + 0.5 * Math.sin(worldT * 5);
  ringPts(hx, hy, 2.5, 2.5, '#c8a050');
  glow(hx, hy, 7 + mage.pose * 12 + pulse * 2, mage.gem, 0.55 + mage.pose * 0.45);
  disc(hx, hy, 1.6, mage.gem);
  rect(hx - 1, hy - 1, 1, 1, '#ffffff');

  G.drawImage(SPR.mage, ox, oy);
  if (mage.blink > 0) rect(ox + SPR.mageEye.x, oy + SPR.mageEye.y, 1, 1, PAL.s);
}

// ---------- 稻草人 ----------
function updateDummy(dt) {
  const st = dummy.status, frozen = st.freeze > 0;
  const stiff = frozen ? 260 : 110, damp = frozen ? 18 : 6;
  dummy.v += (-stiff * dummy.a - damp * dummy.v) * dt;
  dummy.a = clamp(dummy.a + dummy.v * dt, -0.7, 0.7);
  dummy.lift = lerp(dummy.lift, dummy.liftTarget, Math.min(1, dt * 8));
  dummy.liftTarget = 0;
  dummy.flash = Math.max(0, dummy.flash - dt);
  dummy.jit = Math.max(0, dummy.jit - dt);
  for (const k in st) st[k] = Math.max(0, st[k] - dt);

  const L = 20;
  dummy.cx = dummy.baseX + Math.sin(dummy.a) * L;
  dummy.cy = groundY + 1 + dummy.lift - Math.cos(dummy.a) * L;

  const bx = () => dummy.cx + rand(-8, 8), by = () => dummy.cy + rand(-14, 8);
  if (st.burn > 0 && Math.random() < 0.8) spawn({ x: bx(), y: by(), vx: rand(-5, 5), vy: rand(-35, -15), life: rand(0.3, 0.6), size: randi(1, 2), cols: COL.fire, add: true });
  if (st.freeze > 0 && Math.random() < 0.2) spawn({ x: bx(), y: by(), vx: 0, vy: rand(-8, -2), life: rand(0.3, 0.6), size: 1, cols: COL.ice, add: true });
  if (st.void > 0 && Math.random() < 0.3) spawn({ x: bx(), y: by(), vx: rand(-10, 10), vy: rand(-20, -5), life: rand(0.3, 0.6), size: 1, cols: COL.void, add: true });
  if (st.arcane > 0 && Math.random() < 0.3) spawn({ x: bx(), y: by(), vx: rand(-10, 10), vy: rand(-20, -5), life: rand(0.3, 0.6), size: 1, cols: COL.arc, add: true });
}

function drawDummy() {
  shadow(dummy.baseX, groundY + 1, 11);
  const jx = dummy.jit > 0 ? Math.round(rand(-1.4, 1.4)) : 0;
  const sp = SPR.crow, ox = -12, oy = -sp.height, st = dummy.status;
  G.save();
  G.translate(dummy.baseX + jx, groundY + 1 + Math.round(dummy.lift));
  G.rotate(dummy.a);
  G.drawImage(sp, ox, oy);
  if (st.burn > 0) { G.globalAlpha = 0.25 + Math.random() * 0.2; G.drawImage(SPR.crowTint.fire, ox, oy); }
  if (st.freeze > 0) { G.globalAlpha = 0.55 * Math.min(1, st.freeze * 2); G.drawImage(SPR.crowTint.ice, ox, oy); }
  if (st.shock > 0 && Math.random() < 0.35) { G.globalAlpha = 0.7; G.drawImage(SPR.crowTint.elec, ox, oy); }
  if (st.void > 0) { G.globalAlpha = 0.3 * Math.min(1, st.void * 2); G.drawImage(SPR.crowTint.void, ox, oy); }
  if (dummy.flash > 0) { G.globalAlpha = Math.min(1, dummy.flash / 0.07); G.drawImage(SPR.crowTint.white, ox, oy); }
  G.globalAlpha = 1;
  G.restore();
  if (st.shock > 0 && Math.random() < 0.3) {
    const p = () => [dummy.cx + rand(-11, 11), dummy.cy + rand(-15, 6)];
    const [ax, ay] = p(), [bx, by] = p();
    drawBolt(boltPath(ax, ay, bx, by, 3, 3), COL.elec, 1);
  }
}

// o: { col, knock, status, dur, small, big, noCrit }
function hit(dmg, o = {}) {
  const crit = !o.noCrit && Math.random() < (o.small ? 0.1 : 0.2);
  if (crit) dmg *= 2;
  dmg = Math.round(dmg);
  dummy.v += (o.knock ?? 3) * 0.16 * rand(0.8, 1.2);
  dummy.flash = 0.08;
  dummy.jit = 0.18;
  if (o.status) dummy.status[o.status] = Math.max(dummy.status[o.status], o.dur || 2);
  stats.total += dmg;
  stats.maxHit = Math.max(stats.maxHit, dmg);
  nums.push({
    x: dummy.cx + rand(-8, 8), y: dummy.cy - 16 + rand(-6, 4),
    vx: rand(-10, 10), vy: o.small ? -30 : -45, t: 0,
    life: o.big ? 1.4 : o.small ? 0.7 : 1.0,
    txt: crit ? dmg + '!' : String(dmg),
    col: crit ? '#ff5a4a' : o.col || '#ffffff',
    sc: Math.min(3, (o.big ? 2 : 1) + (crit ? 1 : 0)),
  });
  if (nums.length > 60) nums.shift();
  onDamage();
}

function updateNums(dt) {
  for (let i = nums.length - 1; i >= 0; i--) {
    const n = nums[i];
    n.t += dt; n.x += n.vx * dt; n.y += n.vy * dt; n.vy += 50 * dt;
    if (n.t >= n.life) nums.splice(i, 1);
  }
}
function drawNums() {
  for (const n of nums) {
    const k = n.t / n.life;
    G.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    drawText(n.txt, n.x, n.y, n.sc + (n.t < 0.08 ? 1 : 0), n.col);
  }
  G.globalAlpha = 1;
}

// ---------- 环境：萤火虫 & 流星 ----------
let ambT = 0, shootT = 3;
function updateAmbient(dt) {
  ambT -= dt;
  if (ambT <= 0) {
    ambT = rand(0.3, 0.8);
    spawn({ x: rand(0, W), y: groundY - rand(2, 30), vx: rand(-6, 6), vy: rand(-4, 2), life: rand(2, 4), size: 1, shrink: false, cols: ['#3a5a20', '#c8ff6a', '#f0ffb0', '#c8ff6a', '#3a5a20'], add: true });
  }
  shootT -= dt;
  if (shootT <= 0) {
    shootT = rand(4, 9);
    const dir = Math.random() < 0.5 ? -1 : 1;
    spawn({ x: rand(W * 0.1, W * 0.9), y: rand(4, groundY * 0.35), vx: dir * rand(100, 160), vy: rand(40, 70), life: 0.5, type: 'streak', len: 0.08, cols: ['#ffffff', '#cfd4ff', '#6a6aaa'], add: true });
  }
}
