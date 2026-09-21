import type { Move, Position, SquareIndex } from '@/types/chess';
import { isLightSquare, squareAt } from '@/lib/chess/board';
import { ChessPiece } from '@/components/ChessPiece';

interface ChessBoardProps {
  position: Position;
  selectedSquare: SquareIndex | null;
  legalMovesForSelection: Move[];
  lastMove: { from: SquareIndex; to: SquareIndex } | null;
  checkSquare: SquareIndex | null;
  onSquareClick: (square: SquareIndex) => void;
  /** False while the AI is thinking or the game is over (cursor feedback only). */
  interactive: boolean;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/**
 * The 8×8 board (a8 top-left, White at the bottom — fixed orientation)
 * inside a padded slate-teal frame with coordinate labels along the edges.
 */
export function ChessBoard({
  position,
  selectedSquare,
  legalMovesForSelection,
  lastMove,
  checkSquare,
  onSquareClick,
  interactive,
}: ChessBoardProps) {
  const targets = new Map<SquareIndex, Move>();
  for (const move of legalMovesForSelection) targets.set(move.to, move);

  const cells = [];
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const idx = squareAt(rank, file);
      const piece = position.squares[idx];
      const light = isLightSquare(idx);
      const isSelected = selectedSquare === idx;
      const target = targets.get(idx);
      const isLastMove = lastMove !== null && (lastMove.from === idx || lastMove.to === idx);
      const isCheck = checkSquare === idx;
      const labelColor = light ? 'text-[#0d4f4a]' : 'text-[#c9efe4]';

      cells.push(
        <button
          key={idx}
          type="button"
          onClick={() => onSquareClick(idx)}
          className={[
            'relative flex items-center justify-center p-0 text-[10.5cqi] leading-none focus:outline-none',
            light ? 'bg-sea-light' : 'bg-sea-dark',
            interactive && piece && piece.color === 'white' ? 'cursor-pointer' : 'cursor-default',
          ].join(' ')}
        >
          {/* coordinate labels */}
          {file === 0 && (
            <span
              className={`pointer-events-none absolute top-[2%] left-[3%] z-10 text-[3.2cqi] font-semibold leading-none ${labelColor}`}
            >
              {8 - rank}
            </span>
          )}
          {rank === 7 && (
            <span
              className={`pointer-events-none absolute right-[3%] bottom-[2%] z-10 text-[3.2cqi] font-semibold leading-none ${labelColor}`}
            >
              {FILES[file]}
            </span>
          )}

          {/* last-move tint */}
          {isLastMove && <span className="pointer-events-none absolute inset-0 bg-teal-300/35" />}

          {/* check glow on the king's square */}
          {isCheck && (
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,95,72,0.85)_0%,rgba(255,95,72,0.4)_55%,transparent_75%)]" />
          )}

          {/* selected square outline */}
          {isSelected && (
            <span className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_0_4px_rgba(45,212,191,0.95),inset_0_0_12px_rgba(45,212,191,0.5)]" />
          )}

          {/* legal-move markers: dot on empty squares, ring on captures */}
          {target && !target.isCapture && (
            <span className="pointer-events-none absolute z-10 h-[26%] w-[26%] rounded-full bg-[#062a2e]/30" />
          )}
          {target && target.isCapture && (
            <span className="pointer-events-none absolute inset-[3%] z-10 rounded-full border-[3px] border-[#062a2e]/45" />
          )}

          {piece && <ChessPiece piece={piece} className="relative z-10" />}
        </button>,
      );
    }
  }

  return (
    <div className="ocean-grain rounded-xl p-2.5 shadow-[0_18px_50px_rgba(0,0,0,0.6)] ring-1 ring-black/50 sm:p-3.5">
      <div className="@container grid aspect-square w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-md shadow-[inset_0_0_20px_rgba(0,0,0,0.45)]">
        {cells}
      </div>
    </div>
  );
}
