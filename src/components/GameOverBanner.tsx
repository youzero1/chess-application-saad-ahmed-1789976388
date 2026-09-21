import type { Color, GameStatus } from '@/types/chess';

interface GameOverBannerProps {
  status: GameStatus;
  /** Winning side when status is checkmate, otherwise null. */
  winner: Color | null;
  onPlayAgain: () => void;
}

/** Overlay announced when the game ends, with a Play Again button. */
export function GameOverBanner({ status, winner, onPlayAgain }: GameOverBannerProps) {
  if (status !== 'checkmate' && status !== 'stalemate' && status !== 'draw') return null;

  const message =
    status === 'checkmate'
      ? winner === 'white'
        ? 'Checkmate — You Win!'
        : 'Checkmate — Computer Wins'
      : status === 'stalemate'
        ? 'Stalemate — Draw'
        : 'Draw — Insufficient Material';

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-black/55 backdrop-blur-[1px]">
      <div className="wood-grain-panel mx-4 rounded-xl px-8 py-6 text-center shadow-2xl ring-1 ring-gold/40">
        <p className="font-display text-2xl font-bold text-gold drop-shadow sm:text-3xl">
          {message}
        </p>
        <button
          type="button"
          onClick={onPlayAgain}
          className="mt-5 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-[#2a1808] shadow transition-colors hover:bg-[#e5b455]"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
