// Web Audio API sound effects - no external files needed
// All sounds are synthesized procedurally

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

export function ensureAudioReady(): void {
  const ac = getCtx();
  if (ac.state === 'suspended') {
    ac.resume();
  }
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.15,
  detune = 0,
): void {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const vol = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  vol.gain.setValueAtTime(gain, ac.currentTime);
  vol.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.connect(vol);
  vol.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

function noise(duration: number, gain = 0.08): void {
  const ac = getCtx();
  const bufferSize = ac.sampleRate * duration;
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ac.createBufferSource();
  source.buffer = buffer;
  const vol = ac.createGain();
  vol.gain.setValueAtTime(gain, ac.currentTime);
  vol.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);

  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;

  source.connect(filter);
  filter.connect(vol);
  vol.connect(ac.destination);
  source.start();
}

// Piece placed on a square - light wooden tap
export function playMove(): void {
  playTone(220, 0.08, 'triangle', 0.12);
  playTone(440, 0.04, 'sine', 0.06);
}

// Piece selected - soft click
export function playSelect(): void {
  playTone(660, 0.05, 'sine', 0.08);
}

// Capture - violent crunch
export function playCapture(): void {
  noise(0.25, 0.18);
  playTone(120, 0.15, 'sawtooth', 0.12);
  playTone(80, 0.3, 'square', 0.06);
  setTimeout(() => {
    playTone(95, 0.12, 'sawtooth', 0.08);
    noise(0.1, 0.1);
  }, 80);
}

// Spell cast - ominous swell + explosion
export function playSpell(): void {
  const ac = getCtx();

  // Rising ominous tone
  const osc = ac.createOscillator();
  const vol = ac.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(80, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, ac.currentTime + 0.3);
  vol.gain.setValueAtTime(0.1, ac.currentTime);
  vol.gain.setValueAtTime(0.2, ac.currentTime + 0.25);
  vol.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6);
  osc.connect(vol);
  vol.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.6);

  // Explosion at peak
  setTimeout(() => {
    noise(0.4, 0.25);
    playTone(60, 0.5, 'square', 0.15);
    playTone(45, 0.4, 'sawtooth', 0.1);
  }, 250);
}

// Check - sharp warning
export function playCheck(): void {
  playTone(880, 0.1, 'square', 0.1);
  setTimeout(() => playTone(660, 0.15, 'square', 0.08), 100);
}

// Checkmate - dramatic fanfare
export function playCheckmate(): void {
  playTone(220, 0.3, 'sawtooth', 0.1);
  setTimeout(() => playTone(277, 0.3, 'sawtooth', 0.1), 200);
  setTimeout(() => playTone(330, 0.3, 'sawtooth', 0.1), 400);
  setTimeout(() => {
    playTone(440, 0.6, 'sawtooth', 0.15);
    playTone(220, 0.6, 'square', 0.08);
  }, 600);
}

// Castling - two thuds
export function playCastle(): void {
  playTone(180, 0.1, 'triangle', 0.12);
  setTimeout(() => {
    playTone(240, 0.1, 'triangle', 0.12);
    playTone(480, 0.05, 'sine', 0.06);
  }, 120);
}

// Game start / restart
export function playRestart(): void {
  playTone(330, 0.12, 'sine', 0.08);
  setTimeout(() => playTone(440, 0.12, 'sine', 0.08), 100);
  setTimeout(() => playTone(550, 0.2, 'sine', 0.1), 200);
}
