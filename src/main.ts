import './style.css';
import { pieceSvg } from './pieces';
import { ensureAudioReady, playMove, playSelect, playCapture, playSpell, playCheck, playCheckmate, playCastle, playRestart } from './audio';
import { burstBlood, meteorExplosion, boneShards } from './particles';

type Color = 'white' | 'black';
type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

type Piece = {
  color: Color;
  type: PieceType;
};

type Position = { row: number; col: number };
type BoardState = (Piece | null)[][];
type SpellState = Record<Color, boolean>;
type SpellMode = {
  active: boolean;
  origin: Position | null;
  targets: Position[];
};

type CandidateMove = {
  from: Position;
  to: Position;
  captureScore: number;
};

type ArrivalAnimation = {
  piece: Piece;
  capture: boolean;
  from: Position;
  to: Position;
} | null;

type CastlingRights = {
  white: { kingside: boolean; queenside: boolean };
  black: { kingside: boolean; queenside: boolean };
};

const boardEl = requireElement<HTMLDivElement>('board');
const turnLabel = requireElement<HTMLElement>('turnLabel');
const statusLabel = requireElement<HTMLElement>('statusLabel');
const killLabel = requireElement<HTMLElement>('killLabel');
const logEl = requireElement<HTMLUListElement>('log');
const restartBtn = requireElement<HTMLButtonElement>('restartBtn');
const whiteSpellLabel = requireElement<HTMLElement>('whiteSpellLabel');
const blackSpellLabel = requireElement<HTMLElement>('blackSpellLabel');

const pieceValues: Record<PieceType, number> = {
  king: 100,
  queen: 9,
  rook: 5,
  bishop: 3,
  knight: 3,
  pawn: 1,
};

// Piece-square tables for AI evaluation (from black's perspective, flipped for white)
const pst: Record<PieceType, number[]> = {
  pawn: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  knight: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  bishop: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  rook: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  queen: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  king: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
};

const bloodStains = new Set<string>();
let board = initialBoard();
let turn: Color = 'white';
let selected: Position | null = null;
let validMoves: Position[] = [];
let gameOver = false;
let winner: Color | null = null;
let ending: 'checkmate' | 'stalemate' | null = null;
let logLines: string[] = [
  'The board thirsts. White must make the opening sacrifice.',
];
let spellCharges: SpellState = { white: true, black: true };
let spellMode: SpellMode = { active: false, origin: null, targets: [] };
let aiThinking = false;
let longPressTimer: number | null = null;
let arrivalAnimation: ArrivalAnimation = null;
let interactionLocked = false;
let dragState: { piece: Piece; from: Position; el: HTMLElement; offsetX: number; offsetY: number } | null = null;
let castlingRights: CastlingRights = {
  white: { kingside: true, queenside: true },
  black: { kingside: true, queenside: true },
};
let enPassantTarget: Position | null = null;
let capturedPieces: { white: Piece[]; black: Piece[] } = { white: [], black: [] };

restartBtn.addEventListener('click', resetGame);
render();

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element as T;
}

function resetGame(): void {
  board = initialBoard();
  turn = 'white';
  selected = null;
  validMoves = [];
  gameOver = false;
  winner = null;
  ending = null;
  aiThinking = false;
  interactionLocked = false;
  arrivalAnimation = null;
  spellCharges = { white: true, black: true };
  spellMode = { active: false, origin: null, targets: [] };
  castlingRights = {
    white: { kingside: true, queenside: true },
    black: { kingside: true, queenside: true },
  };
  enPassantTarget = null;
  capturedPieces = { white: [], black: [] };
  bloodStains.clear();
  logLines = ['The dead rise. A fresh massacre begins.'];
  killLabel.textContent = 'None yet';
  removeOverlay();
  playRestart();
  render();
}

function initialBoard(): BoardState {
  const back: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  return [
    back.map((type) => ({ color: 'black', type })),
    Array.from({ length: 8 }, () => ({ color: 'black', type: 'pawn' as const })),
    Array.from({ length: 8 }, () => null),
    Array.from({ length: 8 }, () => null),
    Array.from({ length: 8 }, () => null),
    Array.from({ length: 8 }, () => null),
    Array.from({ length: 8 }, () => ({ color: 'white', type: 'pawn' as const })),
    back.map((type) => ({ color: 'white', type })),
  ];
}

