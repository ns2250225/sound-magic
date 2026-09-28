'use strict';
// 法术库：每个法术 { name, color, col2, sides, fire() }
const tipPos = () => staffTip(1);
const tgt = () => ({ x: dummy.cx, y: dummy.cy });

// ============ 1. 炎爆术 ============
function fireExplosion(x, y, s = 1) {
  shake(3 * s); flash(0.25 * s, '#ff9a3f'); Sound.sfx.boom(0.7 * s);
  addFlashGlow(x, y, 30 * s, '#ff7a1a', 0.35);
  addRing(x, y, 22 * s, '#ffd23f', 0.35, 1, '#ff5a1a');
  burst(x, y, 60 * s, COL.fire, { spd: [40, 150 * s], life: [0.3, 0.7], size: [1, 3], drag: 3.5 });
  burst(x, y, 14 * s, COL.fire, { spd: [80, 180], life: [0.4, 0.9], type: 'streak', grav: 200, drag: 1, ground: true });
  burst(x, y, 18 * s, COL.smoke, { spd: [10, 40], life: [0.6, 1.2], size: [2, 4], vy: -20, drag: 2, add: false });
  hit(rand(110, 170) * s, { col: '#ffb04a', knock: 5 * s, status: 'burn', dur: 2.5 });
}
const FIREBALL = {
  name: '炎爆术', color: '#ff8a2a', col2: '#ffd23f', sides: 5,
  fire() {
    const s = tipPos(), p = { x: s.x, y: s.y };
    Sound.sfx.fire();
    addFx({
      update(dt) {
        const tg = tgt(), dx = tg.x - p.x, dy = tg.y - p.y, d = Math.hypot(dx, dy);
        if (d < 5) { fireExplosion(p.x, p.y, 1); return false; }
        const sp = Math.min(d / dt, 230 + this.t * 200);
        p.x += (dx / d) * sp * dt; p.y += (dy / d) * sp * dt;
        for (let i = 0; i < 5; i++) spawn({ x: p.x + rand(-2, 2), y: p.y + rand(-2, 2), vx: (-dx / d) * rand(10, 50) + rand(-15, 15), vy: rand(-25, 5), life: rand(0.25, 0.55), size: randi(1, 3), cols: COL.fire, add: true, drag: 2 });
        if (Math.random() < 0.4) spawn({ x: p.x, y: p.y, vx: rand(-8, 8), vy: rand(-18, -6), life: rand(0.5, 0.9), size: randi(2, 3), cols: COL.smoke, drag: 1 });
      },
      draw() {
        glow(p.x, p.y, 16, '#ff7a1a', 0.9);
        disc(p.x, p.y, 4.5, '#c42a1a'); disc(p.x, p.y, 3.5, '#ff9a1f');
        disc(p.x, p.y, 2.2, '#ffe680'); disc(p.x, p.y, 1, '#ffffff');
      },
    });
  },
};

// ============ 2. 雷霆万钧 ============
function addBolts(bolts, dur, cols = COL.elec) {
  addFx({ dur, draw() {
    if (((this.t * 60) | 0) % 4 === 3) return; // 频闪
    const k = this.t / dur, main = bolts[0];
    for (const b of bolts) drawBolt(b, cols, b === main && k < 0.5 ? 2 : 1);
    for (let i = 0; i < main.length; i += 3) glow(main[i][0], main[i][1], 8, cols[3], 0.4 * (1 - k));
  } });
}
function lightningStrike(big, cloudY) {
  const tg = tgt(), x0 = tg.x + rand(-20, 20);
  const main = boltPath(x0, cloudY, tg.x, tg.y, big ? 9 : 7, 7);
  const bolts = [main];
  for (let i = 0; i < (big ? 5 : 3); i++) {
    const [bx, by] = main[randi(2, Math.max(2, main.length - 3))];
    bolts.push(boltPath(bx, by, bx + rand(-30, 30), by + rand(15, 45), 4, 6));
  }
  if (big) {
    bolts.push(boltPath(tg.x, tg.y, tg.x + rand(-16, -6), groundY, 3, 5));
    bolts.push(boltPath(tg.x, tg.y, tg.x + rand(6, 16), groundY, 3, 5));
    hitstop(0.06);
  }
  addBolts(bolts, big ? 0.35 : 0.22);
  flash(big ? 0.8 : 0.5, '#dffcff'); shake(big ? 6 : 3); Sound.sfx.zap(big ? 1 : 0.7);
  addFlashGlow(tg.x, tg.y, big ? 36 : 24, '#6fe8ff', 0.3);
  burst(tg.x, tg.y, big ? 40 : 20, COL.elec, { spd: [60, 200], life: [0.15, 0.4], type: 'streak', drag: 3 });
  addRing(tg.x, groundY, big ? 30 : 18, '#8ff4ff', 0.35, 0.3);
  hit(big ? rand(150, 200) : rand(60, 90), { col: '#8ff4ff', knock: big ? 6 : 3, status: 'shock', dur: 1.6 });
}
const LIGHTNING = {
  name: '雷霆万钧', color: '#6fe8ff', col2: '#b08aff', sides: 6,
  fire() {
    const s = tipPos(), cx = dummy.baseX, cloudY = Math.max(14, Math.round(groundY * 0.18));
    darken(0.55, 1.2);
    addBolts([boltPath(s.x, s.y, s.x + rand(-10, 10), -4, 5, 8)], 0.15);
    Sound.sfx.zap(0.5);
    // 雷云
    const blobs = Array.from({ length: 9 }, () => [rand(-32, 32), rand(-5, 5), rand(5, 9)]);
    addFx({ layer: 0, dur: 1.3, draw() {
      const k = this.t / 1.3, env = Math.min(1, this.t / 0.15) * Math.min(1, (1 - k) * 4);
      G.globalAlpha = env;
      for (const [ox, oy, r] of blobs) disc(cx + ox, cloudY + oy, r, '#1e1a38');
      for (const [ox, oy, r] of blobs) disc(cx + ox, cloudY + oy - 2, r - 2, '#2e2856');
      G.globalAlpha = 1;
      if (Math.random() < 0.25) glow(cx + rand(-25, 25), cloudY, 18, '#8ff4ff', 0.5);
    } });
    for (let k = 0; k < 3; k++) after(0.2 + k * 0.13, () => lightningStrike(k === 2, cloudY));
  },
};

