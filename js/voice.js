const FILES = "abcdefgh";
const RANKS = "12345678";

const PIECE_WORDS = {
  pawn: "p",
  knight: "n",
  bishop: "b",
  rook: "r",
  queen: "q",
  king: "k",
  night: "n",
  "horse": "n",
};

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/#/g, " ")
    .replace(/\+/g, " ")
    .replace(/[.,!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSquare(tok) {
  if (tok.length !== 2) return null;
  const f = tok[0];
  const r = tok[1];
  if (FILES.includes(f) && RANKS.includes(r)) return f + r;
  return null;
}

/** Try to interpret transcript as a legal chess.js move. Returns SAN string or null. */
export function transcriptToSan(chess, raw) {
  const t = normalize(raw);
  if (!t) return null;

  // single destination when unique (e.g. "e4" only one legal move lands there)
  const single = t.match(/^\s*([a-h][1-8])\s*$/);
  if (single) {
    const to = single[1];
    const legal = chess.moves({ verbose: true });
    const toHere = legal.filter((m) => m.to === to);
    if (toHere.length === 1) return toHere[0].san;
  }

  // e2 to e4, e2-e4, e2 e4
  const sqPair = t.match(/\b([a-h][1-8])\s*(?:to|-|)\s*([a-h][1-8])\b/);
  if (sqPair) {
    const from = sqPair[1];
    const to = sqPair[2];
    const m = tryFromTo(chess, from, to);
    if (m) return m;
  }

  // "e2 e4" two tokens
  const tokens = t.split(" ").filter(Boolean);
  if (tokens.length === 2) {
    const a = parseSquare(tokens[0]);
    const b = parseSquare(tokens[1]);
    if (a && b) {
      const m = tryFromTo(chess, a, b);
      if (m) return m;
    }
  }

  // piece + destination: knight f3, knight to f3, N f3, bishop takes c4
  for (const word of Object.keys(PIECE_WORDS)) {
    const re = new RegExp(
      `(?:^|\\s)${word}(?:s)?\\s+(?:to\\s+)?(?:takes?|capture(?:s)?|x\\s*)?([a-h])([1-8])(?:\\s|$)`,
      "i"
    );
    const mm = t.match(re);
    if (mm) {
      const piece = PIECE_WORDS[word];
      const to = mm[1] + mm[2];
      const san = tryPieceToSquare(chess, piece, to, t.includes(" takes") || t.includes(" take") || t.includes("capture") || t.includes(" x"));
      if (san) return san;
    }
  }

  // short: nf3, n-f3 (SAN-like)
  const sanish = t.replace(/\s/g, "");
  const compact = sanish.match(/^[pnbrqk]?x?[a-h][1-8](?:=[nbrq])?$/);
  if (compact) {
    const legal = chess.moves({ verbose: true });
    const upper = sanish.toUpperCase();
    for (const mv of legal) {
      if (mv.san.replace(/[#+]/g, "").toLowerCase() === sanish) return mv.san;
    }
    // try adding piece letter
    for (const mv of legal) {
      const base = mv.san.replace(/[#+]/g, "");
      if (base.toLowerCase() === sanish) return mv.san;
    }
  }

  // castle
  if (/\bcastle\s+kingside\b|\b0-0\b|\bo-o\b|\bshort\s+castle\b/i.test(t)) {
    if (chess.moves().includes("O-O")) return "O-O";
  }
  if (/\bcastle\s+queenside\b|\b0-0-0\b|\bo-o-o\b|\blong\s+castle\b/i.test(t)) {
    if (chess.moves().includes("O-O-O")) return "O-O-O";
  }

  return null;
}

function tryFromTo(chess, from, to) {
  const legal = chess.moves({ verbose: true });
  const match = legal.find((m) => m.from === from && m.to === to);
  if (!match) return null;
  const promo =
    match.promotion ||
    (needsPromotion(chess, from, to) ? "q" : undefined);
  if (promo) {
    const again = legal.find((m) => m.from === from && m.to === to && m.promotion === promo);
    return again ? again.san : match.san;
  }
  return match.san;
}

function needsPromotion(chess, from, to) {
  const piece = chess.get(from);
  return piece?.type === "p" && (to[1] === "8" || to[1] === "1");
}

function tryPieceToSquare(chess, pieceChar, to, isCapture) {
  const legal = chess.moves({ verbose: true });
  const side = chess.turn();
  const candidates = legal.filter((m) => {
    if (m.to !== to) return false;
    if (m.piece !== pieceChar) return false;
    if (isCapture && !m.captured) return false;
    if (!isCapture && m.captured) return false;
    return true;
  });
  if (candidates.length === 1) return candidates[0].san;
  if (candidates.length > 1) {
    // ambiguous — cannot resolve without disambiguation
    return null;
  }
  if (!isCapture) {
    const loose = legal.filter((m) => m.to === to && m.piece === pieceChar);
    if (loose.length === 1) return loose[0].san;
  }
  return null;
}

export function createSpeechRecognizer(onResult, onError) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  rec.continuous = false;

  rec.onresult = (ev) => {
    const alt = ev.results[0];
    let best = alt[0].transcript;
    let conf = alt[0].confidence ?? 0;
    for (let i = 1; i < alt.length; i++) {
      const c = alt[i].confidence ?? 0;
      if (c > conf) {
        conf = c;
        best = alt[i].transcript;
      }
    }
    onResult(best);
  };

  rec.onerror = (e) => onError?.(e);
  return rec;
}
