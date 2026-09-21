// Chess domain types — the single source of truth for all game logic modules.

export type Color = 'white' | 'black';

export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';

export interface Piece {
  color: Color;
  type: PieceType;
}

/**
 * SquareIndex is a number 0–63 mapping the board like this:
 *   index = rank * 8 + file
 *   rank 0 = rank 8 (top row, Black's home rank), rank 7 = rank 1 (White's home rank)
 *   file 0 = file a, file 7 = file h
 * So a8 = 0, h8 = 7, a1 = 56, h1 = 63.
 */
export type SquareIndex = number;

export interface Move {
  from: SquareIndex;
  to: SquareIndex;
  /** Present on pawn promotion moves (one Move is generated per choice). */
  promotion?: PieceType;
  isCapture: boolean;
  isEnPassant: boolean;
  isCastlingKingside: boolean;
  isCastlingQueenside: boolean;
  isDoublePawnPush: boolean;
}

export interface CastlingRights {
  whiteKingside: boolean;
  whiteQueenside: boolean;
  blackKingside: boolean;
  blackQueenside: boolean;
}

export type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw';

export type Difficulty = 'easy' | 'medium' | 'hard';

/** A full board state. Treated as immutable — applyMove returns a fresh Position. */
export interface Position {
  /** 64 slots, a8 first. */
  squares: (Piece | null)[];
  turn: Color;
  castling: CastlingRights;
  /** Square behind a pawn that just double-pushed, or null. */
  enPassantTarget: SquareIndex | null;
  halfmoveClock: number;
  fullmoveNumber: number;
}

/**
 * One applied move in the game history. The snapshot of the position taken
 * BEFORE the move makes undo trivial and bulletproof.
 */
export interface MoveRecord {
  move: Move;
  /** Human-readable algebraic label, e.g. "Nf3", "exd5", "O-O", "Qxf7#". */
  label: string;
  /** The piece captured by this move, if any. */
  captured: Piece | null;
  /** Deep snapshot of the position before the move was applied. */
  snapshot: Position;
}
