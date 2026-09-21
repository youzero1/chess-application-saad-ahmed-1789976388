import type { Piece } from '@/types/chess';
import { ChessPiece } from '@/components/ChessPiece';

interface CapturedPiecesProps {
  /** Black pieces captured by the player (White). */
  capturedByWhite: Piece[];
  /** White pieces captured by the computer (Black). */
  capturedByBlack: Piece[];
  /** Material difference from White's perspective, in pawns. */
  materialDiff: number;
}

function PieceRow({ pieces, sizeClass }: { pieces: Piece[]; sizeClass: string }) {
  if (pieces.length === 0) {
    return <span className="text-xs text-amber-100/40 italic">none</span>;
  }
  return (
    <span className="flex flex-wrap items-center">
      {pieces.map((piece, i) => (
        <ChessPiece key={i} piece={piece} className={sizeClass} />
      ))}
    </span>
  );
}

export function CapturedPieces({
  capturedByWhite,
  capturedByBlack,
  materialDiff,
}: CapturedPiecesProps) {
  return (
    <div className="wood-grain-panel rounded-xl p-4 shadow-lg ring-1 ring-gold/20">
      <h2 className="font-display mb-3 text-sm font-semibold tracking-widest text-gold uppercase">
        Captured Pieces
      </h2>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-amber-100/60">You captured</span>
        {materialDiff > 0 && (
          <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-[#2a1808]">
            +{materialDiff}
          </span>
        )}
      </div>
      <div className="mt-1 mb-3 min-h-7">
        <PieceRow pieces={capturedByWhite} sizeClass="text-2xl" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-amber-100/60">Computer captured</span>
        {materialDiff < 0 && (
          <span className="rounded-full bg-black/40 px-2 py-0.5 text-xs font-bold text-amber-100 ring-1 ring-gold/30">
            +{-materialDiff}
          </span>
        )}
      </div>
      <div className="mt-1 min-h-7">
        <PieceRow pieces={capturedByBlack} sizeClass="text-2xl" />
      </div>
    </div>
  );
}
