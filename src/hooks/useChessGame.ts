import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  Difficulty,
  GameStatus,
  Move,
  MoveRecord,
  Piece,
  PieceType,
  Position,
  SquareIndex,
} from '@/types/chess';
import { clonePosition, createInitialPosition, fileOf, findKing, rankOf, squareAt } from '@/lib/chess/board';
import { generateLegalMoves } from '@/lib/chess/moves';
import { applyMove, getGameStatus, toAlgebraic } from '@/lib/chess/rules';
import { chooseAiMoveAsync } from '@/lib/chess/ai';

export interface LastMove {
  from: SquareIndex;
  to: SquareIndex;
}

export interface PendingPromotion {
  from: SquareIndex;
  to: SquareIndex;
}

interface AppliedMove {
  position: Position;
  status: GameStatus;
  record: MoveRecord;
}

/** Applies a move and derives everything the game state needs from it. */
function applyAndRecord(position: Position, move: Move): AppliedMove {
  const next = applyMove(position, move);
  const status = getGameStatus(next);
  const label = toAlgebraic(position, move, status);
  let captured: Piece | null = null;
  if (move.isEnPassant) {
    captured = position.squares[squareAt(rankOf(move.from), fileOf(move.to))];
  } else if (move.isCapture) {
    captured = position.squares[move.to];
  }
  // The pre-move position object itself is the snapshot: applyMove never
  // mutates its input, so the reference stays valid forever.
  return { position: next, status, record: { move, label, captured, snapshot: position } };
}

/**
 * Single source of truth for the chess game. The player is always White,
 * the computer always Black. All interactions flow through this hook.
 */
export function useChessGame() {
  const [position, setPosition] = useState<Position>(() => createInitialPosition());
  const [status, setStatus] = useState<GameStatus>('playing');
  const [history, setHistory] = useState<MoveRecord[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<SquareIndex | null>(null);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [difficulty, setDifficultyState] = useState<Difficulty>('medium');
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  // Refs so async AI callbacks always see the latest difficulty and can
  // detect a stale game (New Game pressed while the AI was thinking).
  const difficultyRef = useRef(difficulty);
  const gameIdRef = useRef(0);

  const gameOver = status === 'checkmate' || status === 'stalemate' || status === 'draw';

  const legalMovesForSelection = useMemo<Move[]>(() => {
    if (selectedSquare === null || gameOver) return [];
    return generateLegalMoves(position, 'white').filter((m) => m.from === selectedSquare);
  }, [position, selectedSquare, gameOver]);

  /** Square of the king currently in check (for the red glow), if any. */
  const checkSquare = useMemo<SquareIndex | null>(() => {
    if (status !== 'check' && status !== 'checkmate') return null;
    const kingSq = findKing(position, position.turn);
    return kingSq === -1 ? null : kingSq;
  }, [position, status]);

  const triggerAi = useCallback((positionAfterPlayerMove: Position, historySoFar: MoveRecord[]) => {
    const gameId = gameIdRef.current;
    setAiThinking(true);
    chooseAiMoveAsync(positionAfterPlayerMove, difficultyRef.current).then((aiMove) => {
      if (gameIdRef.current !== gameId) return; // stale: a new game started meanwhile
      setAiThinking(false);
      if (!aiMove) return;
      const applied = applyAndRecord(positionAfterPlayerMove, aiMove);
      setPosition(applied.position);
      setStatus(applied.status);
      setHistory([...historySoFar, applied.record]);
      setLastMove({ from: aiMove.from, to: aiMove.to });
    });
  }, []);

  /** Applies a player move, records it, and triggers the AI reply if the game continues. */
  const playMove = useCallback(
    (move: Move) => {
      const applied = applyAndRecord(position, move);
      const newHistory = [...history, applied.record];
      setPosition(applied.position);
      setStatus(applied.status);
      setHistory(newHistory);
      setLastMove({ from: move.from, to: move.to });
      setSelectedSquare(null);
      setPendingPromotion(null);
      if (applied.status === 'playing' || applied.status === 'check') {
        triggerAi(applied.position, newHistory);
      }
    },
    [position, history, triggerAi],
  );

  const selectSquare = useCallback(
    (square: SquareIndex) => {
      if (aiThinking || gameOver || pendingPromotion) return;
      if (position.turn !== 'white') return;

      if (selectedSquare !== null) {
        if (selectedSquare === square) {
          setSelectedSquare(null);
          return;
        }
        const candidates = legalMovesForSelection.filter((m) => m.to === square);
        if (candidates.length > 0) {
          if (candidates.some((m) => m.promotion)) {
            // Wait for the player to pick a promotion piece.
            setPendingPromotion({ from: selectedSquare, to: square });
            return;
          }
          playMove(candidates[0]);
          return;
        }
      }

      const piece = position.squares[square];
      setSelectedSquare(piece && piece.color === 'white' ? square : null);
    },
    [aiThinking, gameOver, pendingPromotion, position, selectedSquare, legalMovesForSelection, playMove],
  );

  const confirmPromotion = useCallback(
    (pieceType: PieceType) => {
      if (!pendingPromotion) return;
      const move = generateLegalMoves(position, 'white').find(
        (m) =>
          m.from === pendingPromotion.from &&
          m.to === pendingPromotion.to &&
          m.promotion === pieceType,
      );
      if (move) playMove(move);
      else setPendingPromotion(null);
    },
    [pendingPromotion, position, playMove],
  );

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null);
    setSelectedSquare(null);
  }, []);

  /** Takes back the last full round (player move + computer reply). */
  const undo = useCallback(() => {
    if (aiThinking || history.length === 0 || position.turn !== 'white') return;
    const dropCount = history.length >= 2 ? 2 : 1;
    const newHistory = history.slice(0, history.length - dropCount);
    const restored = clonePosition(history[history.length - dropCount].snapshot);
    setPosition(restored);
    setHistory(newHistory);
    setStatus(getGameStatus(restored));
    const last = newHistory[newHistory.length - 1];
    setLastMove(last ? { from: last.move.from, to: last.move.to } : null);
    setSelectedSquare(null);
    setPendingPromotion(null);
  }, [aiThinking, history, position.turn]);

  const newGame = useCallback(() => {
    gameIdRef.current += 1; // invalidates any in-flight AI callback
    setPosition(createInitialPosition());
    setStatus('playing');
    setHistory([]);
    setSelectedSquare(null);
    setLastMove(null);
    setPendingPromotion(null);
    setAiThinking(false);
  }, []);

  const setDifficulty = useCallback((level: Difficulty) => {
    difficultyRef.current = level;
    setDifficultyState(level);
  }, []);

  const undoDisabled = aiThinking || history.length === 0 || position.turn !== 'white';

  return {
    position,
    status,
    history,
    selectedSquare,
    legalMovesForSelection,
    lastMove,
    checkSquare,
    difficulty,
    pendingPromotion,
    aiThinking,
    gameOver,
    undoDisabled,
    selectSquare,
    confirmPromotion,
    cancelPromotion,
    undo,
    newGame,
    setDifficulty,
  };
}