function render(): void {
  boardEl.innerHTML = '';
  turnLabel.textContent = capitalize(turn);
  whiteSpellLabel.textContent = spellCharges.white ? 'Meteor ready' : 'Spent';
  blackSpellLabel.textContent = spellCharges.black ? 'Meteor ready' : 'Spent';
  statusLabel.textContent = currentStatus();

  // Render rank labels (numbers) on left side
  for (let row = 0; row < 8; row++) {
    const label = document.createElement('span');
    label.className = 'rank-label';
    label.textContent = String(8 - row);
    label.style.gridRow = String(row + 1);
    label.style.gridColumn = '1';
    boardEl.appendChild(label);
  }

  board.forEach((row, rowIndex) => {
    row.forEach((piece, colIndex) => {
      const position = { row: rowIndex, col: colIndex };
      const square = document.createElement('button');
      square.className = `square ${(rowIndex + colIndex) % 2 === 0 ? 'light' : 'dark'}`;
      square.type = 'button';
      square.dataset.row = String(rowIndex);
      square.dataset.col = String(colIndex);
      square.style.gridRow = String(rowIndex + 1);
      square.style.gridColumn = String(colIndex + 2); // +2 for rank labels

      if (bloodStains.has(squareKey(position))) {
        square.classList.add('bloody');
      }
      if (selected?.row === rowIndex && selected.col === colIndex) {
        square.classList.add('selected');
      }
      if (spellMode.origin?.row === rowIndex && spellMode.origin.col === colIndex) {
        square.classList.add('spell-origin');
      }
      if (piece?.type === 'king' && isInCheck(board, piece.color)) {
        square.classList.add('in-check');
      }

      const normalMove = validMoves.find((candidate) => candidate.row === rowIndex && candidate.col === colIndex);
      if (normalMove) {
        const target = board[rowIndex][colIndex];
        square.classList.add(target ? 'capture' : 'valid');
        // Also mark en passant captures
        if (!target && selected) {
          const selectedPiece = board[selected.row][selected.col];
          if (selectedPiece?.type === 'pawn' && colIndex !== selected.col) {
            square.classList.remove('valid');
            square.classList.add('capture');
          }
        }
      }

      const spellTarget = spellMode.targets.find((candidate) => candidate.row === rowIndex && candidate.col === colIndex);
      if (spellTarget) {
        square.classList.add('spell-target');
      }

      if (piece) {
        const glyph = document.createElement('span');
        const isAnimated = arrivalAnimation
          && arrivalAnimation.to.row === rowIndex
          && arrivalAnimation.to.col === colIndex;
        glyph.className = `piece piece-${piece.color}`;
        if (isAnimated && arrivalAnimation) {
          const dRow = arrivalAnimation.to.row - arrivalAnimation.from.row;
          const dCol = arrivalAnimation.to.col - arrivalAnimation.from.col;
          glyph.style.setProperty('--slide-x', `${-dCol * 100}%`);
          glyph.style.setProperty('--slide-y', `${-dRow * 100}%`);
          glyph.classList.add('piece-sliding');
          if (arrivalAnimation.capture) {
            glyph.classList.add('piece-slam');
          }
          glyph.addEventListener('animationend', () => {
            arrivalAnimation = null;
            render();
          }, { once: true });
        }
        glyph.innerHTML = pieceSvg(piece.type, piece.color);

        // Drag support for white pieces
        if (piece.color === 'white' && !gameOver && !aiThinking && !interactionLocked && turn === 'white') {
          glyph.style.touchAction = 'none';
          glyph.addEventListener('pointerdown', (e) => {
            // Don't start drag on right-click
            if (e.button !== 0) return;
            e.stopPropagation();
            onDragStart(e, position, glyph);
          });
        }

        square.appendChild(glyph);
      }

      square.addEventListener('pointerdown', () => onSquarePointerDown(position));
      square.addEventListener('pointerup', clearLongPress);
      square.addEventListener('pointerleave', clearLongPress);
      square.addEventListener('pointercancel', clearLongPress);
      square.addEventListener('click', () => onSquareClick(position, square));
      boardEl.appendChild(square);
    });
  });

  // Render file labels (letters) at bottom
  for (let col = 0; col < 8; col++) {
    const label = document.createElement('span');
    label.className = 'file-label';
    label.textContent = String.fromCharCode(97 + col);
    label.style.gridRow = '9';
    label.style.gridColumn = String(col + 2);
    boardEl.appendChild(label);
  }

  // Render captured pieces
  renderCaptured();

  logEl.innerHTML = '';
  for (const line of logLines.slice(-10).reverse()) {
    const item = document.createElement('li');
    item.textContent = line;
    logEl.appendChild(item);
  }
}

