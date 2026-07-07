/* sound.js — 控えめな打鍵音 (window.Sound) */
window.Sound = (function () {
  let ctx;
  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tick(ok) {
    try {
      const c = ensure();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = ok ? 'sine' : 'triangle';
      o.frequency.value = ok ? 620 : 150;
      o.connect(g); g.connect(c.destination);
      const now = c.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(ok ? 0.045 : 0.07, now + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      o.start(now); o.stop(now + 0.08);
    } catch (e) {}
  }
  return { tick };
})();
