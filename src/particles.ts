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
  shape?: 'circle' | 'streak' | 'splat';
  rotation?: number;
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

    if (p.shape === 'streak') {
      // Elongated blood streak
      pctx.save();
      pctx.translate(p.x, p.y);
      pctx.rotate(p.rotation ?? Math.atan2(p.vy, p.vx));
      const len = p.size * 2.5 * alpha;
      pctx.fillRect(-len / 2, -p.size * alpha / 2, len, p.size * alpha);
      pctx.restore();
    } else if (p.shape === 'splat') {
      // Irregular blood splat
      pctx.save();
      pctx.translate(p.x, p.y);
      pctx.rotate(p.rotation ?? 0);
      const s = p.size * alpha;
      pctx.beginPath();
      pctx.ellipse(0, 0, s * 1.3, s * 0.7, 0, 0, Math.PI * 2);
      pctx.fill();
      // extra blob
      pctx.beginPath();
      pctx.arc(s * 0.8, s * 0.3, s * 0.5, 0, Math.PI * 2);
      pctx.fill();
      pctx.restore();
    } else {
      pctx.beginPath();
      pctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      pctx.fill();
    }
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

// Screen shake effect
function screenShake(intensity = 4, duration = 200): void {
  const board = document.getElementById('board');
  if (!board) return;
  const start = performance.now();
  const shake = () => {
    const elapsed = performance.now() - start;
    if (elapsed > duration) {
      board.style.transform = '';
      return;
    }
    const decay = 1 - elapsed / duration;
    const dx = (Math.random() - 0.5) * 2 * intensity * decay;
    const dy = (Math.random() - 0.5) * 2 * intensity * decay;
    board.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(shake);
  };
  requestAnimationFrame(shake);
}

// Blood burst for captures — maximum carnage
export function burstBlood(squareEl: HTMLElement, count = 55): void {
  ensureCanvas();
  const { x, y } = squareCenter(squareEl);
  const colors = ['#dc2626', '#991b1b', '#7f1d1d', '#450a0a', '#fca5a5', '#b91c1c', '#ef4444'];

  // Main blood burst
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    const shape = Math.random() < 0.3 ? 'streak' : Math.random() < 0.4 ? 'splat' : 'circle';
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 35 + Math.random() * 35,
      maxLife: 70,
      size: 2 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.14,
      shape: shape as 'circle' | 'streak' | 'splat',
      rotation: Math.random() * Math.PI * 2,
    });
  }

  // Blood drips that fall down
  for (let i = 0; i < 14; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y,
      vx: (Math.random() - 0.5) * 0.8,
      vy: 1 + Math.random() * 2,
      life: 50 + Math.random() * 40,
      maxLife: 90,
      size: 2 + Math.random() * 3,
      color: '#7f1d1d',
      gravity: 0.2,
      shape: 'streak',
      rotation: Math.PI / 2,
    });
  }

  // Mist / spray
  for (let i = 0; i < 18; i++) {
    const angle = Math.random() * Math.PI * 2;
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * (0.5 + Math.random()),
      vy: Math.sin(angle) * (0.5 + Math.random()) - 0.5,
      life: 25 + Math.random() * 20,
      maxLife: 45,
      size: 8 + Math.random() * 12,
      color: 'rgba(220, 38, 38, 0.3)',
      gravity: -0.01,
    });
  }

  // Blood pool that expands at the base
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    particles.push({
      x: x + Math.cos(angle) * (2 + Math.random() * 8),
      y: y + 5 + Math.random() * 5,
      vx: Math.cos(angle) * 0.3,
      vy: 0.1 + Math.random() * 0.2,
      life: 70 + Math.random() * 50,
      maxLife: 120,
      size: 10 + Math.random() * 15,
      color: 'rgba(69, 10, 10, 0.6)',
      gravity: 0,
      shape: 'splat',
      rotation: Math.random() * Math.PI * 2,
    });
  }

  screenShake(6, 200);
  startLoop();
}

// Meteor / spell explosion - bigger, more dramatic
export function meteorExplosion(squareEl: HTMLElement): void {
  ensureCanvas();
  const { x, y } = squareCenter(squareEl);
  const colors = ['#f97316', '#dc2626', '#facc15', '#991b1b', '#fbbf24', '#fff'];

  // Central flash
  for (let i = 0; i < 12; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      life: 15 + Math.random() * 10,
      maxLife: 25,
      size: 12 + Math.random() * 20,
      color: '#fff',
      gravity: 0,
    });
  }

  // Outer burst
  for (let i = 0; i < 55; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 9;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 40 + Math.random() * 40,
      maxLife: 80,
      size: 3 + Math.random() * 7,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.1,
      shape: Math.random() < 0.3 ? 'streak' : 'circle',
      rotation: Math.random() * Math.PI * 2,
    });
  }

  // Blood rain falling from explosion
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 60,
      y: y - 10 - Math.random() * 20,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 2 + Math.random() * 4,
      life: 60 + Math.random() * 50,
      maxLife: 110,
      size: 1.5 + Math.random() * 3,
      color: '#991b1b',
      gravity: 0.15,
      shape: 'streak',
      rotation: Math.PI / 2 + (Math.random() - 0.5) * 0.3,
    });
  }

  // Embers that float up
  for (let i = 0; i < 20; i++) {
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

  // Smoke
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 15,
      y: y + (Math.random() - 0.5) * 15,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -0.3 - Math.random() * 0.8,
      life: 50 + Math.random() * 40,
      maxLife: 90,
      size: 15 + Math.random() * 20,
      color: 'rgba(40, 10, 10, 0.4)',
      gravity: -0.01,
    });
  }

  screenShake(8, 300);
  startLoop();
}

// Bone fragments for non-spell captures
export function boneShards(squareEl: HTMLElement): void {
  ensureCanvas();
  const { x, y } = squareCenter(squareEl);
  const colors = ['#e8dcc8', '#d4c4a8', '#c9b896', '#f5f0e8'];

  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      life: 35 + Math.random() * 30,
      maxLife: 65,
      size: 1.5 + Math.random() * 3.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.2,
      shape: Math.random() < 0.5 ? 'streak' : 'circle',
      rotation: Math.random() * Math.PI * 2,
    });
  }
  startLoop();
}
