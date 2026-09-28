'use strict';
// 主循环：布局适配、施法队列、HUD、输入
const $ = id => document.getElementById(id);
let combo = 0, comboT = 0, queue = 0, castCd = 0, hudDirty = true;
const recent = [];

// ---------- 布局：竖屏按宽度定像素密度，横屏按高度 ----------
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  portrait = vh >= vw;
  if (portrait) { W = 168; S = vw / W; H = Math.round(vh / S); }
  else { H = 200; S = vh / H; W = Math.round(vw / S); }
  cvs.width = W; cvs.height = H;
  cvs.style.width = vw + 'px'; cvs.style.height = vh + 'px';
  ctx.imageSmoothingEnabled = false;

  groundY = portrait ? Math.round(H * 0.64) : Math.round(H * 0.8);
  const gap = portrait ? Math.round(W * 0.56) : Math.min(Math.round(W * 0.5), 200);
  const mid = Math.round(W / 2);
  mage.x = mid - Math.round(gap / 2) - 11;
  mage.y = groundY - SPR.mage.height + 1;
  dummy.baseX = mid + Math.round(gap / 2);

  buildBg();
  document.documentElement.style.setProperty('--gy', groundY * S + 'px');
  document.body.classList.toggle('portrait', portrait);
}

// ---------- 施法 ----------
function requestCast(n = 1) { queue = Math.min(queue + n, 12); }

function doCast() {
  combo++; comboT = 3.2; stats.casts++;
  let sp;
  if (combo % 10 === 0) sp = ULT;
  else {
    sp = pick(SPELLS.filter(s => !recent.includes(s)));
    recent.push(sp);
    if (recent.length > 3) recent.shift();
  }
  mage.cast = sp.ult ? 1.2 : 0.55;
  mage.gem = sp.color;
  const tp = staffTip(1), big = sp.ult ? 1.5 : 1;
  addCircle({ x: mage.x + 11, y: groundY, r: 20 * big, sx: 1, sy: 0.3, col: sp.color, col2: sp.col2, sides: sp.sides, dur: sp.ult ? 2.5 : 1.1, spin: 3, layer: 0 });
  addCircle({ x: tp.x + 5, y: tp.y, r: 11 * big, sx: 0.38, sy: 1, col: sp.color, col2: sp.col2, sides: sp.sides, dur: sp.ult ? 2 : 0.8, spin: -5, layer: 1 });
  burst(mage.x + 11, groundY - 2, 16, ['#ffffff', sp.col2, sp.color], { spd: [20, 60], ang: -Math.PI / 2, spread: 1.2, life: [0.3, 0.6], drag: 2 });
  hud.banner(sp.name, sp.color, sp.ult);
  hud.combo();
  hudDirty = true;
  Sound.sfx.charge();
  after(sp.ult ? 0.35 : 0.18, () => { mage.recoil = 1; sp.fire(); });
}

function onDamage() { hudDirty = true; }

// ---------- HUD ----------
const hud = {
  stats() {
    $('total').textContent = stats.total.toLocaleString();
    $('casts').textContent = stats.casts;
    $('maxHit').textContent = stats.maxHit.toLocaleString();
  },
  combo() {
    const el = $('combo');
    $('comboNum').textContent = combo;
    el.style.opacity = combo > 1 ? 1 : 0;
    el.classList.toggle('hot', combo >= 5 && combo < 10);
    el.classList.toggle('fire', combo >= 10);
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  },
  banner(name, col, ult) {
    const el = $('banner');
    el.textContent = name;
    el.style.color = col;
    el.classList.toggle('ult', !!ult);
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  },
  heard(text) {
    const esc = text.slice(-24).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    $('heardText').innerHTML = esc.replace(Voice.TRIGGER, m => `<em>${m}</em>`) || '…';
  },
  msg(text) { $('heardText').textContent = text; },
  mode() {
    const m = Voice.mode;
    $('modeBtn').textContent = '模式：' + (m === 'speech' ? '语音识别' : '声控');
    if (!Voice.supported) { $('modeBtn').disabled = true; $('modeBtn').textContent = '模式：声控（浏览器不支持语音识别）'; }
    document.body.classList.toggle('volume', m === 'volume');
    $('tip').textContent = m === 'speech' ? '说「操」即可施法，连说可连发 · 也可点击画面 / 按空格' : '声控模式：发出短促有力的声音即可施法 · 也可点击画面';
  },
};

