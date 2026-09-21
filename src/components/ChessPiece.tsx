import type { Color, Piece, PieceType } from '@/types/chess';

const GLYPHS: Record<Color, Record<PieceType, string>> = {
  white: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
};

interface ChessPieceProps {
  piece: Piece;
  /** Optional size override; defaults to filling the parent square. */
  className?: string;
}

/**
 * A chess piece rendered as a Unicode glyph styled to look carved from wood:
 * white pieces in cream with a dark outline, black pieces in deep walnut
 * with a light outline, both with a soft drop shadow.
 */
export function ChessPiece({ piece, className = '' }: ChessPieceProps) {
  const colorClasses =
    piece.color === 'white'
      ? 'text-[#f7ecd2] [text-shadow:0_0_1px_#2a1608,0_1px_0_#2a1608,0_2px_3px_rgba(20,10,4,0.55)]'
      : 'text-[#2a1608] [text-shadow:0_0_1px_#e8d5a8,0_1px_0_rgba(232,213,168,0.7),0_2px_3px_rgba(20,10,4,0.5)]';

  return (
    <span
      aria-hidden
      className={`block leading-none select-none ${colorClasses} ${className}`}
    >
      {GLYPHS[piece.color][piece.type]}
    </span>
  );
}
