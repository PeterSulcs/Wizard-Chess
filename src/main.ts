import './style.css';

type Color = 'white' | 'black';
type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

type Piece = {
  color: Color;
  type: PieceType;
};

type Position = { row: number; col: number };

type Move = Position;

type BoardState = (Piece | null)[][];

const boardEl = requireElement<HTMLDivElement>('board');
const turnLabel = requireElement<HTMLElement>('turnLabel');
const statusLabel = requireElement<HTMLElement>('statusLabel');
const killLabel = requireElement<HTMLElement>('killLabel');
const logEl = requireElement<HTMLUListElement>('log');
const restartBtn = requireElement<HTMLButtonElement>('restartBtn');

const symbols: Record<Color, Record<PieceType, string>> = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙',
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟',
  },
};

let board = initialBoard();
let turn: Color = 'white';
let selected: Position | null = null;
let validMoves: Move[] = [];
let gameOver = false;
let logLines: string[] = [
  'The board thirsts. White must make the opening sacrifice.',
];

restartBtn.addEventListener('click', () => {
  board = initialBoard();
  turn = 'white';
  selected = null;
  validMoves = [];
  gameOver = false;
  logLines = ['The dead rise. A fresh massacre begins.'];
  killLabel.textContent = 'None yet';
  render();
});

render();

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element as T;
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
  statusLabel.textContent = gameOver
    ? `${capitalize(opponent(turn))} wins the slaughter`
    : selected
      ? 'Choose a glowing destination'
      : 'Choose a piece';

  board.forEach((row, rowIndex) => {
    row.forEach((piece, colIndex) => {
      const square = document.createElement('button');
      square.className = `square ${(rowIndex + colIndex) % 2 === 0 ? 'light' : 'dark'}`;
      square.type = 'button';
      square.dataset.row = String(rowIndex);
      square.dataset.col = String(colIndex);
      square.textContent = piece ? symbols[piece.color][piece.type] : '';

      if (selected?.row === rowIndex && selected.col === colIndex) {
        square.classList.add('selected');
      }

      const move = validMoves.find((candidate) => candidate.row === rowIndex && candidate.col === colIndex);
      if (move) {
        const target = board[rowIndex][colIndex];
        square.classList.add(target ? 'capture' : 'valid');
      }

      square.addEventListener('click', () => onSquareClick({ row: rowIndex, col: colIndex }, square));
      boardEl.appendChild(square);
    });
  });

  logEl.innerHTML = '';
  for (const line of logLines.slice(-10).reverse()) {
    const item = document.createElement('li');
    item.textContent = line;
    logEl.appendChild(item);
  }
}

function onSquareClick(position: Position, squareEl: HTMLButtonElement): void {
  if (gameOver) {
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
  validMoves = legalMoves(position);
  render();
}

function makeMove(from: Position, to: Position, squareEl: HTMLButtonElement): void {
  const piece = board[from.row][from.col];
  if (!piece) {
    return;
  }

  const target = board[to.row][to.col];
  board[to.row][to.col] = piece;
  board[from.row][from.col] = null;

  if (piece.type === 'pawn' && (to.row === 0 || to.row === 7)) {
    board[to.row][to.col] = { color: piece.color, type: 'queen' };
    logLines.push(`${capitalize(piece.color)} pawn crawls into the grave-light and returns as a queen.`);
  }

  if (target) {
    squareEl.classList.add('gore');
    const line = goreLine(piece, target, to);
    logLines.push(line);
    killLabel.textContent = `${pieceText(piece)} butchered ${pieceText(target)}`;
    if (target.type === 'king') {
      gameOver = true;
      logLines.push(`${capitalize(piece.color)} claims the enemy king. The ritual is complete.`);
    }
  } else {
    logLines.push(`${pieceText(piece)} glides to ${notation(to)}.`);
  }

  selected = null;
  validMoves = [];
  turn = opponent(turn);
  render();
}

function goreLine(attacker: Piece, victim: Piece, to: Position): string {
  const lines = [
    `${pieceText(attacker)} hacks ${pieceText(victim)} apart at ${notation(to)}. Bone fragments bless the board.`,
    `${pieceText(attacker)} reduces ${pieceText(victim)} to wet ruin on ${notation(to)}.`,
    `${pieceText(victim)} is devoured in scarlet light as ${pieceText(attacker)} seizes ${notation(to)}.`,
    `${pieceText(attacker)} leaves only a steaming stain where ${pieceText(victim)} stood on ${notation(to)}.`,
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

function legalMoves(position: Position): Move[] {
  const piece = board[position.row][position.col];
  if (!piece) {
    return [];
  }

  const candidates: Move[] = [];
  const forward = piece.color === 'white' ? -1 : 1;

  switch (piece.type) {
    case 'pawn': {
      const one = { row: position.row + forward, col: position.col };
      if (inBounds(one) && !board[one.row][one.col]) {
        candidates.push(one);
        const startRow = piece.color === 'white' ? 6 : 1;
        const two = { row: position.row + forward * 2, col: position.col };
        if (position.row === startRow && !board[two.row][two.col]) {
          candidates.push(two);
        }
      }
      for (const offset of [-1, 1]) {
        const attack = { row: position.row + forward, col: position.col + offset };
        if (inBounds(attack) && board[attack.row][attack.col] && board[attack.row][attack.col]?.color !== piece.color) {
          candidates.push(attack);
        }
      }
      break;
    }
    case 'rook':
      pushSlidingMoves(candidates, position, piece.color, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
      break;
    case 'bishop':
      pushSlidingMoves(candidates, position, piece.color, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
      break;
    case 'queen':
      pushSlidingMoves(candidates, position, piece.color, [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
      break;
    case 'knight':
      pushStepMoves(candidates, position, piece.color, [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]]);
      break;
    case 'king':
      pushStepMoves(candidates, position, piece.color, [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
      break;
  }

  return candidates;
}

function pushSlidingMoves(candidates: Move[], origin: Position, color: Color, directions: number[][]): void {
  for (const [rowStep, colStep] of directions) {
    let row = origin.row + rowStep;
    let col = origin.col + colStep;
    while (inBounds({ row, col })) {
      const occupant = board[row][col];
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

function pushStepMoves(candidates: Move[], origin: Position, color: Color, steps: number[][]): void {
  for (const [rowStep, colStep] of steps) {
    const target = { row: origin.row + rowStep, col: origin.col + colStep };
    if (!inBounds(target)) {
      continue;
    }
    const occupant = board[target.row][target.col];
    if (!occupant || occupant.color !== color) {
      candidates.push(target);
    }
  }
}

function inBounds(position: Position): boolean {
  return position.row >= 0 && position.row < 8 && position.col >= 0 && position.col < 8;
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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
