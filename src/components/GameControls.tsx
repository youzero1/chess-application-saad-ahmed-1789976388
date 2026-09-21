import type { Difficulty } from '@/types/chess';

interface GameControlsProps {
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onUndo: () => void;
  onNewGame: () => void;
  undoDisabled: boolean;
}

const LEVELS: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export function GameControls({
  difficulty,
  onDifficultyChange,
  onUndo,
  onNewGame,
  undoDisabled,
}: GameControlsProps) {
  return (
    <div className="wood-grain-panel rounded-xl p-4 shadow-lg ring-1 ring-gold/20">
      <h2 className="font-display mb-3 text-sm font-semibold tracking-widest text-gold uppercase">
        Difficulty
      </h2>
      <div className="mb-4 flex gap-1 rounded-lg bg-black/30 p-1">
        {LEVELS.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => onDifficultyChange(level.value)}
            className={[
              'flex-1 rounded-md px-3 py-1.5 text-sm transition-colors',
              difficulty === level.value
                ? 'bg-gold font-semibold text-[#2a1808] shadow'
                : 'text-amber-100/70 hover:text-amber-100',
            ].join(' ')}
          >
            {level.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={undoDisabled}
          className="flex-1 rounded-lg border border-gold/40 px-4 py-2 text-sm font-medium text-amber-100 transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Undo Move
        </button>
        <button
          type="button"
          onClick={onNewGame}
          className="flex-1 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-[#2a1808] shadow transition-colors hover:bg-[#e5b455]"
        >
          New Game
        </button>
      </div>
    </div>
  );
}
