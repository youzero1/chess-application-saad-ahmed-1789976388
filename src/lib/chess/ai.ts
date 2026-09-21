import type { Difficulty, Move, Position } from '@/types/chess';
import { generateLegalMoves } from '@/lib/chess/moves';
import { applyMove, hasInsufficientMaterial, isInCheck } from '@/lib/chess/rules';
import { evaluate, PIECE_VALUES } from '@/lib/chess/evaluate';

const DEPTHS: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

const MATE_SCORE = 1_000_000;

/** Captures first (most valuable victim) so alpha-beta prunes more. */
function captureScore(position: Position, move: Move): number {
  if (move.isEnPassant) return PIECE_VALUES.pawn;
  const target = position.squares[move.to];
  return target ? PIECE_VALUES[target.type] : 0;
}

function orderMoves(position: Position, moves: Move[]): Move[] {
  return [...moves].sort((a, b) => captureScore(position, b) - captureScore(position, a));
}

/** Minimax with alpha-beta pruning. Scores are from White's perspective. */
function minimax(position: Position, depth: number, alpha: number, beta: number): number {
  if (hasInsufficientMaterial(position)) return 0;
  if (depth === 0) return evaluate(position);

  const moves = generateLegalMoves(position, position.turn);
  if (moves.length === 0) {
    if (isInCheck(position, position.turn)) {
      // Side to move is checkmated. Adding `depth` prefers faster mates.
      return position.turn === 'white' ? -(MATE_SCORE + depth) : MATE_SCORE + depth;
    }
    return 0; // stalemate
  }

  const ordered = orderMoves(position, moves);
  if (position.turn === 'white') {
    let best = -Infinity;
    for (const move of ordered) {
      best = Math.max(best, minimax(applyMove(position, move), depth - 1, alpha, beta));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const move of ordered) {
    best = Math.min(best, minimax(applyMove(position, move), depth - 1, alpha, beta));
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

/**
 * Chooses a move for Black. Easy adds a wide tolerance so it picks randomly
 * among near-equal (sometimes bad) moves; all levels randomize among exactly
 * tied best moves for variety. The AI always promotes to queen.
 */
export function chooseAiMove(position: Position, difficulty: Difficulty): Move | null {
  const moves = generateLegalMoves(position, 'black').filter(
    (m) => !m.promotion || m.promotion === 'queen',
  );
  if (moves.length === 0) return null;

  const depth = DEPTHS[difficulty];
  let bestScore = Infinity;
  const scored: { move: Move; score: number }[] = [];
  for (const move of moves) {
    const score = minimax(applyMove(position, move), depth - 1, -Infinity, Infinity);
    scored.push({ move, score });
    if (score < bestScore) bestScore = score;
  }

  const tolerance = difficulty === 'easy' ? 120 : 0;
  const candidates = scored.filter((s) => s.score <= bestScore + tolerance);
  return candidates[Math.floor(Math.random() * candidates.length)].move;
}

/** Async wrapper so the UI never blocks and the move feels natural. */
export function chooseAiMoveAsync(
  position: Position,
  difficulty: Difficulty,
  delayMs = 400,
): Promise<Move | null> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(chooseAiMove(position, difficulty)), delayMs);
  });
}
