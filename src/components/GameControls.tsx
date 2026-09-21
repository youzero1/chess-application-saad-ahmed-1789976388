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
    <div className="ocean-grain-panel rounded-xl p-4 shadow-lg ring-1 ring-accent/20">
      <h2 className="font-display mb-3 text-sm font-semibold tracking-widest text-accent uppercase">
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
                ? 'bg-accent font-semibold text-[#062a2e] shadow'
                : 'text-teal-100/70 hover:text-teal-100',
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
          className="flex-1 rounded-lg border border-accent/40 px-4 py-2 text-sm font-medium text-teal-100 transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Undo Move
        </button>
        <button
          type="button"
          onClick={onNewGame}
          className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#062a2e] shadow transition-colors hover:bg-[#5eead4]"
        >
          New Game
        </button>
      </div>
    </div>
  );
}