Voice.init({
  trigger(n) {
    requestCast(n);
    const el = $('heard');
    el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
    if (Voice.mode === 'volume') hud.msg('✦ 施法！');
  },
  text: t => hud.heard(t),
  level: v => { $('level').firstElementChild.style.width = (v * 100).toFixed(0) + '%'; },
  mode: () => hud.mode(),
  status(s) {
    const on = s === 'listening';
    $('micBtn').classList.toggle('on', Voice.active);
    $('micBtn').textContent = Voice.active ? '● 聆听中' : '🎙️ 开始聆听';
    $('heard').classList.toggle('live', on);
    if (on) hud.msg(Voice.mode === 'speech' ? '聆听中…请念出咒语「操」' : '声控聆听中…发出声音施法');
    else if (s === 'denied') hud.msg('麦克风权限被拒绝（需 HTTPS / localhost 并允许麦克风）');
    else if (s === 'nomic') hud.msg('未检测到可用的麦克风');
    else if (s === 'network') hud.msg('语音识别服务不可用，已切换为声控模式');
  },
});

// ---------- 主循环 ----------
function update(dt) {
  worldT += dt;
  updateTimers(dt);
  castCd -= dt;
  if (queue > 0 && castCd <= 0) { queue--; doCast(); castCd = 0.17; }
  if (combo > 0) { comboT -= dt; if (comboT <= 0) { combo = 0; hud.combo(); } }
  updateMage(dt, combo);
  updateFx(dt);
  updateDummy(dt);
  updateParticles(dt);
  updateNums(dt);
  updateScreen(dt);
  updateAmbient(dt);
  if (hudDirty) { hudDirty = false; hud.stats(); }
}

function render() {
  G = ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#05040f'; ctx.fillRect(0, 0, W, H);
  const sh = screen.shake;
  const ox = sh > 0.3 ? Math.round(rand(-sh, sh)) : 0, oy = sh > 0.3 ? Math.round(rand(-sh, sh) * 0.7) : 0;
  ctx.setTransform(1, 0, 0, 1, ox, oy);
  ctx.drawImage(bg, 0, 0);
  drawStars();
  if (screen.dark > 0.01) {
    ctx.globalAlpha = screen.dark * 0.75; ctx.fillStyle = '#040210';
    ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.globalAlpha = 1;
  }
  drawFx(0);
  drawDummy();
  drawMage();
  drawFx(1);
  drawParticles();
  drawNums();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (screen.flash > 0.01) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.85, screen.flash);
    ctx.fillStyle = screen.flashCol; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}

let lastT = performance.now(), frozen = false;
function frame(now) {
  if (frozen) { render(); requestAnimationFrame(frame); return; }
  let dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (screen.hitstop > 0) { screen.hitstop -= dt; dt *= 0.08; }
  update(dt);
  render();
  requestAnimationFrame(frame);
}

// ---------- 输入 ----------
function manualCast() { Sound.init(); requestCast(1); }
cvs.addEventListener('pointerdown', e => { e.preventDefault(); manualCast(); });
window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if ($('start').classList.contains('hide')) manualCast(); }
});
$('micBtn').addEventListener('click', () => { Sound.init(); Voice.active ? Voice.stop() : Voice.start(); });
$('modeBtn').addEventListener('click', () => Voice.setMode(Voice.mode === 'speech' ? 'volume' : 'speech'));
$('soundBtn').addEventListener('click', () => {
  Sound.init(); Sound.setMuted(!Sound.muted);
  $('soundBtn').textContent = Sound.muted ? '🔇' : '🔊';
});
$('sens').addEventListener('input', e => Voice.setSensitivity(e.target.value / 100));

$('startBtn').addEventListener('click', async () => {
  Sound.init();
  $('start').classList.add('hide');
  Voice.start();
  try { if (navigator.wakeLock) await navigator.wakeLock.request('screen'); } catch (_) {}
});

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

resize();
hud.mode();
hud.stats();
requestAnimationFrame(frame);

// 调试/演示：?auto 自动连续施法
if (/[?&]auto/.test(location.search)) {
  $('start').classList.add('hide');
  setInterval(() => requestCast(1), 700);
}
// 调试：?shot=法术序号,秒数 —— 同步快进模拟，便于截图检查特效（序号 -1 为终极法术）
{
  const m = /[?&]shot=(-?\d+),([\d.]+)/.exec(location.search);
  if (m) {
    $('start').classList.add('hide');
    const i = +m[1], sp = i < 0 ? ULT : SPELLS[i % SPELLS.length];
    if (sp.ult) combo = 9;
    SPELLS.length = 0; SPELLS.push(sp);
    recent.length = 0; recent.includes = () => false;
    requestCast(1);
    for (let t = 0; t < +m[2]; t += 1 / 60) update(1 / 60);
    render();
    frozen = true; // 冻结后续帧
  }
}