// ============ 3. 冰霜棘刺 ============
function iceSpike(x, h, big, tilt) {
  const life = big ? 1.1 : 0.75;
  Sound.sfx.ice(big);
  burst(x, groundY, big ? 20 : 8, COL.ice, { spd: [20, 80], life: [0.3, 0.6], size: [1, 2], ang: -Math.PI / 2, spread: 1.2, grav: 150 });
  if (big) {
    hit(rand(170, 230), { col: '#bff4ff', knock: 7, status: 'freeze', dur: 2.8 });
    flash(0.35, '#cff6ff'); shake(5);
    addRing(x, groundY, 26, '#bff4ff', 0.4, 0.3);
    addFlashGlow(x, groundY - 20, 30, '#5cc2f2', 0.4);
  }
  const w = Math.max(3, h * 0.42);
  addFx({ dur: life, draw() {
    const g = easeOutBack(Math.min(1, this.t / 0.12)), hh = Math.max(1, Math.round(h * g));
    for (let yy = 0; yy < hh; yy++) {
      const f = 1 - yy / hh, hw = Math.round(Math.max(0.5, (w / 2) * f));
      const cx = Math.round(x + tilt * yy), py = groundY - yy;
      G.fillStyle = '#1f4f8a'; G.fillRect(cx - hw - 1, py, hw * 2 + 2, 1);
      G.fillStyle = '#c8f4ff'; G.fillRect(cx - hw, py, hw, 1);
      G.fillStyle = '#5aaee8'; G.fillRect(cx, py, hw, 1);
      if (yy % 3) { G.fillStyle = '#ffffff'; G.fillRect(cx - 1, py, 1, 1); }
    }
    glow(x + tilt * hh * 0.5, groundY - hh * 0.5, h * 0.6, '#5cc2f2', 0.35);
  } });
  after(life, () => {
    Sound.sfx.shatter();
    for (let i = 0; i < h * 0.7; i++) {
      const yy = rand(0, h);
      spawn({ x: x + tilt * yy, y: groundY - yy, vx: rand(-60, 60), vy: rand(-90, -10), grav: 300, ground: true, life: rand(0.5, 0.9), size: randi(1, 2), cols: COL.ice, add: false, shrink: false });
    }
  });
}
const ICE = {
  name: '冰霜棘刺', color: '#8fe6ff', col2: '#e0f8ff', sides: 6,
  fire() {
    const x0 = mage.x + 30, x1 = dummy.baseX, n = 6;
    for (let i = 0; i < n; i++) {
      after(i * 0.07, () => {
        const last = i === n - 1;
        iceSpike(lerp(x0, x1 - 3, i / (n - 1)) + rand(-2, 2), last ? 38 : 10 + i * 4, last, last ? 0.05 : rand(-0.25, 0.25));
      });
    }
    after((n - 1) * 0.07 + 0.04, () => { iceSpike(x1 + 10, 22, false, 0.35); iceSpike(x1 - 11, 18, false, -0.35); });
  },
};

