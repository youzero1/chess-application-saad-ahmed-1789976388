import { createFileRoute } from '@tanstack/react-router';
import { ChessBoard } from '@/components/ChessBoard';
import { GameControls } from '@/components/GameControls';
import { CapturedPieces } from '@/components/CapturedPieces';
import { MoveHistory } from '@/components/MoveHistory';
import { PromotionDialog } from '@/components/PromotionDialog';
import { GameOverBanner } from '@/components/GameOverBanner';
import { useChessGame } from '@/hooks/useChessGame';
import { getCapturedPieces } from '@/lib/chess/rules';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const game = useChessGame();
  const captured = getCapturedPieces(game.history);

  const statusText = game.gameOver
    ? 'Game over'
    : game.aiThinking
      ? 'Computer is thinking…'
      : game.status === 'check'
        ? 'Check — your move'
        : 'Your move';

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-6 sm:py-8">
      <header className="mb-6 text-center">
        <h1 className="font-display text-4xl font-bold tracking-wide text-accent drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] sm:text-5xl">
          Ocean Chess
        </h1>
        <p className="mt-1 text-sm text-teal-100/60">
          You play White against the computer
        </p>
      </header>

      <main className="flex w-full max-w-5xl flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        <div className="relative w-full max-w-[min(92vw,36rem)]">
          <ChessBoard
            position={game.position}
            selectedSquare={game.selectedSquare}
            legalMovesForSelection={game.legalMovesForSelection}
            lastMove={game.lastMove}
            checkSquare={game.checkSquare}
            onSquareClick={game.selectSquare}
            interactive={!game.aiThinking && !game.gameOver}
          />

          {game.pendingPromotion !== null && (
            <PromotionDialog
              onSelect={game.confirmPromotion}
              onCancel={game.cancelPromotion}
            />
          )}

          <GameOverBanner
            status={game.status}
            winner={game.status === 'checkmate' ? (game.position.turn === 'white' ? 'black' : 'white') : null}
            onPlayAgain={game.newGame}
          />
        </div>

        <aside className="flex w-full max-w-[min(92vw,36rem)] flex-col gap-4 lg:w-80">
          <div className="rounded-xl bg-panel/90 px-4 py-3 text-center text-sm font-medium text-teal-100/90 shadow-lg ring-1 ring-accent/20">
            {statusText}
          </div>

          <GameControls
            difficulty={game.difficulty}
            onDifficultyChange={game.setDifficulty}
            onUndo={game.undo}
            onNewGame={game.newGame}
            undoDisabled={game.undoDisabled}
          />

          <CapturedPieces
            capturedByWhite={captured.capturedByWhite}
            capturedByBlack={captured.capturedByBlack}
            materialDiff={captured.materialDiff}
          />

          <MoveHistory history={game.history} />
        </aside>
      </main>
    </div>
  );
}
