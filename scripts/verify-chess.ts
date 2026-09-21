/**
 * Engine verification script — not part of the app bundle and not typechecked
 * (lives outside src/). Run with:
 *   npx esbuild scripts/verify-chess.ts --bundle --platform=node --format=esm \
 *     --alias:@=./src --outfile=scripts/.verify.bundle.mjs
 *   node scripts/.verify.bundle.mjs
 */
import type { Move, Position } from '../src/types/chess';
import { createInitialPosition, squareAt } from '../src/lib/chess/board';
import { generateLegalMoves } from '../src/lib/chess/moves';
import { applyMove, getGameStatus, toAlgebraic } from '../src/lib/chess/rules';
import { chooseAiMove } from '../src/lib/chess/ai';

let failures = 0;
function check(name: string, cond: boolean): void {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) failures++;
}

function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  const moves = generateLegalMoves(pos, pos.turn);
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) n += perft(applyMove(pos, m), depth - 1);
  return n;
}

function squareFromName(name: string): number {
  return squareAt(8 - Number(name[1]), name.charCodeAt(0) - 97);
}

function findMove(pos: Position, from: string, to: string): Move | undefined {
  const f = squareFromName(from);
  const t = squareFromName(to);
  return generateLegalMoves(pos, pos.turn).find((m) => m.from === f && m.to === t);
}

function play(pos: Position, from: string, to: string): Position {
  const m = findMove(pos, from, to);
  if (!m) throw new Error(`Illegal move attempted in test: ${from}-${to}`);
  return applyMove(pos, m);
}

function emptyPosition(turn: 'white' | 'black'): Position {
  return {
    squares: new Array(64).fill(null),
    turn,
    castling: {
      whiteKingside: false,
      whiteQueenside: false,
      blackKingside: false,
      blackQueenside: false,
    },
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
  };
}

// 1. Perft from the initial position (validates the whole move generator).
const initial = createInitialPosition();
check('perft(1) = 20', perft(initial, 1) === 20);
check('perft(2) = 400', perft(initial, 2) === 400);
check('perft(3) = 8902', perft(initial, 3) === 8902);

// 2. Scholar's mate ends in checkmate with a "#" label.
let pos = createInitialPosition();
pos = play(pos, 'e2', 'e4');
pos = play(pos, 'e7', 'e5');
pos = play(pos, 'f1', 'c4');
pos = play(pos, 'b8', 'c6');
pos = play(pos, 'd1', 'h5');
pos = play(pos, 'g8', 'f6');
const mateMove = findMove(pos, 'h5', 'f7');
check('Qxf7 is available', !!mateMove);
const mated = applyMove(pos, mateMove!);
check("scholar's mate is checkmate", getGameStatus(mated) === 'checkmate');
check('mate label is Qxf7#', toAlgebraic(pos, mateMove!, 'checkmate') === 'Qxf7#');

// 3. Stalemate: black Ka8, white Kc7 + Qb6, black to move.
const stale = emptyPosition('black');
stale.squares[squareFromName('a8')] = { color: 'black', type: 'king' };
stale.squares[squareFromName('c7')] = { color: 'white', type: 'king' };
stale.squares[squareFromName('b6')] = { color: 'white', type: 'queen' };
check('stalemate detected', getGameStatus(stale) === 'stalemate');

// 4. Kingside castling generation, rook movement, and label.
pos = createInitialPosition();
pos = play(pos, 'e2', 'e4');
pos = play(pos, 'e7', 'e5');
pos = play(pos, 'g1', 'f3');
pos = play(pos, 'b8', 'c6');
pos = play(pos, 'f1', 'c4');
pos = play(pos, 'f8', 'c5');
const castle = findMove(pos, 'e1', 'g1');
check('O-O generated with castling flag', !!castle && castle.isCastlingKingside);
const afterCastle = applyMove(pos, castle!);
check('king lands on g1 after O-O', afterCastle.squares[squareFromName('g1')]?.type === 'king');
check('rook lands on f1 after O-O', afterCastle.squares[squareFromName('f1')]?.type === 'rook');
check('castling label is O-O', toAlgebraic(pos, castle!, getGameStatus(afterCastle)) === 'O-O');

// 5. En passant: 1.e4 a6 2.e5 d5 3.exd6 e.p.
pos = createInitialPosition();
pos = play(pos, 'e2', 'e4');
pos = play(pos, 'a7', 'a6');
pos = play(pos, 'e4', 'e5');
pos = play(pos, 'd7', 'd5');
const ep = findMove(pos, 'e5', 'd6');
check('en passant generated with flag', !!ep && ep.isEnPassant);
const afterEp = applyMove(pos, ep!);
check('e.p.: white pawn lands on d6', afterEp.squares[squareFromName('d6')]?.color === 'white');
check('e.p.: captured pawn removed from d5', afterEp.squares[squareFromName('d5')] === null);
check('e.p. label is exd6', toAlgebraic(pos, ep!, getGameStatus(afterEp)) === 'exd6');

// 6. Promotion generates all four choices.
const promo = emptyPosition('white');
promo.squares[squareFromName('a7')] = { color: 'white', type: 'pawn' };
promo.squares[squareFromName('e1')] = { color: 'white', type: 'king' };
promo.squares[squareFromName('h8')] = { color: 'black', type: 'king' };
const promoMoves = generateLegalMoves(promo, 'white').filter((m) => m.from === squareFromName('a7'));
check('4 promotion moves generated', promoMoves.length === 4 && promoMoves.every((m) => !!m.promotion));

// 7. Insufficient material draws.
const kvk = emptyPosition('white');
kvk.squares[squareFromName('e1')] = { color: 'white', type: 'king' };
kvk.squares[squareFromName('e8')] = { color: 'black', type: 'king' };
check('K vs K is a draw', getGameStatus(kvk) === 'draw');
const kvn = emptyPosition('black');
kvn.squares[squareFromName('e1')] = { color: 'white', type: 'king' };
kvn.squares[squareFromName('e8')] = { color: 'black', type: 'king' };
kvn.squares[squareFromName('c3')] = { color: 'white', type: 'knight' };
check('K+N vs K is a draw', getGameStatus(kvn) === 'draw');

// 8. AI (hard) takes a hanging queen: black Nf6 vs undefended white Qd5.
const hang = emptyPosition('black');
hang.squares[squareFromName('e8')] = { color: 'black', type: 'king' };
hang.squares[squareFromName('f6')] = { color: 'black', type: 'knight' };
hang.squares[squareFromName('e1')] = { color: 'white', type: 'king' };
hang.squares[squareFromName('d5')] = { color: 'white', type: 'queen' };
const aiMove = chooseAiMove(hang, 'hard');
check('AI captures the hanging queen', !!aiMove && aiMove.to === squareFromName('d5'));

// 9. AI reply from a normal position is always a legal move.
const afterE4 = play(createInitialPosition(), 'e2', 'e4');
const reply = chooseAiMove(afterE4, 'medium');
const legal = generateLegalMoves(afterE4, 'black');
check(
  'AI reply is legal',
  !!reply && legal.some((m) => m.from === reply.from && m.to === reply.to),
);

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log('\nAll chess engine checks passed.');