// ============ 4. 陨星天坠 ============
function meteorImpact(x, y) {
  hitstop(0.09); flash(1, '#ffe0a0'); shake(11); Sound.sfx.boom(1.6);
  addFlashGlow(x, y, 70, '#ff7a1a', 0.6); addFlashGlow(x, y, 40, '#ffffff', 0.2);
  addRing(x, groundY, 60, '#ffd23f', 0.55, 0.3, '#ff5a1a');
  addRing(x, y - 6, 40, '#ffb04a', 0.45, 1);
  after(0.08, () => addRing(x, groundY, 90, '#ff5a1a', 0.7, 0.28));
  burst(x, y, 140, COL.fire, { spd: [50, 230], life: [0.4, 1.0], size: [2, 4], drag: 3 });
  burst(x, y, 40, COL.fire, { spd: [100, 260], life: [0.5, 1.1], type: 'streak', grav: 260, drag: 0.8, ground: true, ang: -Math.PI / 2, spread: 1.3 });
  for (let i = 0; i < 26; i++) spawn({ x, y, vx: rand(-120, 120), vy: rand(-220, -60), grav: 420, life: rand(0.8, 1.5), size: randi(1, 3), cols: COL.rock, add: false, ground: true, shrink: false, drag: 0.3 });
  burst(x, y - 6, 40, COL.smoke, { spd: [15, 70], life: [0.8, 1.6], size: [3, 6], vy: -25, drag: 1.8, add: false });
  for (let i = 0; i < 30; i++) spawn({ x: x + rand(-6, 6), y, vx: rand(-10, 10), vy: rand(-160, -60), life: rand(0.4, 0.8), size: randi(2, 4), cols: COL.fire, add: true, drag: 1.5 });
  addScorch(x, groundY, 26);
  hit(rand(380, 520), { col: '#ff9a3f', knock: 11, status: 'burn', dur: 3.5, big: true });
}
const METEOR = {
  name: '陨星天坠', color: '#ff5a2a', col2: '#ffb04a', sides: 7,
  fire() {
    darken(0.6, 1.6);
    const tx = dummy.baseX, ty = groundY - 8;
    addCircle({ x: tx, y: groundY, r: 26, sx: 1, sy: 0.3, col: '#ff5a2a', col2: '#ffd23f', sides: 7, dur: 1.2, spin: 3, layer: 0 });
    Sound.sfx.rumble();
    const sx0 = tx - (groundY + 30) * 0.55, sy0 = -30, dur = 0.8, m = { x: sx0, y: sy0 };
    const ang = Math.atan2(ty - sy0, tx - sx0), ux = Math.cos(ang), uy = Math.sin(ang);
    addFx({
      update() {
        const k = Math.min(1, this.t / dur), e = easeIn(k);
        m.x = lerp(sx0, tx, e); m.y = lerp(sy0, ty, e);
        for (let i = 0; i < 8; i++) spawn({ x: m.x + rand(-4, 4), y: m.y + rand(-4, 4), vx: -ux * rand(20, 70) + rand(-15, 15), vy: -uy * rand(20, 70) + rand(-15, 15), life: rand(0.3, 0.7), size: randi(2, 4), cols: COL.fire, add: true, drag: 2 });
        if (Math.random() < 0.6) spawn({ x: m.x, y: m.y, vx: rand(-10, 10), vy: rand(-15, 0), life: rand(0.6, 1.1), size: randi(3, 5), cols: COL.smoke, drag: 1 });
        if (k >= 1) { meteorImpact(tx, groundY - 4); return false; }
      },
      draw() {
        glow(m.x, m.y, 34, '#ff6a1a', 0.9);
        G.globalCompositeOperation = 'lighter';
        for (let i = 14; i >= 1; i--) disc(m.x - ux * i * 2.2, m.y - uy * i * 2.2, 6.5 * (1 - i / 15), i < 4 ? '#ffe680' : i < 9 ? '#ff9a1f' : '#c42a1a');
        G.globalCompositeOperation = 'source-over';
        disc(m.x, m.y, 6, '#3a1e16');
        disc(m.x + ux * 1.5, m.y + uy * 1.5, 4.5, '#ff7b1c');
        disc(m.x - ux * 1, m.y - uy * 1, 4, '#5a2a1e');
        rect(m.x - 2, m.y, 1, 1, '#2a120c'); rect(m.x + 1, m.y - 2, 1, 1, '#2a120c');
        disc(m.x + ux * 3, m.y + uy * 3, 1.5, '#fff3a0');
      },
    });
  },
};

