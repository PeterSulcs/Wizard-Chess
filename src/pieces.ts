export type PieceSvgKind = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type PieceSvgColor = 'white' | 'black';

const shapes: Record<PieceSvgKind, string> = {
  king: `
    <path d="M50 14v16" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="M42 22h16" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="M37 72c0-16 5-30 13-38 8 8 13 22 13 38"/>
    <path d="M31 80h38" stroke="currentColor" stroke-width="8" stroke-linecap="round" fill="none"/>
    <path d="M35 67h30" stroke="currentColor" stroke-width="6" stroke-linecap="round" fill="none"/>
  `,
  queen: `
    <circle cx="30" cy="24" r="4.2"/>
    <circle cx="43" cy="18" r="4"/>
    <circle cx="57" cy="18" r="4"/>
    <circle cx="70" cy="24" r="4.2"/>
    <path d="M32 30l8 18h20l8-18-12 10-6-10-6 10z"/>
    <path d="M38 50h24c4 6 6 12 7 18H31c1-6 3-12 7-18z"/>
    <path d="M31 80h38" stroke="currentColor" stroke-width="8" stroke-linecap="round" fill="none"/>
    <path d="M35 68h30" stroke="currentColor" stroke-width="6" stroke-linecap="round" fill="none"/>
  `,
  rook: `
    <path d="M32 20h8v10h6V20h8v10h6V20h8v14H32z"/>
    <path d="M36 34h28v32H36z"/>
    <path d="M32 80h36" stroke="currentColor" stroke-width="8" stroke-linecap="round" fill="none"/>
    <path d="M36 68h28" stroke="currentColor" stroke-width="6" stroke-linecap="round" fill="none"/>
  `,
  bishop: `
    <path d="M50 18c7 0 12 6 12 13 0 6-3 10-7 14 7 6 11 14 12 25H33c1-11 5-19 12-25-4-4-7-8-7-14 0-7 5-13 12-13z"/>
    <circle cx="50" cy="28" r="3.5" fill="var(--piece-accent)"/>
    <path d="M46 40l8-9" stroke="var(--piece-accent)" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    <path d="M33 80h34" stroke="currentColor" stroke-width="8" stroke-linecap="round" fill="none"/>
  `,
  knight: `
    <path d="M65 70H34c1-10 6-18 14-23-6-3-9-8-9-15 0-10 7-17 18-17 7 0 13 3 18 10l-9 7c-3-4-6-6-10-6-5 0-8 3-8 7 0 5 4 7 11 9 9 3 14 9 14 19 0 4-1 7-3 9z"/>
    <circle cx="57" cy="33" r="2.8" fill="var(--piece-accent)"/>
    <path d="M32 80h36" stroke="currentColor" stroke-width="8" stroke-linecap="round" fill="none"/>
  `,
  pawn: `
    <circle cx="50" cy="26" r="10"/>
    <path d="M38 48c3-8 7-12 12-12s9 4 12 12l4 18H34z"/>
    <path d="M35 80h30" stroke="currentColor" stroke-width="8" stroke-linecap="round" fill="none"/>
  `,
};

export function pieceSvg(kind: PieceSvgKind, color: PieceSvgColor): string {
  const fill = color === 'white' ? '#f6eadf' : '#140a10';
  const stroke = color === 'white' ? '#fff7f0' : '#f6d7db';
  const accent = color === 'white' ? '#8b1e2d' : '#ef4444';
  return `
    <svg viewBox="0 0 100 100" class="piece-svg piece-${color}" aria-hidden="true">
      <g fill="${fill}" stroke="${stroke}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" style="--piece-accent:${accent}">
        ${shapes[kind]}
      </g>
    </svg>
  `;
}
