import { useEffect, useRef } from 'react';
import type { MoveRecord } from '@/types/chess';

interface MoveHistoryProps {
  history: MoveRecord[];
}

interface Round {
  number: number;
  white: string;
  whiteIndex: number;
  black?: string;
  blackIndex?: number;
}

export function MoveHistory({ history }: MoveHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest move.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history.length]);

  const rounds: Round[] = [];
  for (let i = 0; i < history.length; i += 2) {
    rounds.push({
      number: i / 2 + 1,
      white: history[i].label,
      whiteIndex: i,
      black: history[i + 1]?.label,
      blackIndex: i + 1 < history.length ? i + 1 : undefined,
    });
  }

  const latestIndex = history.length - 1;
  const moveCell = (label: string | undefined, index: number | undefined) => (
    <span
      className={[
        'rounded px-2 py-0.5 text-sm',
        index === latestIndex
          ? 'bg-gold/25 font-semibold text-amber-50'
          : 'text-amber-100/80',
      ].join(' ')}
    >
      {label ?? ''}
    </span>
  );

  return (
    <div className="wood-grain-panel rounded-xl p-4 shadow-lg ring-1 ring-gold/20">
      <h2 className="font-display mb-3 text-sm font-semibold tracking-widest text-gold uppercase">
        Moves
      </h2>
      <div ref={scrollRef} className="max-h-56 overflow-y-auto pr-1">
        {rounds.length === 0 ? (
          <p className="text-sm text-amber-100/40 italic">
            No moves yet — White to play.
          </p>
        ) : (
          <div className="grid grid-cols-[2rem_1fr_1fr] items-center gap-y-0.5">
            {rounds.map((round) => (
              <div key={round.number} className="contents">
                <span className="py-0.5 text-sm text-amber-100/50">{round.number}.</span>
                {moveCell(round.white, round.whiteIndex)}
                {moveCell(round.black, round.blackIndex)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