function renderCaptured(): void {
  let tray = document.getElementById('capturedTray');
  if (!tray) {
    tray = document.createElement('div');
    tray.id = 'capturedTray';
    tray.className = 'captured-tray';
    boardEl.parentElement!.appendChild(tray);
  }
  tray.innerHTML = '';

  for (const color of ['white', 'black'] as Color[]) {
    const pieces = capturedPieces[color];
    if (pieces.length === 0) continue;
    const row = document.createElement('div');
    row.className = `captured-row captured-${color}`;
    const label = document.createElement('span');
    label.className = 'captured-label';
    label.textContent = `${capitalize(color)} lost:`;
    row.appendChild(label);
    // Sort by value descending
    const sorted = [...pieces].sort((a, b) => pieceValues[b.type] - pieceValues[a.type]);
    for (const p of sorted) {
      const icon = document.createElement('span');
      icon.className = `captured-piece piece-${p.color}`;
      icon.innerHTML = pieceSvg(p.type, p.color);
      row.appendChild(icon);
    }
    tray.appendChild(row);
  }
}

function currentStatus(): string {
  if (gameOver && winner && ending === 'checkmate') {
    return `${capitalize(winner)} wins by checkmate`;
  }
  if (gameOver && ending === 'stalemate') {
    return 'Stalemate. The slaughter stalls.';
  }
  if (aiThinking) {
    return 'Black automaton is contemplating murder';
  }
  if (interactionLocked) {
    return 'Bones slide across the board';
  }
  if (spellMode.active) {
    return spellMode.origin ? 'Tap a skull-marked enemy to drop the meteor' : 'Long-press your caster';
  }
  if (selected) {
    return 'Choose a glowing destination';
  }
  if (isInCheck(board, turn)) {
    return `${capitalize(turn)} is in check`;
  }
  if (turn === 'white' && spellCharges.white) {
    return 'Tap to move or long-press a piece for blood meteor';
  }
  return 'Choose a piece';
}

function onSquarePointerDown(position: Position): void {
  if (gameOver || aiThinking || interactionLocked || turn !== 'white' || !spellCharges.white) {
    return;
  }
  const piece = board[position.row][position.col];
  if (!piece || piece.color !== 'white') {
    return;
  }
  clearLongPress();
  longPressTimer = window.setTimeout(() => {
    activateSpellMode(position);
  }, 420);
}

