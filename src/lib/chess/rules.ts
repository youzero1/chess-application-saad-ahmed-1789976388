import type {
  CastlingRights,
  Color,
  GameStatus,
  Move,
  MoveRecord,
  Piece,
  PieceType,
  Position,
  SquareIndex,
} from '@/types/chess';
import { clonePosition, fileOf, opposite, rankOf, squareAt, squareName } from '@/lib/chess/board';
// Circular import is safe: both modules only call each other's functions at
// runtime (ESM live bindings), never at module initialization time.
import { generateLegalMoves, isSquareAttacked } from '@/lib/chess/moves';

const PIECE_LETTERS: Record<PieceType, string> = {
  pawn: '',
  knight: 'N',
  bishop: 'B',
  rook: 'R',
  queen: 'Q',
  king: 'K',
};

const CAPTURE_VALUES: Record<PieceType, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0,
};

/** Rook home squares and the castling right tied to each. */
const ROOK_HOME_RIGHTS: [SquareIndex, keyof CastlingRights][] = [
  [squareAt(7, 7), 'whiteKingside'],
  [squareAt(7, 0), 'whiteQueenside'],
  [squareAt(0, 7), 'blackKingside'],
  [squareAt(0, 0), 'blackQueenside'],
];

/**
 * Applies a move to a position, returning a NEW position. Handles captures,
 * en passant, castling rook movement, promotion, castling-rights updates,
 * en-passant targets and clocks. Never mutates the input position.
 */
export function applyMove(position: Position, move: Move): Position {
  const next = clonePosition(position);
  const piece = next.squares[move.from];
  if (!piece) return next;

  // Remove an en-passant-captured pawn (it sits beside the mover, not on `to`).
  if (move.isEnPassant) {
    next.squares[squareAt(rankOf(move.from), fileOf(move.to))] = null;
  }

  next.squares[move.from] = null;
  next.squares[move.to] = move.promotion ? { color: piece.color, type: move.promotion } : piece;

  // Move the rook on castling.
  if (move.isCastlingKingside) {
    const homeRank = rankOf(move.from);
    next.squares[squareAt(homeRank, 7)] = null;
    next.squares[squareAt(homeRank, 5)] = { color: piece.color, type: 'rook' };
  } else if (move.isCastlingQueenside) {
    const homeRank = rankOf(move.from);
    next.squares[squareAt(homeRank, 0)] = null;
    next.squares[squareAt(homeRank, 3)] = { color: piece.color, type: 'rook' };
  }

  // Castling rights.
  const rights = { ...next.castling };
  if (piece.type === 'king') {
    if (piece.color === 'white') {
      rights.whiteKingside = false;
      rights.whiteQueenside = false;
    } else {
      rights.blackKingside = false;
      rights.blackQueenside = false;
    }
  }
  for (const [homeSq, key] of ROOK_HOME_RIGHTS) {
    // Rook leaves its home square, or a rook is captured on it.
    if (move.from === homeSq || move.to === homeSq) rights[key] = false;
  }
  next.castling = rights;

  // En-passant target appears exactly behind a double-pushed pawn.
  next.enPassantTarget = move.isDoublePawnPush
    ? squareAt((rankOf(move.from) + rankOf(move.to)) / 2, fileOf(move.from))
    : null;

  next.halfmoveClock = piece.type === 'pawn' || move.isCapture ? 0 : position.halfmoveClock + 1;
  next.fullmoveNumber = position.turn === 'black' ? position.fullmoveNumber + 1 : position.fullmoveNumber;
  next.turn = opposite(position.turn);
  return next;
}

export function isInCheck(position: Position, color: Color): boolean {
  const kingSq = position.squares.findIndex(
    (p) => p !== null && p.type === 'king' && p.color === color,
  );
  if (kingSq === -1) return false;
  return isSquareAttacked(position, kingSq, opposite(color));
}

/** King vs king, or king + single minor piece vs king. */
export function hasInsufficientMaterial(position: Position): boolean {
  const nonKings = position.squares.filter(
    (p): p is Piece => p !== null && p.type !== 'king',
  );
  if (nonKings.length === 0) return true;
  if (nonKings.length === 1 && (nonKings[0].type === 'bishop' || nonKings[0].type === 'knight')) {
    return true;
  }
  return false;
}

export function getGameStatus(position: Position): GameStatus {
  if (hasInsufficientMaterial(position)) return 'draw';
  const legalMoves = generateLegalMoves(position, position.turn);
  const inCheck = isInCheck(position, position.turn);
  if (legalMoves.length === 0) return inCheck ? 'checkmate' : 'stalemate';
  return inCheck ? 'check' : 'playing';
}

/**
 * Builds an algebraic label for a move. `position` is the position BEFORE the
 * move; `resultingStatus` is the game status after it (for +/# suffixes).
 * Standard SAN disambiguation: file first, then rank, then both.
 */
export function toAlgebraic(position: Position, move: Move, resultingStatus: GameStatus): string {
  const suffix = resultingStatus === 'checkmate' ? '#' : resultingStatus === 'check' ? '+' : '';
  if (move.isCastlingKingside) return 'O-O' + suffix;
  if (move.isCastlingQueenside) return 'O-O-O' + suffix;

  const piece = position.squares[move.from];
  if (!piece) return squareName(move.to) + suffix;
  const destination = squareName(move.to);

  if (piece.type === 'pawn') {
    let label = move.isCapture ? String.fromCharCode(97 + fileOf(move.from)) + 'x' + destination : destination;
    if (move.promotion) label += '=' + PIECE_LETTERS[move.promotion];
    return label + suffix;
  }

  let disambiguation = '';
  const rivals = generateLegalMoves(position, piece.color).filter(
    (m) =>
      m.to === move.to &&
      m.from !== move.from &&
      position.squares[m.from]?.type === piece.type,
  );
  if (rivals.length > 0) {
    const sameFile = rivals.some((m) => fileOf(m.from) === fileOf(move.from));
    const sameRank = rivals.some((m) => rankOf(m.from) === rankOf(move.from));
    if (!sameFile) disambiguation = String.fromCharCode(97 + fileOf(move.from));
    else if (!sameRank) disambiguation = String(8 - rankOf(move.from));
    else disambiguation = squareName(move.from);
  }

  return PIECE_LETTERS[piece.type] + disambiguation + (move.isCapture ? 'x' : '') + destination + suffix;
}

export interface CapturedSummary {
  /** Black pieces captured by White (the player). */
  capturedByWhite: Piece[];
  /** White pieces captured by Black (the computer). */
  capturedByBlack: Piece[];
  /** Material difference from White's perspective, in pawns. */
  materialDiff: number;
}

export function getCapturedPieces(history: MoveRecord[]): CapturedSummary {
  const capturedByWhite: Piece[] = [];
  const capturedByBlack: Piece[] = [];
  for (const record of history) {
    if (!record.captured) continue;
    // snapshot.turn is the side that made the move.
    if (record.snapshot.turn === 'white') capturedByWhite.push(record.captured);
    else capturedByBlack.push(record.captured);
  }
  const byValueDesc = (a: Piece, b: Piece) => CAPTURE_VALUES[b.type] - CAPTURE_VALUES[a.type];
  capturedByWhite.sort(byValueDesc);
  capturedByBlack.sort(byValueDesc);
  const sum = (pieces: Piece[]) => pieces.reduce((acc, p) => acc + CAPTURE_VALUES[p.type], 0);
  return {
    capturedByWhite,
    capturedByBlack,
    materialDiff: sum(capturedByWhite) - sum(capturedByBlack),
  };
}
