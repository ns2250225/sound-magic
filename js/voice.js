'use strict';
// 语音输入：优先使用 Web Speech API 识别「操」及同音字；不可用时退化为「声控模式」（音量起伏检测）
const Voice = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  // 同音/近音字 + 拼音 + 部分浏览器对脏话的 * 号屏蔽
  const TRIGGER = /[操草曹槽糙嘈漕螬艹肏艸蓸屮]|cao|\*/gi;
  const isAndroid = /Android/i.test(navigator.userAgent);

  let mode = SR ? 'speech' : 'volume';
  let active = false, cb = {};
  // speech
  let rec = null, counted = [], netFail = false;
  // volume
  let stream = null, analyser = null, buf = null, volTimer = 0, sens = 0.55;

  const emit = (name, ...args) => cb[name] && cb[name](...args);

  function startSpeech() {
    if (!rec) {
      rec = new SR();
      rec.lang = 'zh-CN';
      rec.interimResults = true;
      // Android Chrome 的 continuous 模式会重复返回结果，改为单句 + 自动重启
      rec.continuous = !isAndroid;
      rec.maxAlternatives = 1;

      rec.onstart = () => { counted = []; emit('status', 'listening'); };

      rec.onresult = e => {
        let text = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          text = t;
          // 中间结果会不断增长，只对新增的触发字施法
          const n = (t.match(TRIGGER) || []).length;
          const c = counted[i] || 0;
          if (n > c) { counted[i] = n; emit('trigger', n - c); }
        }
        emit('text', text);
      };

      rec.onerror = e => {
        if (e.error === 'not-allowed') { active = false; emit('status', 'denied'); }
        else if (e.error === 'service-not-allowed' || e.error === 'network' || e.error === 'language-not-supported') {
          netFail = true; emit('status', 'network');
        } else if (e.error === 'audio-capture') { active = false; emit('status', 'nomic'); }
      };

      rec.onend = () => {
        if (!active || mode !== 'speech') return;
        if (netFail) { netFail = false; setMode('volume'); return; }
        setTimeout(() => { if (active && mode === 'speech') safeStart(); }, 60);
      };
    }
    safeStart();
  }

  function safeStart(retry = 3) {
    try { rec.start(); }
    catch (_) { if (retry > 0) setTimeout(() => active && mode === 'speech' && safeStart(retry - 1), 300); }
  }

  async function startVolume() {
    const ac = Sound.init();
    if (!ac || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { active = false; emit('status', 'nomic'); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
      });
    } catch (err) { active = false; emit('status', 'denied'); return; }
    if (!active || mode !== 'volume') { stopVolume(); return; }

    const src = ac.createMediaStreamSource(stream);
    analyser = ac.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(analyser);
    buf = new Float32Array(analyser.fftSize);
    emit('status', 'listening');

    // 音节起始检测：超过阈值触发一次，回落到峰值的一半以下才重新上膛
    let floor = 0.006, armed = true, peak = 0, trough = 1, last = 0;
    const loop = () => {
      if (!analyser) return;
      analyser.getFloatTimeDomainData(buf);
      let s = 0;
      for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      const rms = Math.sqrt(s / buf.length);
      const now = performance.now();
      const th = Math.max(floor * (2.5 + (1 - sens) * 4), 0.008 + (1 - sens) * 0.07);
      emit('level', Math.min(1, rms / (th * 2)));
      if (armed) {
        trough = Math.min(trough, rms);
        if (rms > th && rms > trough * 1.8 && now - last > 110) {
          armed = false; peak = rms; last = now; emit('trigger', 1);
        } else if (rms < th) {
          floor = floor * 0.97 + rms * 0.03;
        }
      } else {
        peak = Math.max(peak, rms);
        if (rms < Math.max(peak * 0.45, th * 0.7)) { armed = true; trough = rms; }
      }
      volTimer = setTimeout(loop, 16);
    };
    loop();
  }

  function stopVolume() {
    clearTimeout(volTimer);
    analyser = null;
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    emit('level', 0);
  }

  function start() {
    active = true;
    if (mode === 'speech') startSpeech(); else startVolume();
  }

  function stop() {
    active = false;
    if (rec) { try { rec.abort(); } catch (_) {} }
    stopVolume();
    emit('status', 'stopped');
  }

  function setMode(m) {
    if (m === 'speech' && !SR) return false;
    const was = active;
    stop();
    mode = m;
    emit('mode', m);
    if (was) start();
    return true;
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && active && mode === 'speech' && rec) safeStart();
  });

  return {
    TRIGGER,
    supported: !!SR,
    init(callbacks) { cb = callbacks; },
    start, stop, setMode,
    setSensitivity(v) { sens = v; },
    get mode() { return mode; },
    get active() { return active; },
  };
})();
