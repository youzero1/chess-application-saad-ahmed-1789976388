import type { Color, Move, Piece, Position, SquareIndex } from '@/types/chess';
import { fileOf, findKing, isValidSquare, opposite, rankOf, squareAt } from '@/lib/chess/board';
// Circular import is safe here: both modules only call each other's functions
// at runtime (ESM live bindings), never at module initialization time.
import { applyMove } from '@/lib/chess/rules';

const KNIGHT_OFFSETS: [number, number][] = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];

const KING_OFFSETS: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

const BISHOP_DIRS: [number, number][] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

const ROOK_DIRS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

const QUEEN_DIRS: [number, number][] = [...BISHOP_DIRS, ...ROOK_DIRS];

const PROMOTION_CHOICES = ['queen', 'rook', 'bishop', 'knight'] as const;

function makeMove(from: SquareIndex, to: SquareIndex, flags: Partial<Move> = {}): Move {
  return {
    from,
    to,
    promotion: flags.promotion,
    isCapture: flags.isCapture ?? false,
    isEnPassant: flags.isEnPassant ?? false,
    isCastlingKingside: flags.isCastlingKingside ?? false,
    isCastlingQueenside: flags.isCastlingQueenside ?? false,
    isDoublePawnPush: flags.isDoublePawnPush ?? false,
  };
}

function slidingMoves(
  position: Position,
  from: SquareIndex,
  piece: Piece,
  dirs: [number, number][],
  out: Move[],
): void {
  const rank = rankOf(from);
  const file = fileOf(from);
  for (const [dr, df] of dirs) {
    let r = rank + dr;
    let f = file + df;
    while (isValidSquare(r, f)) {
      const to = squareAt(r, f);
      const target = position.squares[to];
      if (!target) {
        out.push(makeMove(from, to));
      } else {
        if (target.color !== piece.color) out.push(makeMove(from, to, { isCapture: true }));
        break; // ray blocked
      }
      r += dr;
      f += df;
    }
  }
}

function steppingMoves(
  position: Position,
  from: SquareIndex,
  piece: Piece,
  offsets: [number, number][],
  out: Move[],
): void {
  const rank = rankOf(from);
  const file = fileOf(from);
  for (const [dr, df] of offsets) {
    const r = rank + dr;
    const f = file + df;
    if (!isValidSquare(r, f)) continue;
    const to = squareAt(r, f);
    const target = position.squares[to];
    if (!target) {
      out.push(makeMove(from, to));
    } else if (target.color !== piece.color) {
      out.push(makeMove(from, to, { isCapture: true }));
    }
  }
}

function pawnMoves(position: Position, from: SquareIndex, piece: Piece, out: Move[]): void {
  const rank = rankOf(from);
  const file = fileOf(from);
  const dir = piece.color === 'white' ? -1 : 1; // white moves toward rank 0 (top)
  const startRank = piece.color === 'white' ? 6 : 1;
  const promotionRank = piece.color === 'white' ? 0 : 7;

  // Pushes
  const oneRank = rank + dir;
  if (isValidSquare(oneRank, file)) {
    const one = squareAt(oneRank, file);
    if (!position.squares[one]) {
      if (oneRank === promotionRank) {
        for (const promotion of PROMOTION_CHOICES) out.push(makeMove(from, one, { promotion }));
      } else {
        out.push(makeMove(from, one));
        if (rank === startRank) {
          const two = squareAt(rank + 2 * dir, file);
          if (!position.squares[two]) {
            out.push(makeMove(from, two, { isDoublePawnPush: true }));
          }
        }
      }
    }
  }

  // Captures (including en passant)
  for (const df of [-1, 1]) {
    const r = rank + dir;
    const f = file + df;
    if (!isValidSquare(r, f)) continue;
    const to = squareAt(r, f);
    const target = position.squares[to];
    if (target && target.color !== piece.color) {
      if (r === promotionRank) {
        for (const promotion of PROMOTION_CHOICES) {
          out.push(makeMove(from, to, { isCapture: true, promotion }));
        }
      } else {
        out.push(makeMove(from, to, { isCapture: true }));
      }
    } else if (!target && position.enPassantTarget === to) {
      out.push(makeMove(from, to, { isCapture: true, isEnPassant: true }));
    }
  }
}

