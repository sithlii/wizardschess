import { Chess } from "https://cdn.jsdelivr.net/npm/chess.js@1.4.0/dist/esm/chess.js";

const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const CENTER_SQ = new Set(["d4", "d5", "e4", "e5"]);

/** Score from Black's perspective: positive favors Black. */
function evaluateForBlack(chess) {
  if (chess.isCheckmate()) {
    return chess.turn() === "b" ? -1e6 : 1e6;
  }
  if (chess.isStalemate() || chess.isDraw()) {
    return 0;
  }

  let material = 0;
  let blackCenter = 0;
  let whiteCenter = 0;
  const b = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = b[r][f];
      if (!cell) continue;
      const sq = String.fromCharCode(97 + f) + (8 - r);
      const v = PIECE_VAL[cell.type] ?? 0;
      if (cell.color === "b") {
        material += v;
        if (CENTER_SQ.has(sq) && cell.type !== "k") blackCenter += 0.15;
      } else {
        material -= v;
        if (CENTER_SQ.has(sq) && cell.type !== "k") whiteCenter += 0.15;
      }
    }
  }

  let development = 0;
  if (b[0][1]?.type === "n" && b[0][1]?.color === "b") development -= 0.06;
  if (b[0][6]?.type === "n" && b[0][6]?.color === "b") development -= 0.06;
  if (b[7][1]?.type === "n" && b[7][1]?.color === "w") development += 0.06;
  if (b[7][6]?.type === "n" && b[7][6]?.color === "w") development += 0.06;

  return material + (blackCenter - whiteCenter) * 2 + development;
}

function captureValue(move) {
  if (!move.captured) return 0;
  return PIECE_VAL[move.captured] ?? 0;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickMove(chess, difficulty) {
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return null;

  if (difficulty === "easy") {
    const pick = moves[Math.floor(Math.random() * moves.length)];
    return pick;
  }

  if (difficulty === "medium") {
    let best = -Infinity;
    const tier = [];
    for (const m of moves) {
      chess.move(m);
      let s = 0;
      if (chess.isCheckmate() && chess.turn() === "w") s = 1e5;
      else {
        const cap = captureValue(m) * 120;
        const chk = chess.inCheck() ? 180 : 0;
        const pos = evaluateForBlack(chess) * 1.2;
        s = cap + chk + pos;
      }
      chess.undo();
      if (s > best) {
        best = s;
        tier.length = 0;
        tier.push(m);
      } else if (s === best) tier.push(m);
    }
    return tier[Math.floor(Math.random() * tier.length)];
  }

  // hard — one ply: Black max, White min reply
  let bestWorst = -Infinity;
  const tier = [];
  const shuffled = shuffle(moves);

  for (const m of shuffled) {
    const g = new Chess(chess.fen());
    g.move(m);

    if (g.isGameOver()) {
      const leaf = g.isCheckmate() ? 1e6 : 0;
      if (leaf > bestWorst) {
        bestWorst = leaf;
        tier.length = 0;
        tier.push(m);
      } else if (leaf === bestWorst) tier.push(m);
      continue;
    }

    const replies = g.moves({ verbose: true });
    let worstForBlack = Infinity;

    for (const r of replies) {
      g.move(r);
      let ev;
      if (g.isCheckmate() && g.turn() === "b") ev = -1e6;
      else if (g.isStalemate() && g.turn() === "b") ev = 0;
      else ev = evaluateForBlack(g);
      g.undo();
      if (ev < worstForBlack) worstForBlack = ev;
    }

    if (worstForBlack > bestWorst) {
      bestWorst = worstForBlack;
      tier.length = 0;
      tier.push(m);
    } else if (worstForBlack === bestWorst) tier.push(m);
  }

  return tier[Math.floor(Math.random() * tier.length)];
}
