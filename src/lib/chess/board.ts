import type { Color, Piece, PieceType, Position, SquareIndex } from '@/types/chess';

// ---------------------------------------------------------------------------
// Coordinate helpers — all index arithmetic is centralized here.
// rank 0 = rank 8 (top), rank 7 = rank 1 (bottom); file 0 = a, file 7 = h.
// ---------------------------------------------------------------------------

export function rankOf(square: SquareIndex): number {
  return Math.floor(square / 8);
}

export function fileOf(square: SquareIndex): number {
  return square % 8;
}

export function squareAt(rank: number, file: number): SquareIndex {
  return rank * 8 + file;
}

export function isValidSquare(rank: number, file: number): boolean {
  return rank >= 0 && rank < 8 && file >= 0 && file < 8;
}

/** Algebraic name of a square, e.g. squareAt(3, 4) -> "e4". */
export function squareName(square: SquareIndex): string {
  return String.fromCharCode(97 + fileOf(square)) + (8 - rankOf(square));
}

/** a8 is a light square; light/dark alternates from there. */
export function isLightSquare(square: SquareIndex): boolean {
  return (rankOf(square) + fileOf(square)) % 2 === 0;
}

export function opposite(color: Color): Color {
  return color === 'white' ? 'black' : 'white';
}

// ---------------------------------------------------------------------------
// Position construction and access
// ---------------------------------------------------------------------------

const BACK_RANK: PieceType[] = [
  'rook',
  'knight',
  'bishop',
  'queen',
  'king',
  'bishop',
  'knight',
  'rook',
];

export function createInitialPosition(): Position {
  const squares: (Piece | null)[] = new Array<Piece | null>(64).fill(null);
  for (let file = 0; file < 8; file++) {
    squares[squareAt(0, file)] = { color: 'black', type: BACK_RANK[file] };
    squares[squareAt(1, file)] = { color: 'black', type: 'pawn' };
    squares[squareAt(6, file)] = { color: 'white', type: 'pawn' };
    squares[squareAt(7, file)] = { color: 'white', type: BACK_RANK[file] };
  }
  return {
    squares,
    turn: 'white',
    castling: {
      whiteKingside: true,
      whiteQueenside: true,
      blackKingside: true,
      blackQueenside: true,
    },
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
  };
}

export function clonePosition(position: Position): Position {
  return {
    squares: position.squares.map((piece) => (piece ? { ...piece } : null)),
    turn: position.turn,
    castling: { ...position.castling },
    enPassantTarget: position.enPassantTarget,
    halfmoveClock: position.halfmoveClock,
    fullmoveNumber: position.fullmoveNumber,
  };
}

export function getPieceAt(position: Position, square: SquareIndex): Piece | null {
  return position.squares[square];
}

export function setPieceAt(position: Position, square: SquareIndex, piece: Piece | null): void {
  position.squares[square] = piece;
}

/** Returns the square of the given color's king, or -1 if not found. */
export function findKing(position: Position, color: Color): SquareIndex {
  for (let i = 0; i < 64; i++) {
    const piece = position.squares[i];
    if (piece && piece.type === 'king' && piece.color === color) return i;
  }
  return -1;
}
