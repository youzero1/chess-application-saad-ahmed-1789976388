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
 * A chess piece rendered as a Unicode glyph styled for the ocean theme:
 * white pieces in pearl-white with a deep slate-teal outline, black pieces
 * in deep slate-teal with a pale seafoam outline, both with a soft drop shadow.
 */
export function ChessPiece({ piece, className = '' }: ChessPieceProps) {
  const colorClasses =
    piece.color === 'white'
      ? 'text-[#f4faf8] [text-shadow:0_0_1px_#0a3236,0_1px_0_#0a3236,0_2px_3px_rgba(4,26,30,0.55)]'
      : 'text-[#123740] [text-shadow:0_0_1px_#c9efe4,0_1px_0_rgba(201,239,228,0.7),0_2px_3px_rgba(4,26,30,0.5)]';

  return (
    <span
      aria-hidden
      className={`block leading-none select-none ${colorClasses} ${className}`}
    >
      {GLYPHS[piece.color][piece.type]}
    </span>
  );
}