function clearLongPress(): void {
  if (longPressTimer !== null) {
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function activateSpellMode(origin: Position): void {
  const piece = board[origin.row][origin.col];
  if (!piece || piece.color !== turn || !spellCharges[turn] || interactionLocked) {
    return;
  }
  selected = null;
  validMoves = [];
  spellMode = {
    active: true,
    origin,
    targets: spellTargets(board, origin, turn),
  };
  if (spellMode.targets.length === 0) {
    spellMode = { active: false, origin: null, targets: [] };
    logLines.push(`${pieceText(piece)} whispers to the meteor, but no adjacent flesh is ripe for bursting.`);
  } else {
    logLines.push(`${pieceText(piece)} begins chanting. Tap a skull-marked adjacent enemy to pulp it.`);
  }
  render();
}

function onSquareClick(position: Position, squareEl: HTMLButtonElement): void {
  clearLongPress();
  ensureAudioReady();

  if (gameOver || aiThinking || interactionLocked || turn !== 'white') {
    return;
  }

  if (spellMode.active) {
    handleSpellClick(position, squareEl);
    return;
  }

  const piece = board[position.row][position.col];

  if (selected) {
    const move = validMoves.find((candidate) => candidate.row === position.row && candidate.col === position.col);
    if (move) {
      makeMove(selected, move, squareEl);
      return;
    }
  }

  if (!piece || piece.color !== turn) {
    selected = null;
    validMoves = [];
    render();
    return;
  }

  selected = position;
  validMoves = legalMoves(board, position, castlingRights, enPassantTarget);
  playSelect();
  render();
}

function handleSpellClick(position: Position, squareEl: HTMLButtonElement): void {
  const chosen = spellMode.targets.find((target) => target.row === position.row && target.col === position.col);
  if (!chosen || !spellMode.origin) {
    spellMode = { active: false, origin: null, targets: [] };
    render();
    return;
  }

  castSpell(turn, spellMode.origin, chosen, squareEl);
}

function castSpell(color: Color, origin: Position, targetPosition: Position, squareEl: HTMLButtonElement): void {
  const caster = board[origin.row][origin.col];
  const victim = board[targetPosition.row][targetPosition.col];
  if (!caster || !victim || victim.color === color || victim.type === 'king' || !spellCharges[color]) {
    spellMode = { active: false, origin: null, targets: [] };
    render();
    return;
  }

  const next = cloneBoard(board);
  next[targetPosition.row][targetPosition.col] = null;
  if (isInCheck(next, color)) {
    logLines.push(`${pieceText(caster)} cannot cast while leaving the king exposed.`);
    spellMode = { active: false, origin: null, targets: [] };
    render();
    return;
  }

  board = next;
  capturedPieces[victim.color].push(victim);
  bloodStains.add(squareKey(targetPosition));
  spellCharges[color] = false;
  spellMode = { active: false, origin: null, targets: [] };
  selected = null;
  validMoves = [];
  squareEl.classList.add('gore');
  playSpell();
  meteorExplosion(squareEl);
  killLabel.textContent = `${pieceText(caster)} incinerated ${pieceText(victim)}`;
  logLines.push(`${pieceText(caster)} calls down a blood meteor, turning ${pieceText(victim)} into a red paste at ${notation(targetPosition)}.`);
  finishTurn();
  render();
}

function makeMove(from: Position, to: Position, squareEl: HTMLButtonElement): void {
  const piece = board[from.row][from.col];
  if (!piece) {
    return;
  }

  const target = board[to.row][to.col];
  let capturedPiece = target;

  // En passant capture
  if (piece.type === 'pawn' && !target && to.col !== from.col) {
    const epRow = from.row;
    const epVictim = board[epRow][to.col];
    if (epVictim) {
      capturedPiece = epVictim;
      board[epRow][to.col] = null;
      bloodStains.add(squareKey({ row: epRow, col: to.col }));
    }
  }

  // Castling: move the rook
  if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
    const row = from.row;
    if (to.col === 6) { // kingside
      board[row][5] = board[row][7];
      board[row][7] = null;
    } else if (to.col === 2) { // queenside
      board[row][3] = board[row][0];
      board[row][0] = null;
    }
    logLines.push(`${capitalize(piece.color)} king castles. The fortress shifts.`);
  }

  board[to.row][to.col] = piece;
  board[from.row][from.col] = null;
  arrivalAnimation = { piece, from, to, capture: !!capturedPiece };
  interactionLocked = true;

  // Update castling rights
  if (piece.type === 'king') {
    castlingRights[piece.color].kingside = false;
    castlingRights[piece.color].queenside = false;
  }
  if (piece.type === 'rook') {
    if (from.col === 0) castlingRights[piece.color].queenside = false;
    if (from.col === 7) castlingRights[piece.color].kingside = false;
  }
  // If a rook is captured, revoke that side's castling
  if (capturedPiece?.type === 'rook') {
    const capturedColor = capturedPiece.color;
    if (to.col === 0) castlingRights[capturedColor].queenside = false;
    if (to.col === 7) castlingRights[capturedColor].kingside = false;
  }

  // Update en passant target
  if (piece.type === 'pawn' && Math.abs(to.row - from.row) === 2) {
    enPassantTarget = { row: (from.row + to.row) / 2, col: from.col };
  } else {
    enPassantTarget = null;
  }

  // Promotion
  if (piece.type === 'pawn' && (to.row === 0 || to.row === 7)) {
    board[to.row][to.col] = { color: piece.color, type: 'queen' };
    logLines.push(`${capitalize(piece.color)} pawn crawls into the grave-light and returns as a queen.`);
  }

  if (capturedPiece) {
    capturedPieces[capturedPiece.color].push(capturedPiece);
    bloodStains.add(squareKey(to));
    squareEl.classList.add('gore');
    playCapture();
    burstBlood(squareEl);
    boneShards(squareEl);
    logLines.push(goreLine(piece, capturedPiece, to));
    killLabel.textContent = `${pieceText(piece)} butchered ${pieceText(capturedPiece)}`;
  } else if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
    playCastle();
  } else {
    playMove();
    logLines.push(`${pieceText(piece)} glides to ${notation(to)}.`);
  }

  selected = null;
  validMoves = [];
  render();

  window.setTimeout(() => {
    interactionLocked = false;
    finishTurn();
    render();
  }, 220);
}

function finishTurn(): void {
  turn = opponent(turn);
  const nextMoves = allMovesForColor(board, turn, castlingRights, enPassantTarget);
  if (nextMoves.length === 0) {
    gameOver = true;
    if (isInCheck(board, turn)) {
      winner = opponent(turn);
      ending = 'checkmate';
      logLines.push(`${capitalize(winner)} has delivered checkmate. The board weeps blood.`);
      playCheckmate();
      showOverlay(winner);
    } else {
      winner = null;
      ending = 'stalemate';
      logLines.push('No legal moves remain. Stalemate.');
      showOverlay(null);
    }
    return;
  }
  if (isInCheck(board, turn)) {
    logLines.push(`${capitalize(turn)} is in check.`);
    playCheck();
  }
  if (turn === 'black' && !gameOver) {
    aiThinking = true;
    render();
    window.setTimeout(() => {
      aiMove();
      aiThinking = false;
      render();
    }, 400);
  }
}

