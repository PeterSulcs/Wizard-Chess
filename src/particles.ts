// Canvas-based particle effects overlay for captures and spells

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
};

let canvas: HTMLCanvasElement | null = null;
let pctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let animFrameId: number | null = null;

function ensureCanvas(): CanvasRenderingContext2D {
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'particle-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
    document.body.appendChild(canvas);
  }
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  pctx = canvas.getContext('2d')!;
  return pctx;
}

function tick(): void {
  if (!pctx || !canvas) return;
  pctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.life -= 1;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    const alpha = p.life / p.maxLife;
    pctx.globalAlpha = alpha;
    pctx.fillStyle = p.color;
    pctx.beginPath();
    pctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    pctx.fill();
  }

  pctx.globalAlpha = 1;

  if (particles.length > 0) {
    animFrameId = requestAnimationFrame(tick);
  } else {
    animFrameId = null;
  }
}

function startLoop(): void {
  if (animFrameId === null) {
    animFrameId = requestAnimationFrame(tick);
  }
}

// Get center of a square element in viewport coordinates
function squareCenter(el: HTMLElement): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

// Blood burst for captures
export function burstBlood(squareEl: HTMLElement, count = 24): void {
  ensureCanvas();
  const { x, y } = squareCenter(squareEl);
  const colors = ['#dc2626', '#991b1b', '#7f1d1d', '#450a0a', '#fca5a5'];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 4;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 30 + Math.random() * 30,
      maxLife: 60,
      size: 2 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.12,
    });
  }
  startLoop();
}

// Meteor / spell explosion - bigger, more dramatic
export function meteorExplosion(squareEl: HTMLElement): void {
  ensureCanvas();
  const { x, y } = squareCenter(squareEl);
  const colors = ['#f97316', '#dc2626', '#facc15', '#991b1b', '#fbbf24', '#fff'];

  // Central flash
  for (let i = 0; i < 8; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      life: 15 + Math.random() * 10,
      maxLife: 25,
      size: 10 + Math.random() * 15,
      color: '#fff',
      gravity: 0,
    });
  }

  // Outer burst
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 7;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 40 + Math.random() * 40,
      maxLife: 80,
      size: 3 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.1,
    });
  }

  // Embers that float up
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 2,
      vy: -1 - Math.random() * 3,
      life: 60 + Math.random() * 40,
      maxLife: 100,
      size: 1.5 + Math.random() * 3,
      color: '#fbbf24',
      gravity: -0.02,
    });
  }

  startLoop();
}

// Bone fragments for non-spell captures
export function boneShards(squareEl: HTMLElement): void {
  ensureCanvas();
  const { x, y } = squareCenter(squareEl);
  const colors = ['#e8dcc8', '#d4c4a8', '#c9b896', '#f5f0e8'];

  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 3;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 30 + Math.random() * 25,
      maxLife: 55,
      size: 1.5 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.18,
    });
  }
  startLoop();
}
