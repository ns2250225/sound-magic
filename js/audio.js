'use strict';
// WebAudio 合成音效，无需任何音频文件
const Sound = (() => {
  let ac = null, master = null, noiseBuf = null, muted = false;

  function init() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6;
      master = ac.createGain(); master.gain.value = 0.55;
      master.connect(comp); comp.connect(ac.destination);
      const len = ac.sampleRate * 2;
      noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  const ok = () => ac && !muted && ac.state === 'running';

  function env(g, t, a, d, v) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function tone({ type = 'sine', f0 = 440, f1 = f0, dur = 0.3, vol = 0.2, delay = 0, a = 0.01 }) {
    if (!ok()) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + a + dur);
    env(g, t, a, dur, vol);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + a + dur + 0.05);
  }

  function noise({ dur = 0.3, vol = 0.2, type = 'lowpass', f0 = 1000, f1 = f0, q = 1, delay = 0, a = 0.005 }) {
    if (!ok()) return;
    const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + a + dur);
    env(g, t, a, dur, vol);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random()); s.stop(t + a + dur + 0.05);
  }

  const sfx = {
    charge() {
      tone({ type: 'sine', f0: 220, f1: 880, dur: 0.3, vol: 0.1 });
      tone({ type: 'triangle', f0: 440, f1: 1760, dur: 0.25, vol: 0.05, delay: 0.04 });
    },
    fire() { noise({ type: 'bandpass', f0: 500, f1: 2400, dur: 0.35, vol: 0.35, q: 0.8 }); },
    boom(s = 1) {
      noise({ type: 'lowpass', f0: 1800, f1: 60, dur: 0.5 * s + 0.2, vol: Math.min(0.9, 0.45 * s) });
      tone({ type: 'sine', f0: 150, f1: 30, dur: 0.45 * s + 0.1, vol: Math.min(0.9, 0.5 * s) });
    },
    zap(s = 1) {
      noise({ type: 'highpass', f0: 2500, f1: 6000, dur: 0.25 * s, vol: 0.35 * s });
      tone({ type: 'square', f0: 1400, f1: 60, dur: 0.18, vol: 0.12 * s });
      tone({ type: 'sawtooth', f0: 90, f1: 40, dur: 0.4 * s, vol: 0.22 * s });
    },
    ice(big) {
      [0, 0.04, 0.09].forEach((d, i) => tone({ type: 'triangle', f0: 1800 + i * 500, f1: 2600 + i * 400, dur: 0.12, vol: 0.07, delay: d }));
      noise({ type: 'highpass', f0: 3000, dur: 0.15, vol: big ? 0.3 : 0.12 });
      if (big) tone({ type: 'sine', f0: 200, f1: 60, dur: 0.3, vol: 0.3 });
    },
    shatter() {
      for (let i = 0; i < 5; i++) tone({ type: 'triangle', f0: 2000 + Math.random() * 2500, f1: 1500, dur: 0.08, vol: 0.05, delay: i * 0.025 });
      noise({ type: 'highpass', f0: 4000, dur: 0.2, vol: 0.12 });
    },
    beam(d = 1) {
      tone({ type: 'sawtooth', f0: 110, f1: 100, dur: d, vol: 0.12, a: 0.05 });
      tone({ type: 'sawtooth', f0: 166, f1: 150, dur: d, vol: 0.1, a: 0.05 });
      tone({ type: 'square', f0: 660, f1: 440, dur: d, vol: 0.04, a: 0.05 });
      noise({ type: 'bandpass', f0: 900, f1: 1400, dur: d, vol: 0.15, q: 2, a: 0.05 });
    },
    chime() { [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'sine', f0: f, dur: 1.1, vol: 0.09, delay: i * 0.06 })); },
    holy() {
      tone({ type: 'triangle', f0: 1047, f1: 1040, dur: 0.9, vol: 0.12 });
      tone({ type: 'sine', f0: 1568, dur: 0.9, vol: 0.08 });
      noise({ type: 'bandpass', f0: 3000, f1: 1500, dur: 0.8, vol: 0.2, q: 0.6 });
      sfx.boom(0.6);
    },
    whoosh(d = 1) { noise({ type: 'bandpass', f0: 300, f1: 1400, dur: d, vol: 0.3, q: 1.5, a: 0.15 }); },
    void() {
      tone({ type: 'sine', f0: 320, f1: 40, dur: 1.6, vol: 0.3 });
      tone({ type: 'triangle', f0: 90, f1: 30, dur: 1.8, vol: 0.18 });
      noise({ type: 'lowpass', f0: 400, f1: 100, dur: 1.6, vol: 0.2, a: 0.3 });
    },
    rumble() {
      noise({ type: 'lowpass', f0: 300, f1: 120, dur: 0.9, vol: 0.35, a: 0.3 });
      tone({ type: 'sawtooth', f0: 55, f1: 45, dur: 0.9, vol: 0.12, a: 0.3 });
    },
    pew() { tone({ type: 'square', f0: 1200, f1: 500, dur: 0.07, vol: 0.05 }); },
    pop() {
      tone({ type: 'square', f0: 700, f1: 200, dur: 0.07, vol: 0.07 });
      noise({ type: 'bandpass', f0: 1500, dur: 0.08, vol: 0.12 });
    },
    roar() {
      tone({ type: 'sawtooth', f0: 180, f1: 70, dur: 0.9, vol: 0.2, a: 0.08 });
      tone({ type: 'sawtooth', f0: 186, f1: 72, dur: 0.9, vol: 0.15, a: 0.08 });
      noise({ type: 'bandpass', f0: 700, f1: 250, dur: 0.9, vol: 0.3, q: 1.2, a: 0.08 });
    },
  };

  return {
    init, sfx,
    get ctx() { return ac; },
    get muted() { return muted; },
    setMuted(m) { muted = m; },
  };
})();
