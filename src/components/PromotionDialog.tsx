import type { PieceType } from '@/types/chess';
import { ChessPiece } from '@/components/ChessPiece';

interface PromotionDialogProps {
  onSelect: (pieceType: PieceType) => void;
  onCancel: () => void;
}

const CHOICES: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];

/** Modal shown over the board when the player promotes a pawn. */
export function PromotionDialog({ onSelect, onCancel }: PromotionDialogProps) {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-[1px]"
      onClick={onCancel}
    >
      <div
        className="ocean-grain-panel rounded-xl p-5 shadow-2xl ring-1 ring-accent/40"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-display mb-3 text-center text-sm font-semibold tracking-widest text-accent uppercase">
          Promote to
        </p>
        <div className="flex gap-3">
          {CHOICES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              className="flex h-16 w-16 items-center justify-center rounded-lg bg-sea-light/90 shadow transition-transform hover:scale-110 hover:bg-sea-light"
              aria-label={`Promote to ${type}`}
            >
              <ChessPiece piece={{ color: 'white', type }} className="text-4xl" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