// ============ 5. 奥术洪流 ============
const BEAM = {
  name: '奥术洪流', color: '#ff6ff0', col2: '#c04bff', sides: 8,
  fire() {
    const s = tipPos();
    for (let i = 0; i < 36; i++) {
      const a = rand(0, TAU), r = rand(14, 26);
      spawn({ x: s.x + Math.cos(a) * r, y: s.y + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.8, vy: -Math.sin(a) * r * 2.8, life: 0.33, size: randi(1, 2), cols: COL.arc, add: true });
    }
    addCircle({ x: s.x + 6, y: s.y, r: 15, sx: 0.4, sy: 1, col: '#ff6ff0', col2: '#c04bff', sides: 8, dur: 1.6, spin: -6, layer: 1 });
    after(0.32, () => {
      const dur = 1.0;
      let tick = 0;
      Sound.sfx.beam(dur);
      addFx({
        dur,
        update(dt) {
          const tg = tgt(), s = tipPos();
          tick -= dt;
          if (tick <= 0) { tick = 0.09; hit(rand(22, 38), { col: '#ff9af5', knock: 1.2, status: 'arcane', dur: 1, small: true }); }
          shake(1.8);
          burst(tg.x, tg.y, 4, COL.arc, { spd: [40, 140], life: [0.2, 0.4], type: 'streak', drag: 2 });
          const u = Math.random();
          spawn({ x: lerp(s.x, tg.x, u), y: lerp(s.y, tg.y, u) + rand(-3, 3), vx: rand(-10, 10), vy: rand(-30, -5), life: rand(0.2, 0.5), size: 1, cols: COL.arc, add: true });
        },
        draw() {
          const s = tipPos(), tg = tgt();
          const env = Math.min(1, this.t / 0.07) * Math.min(1, (dur - this.t) / 0.2);
          const w = (5 + Math.sin(this.t * 50) * 1.2) * env;
          const dx = tg.x - s.x, dy = tg.y - s.y, len = Math.hypot(dx, dy);
          G.save();
          G.translate(s.x, s.y); G.rotate(Math.atan2(dy, dx));
          G.globalCompositeOperation = 'lighter';
          G.globalAlpha = 0.6; G.fillStyle = '#6a2bd0'; G.fillRect(0, -w - 2, len, (w + 2) * 2);
          G.globalAlpha = 1; G.fillStyle = '#ff6ff0'; G.fillRect(0, -w, len, w * 2);
          G.fillStyle = '#ffffff'; G.fillRect(0, -w * 0.4, len, w * 0.8);
          for (let d = (this.t * 160) % 10; d < len; d += 10) ringPts(d, 0, 1.5 * env, (w + 4) * env, '#ffd6ff');
          G.restore();
          G.globalAlpha = 1; G.globalCompositeOperation = 'source-over';
          glow(s.x, s.y, 14 * env + 4, '#ff6ff0', 0.9);
          glow(tg.x, tg.y, 24 * env, '#ff6ff0', 0.9);
        },
      });
      after(dur, () => {
        const tg = tgt();
        addRing(tg.x, tg.y, 30, '#ff85f2', 0.4, 1, '#c04bff');
        burst(tg.x, tg.y, 50, COL.arc, { spd: [50, 180], life: [0.3, 0.7], drag: 3 });
        flash(0.4, '#ffb0ff'); shake(5); Sound.sfx.boom(0.6);
        hit(rand(120, 160), { col: '#ff9af5', knock: 6 });
      });
    });
  },
};

// ============ 6. 虚空奇点 ============
function voidNova(x, y) {
  flash(0.8, '#d8b0ff'); shake(8); hitstop(0.07); Sound.sfx.boom(1.2);
  addFlashGlow(x, y, 50, '#a65bff', 0.5);
  addRing(x, y, 45, '#e6c2ff', 0.5, 1, '#a65bff');
  after(0.06, () => addRing(x, y, 30, '#ffffff', 0.35, 1));
  addRing(x, groundY, 50, '#a65bff', 0.5, 0.3);
  burst(x, y, 90, COL.void, { spd: [40, 200], life: [0.3, 0.8], size: [1, 3], drag: 3 });
  burst(x, y, 30, COL.void, { spd: [120, 240], life: [0.3, 0.6], type: 'streak', drag: 2 });
  hit(rand(260, 340), { col: '#d6a8ff', knock: 9, status: 'void', dur: 1.5, big: true });
}
const VOID = {
  name: '虚空奇点', color: '#a65bff', col2: '#e6c2ff', sides: 7,
  fire() {
    const s = tipPos(), o = { x: s.x, y: s.y, r: 2 };
    const travel = 0.45, hold = 1.5;
    let tick = 0;
    Sound.sfx.void(); darken(0.5, 2.2);
    addFx({
      update(dt) {
        const t = this.t, tg = tgt();
        if (t < travel) {
          const e = easeOut(t / travel);
          o.x = lerp(s.x, tg.x, e); o.y = lerp(s.y, tg.y - 4, e); o.r = 2 + e * 2;
          spawn({ x: o.x, y: o.y, vx: rand(-10, 10), vy: rand(-10, 10), life: 0.4, size: 2, cols: COL.void, add: true });
        } else if (t < travel + hold) {
          o.r = lerp(o.r, 9, dt * 6);
          for (let i = 0; i < 4; i++) {
            const a = rand(0, TAU), r = rand(30, 60);
            spawn({ x: o.x + Math.cos(a) * r, y: o.y + Math.sin(a) * r, vx: -Math.sin(a) * 40, vy: Math.cos(a) * 40, life: 1.5, size: randi(1, 2), cols: COL.void, add: true, attr: { x: o.x, y: o.y, k: 420 }, drag: 1.5 });
          }
          dummy.v += rand(-1.5, 1.5) * dt * 20;
          shake(1.5);
          tick -= dt;
          if (tick <= 0) { tick = 0.13; hit(rand(20, 35), { col: '#d6a8ff', knock: 0.5, small: true, status: 'void', dur: 1 }); }
        } else if (t < travel + hold + 0.18) {
          o.r = lerp(o.r, 0, dt * 18);
        } else { voidNova(o.x, o.y); return false; }
      },
      draw() {
        const t = this.t, r = o.r, n = 48;
        glow(o.x, o.y, r * 4 + 6, '#6a1fd0', 0.9);
        for (let i = 0; i < n; i++) { // 吸积盘后半
          const a = (i / n) * TAU + t * 6;
          if (Math.sin(a) < 0) rect(o.x + Math.cos(a) * r * 2.4, o.y + Math.sin(a) * r * 0.55, 1, 1, i % 3 ? '#a65bff' : '#e6c2ff');
        }
        disc(o.x, o.y, r + 1, '#e6c2ff');
        disc(o.x, o.y, r, '#05000c');
        G.globalCompositeOperation = 'lighter';
        ringPts(o.x, o.y, r + 2 + Math.sin(t * 20), r + 2 + Math.sin(t * 20), '#a65bff', t * 3, 2);
        G.globalCompositeOperation = 'source-over';
        for (let i = 0; i < n; i++) { // 吸积盘前半
          const a = (i / n) * TAU + t * 6;
          if (Math.sin(a) >= 0) rect(o.x + Math.cos(a) * r * 2.4, o.y + Math.sin(a) * r * 0.55, 2, 1, i % 3 ? '#e6c2ff' : '#ffffff');
        }
      },
    });
  },
};

