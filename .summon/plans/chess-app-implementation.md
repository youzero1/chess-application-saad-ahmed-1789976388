---
status: implemented
title: Chess Application — Play vs AI with Wooden Classic Look
---

# Chess Application Implementation Plan

A single-page chess game: player (White) vs computer (Black) with three difficulty levels, full legal chess rules, move history with undo of the last full round, and a warm wooden classic aesthetic. The project is currently empty (only README.md), so the plan starts with scaffolding. All chess logic is hand-written in pure TypeScript — no external chess libraries.

Scope decisions (to keep scope reasonable): player always plays White, board orientation is fixed (White at bottom), AI always promotes to queen, draws detected are stalemate and insufficient material (threefold repetition and 50-move rule omitted).

## 1. Scaffold the project base

Files to create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/styles/global.css`, `src/routes/__root.tsx`, `src/routes/index.tsx` (temporary placeholder).

- `package.json`: dependencies `react`, `react-dom`, `@tanstack/react-router`; devDependencies `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`, `@tailwindcss/vite`, `@tanstack/router-plugin`. npm scripts: dev/build/preview. No chess libraries.
- `vite.config.ts`: register `@tanstack/router-plugin/vite` (before the React plugin) and `@tailwindcss/vite`; configure the `@` path alias to `src/`.
- `tsconfig.json`: strict TypeScript, bundler module resolution, path alias `@/*` → `src/*`.
- `index.html`: standard Vite entry mounting `#root`, page title "Wooden Chess".
- `src/styles/global.css`: MUST start with exactly `@import "tailwindcss";`, then an `@theme` block defining the wooden palette tokens (e.g. `--color-wood-light`, `--color-wood-dark`, `--color-panel`, `--color-felt`, accent gold) and a small set of custom utility/component classes for wood-grain gradients (CSS gradients only, no image assets).
- `src/main.tsx`: create the TanStack Router instance with the generated route tree, render `RouterProvider`, import `@/styles/global.css` once.
- `src/routes/__root.tsx`: app shell — warm brown gradient background, centered column layout, `<Outlet />`.
- `src/routes/index.tsx`: placeholder heading for now.
- Expected outcome: `npm install && npm run dev` starts the app, the router plugin auto-generates `src/routeTree.gen.ts` (never edit it), Tailwind classes render, placeholder page visible.

## 2. Define chess domain types

File to create: `src/types/chess.ts`.

- `Color` (`'white' | 'black'`), `PieceType` (`'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king'`), `Piece` (color + type).
- `SquareIndex` as number 0–63 (a8 = 0 … h1 = 63) plus `Square` helper shape if preferred; document the mapping.
- `Move`: from, to, optional `promotion` piece type, and flags for `isCapture`, `isEnPassant`, `isCastlingKingside`/`isCastlingQueenside`, `isDoublePawnPush`.
- `CastlingRights` (four booleans), `GameStatus` (`'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw'`), `Difficulty` (`'easy' | 'medium' | 'hard'`).
- `Position`: squares array (64 slots of `Piece | null`), side to move, castling rights, en-passant target square (or null), halfmove clock, fullmove number.
- `MoveRecord`: the applied `Move`, its human label (algebraic notation string), the captured piece (if any), and a deep snapshot of the `Position` before the move (enables trivial, bulletproof undo).
- Expected outcome: all later modules import every domain concept from this single file; no `any` types anywhere in game logic.

## 3. Board representation and position setup

File to create: `src/lib/chess/board.ts`.

- Helpers: rank/file ↔ square-index conversions, coordinate label of a square (e.g. `e4`), `isLightSquare`, `squareColorAt` etc.
- `createInitialPosition()`: standard starting position with White to move, all castling rights true, no en-passant target.
- `clonePosition()` for safe immutable updates, and `getPieceAt` / `setPieceAt` utilities.
- Expected outcome: can build and inspect the standard starting position; coordinate math is centralized here so no other module does index arithmetic inline.

## 4. Legal move generation

File to create: `src/lib/chess/moves.ts`.

- Pseudo-legal generators per piece type: sliding pieces (bishop/rook/queen) with ray blocking, knight and king offsets, pawn pushes (single/double from start rank), pawn captures including en passant, and promotion moves (emitting one move per promotion choice: queen, rook, bishop, knight).
- Castling generation: rights still available, king and rook unmoved (tracked via rights), squares between empty, and king not currently in / passing through / landing on an attacked square.
- `isSquareAttacked(position, square, byColor)` — used by both castling checks and legality filtering.
- `generateLegalMoves(position, color)`: generate pseudo-legal moves, then filter out any move that leaves the own king attacked (apply on a cloned position and test).
- Expected outcome: from the initial position exactly 20 legal moves are generated for White; en passant, promotion, and castling appear in the correct edge-case positions. This module is pure and has no React dependency.

## 5. Rules engine and game-status detection

File to create: `src/lib/chess/rules.ts`.

- `applyMove(position, move)`: returns a new `Position` — moves the piece, handles captures (including removing the en-passant-captured pawn), moves the rook on castling, swaps in the promoted piece, updates castling rights when king/rook moves or a rook is captured on its home square, sets/clears the en-passant target on double pawn pushes, advances clocks.
- `isInCheck(position, color)`, and `getGameStatus(position)`: returns `checkmate` (in check with zero legal moves), `stalemate` (not in check with zero legal moves), `draw` (insufficient material: king vs king, or king + minor piece vs king), `check`, or `playing`.
- `toAlgebraic(position, move, resultingStatus)`: builds the move label — piece letter (pawns omit), `x` on captures, destination square, promotion suffix (`=Q`), castling as `O-O` / `O-O-O`, `+` / `#` suffix from resulting status. Simplified disambiguation is acceptable.
- `getCapturedPieces(history)` helper: derives each side's captured pieces and material score diff from move records.
- Expected outcome: a small scripted sequence (e.g. scholar's mate) reaches `checkmate`; a stalemated test position reports `stalemate`; foolproof legality — illegal moves can never be applied.

## 6. Evaluation and AI opponent

Files to create: `src/lib/chess/evaluate.ts`, `src/lib/chess/ai.ts`.

- `evaluate.ts`: material values (pawn 100, knight 320, bishop 330, rook 500, queen 900, king 0), plus piece-square tables giving small positional bonuses (central pawns/knights encouraged, king sheltered mid-game). `evaluate(position)` returns a score from White's perspective.
- `ai.ts`: minimax with alpha-beta pruning over `generateLegalMoves`/`applyMove`, terminal scoring for checkmate/stalemate, and simple move ordering (captures first) to speed up pruning. `chooseAiMove(position, difficulty)` maps difficulty to search depth: easy = 1 ply, medium = 2 plies, hard = 3 plies; easy also picks randomly among near-equal moves (small randomness for variety at all levels). Always promotes to queen.
- Export an async wrapper that resolves after a short `setTimeout` delay (~400 ms) so the UI never blocks and the move feels natural.
- Expected outcome: at depth 3 the AI consistently punishes hanging pieces and takes free material; computation returns asynchronously without freezing the page.

## 7. Game state hook

File to create: `src/hooks/useChessGame.ts`.

- State: current `Position`, `status`, `history` (array of `MoveRecord`), `selectedSquare`, `legalMovesForSelection`, `lastMove` (from/to for highlighting), `difficulty`, `pendingPromotion` (from/to awaiting piece choice, or null), `aiThinking` flag.
- `selectSquare(square)`: if a promotion-relevant pawn move is chosen, set `pendingPromotion` and wait; otherwise validate against legal moves, apply via `rules.ts`, append a `MoveRecord` (with pre-move snapshot), update status and `lastMove`, then if the game continues trigger the AI reply through the async wrapper, guarding re-entry with `aiThinking`.
- `confirmPromotion(pieceType)` / `cancelPromotion()`: completes or aborts the pending pawn move.
- `undo()`: enabled only when it is the player's turn and `aiThinking` is false; pops the last two `MoveRecord`s (computer reply + player move) and restores the position snapshot stored on the player's move record; falls back to popping one record if only one exists (e.g. right after a new game where the AI moved first — not applicable here since player is White, but keep the guard). Recomputes status and clears selection/highlights.
- `newGame()`: resets everything, keeps the chosen difficulty.
- `setDifficulty(level)`: applies immediately to subsequent AI moves.
- Expected outcome: all game interactions flow through this one hook; undo always returns to the exact position before the player's last move, even mid-combination; AI never moves twice and never moves after game over.

## 8. Board UI components

Files to create: `src/components/ChessBoard.tsx`, `src/components/ChessPiece.tsx`.

- `ChessBoard`: renders the 8×8 grid (a8 top-left) inside a padded wooden frame with rank/file coordinate labels along the edges; squares use the `wood-light`/`wood-dark` theme tokens; click handling delegates to `onSquareClick` from the hook.
- Highlights: selected square outline, legal destination dots (ring style on capture squares), last-move from/to tint, and a red glow on the king's square when that side is in check. All highlights via Tailwind classes; only truly dynamic values may use inline styles.
- `ChessPiece`: renders a piece as a styled Unicode chess glyph (♔♕♖♗♘♙ / ♚♛♜♝♞♟) — large, centered, white pieces in cream with dark outline, black pieces in deep brown with light outline, subtle drop shadow for the carved-wood feel.
- Subtle hover cursor feedback on squares holding a movable piece; non-interactive while `aiThinking` or game over.
- Expected outcome: a beautiful warm wooden board where pieces can be selected and moved by click-select-then-click-target, with all highlights rendering correctly.

## 9. Side panel and dialog components

Files to create: `src/components/MoveHistory.tsx`, `src/components/CapturedPieces.tsx`, `src/components/GameControls.tsx`, `src/components/PromotionDialog.tsx`, `src/components/GameOverBanner.tsx`.

- `MoveHistory`: scrollable, numbered list pairing White's and Black's moves per round (1. e4 e5 …), auto-scrolls to the latest move, latest move visually emphasized; empty-state message before the first move.
- `CapturedPieces`: two rows showing pieces each side has lost (small glyphs), plus a material advantage badge (e.g. `+3`) for the leading side.
- `GameControls`: difficulty selector (Easy / Medium / Hard segmented control), Undo button (disabled while `aiThinking`, when history is empty, or when it's not the player's turn), and New Game button; all in the warm panel style with gold accents.
- `PromotionDialog`: modal overlay centered over the board offering Queen / Rook / Bishop / Knight as large glyph buttons; choosing one calls `confirmPromotion`, backdrop click calls `cancelPromotion`.
- `GameOverBanner`: appears when status is checkmate / stalemate / draw — announces "Checkmate — You Win!", "Checkmate — Computer Wins", "Stalemate — Draw", or "Draw — Insufficient Material", with a Play Again button calling `newGame`.
- Expected outcome: the full side panel works against the hook in isolation; every control has a clear disabled/empty state.

## 10. Compose the game screen and polish the wooden theme

File to update: `src/routes/index.tsx` (replace placeholder); touch up `src/styles/global.css` and `src/routes/__root.tsx` as needed.

- Layout: page title header with an elegant serif display font (add a Google Fonts link in `index.html`); responsive layout — board and side panel side-by-side on desktop (board left, panel right with fixed width), stacked vertically (board first, panel below) on mobile.
- Wire everything through a single `useChessGame()` instance in the route component, passing state and callbacks down as props.
- Polish: wood-grain gradient on the board frame and panel via the custom classes from step 1, felt-green or deep-brown page background, soft shadows, rounded frame corners, gold accent on active controls; ensure the board grid stays perfectly square (`aspect-square`) at all viewport sizes.
- Expected outcome: the app matches the classic wooden look — warm light/dark squares, carved-looking pieces, elegant warm-toned UI — and is fully usable on phone and desktop.

## 11. Final verification pass

- Exercise the full checklist in the running app: all piece movements, captures, both castling sides, en passant, promotion via the picker (for the player) and automatic queen promotion (for the AI), check indication, checkmate and stalemate endings, move history labels with `+`/`#` suffixes, undo reverting exactly one full round across multiple consecutive uses, difficulty switch taking effect on the next AI move, and New Game resetting cleanly.
- Confirm `npm run build` completes with no TypeScript errors and the production bundle renders identically.
- Expected outcome: a bug-free, complete chess game meeting every stated requirement.
