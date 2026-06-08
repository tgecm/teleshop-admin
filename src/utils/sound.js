function isEnabled() {
  return localStorage.getItem('soundEnabled') !== 'false';
}

let ctx;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function playTone(freq, duration, type = 'sine', volume = 0.15) {
  if (!isEnabled()) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  } catch {}
}

export function clickSound() {
  playTone(600, 0.06, 'sine', 0.08);
}

export function notificationSound() {
  playTone(520, 0.1, 'sine', 0.12);
  setTimeout(() => playTone(780, 0.1, 'sine', 0.1), 110);
}

export function successSound() {
  playTone(523, 0.3, 'sine', 0.14);
  setTimeout(() => playTone(659, 0.3, 'sine', 0.12), 250);
  setTimeout(() => playTone(784, 0.3, 'sine', 0.12), 500);
  setTimeout(() => playTone(1047, 0.6, 'sine', 0.12), 750);
}