// --- AI with minimax ---

function aiMove(): void {
  const spellChoice = aiSpellChoice();
  if (spellChoice) {
    const { origin, target } = spellChoice;
    castSpell('black', origin, target, squareAt(target));
    return;
  }

  const moves = allMovesForColor(board, 'black', castlingRights, enPassantTarget);
  if (moves.length === 0) {
    gameOver = true;
    return;
  }

  let bestScore = -Infinity;
  let bestMoves: CandidateMove[] = [];

  for (const move of moves) {
    const simBoard = cloneBoard(board);
    const simCastling = cloneCastlingRights(castlingRights);
    applyMoveToSim(simBoard, move.from, move.to, simCastling);

    const score = minimax(simBoard, 2, -Infinity, Infinity, false, simCastling, null);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  makeMove(chosen.from, chosen.to, squareAt(chosen.to));
}

function minimax(
  state: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  cr: CastlingRights,
  ep: Position | null,
): number {
  if (depth === 0) {
    return evaluateBoard(state);
  }

  const color: Color = isMaximizing ? 'black' : 'white';
  const moves = allMovesForColor(state, color, cr, ep);

  if (moves.length === 0) {
    if (isInCheck(state, color)) {
      return isMaximizing ? -9999 : 9999;
    }
    return 0; // stalemate
  }

  // Order captures first for better pruning
  moves.sort((a, b) => b.captureScore - a.captureScore);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const sim = cloneBoard(state);
      const simCr = cloneCastlingRights(cr);
      applyMoveToSim(sim, move.from, move.to, simCr);
      const score = minimax(sim, depth - 1, alpha, beta, false, simCr, null);
      maxEval = Math.max(maxEval, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const sim = cloneBoard(state);
      const simCr = cloneCastlingRights(cr);
      applyMoveToSim(sim, move.from, move.to, simCr);
      const score = minimax(sim, depth - 1, alpha, beta, true, simCr, null);
      minEval = Math.min(minEval, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function applyMoveToSim(state: BoardState, from: Position, to: Position, cr: CastlingRights): void {
  const piece = state[from.row][from.col];
  if (!piece) return;

  // En passant
  if (piece.type === 'pawn' && !state[to.row][to.col] && to.col !== from.col) {
    state[from.row][to.col] = null;
  }

  // Castling rook
  if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
    const row = from.row;
    if (to.col === 6) {
      state[row][5] = state[row][7];
      state[row][7] = null;
    } else if (to.col === 2) {
      state[row][3] = state[row][0];
      state[row][0] = null;
    }
  }

  state[to.row][to.col] = piece;
  state[from.row][from.col] = null;

  // Promotion
  if (piece.type === 'pawn' && (to.row === 0 || to.row === 7)) {
    state[to.row][to.col] = { color: piece.color, type: 'queen' };
  }

  // Update castling rights
  if (piece.type === 'king') {
    cr[piece.color].kingside = false;
    cr[piece.color].queenside = false;
  }
  if (piece.type === 'rook') {
    if (from.col === 0) cr[piece.color].queenside = false;
    if (from.col === 7) cr[piece.color].kingside = false;
  }
}

function evaluateBoard(state: BoardState): number {
  let score = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = state[row][col];
      if (!piece) continue;
      const materialValue = pieceValues[piece.type] * 100;
      // PST index: for black pieces, use row*8+col; for white, flip the row
      const pstIndex = piece.color === 'black' ? row * 8 + col : (7 - row) * 8 + col;
      const positionalValue = pst[piece.type][pstIndex];
      if (piece.color === 'black') {
        score += materialValue + positionalValue;
      } else {
        score -= materialValue + positionalValue;
      }
    }
  }
  return score;
}

function cloneCastlingRights(cr: CastlingRights): CastlingRights {
  return {
    white: { ...cr.white },
    black: { ...cr.black },
  };
}

function aiSpellChoice(): { origin: Position; target: Position } | null {
  if (!spellCharges.black) {
    return null;
  }
  let best: { origin: Position; target: Position; score: number } | null = null;
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.color !== 'black') {
        continue;
      }
      for (const target of spellTargets(board, { row, col }, 'black')) {
        const victim = board[target.row][target.col];
        if (!victim || victim.type === 'king') {
          continue;
        }
        const next = cloneBoard(board);
        next[target.row][target.col] = null;
        if (isInCheck(next, 'black')) {
          continue;
        }
        const score = pieceValues[victim.type];
        if (!best || score > best.score) {
          best = { origin: { row, col }, target, score };
        }
      }
    }
  }
  if (!best || best.score < 3) {
    return null;
  }
  return { origin: best.origin, target: best.target };
}