// ============ 7. 圣光裁决 ============
const HOLY = {
  name: '圣光裁决', color: '#ffd84a', col2: '#fffbd6', sides: 8,
  fire() {
    const tx = dummy.baseX, skyY = Math.max(14, groundY - 120);
    addCircle({ x: tx, y: groundY, r: 24, sx: 1, sy: 0.3, col: '#ffd84a', col2: '#fffbd6', sides: 8, dur: 1.7, spin: 4, layer: 0 });
    addCircle({ x: tx, y: skyY, r: 20, sx: 1, sy: 0.3, col: '#ffd84a', col2: '#fffbd6', sides: 6, dur: 1.6, spin: -3, layer: 0 });
    Sound.sfx.chime();
    for (let i = 0; i < 20; i++) after(rand(0, 0.4), () => spawn({ x: tx + rand(-20, 20), y: groundY, vx: 0, vy: rand(-50, -20), life: 0.8, size: 1, cols: COL.holy, add: true }));
    after(0.45, () => {
      const dur = 0.95;
      flash(0.7, '#fff6c0'); shake(6); hitstop(0.05); Sound.sfx.holy();
      addRing(tx, groundY, 50, '#ffe680', 0.5, 0.3);
      addFx({
        dur,
        update() {
          for (let i = 0; i < 5; i++) spawn({ x: tx + rand(-8, 8), y: rand(0, groundY), vx: rand(-5, 5), vy: rand(-80, -20), life: rand(0.3, 0.6), size: randi(1, 2), cols: COL.holy, add: true });
          burst(tx, groundY, 2, COL.holy, { spd: [60, 140], ang: Math.random() < 0.5 ? 0 : Math.PI, spread: 0.15, life: [0.2, 0.4], type: 'streak', drag: 1 });
        },
        draw() {
          const k = this.t / dur;
          const w = k < 0.15 ? easeOut(k / 0.15) * 16 : 16 * (1 - easeIn((k - 0.15) / 0.85)) + 2 * (1 - k);
          const hh = groundY + 2;
          G.globalCompositeOperation = 'lighter';
          G.globalAlpha = 0.35; G.fillStyle = '#ffc83f'; G.fillRect(Math.round(tx - w - 5), 0, Math.round((w + 5) * 2), hh);
          G.globalAlpha = 0.9; G.fillStyle = '#ffe680'; G.fillRect(Math.round(tx - w), 0, Math.round(w * 2), hh);
          G.globalAlpha = 1; G.fillStyle = '#ffffff'; G.fillRect(Math.round(tx - w * 0.45), 0, Math.round(w * 0.9), hh);
          G.globalAlpha = 0.5;
          for (let y = (this.t * 200) % 12; y < hh; y += 12) G.fillRect(Math.round(tx - w - 3), Math.round(y), Math.round((w + 3) * 2), 1);
          G.globalAlpha = 1; G.globalCompositeOperation = 'source-over';
          glow(tx, groundY, 50 * (1 - k) + 10, '#ffc83f', 0.8, 0.4);
          glow(tx, dummy.cy, 30 * (1 - k), '#ffffff', 0.6);
        },
      });
      [0, 0.25, 0.5].forEach((d, i) => after(d, () => hit(i === 2 ? rand(160, 220) : rand(80, 110), { col: '#ffe680', knock: i === 2 ? 6 : 2 })));
    });
  },
};

