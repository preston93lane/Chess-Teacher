import { useApp } from './store/app';

let ctx: AudioContext | null = null;

function ac() {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function knock(freq: number, dur: number, gain: number) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 1.4;
  const g = a.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(a.destination);
  src.start(t);
}

function tone(freq: number, dur: number, gain = 0.06) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur);
}

export function playSound(kind: 'move' | 'capture' | 'check' | 'good' | 'bad' | 'end') {
  if (!useApp.getState().settings.sound) return;
  try {
    if (kind === 'move') knock(1800, 0.07, 0.9);
    else if (kind === 'capture') {
      knock(1200, 0.09, 1);
      setTimeout(() => knock(2200, 0.05, 0.6), 35);
    } else if (kind === 'check') {
      knock(1600, 0.07, 0.9);
      tone(880, 0.12, 0.04);
    } else if (kind === 'good') {
      tone(660, 0.1);
      setTimeout(() => tone(990, 0.14), 90);
    } else if (kind === 'bad') tone(220, 0.22, 0.05);
    else if (kind === 'end') {
      tone(523, 0.15);
      setTimeout(() => tone(659, 0.15), 120);
      setTimeout(() => tone(784, 0.25), 240);
    }
  } catch {
    /* audio unavailable */
  }
}

export function soundForSan(san: string) {
  if (san.includes('+') || san.includes('#')) playSound('check');
  else if (san.includes('x')) playSound('capture');
  else playSound('move');
}