// --- Move generation ---

function allMovesForColor(state: BoardState, color: Color, cr: CastlingRights, ep: Position | null): CandidateMove[] {
  const moves: CandidateMove[] = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = state[row][col];
      if (!piece || piece.color !== color) {
        continue;
      }
      for (const move of legalMoves(state, { row, col }, cr, ep)) {
        const target = state[move.row][move.col];
        let captureScore = target ? pieceValues[target.type] : 0;
        // Score en passant captures
        if (piece.type === 'pawn' && !target && move.col !== col) {
          captureScore = pieceValues.pawn;
        }
        moves.push({
          from: { row, col },
          to: move,
          captureScore,
        });
      }
    }
  }
  return moves;
}

function legalMoves(state: BoardState, position: Position, cr: CastlingRights, ep: Position | null): Position[] {
  const piece = state[position.row][position.col];
  if (!piece) {
    return [];
  }
  return pseudoMoves(state, position, cr, ep).filter((move) => {
    const next = cloneBoard(state);

    // En passant removal
    if (piece.type === 'pawn' && !next[move.row][move.col] && move.col !== position.col) {
      next[position.row][move.col] = null;
    }

    // Castling: also move the rook so we can check legality
    if (piece.type === 'king' && Math.abs(move.col - position.col) === 2) {
      const row = position.row;
      if (move.col === 6) {
        next[row][5] = next[row][7];
        next[row][7] = null;
      } else if (move.col === 2) {
        next[row][3] = next[row][0];
        next[row][0] = null;
      }
    }

    next[move.row][move.col] = next[position.row][position.col];
    next[position.row][position.col] = null;
    const moved = next[move.row][move.col];
    if (moved?.type === 'pawn' && (move.row === 0 || move.row === 7)) {
      next[move.row][move.col] = { color: moved.color, type: 'queen' };
    }
    return !isInCheck(next, piece.color);
  });
}