// ============ 8. 风暴龙卷 ============
const TORNADO = {
  name: '风暴龙卷', color: '#5cf0b0', col2: '#dcfff0', sides: 5,
  fire() {
    const sx = mage.x + 30, tx = dummy.baseX, travel = 0.55, hold = 1.1, out = 0.35, dur = travel + hold + out;
    const o = { x: sx };
    let tick = 0, done = false;
    Sound.sfx.whoosh(dur);
    addFx({
      dur,
      update(dt) {
        const t = this.t;
        o.x = t < travel ? lerp(sx, tx, easeOut(t / travel)) : tx + Math.sin(t * 6) * 2;
        if (t >= travel && t < travel + hold) {
          tick -= dt;
          if (tick <= 0) { tick = 0.12; hit(rand(28, 45), { col: '#9affd0', knock: rand(-3, 3), small: true }); }
          dummy.liftTarget = -8 - Math.sin(t * 9) * 2;
          shake(1.5);
        }
        spawn({ x: o.x + rand(-10, 10), y: groundY - rand(0, 3), vx: rand(-30, 30), vy: rand(-40, -10), life: rand(0.3, 0.6), size: randi(1, 2), cols: ['#8a7a5a', '#6a5a40', '#4a3e2c'], grav: 40 });
        if (Math.random() < 0.5) {
          const a = rand(0, TAU), hy = rand(0, 40);
          spawn({ x: o.x + Math.cos(a) * (4 + hy * 0.3), y: groundY - hy, vx: -Math.sin(a) * 60, vy: rand(-50, -20), life: rand(0.4, 0.8), size: 1, cols: ['#8adf5a', '#4aa83c', '#2f6e2f'], drag: 1, shrink: false });
        }
        if (t >= travel + hold && !done) {
          done = true;
          hit(rand(130, 170), { col: '#9affd0', knock: 8 });
          burst(o.x, groundY - 20, 50, COL.wind, { spd: [60, 160], life: [0.3, 0.7], type: 'streak', drag: 2 });
          Sound.sfx.boom(0.5); shake(4);
        }
      },
      draw() {
        const t = this.t, env = Math.min(1, t / 0.2) * Math.min(1, (dur - t) / out), N = 24;
        G.globalCompositeOperation = 'lighter';
        for (let j = 0; j < N; j++) {
          const f = j / N, hy = groundY - 1 - j * 2 * env, rad = (2 + Math.pow(f, 1.3) * 15) * env;
          const cx = o.x + Math.sin(t * 7 + j * 0.35) * 3 * f;
          for (let m = 0; m < 6; m++) {
            const a = t * 14 + j * 0.6 + (m * TAU) / 6, front = Math.sin(a) > 0;
            G.globalAlpha = front ? 0.95 : 0.45;
            G.fillStyle = front ? COL.wind[1] : COL.wind[3];
            G.fillRect(Math.round(cx + Math.cos(a) * rad), Math.round(hy + Math.sin(a) * rad * 0.3), 2, 1);
          }
        }
        G.globalAlpha = 1; G.globalCompositeOperation = 'source-over';
        glow(o.x, groundY - 24 * env, 30 * env, '#3fd6a0', 0.5, 1.3);
      },
    });
  },
};

// ============ 9. 奥术飞弹 ============
const MISSILES = {
  name: '奥术飞弹', color: '#6a9aff', col2: '#d6ecff', sides: 6,
  fire() {
    for (let i = 0; i < 8; i++) {
      after(i * 0.06, () => {
        const s = tipPos(), c = { x: s.x + rand(-10, 30), y: s.y - rand(30, 80) }, dur = rand(0.5, 0.7), p = { x: s.x, y: s.y };
        Sound.sfx.pew();
        addFx({
          update() {
            const k = Math.min(1, this.t / dur), tg = tgt(), e = easeIn(k) * 0.6 + k * 0.4, q = 1 - e;
            p.x = q * q * s.x + 2 * q * e * c.x + e * e * tg.x;
            p.y = q * q * s.y + 2 * q * e * c.y + e * e * tg.y;
            for (let j = 0; j < 2; j++) spawn({ x: p.x, y: p.y, vx: rand(-8, 8), vy: rand(-8, 8), life: rand(0.2, 0.4), size: randi(1, 2), cols: COL.missile, add: true });
            if (k >= 1) {
              burst(p.x, p.y, 14, COL.missile, { spd: [30, 110], life: [0.2, 0.4], drag: 3 });
              addRing(p.x, p.y, 8, '#8abaff', 0.2);
              hit(rand(35, 55), { col: '#aad0ff', knock: 1.5, small: true });
              Sound.sfx.pop();
              return false;
            }
          },
          draw() {
            glow(p.x, p.y, 7, '#4a6aff', 0.9);
            rect(p.x - 1, p.y, 3, 1, '#d6ecff'); rect(p.x, p.y - 1, 1, 3, '#d6ecff'); rect(p.x, p.y, 1, 1, '#ffffff');
          },
        });
      });
    }
  },
};