function castlingMoves(position: Position, color: Color, out: Move[]): void {
  const enemy = opposite(color);
  const homeRank = color === 'white' ? 7 : 0;
  const kingSq = squareAt(homeRank, 4);
  const king = position.squares[kingSq];
  if (!king || king.type !== 'king' || king.color !== color) return;

  const kingsideRight = color === 'white' ? position.castling.whiteKingside : position.castling.blackKingside;
  const queensideRight = color === 'white' ? position.castling.whiteQueenside : position.castling.blackQueenside;

  if (kingsideRight) {
    const fSq = squareAt(homeRank, 5);
    const gSq = squareAt(homeRank, 6);
    const rookSq = squareAt(homeRank, 7);
    const rook = position.squares[rookSq];
    if (
      rook &&
      rook.type === 'rook' &&
      rook.color === color &&
      !position.squares[fSq] &&
      !position.squares[gSq] &&
      !isSquareAttacked(position, kingSq, enemy) &&
      !isSquareAttacked(position, fSq, enemy) &&
      !isSquareAttacked(position, gSq, enemy)
    ) {
      out.push(makeMove(kingSq, gSq, { isCastlingKingside: true }));
    }
  }

  if (queensideRight) {
    const dSq = squareAt(homeRank, 3);
    const cSq = squareAt(homeRank, 2);
    const bSq = squareAt(homeRank, 1);
    const rookSq = squareAt(homeRank, 0);
    const rook = position.squares[rookSq];
    if (
      rook &&
      rook.type === 'rook' &&
      rook.color === color &&
      !position.squares[dSq] &&
      !position.squares[cSq] &&
      !position.squares[bSq] &&
      !isSquareAttacked(position, kingSq, enemy) &&
      !isSquareAttacked(position, dSq, enemy) &&
      !isSquareAttacked(position, cSq, enemy)
    ) {
      out.push(makeMove(kingSq, cSq, { isCastlingQueenside: true }));
    }
  }
}

/** Pseudo-legal moves: ignores whether the own king is left in check. */
function generatePseudoLegalMoves(position: Position, color: Color): Move[] {
  const out: Move[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const piece = position.squares[sq];
    if (!piece || piece.color !== color) continue;
    switch (piece.type) {
      case 'pawn':
        pawnMoves(position, sq, piece, out);
        break;
      case 'knight':
        steppingMoves(position, sq, piece, KNIGHT_OFFSETS, out);
        break;
      case 'bishop':
        slidingMoves(position, sq, piece, BISHOP_DIRS, out);
        break;
      case 'rook':
        slidingMoves(position, sq, piece, ROOK_DIRS, out);
        break;
      case 'queen':
        slidingMoves(position, sq, piece, QUEEN_DIRS, out);
        break;
      case 'king':
        steppingMoves(position, sq, piece, KING_OFFSETS, out);
        break;
    }
  }
  castlingMoves(position, color, out);
  return out;
}

/** Is `square` attacked by any piece of color `byColor`? */
export function isSquareAttacked(position: Position, square: SquareIndex, byColor: Color): boolean {
  const rank = rankOf(square);
  const file = fileOf(square);

  // Pawns: a `byColor` pawn attacks diagonally forward, so attackers sit one rank behind.
  const pawnDir = byColor === 'white' ? -1 : 1;
  for (const df of [-1, 1]) {
    const r = rank - pawnDir;
    const f = file + df;
    if (isValidSquare(r, f)) {
      const p = position.squares[squareAt(r, f)];
      if (p && p.color === byColor && p.type === 'pawn') return true;
    }
  }

  // Knights
  for (const [dr, df] of KNIGHT_OFFSETS) {
    const r = rank + dr;
    const f = file + df;
    if (isValidSquare(r, f)) {
      const p = position.squares[squareAt(r, f)];
      if (p && p.color === byColor && p.type === 'knight') return true;
    }
  }

  // King
  for (const [dr, df] of KING_OFFSETS) {
    const r = rank + dr;
    const f = file + df;
    if (isValidSquare(r, f)) {
      const p = position.squares[squareAt(r, f)];
      if (p && p.color === byColor && p.type === 'king') return true;
    }
  }

  // Diagonal sliders (bishop / queen)
  for (const [dr, df] of BISHOP_DIRS) {
    let r = rank + dr;
    let f = file + df;
    while (isValidSquare(r, f)) {
      const p = position.squares[squareAt(r, f)];
      if (p) {
        if (p.color === byColor && (p.type === 'bishop' || p.type === 'queen')) return true;
        break;
      }
      r += dr;
      f += df;
    }
  }

  // Straight sliders (rook / queen)
  for (const [dr, df] of ROOK_DIRS) {
    let r = rank + dr;
    let f = file + df;
    while (isValidSquare(r, f)) {
      const p = position.squares[squareAt(r, f)];
      if (p) {
        if (p.color === byColor && (p.type === 'rook' || p.type === 'queen')) return true;
        break;
      }
      r += dr;
      f += df;
    }
  }

  return false;
}

/** Fully legal moves: pseudo-legal moves that do not leave the own king in check. */
export function generateLegalMoves(position: Position, color: Color): Move[] {
  const enemy = opposite(color);
  return generatePseudoLegalMoves(position, color).filter((move) => {
    const next = applyMove(position, move);
    const kingSq = findKing(next, color);
    return kingSq !== -1 && !isSquareAttacked(next, kingSq, enemy);
  });
}