function pseudoMoves(state: BoardState, position: Position, cr: CastlingRights, ep: Position | null): Position[] {
  const piece = state[position.row][position.col];
  if (!piece) {
    return [];
  }

  const candidates: Position[] = [];
  const forward = piece.color === 'white' ? -1 : 1;

  switch (piece.type) {
    case 'pawn': {
      const one = { row: position.row + forward, col: position.col };
      if (inBounds(one) && !state[one.row][one.col]) {
        candidates.push(one);
        const startRow = piece.color === 'white' ? 6 : 1;
        const two = { row: position.row + forward * 2, col: position.col };
        if (position.row === startRow && inBounds(two) && !state[two.row][two.col]) {
          candidates.push(two);
        }
      }
      for (const offset of [-1, 1]) {
        const attack = { row: position.row + forward, col: position.col + offset };
        if (!inBounds(attack)) continue;
        const occupant = state[attack.row][attack.col];
        if (occupant && occupant.color !== piece.color) {
          candidates.push(attack);
        }
        // En passant
        if (ep && attack.row === ep.row && attack.col === ep.col) {
          candidates.push(attack);
        }
      }
      break;
    }
    case 'rook':
      pushSlidingMoves(state, candidates, position, piece.color, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
      break;
    case 'bishop':
      pushSlidingMoves(state, candidates, position, piece.color, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
      break;
    case 'queen':
      pushSlidingMoves(state, candidates, position, piece.color, [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
      break;
    case 'knight':
      pushStepMoves(state, candidates, position, piece.color, [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]]);
      break;
    case 'king': {
      pushStepMoves(state, candidates, position, piece.color, [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
      // Castling
      const rights = cr[piece.color];
      const row = piece.color === 'white' ? 7 : 0;
      if (position.row === row && position.col === 4 && !isInCheck(state, piece.color)) {
        // Kingside
        if (rights.kingside && !state[row][5] && !state[row][6] && state[row][7]?.type === 'rook') {
          if (!isSquareAttacked(state, { row, col: 5 }, opponent(piece.color)) &&
              !isSquareAttacked(state, { row, col: 6 }, opponent(piece.color))) {
            candidates.push({ row, col: 6 });
          }
        }
        // Queenside
        if (rights.queenside && !state[row][1] && !state[row][2] && !state[row][3] && state[row][0]?.type === 'rook') {
          if (!isSquareAttacked(state, { row, col: 2 }, opponent(piece.color)) &&
              !isSquareAttacked(state, { row, col: 3 }, opponent(piece.color))) {
            candidates.push({ row, col: 2 });
          }
        }
      }
      break;
    }
  }

  return candidates;
}

function isSquareAttacked(state: BoardState, pos: Position, byColor: Color): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = state[row][col];
      if (!piece || piece.color !== byColor) continue;
      // Use basic pseudo moves without castling to avoid recursion
      const attacks = basicPseudoMoves(state, { row, col }, piece);
      if (attacks.some((a) => a.row === pos.row && a.col === pos.col)) {
        return true;
      }
    }
  }
  return false;
}

// Pseudo moves without castling (to avoid infinite recursion in isSquareAttacked)
function basicPseudoMoves(state: BoardState, position: Position, piece: Piece): Position[] {
  const candidates: Position[] = [];
  const forward = piece.color === 'white' ? -1 : 1;

  switch (piece.type) {
    case 'pawn': {
      for (const offset of [-1, 1]) {
        const attack = { row: position.row + forward, col: position.col + offset };
        if (inBounds(attack)) {
          candidates.push(attack);
        }
      }
      break;
    }
    case 'rook':
      pushSlidingMoves(state, candidates, position, piece.color, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
      break;
    case 'bishop':
      pushSlidingMoves(state, candidates, position, piece.color, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
      break;
    case 'queen':
      pushSlidingMoves(state, candidates, position, piece.color, [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
      break;
    case 'knight':
      pushStepMoves(state, candidates, position, piece.color, [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]]);
      break;
    case 'king':
      pushStepMoves(state, candidates, position, piece.color, [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
      break;
  }

  return candidates;
}

function isInCheck(state: BoardState, color: Color): boolean {
  const king = findKing(state, color);
  if (!king) {
    return false;
  }
  return isSquareAttacked(state, king, opponent(color));
}

function findKing(state: BoardState, color: Color): Position | null {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = state[row][col];
      if (piece?.color === color && piece.type === 'king') {
        return { row, col };
      }
    }
  }
  return null;
}

function cloneBoard(state: BoardState): BoardState {
  return state.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function squareAt(position: Position): HTMLButtonElement {
  return boardEl.querySelector(`[data-row="${position.row}"][data-col="${position.col}"]`) as HTMLButtonElement;
}

function spellTargets(state: BoardState, origin: Position, color: Color): Position[] {
  const targets: Position[] = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }
      const target = { row: origin.row + rowOffset, col: origin.col + colOffset };
      if (!inBounds(target)) {
        continue;
      }
      const occupant = state[target.row][target.col];
      if (occupant && occupant.color !== color) {
        targets.push(target);
      }
    }
  }
  return targets;
}

function goreLine(attacker: Piece, victim: Piece, to: Position): string {
  const lines = [
    `${pieceText(attacker)} hacks ${pieceText(victim)} apart at ${notation(to)}. Bone fragments bless the board.`,
    `${pieceText(attacker)} pulps ${pieceText(victim)} into gobbets and ruin on ${notation(to)}.`,
    `${pieceText(victim)} bursts under ${pieceText(attacker)}, painting ${notation(to)} with hot arterial filth.`,
    `${pieceText(attacker)} leaves only a steaming stain and loose bones where ${pieceText(victim)} stood on ${notation(to)}.`,
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

function pushSlidingMoves(state: BoardState, candidates: Position[], origin: Position, color: Color, directions: number[][]): void {
  for (const [rowStep, colStep] of directions) {
    let row = origin.row + rowStep;
    let col = origin.col + colStep;
    while (inBounds({ row, col })) {
      const occupant = state[row][col];
      if (!occupant) {
        candidates.push({ row, col });
      } else {
        if (occupant.color !== color) {
          candidates.push({ row, col });
        }
        break;
      }
      row += rowStep;
      col += colStep;
    }
  }
}

function pushStepMoves(state: BoardState, candidates: Position[], origin: Position, color: Color, steps: number[][]): void {
  for (const [rowStep, colStep] of steps) {
    const target = { row: origin.row + rowStep, col: origin.col + colStep };
    if (!inBounds(target)) {
      continue;
    }
    const occupant = state[target.row][target.col];
    if (!occupant || occupant.color !== color) {
      candidates.push(target);
    }
  }
}

function inBounds(position: Position): boolean {
  return position.row >= 0 && position.row < 8 && position.col >= 0 && position.col < 8;
}

function squareKey(position: Position): string {
  return `${position.row},${position.col}`;
}

function opponent(color: Color): Color {
  return color === 'white' ? 'black' : 'white';
}

function pieceText(piece: Piece): string {
  return `${piece.color} ${piece.type}`;
}

function notation(position: Position): string {
  return `${String.fromCharCode(97 + position.col)}${8 - position.row}`;
}

// --- Drag and Drop ---

function onDragStart(e: PointerEvent, position: Position, glyphEl: HTMLElement): void {
  if (gameOver || aiThinking || interactionLocked || turn !== 'white' || spellMode.active) return;
  const piece = board[position.row][position.col];
  if (!piece || piece.color !== 'white') return;

  // Select this piece and compute legal moves
  selected = position;
  validMoves = legalMoves(board, position, castlingRights, enPassantTarget);

  const rect = glyphEl.getBoundingClientRect();
  dragState = {
    piece,
    from: position,
    el: glyphEl,
    offsetX: e.clientX - rect.left - rect.width / 2,
    offsetY: e.clientY - rect.top - rect.height / 2,
  };

  glyphEl.classList.add('dragging');
  glyphEl.style.position = 'fixed';
  glyphEl.style.zIndex = '1000';
  glyphEl.style.width = `${rect.width}px`;
  glyphEl.style.height = `${rect.height}px`;
  glyphEl.style.pointerEvents = 'none';
  glyphEl.style.left = `${e.clientX - rect.width / 2}px`;
  glyphEl.style.top = `${e.clientY - rect.height / 2}px`;
  glyphEl.setPointerCapture(e.pointerId);

  playSelect();
  render();
  // Re-attach the dragged element since render clears the board
  document.body.appendChild(glyphEl);
}

function onDragMove(e: PointerEvent): void {
  if (!dragState) return;
  const { el } = dragState;
  const w = parseFloat(el.style.width);
  const h = parseFloat(el.style.height);
  el.style.left = `${e.clientX - w / 2}px`;
  el.style.top = `${e.clientY - h / 2}px`;

  // Highlight square under cursor
  const target = document.elementFromPoint(e.clientX, e.clientY);
  boardEl.querySelectorAll('.drag-hover').forEach((el) => el.classList.remove('drag-hover'));
  if (target && target instanceof HTMLElement) {
    const sq = target.closest('.square') as HTMLElement | null;
    if (sq) sq.classList.add('drag-hover');
  }
}

function onDragEnd(e: PointerEvent): void {
  if (!dragState) return;
  const { from, el } = dragState;

  boardEl.querySelectorAll('.drag-hover').forEach((el) => el.classList.remove('drag-hover'));

  // Find which square we dropped on
  el.style.display = 'none';
  const target = document.elementFromPoint(e.clientX, e.clientY);
  el.style.display = '';
  el.remove();

  let dropped = false;
  if (target && target instanceof HTMLElement) {
    const sq = target.closest('.square') as HTMLElement | null;
    if (sq && sq.dataset.row && sq.dataset.col) {
      const to = { row: Number(sq.dataset.row), col: Number(sq.dataset.col) };
      const isValid = validMoves.some((m) => m.row === to.row && m.col === to.col);
      if (isValid) {
        dropped = true;
        dragState = null;
        makeMove(from, to, sq as HTMLButtonElement);
        return;
      }
    }
  }

  dragState = null;
  if (!dropped) {
    selected = null;
    validMoves = [];
    render();
  }
}

document.addEventListener('pointermove', onDragMove);
document.addEventListener('pointerup', onDragEnd);

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// --- Game Over Overlay ---

function showOverlay(winnerColor: Color | null): void {
  removeOverlay();
  const overlay = document.createElement('div');
  overlay.id = 'gameOverOverlay';
  overlay.className = 'game-over-overlay';

  const inner = document.createElement('div');
  inner.className = 'game-over-inner';

  const title = document.createElement('h2');
  if (winnerColor) {
    title.textContent = winnerColor === 'white' ? 'Victory' : 'Defeat';
    title.className = winnerColor === 'white' ? 'victory-text' : 'defeat-text';
  } else {
    title.textContent = 'Stalemate';
    title.className = 'stalemate-text';
  }

  const subtitle = document.createElement('p');
  if (winnerColor === 'white') {
    subtitle.textContent = 'The automaton crumbles. Your reign of blood is absolute.';
  } else if (winnerColor === 'black') {
    subtitle.textContent = 'The machine has devoured your king. Darkness reigns.';
  } else {
    subtitle.textContent = 'Neither side draws breath. The board is a tomb.';
  }

  const btn = document.createElement('button');
  btn.textContent = 'Resurrect the Board';
  btn.className = 'overlay-restart-btn';
  btn.addEventListener('click', resetGame);

  inner.appendChild(title);
  inner.appendChild(subtitle);
  inner.appendChild(btn);
  overlay.appendChild(inner);
  document.body.appendChild(overlay);

  // Animate in
  requestAnimationFrame(() => overlay.classList.add('visible'));
}

function removeOverlay(): void {
  const existing = document.getElementById('gameOverOverlay');
  if (existing) existing.remove();
}