// ============ 10. 苍龙破 ============
function dragonImpact(x, y) {
  flash(0.6, '#ccfff9'); shake(7); hitstop(0.06); Sound.sfx.boom(1);
  addFlashGlow(x, y, 44, '#2fc0d8', 0.45);
  addRing(x, y, 36, '#6ff0e8', 0.45, 1, '#2fc0d8');
  addRing(x, groundY, 44, '#ccfff9', 0.5, 0.3);
  burst(x, y, 80, COL.azure, { spd: [40, 190], life: [0.3, 0.8], size: [1, 3], drag: 3 });
  burst(x, y, 24, COL.azure, { spd: [100, 220], life: [0.3, 0.6], type: 'streak', drag: 2 });
  hit(rand(260, 340), { col: '#9ff6f0', knock: 8, status: 'shock', dur: 1.2, big: true });
}
const DRAGON = {
  name: '苍龙破', color: '#3fe0e8', col2: '#ccfff9', sides: 7,
  fire() {
    const s = tipPos(), hist = [[s.x, s.y]], dur = 1.15, A = Math.min(groundY * 0.5, 110), SEG = 26, SP = 3;
    const head = { x: s.x, y: s.y };
    let hitDone = false, shift = 0;
    Sound.sfx.roar();
    addFx({
      update(dt) {
        const tg = tgt();
        if (!hitDone) {
          const k = Math.min(1, this.t / dur);
          head.x = lerp(s.x, tg.x, k) + Math.sin(k * TAU) * 12 * (1 - k);
          head.y = lerp(s.y, tg.y, k) - Math.sin(k * Math.PI) * A + Math.sin(k * Math.PI * 4) * 6;
          const lp = hist[hist.length - 1];
          if (Math.hypot(head.x - lp[0], head.y - lp[1]) >= 1.5) hist.push([head.x, head.y]);
          if (Math.random() < 0.7) spawn({ x: head.x + rand(-3, 3), y: head.y + rand(-3, 3), vx: rand(-15, 15), vy: rand(-15, 15), life: rand(0.3, 0.6), size: randi(1, 2), cols: COL.azure, add: true });
          if (k >= 1) { hitDone = true; dragonImpact(tg.x, tg.y); }
        } else {
          // 龙身继续沿轨迹冲入目标并消散
          shift += dt * 90;
          if (Math.random() < 0.6) burst(head.x, head.y, 3, COL.azure, { spd: [40, 120], life: [0.2, 0.4] });
          if (shift / SP > SEG) return false;
        }
      },
      draw() {
        const L = hist.length;
        for (let i = SEG - 1; i >= 0; i--) {
          const idx = Math.round(L - 1 - i * SP + shift);
          if (idx < 0 || idx > L - 1) continue;
          const [x, y] = hist[idx], r = Math.max(1, 5.5 * (1 - (i / SEG) * 0.85));
          disc(x, y, r + 1, '#123a6a');
          disc(x, y, r, '#2fc0d8');
          disc(x, y - r * 0.35, r * 0.45, '#ccfff9');
          if (i % 3 === 0 && i > 1) rect(x, y - r - 2, 1, 2, '#ffffff');
          if (i % 5 === 0) glow(x, y, 10, '#2fc0d8', 0.35);
        }
        if (!hitDone && L >= 2) {
          const [ax, ay] = hist[L - 2], hx = head.x, hy = head.y;
          const d = Math.hypot(hx - ax, hy - ay) || 1, ux = (hx - ax) / d, uy = (hy - ay) / d;
          let nx = -uy, ny = ux;
          if (ny > 0) { nx = -nx; ny = -ny; }
          glow(hx, hy, 18, '#3fe0e8', 0.8);
          line(hx + nx * 3, hy + ny * 3, hx - ux * 7 + nx * 8, hy - uy * 7 + ny * 8, '#ffe680');
          line(hx + nx * 2 - ux * 2, hy + ny * 2 - uy * 2, hx - ux * 9 + nx * 5, hy - uy * 9 + ny * 5, '#ffe680');
          disc(hx, hy, 5, '#123a6a'); disc(hx, hy, 4.2, '#2fc0d8');
          disc(hx + ux * 4, hy + uy * 4, 3, '#2fc0d8');
          line(hx + ux * 2 - nx * 2, hy + uy * 2 - ny * 2, hx + ux * 7 - nx * 1, hy + uy * 7 - ny * 1, '#ccfff9');
          rect(hx + ux * 1 + nx * 2, hy + uy * 1 + ny * 2, 1, 1, '#ff3a3a');
          line(hx + ux * 6, hy + uy * 6, hx - ux * 4 - nx * 6 + Math.sin(this.t * 20) * 2, hy - uy * 4 - ny * 6, '#ccfff9');
        }
      },
    });
  },
};

// ============ 终极：星辰陨落（每 10 连击） ============
function smallStarImpact(x, y, cols) {
  burst(x, y, 25, cols, { spd: [40, 140], life: [0.3, 0.6], drag: 3 });
  addRing(x, groundY, 14, cols[2], 0.3, 0.3);
  flash(0.15, cols[1]); shake(2); Sound.sfx.pop();
  hit(rand(55, 90), { col: cols[2], knock: 2, small: true });
}
function starFinale(x, y) {
  hitstop(0.15); flash(1, '#ffffff'); shake(15); Sound.sfx.boom(2);
  addFlashGlow(x, y, 90, '#ffe680', 0.8); addFlashGlow(x, y, 50, '#ffffff', 0.3);
  [0, 0.08, 0.16, 0.26].forEach((d, i) => after(d, () => {
    addRing(x, y, 40 + i * 25, pick(['#ffe680', '#ff85f2', '#6ff0e8', '#ffffff']), 0.6, 1);
    addRing(x, groundY, 60 + i * 30, '#ffe680', 0.7, 0.28);
  }));
  for (const c of [COL.star, COL.holy, COL.arc, COL.azure]) {
    burst(x, y, 55, c, { spd: [50, 260], life: [0.4, 1.1], size: [1, 3], drag: 2.5 });
    burst(x, y, 15, c, { spd: [120, 300], life: [0.4, 0.9], type: 'streak', drag: 1.5, grav: 120, ground: true });
  }
  after(0.2, () => flash(0.6, '#ffe680'));
  hit(rand(1200, 1800), { col: '#ffe680', knock: 14, big: true, status: 'burn', dur: 2 });
}
function fallingStar(x0, y0, x1, r, big) {
  const y1 = big ? dummy.cy : groundY - 2, dur = big ? 0.45 : 0.3;
  const cols = pick([COL.star, COL.holy, COL.arc, COL.azure]), p = { x: x0, y: y0 };
  const ang = Math.atan2(y1 - y0, x1 - x0), ux = Math.cos(ang), uy = Math.sin(ang);
  addFx({
    update() {
      const k = Math.min(1, this.t / dur), e = easeIn(k);
      p.x = lerp(x0, x1, e); p.y = lerp(y0, y1, e);
      for (let i = 0; i < (big ? 6 : 2); i++) spawn({ x: p.x + rand(-r, r), y: p.y + rand(-r, r), vx: rand(-15, 15), vy: rand(-30, -5), life: rand(0.3, 0.6), size: randi(1, 2), cols, add: true });
      if (k >= 1) { big ? starFinale(p.x, p.y) : smallStarImpact(p.x, p.y, cols); return false; }
    },
    draw() {
      glow(p.x, p.y, r * 5, cols[3], 0.8);
      G.globalCompositeOperation = 'lighter';
      for (let i = 10; i >= 0; i--) disc(p.x - ux * i * r * 0.7, p.y - uy * i * r * 0.7, r * (1 - i / 11), i < 3 ? '#ffffff' : cols[Math.min(4, 1 + (i >> 1))]);
      G.globalCompositeOperation = 'source-over';
      line(p.x - r * 2.5, p.y, p.x + r * 2.5, p.y, '#ffffff');
      line(p.x, p.y - r * 2.5, p.x, p.y + r * 2.5, '#ffffff');
    },
  });
}
const ULT = {
  name: '★ 星辰陨落 ★', color: '#ffe680', col2: '#b0a0ff', sides: 8, ult: true,
  fire() {
    const tx = dummy.baseX, skyY = Math.max(20, groundY - (portrait ? 150 : 115));
    darken(0.85, 3.2);
    addCircle({ x: tx, y: skyY, r: portrait ? 46 : 54, sx: 1, sy: 0.32, col: '#ffe680', col2: '#b0a0ff', sides: 8, dur: 2.9, spin: 2, layer: 0 });
    addCircle({ x: tx, y: skyY, r: portrait ? 30 : 36, sx: 1, sy: 0.32, col: '#ff85f2', col2: '#ffffff', sides: 5, dur: 2.9, spin: -3, layer: 0 });
    addCircle({ x: tx, y: groundY, r: 32, sx: 1, sy: 0.3, col: '#ffe680', col2: '#b0a0ff', sides: 8, dur: 2.9, spin: 3, layer: 0 });
    Sound.sfx.chime(); Sound.sfx.rumble();
    const N = 16;
    for (let i = 0; i < N; i++) after(0.45 + i * 0.09, () => fallingStar(tx + rand(-30, 30), skyY, tx + rand(-28, 28), rand(2, 3.5), false));
    after(0.45 + N * 0.09 + 0.25, () => { Sound.sfx.roar(); fallingStar(tx, skyY, tx, 8, true); });
  },
};

const SPELLS = [FIREBALL, LIGHTNING, ICE, METEOR, BEAM, VOID, HOLY, TORNADO, MISSILES, DRAGON];
