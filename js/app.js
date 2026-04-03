import { Chess } from "https://cdn.jsdelivr.net/npm/chess.js@1.4.0/dist/esm/chess.js";
import { pickMove } from "./ai.js";
import { createSpeechRecognizer, transcriptToSan } from "./voice.js";

/** Filled chess symbols for both sides — color comes from CSS (.piece--white / .piece--black). */
const PIECE_GLYPHS = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };

const els = {
  board: document.getElementById("board"),
  status: document.getElementById("status"),
  moveLog: document.getElementById("move-log"),
  mode: document.getElementById("mode"),
  difficulty: document.getElementById("difficulty"),
  btnNew: document.getElementById("btn-new"),
  btnUndo: document.getElementById("btn-undo"),
  btnMic: document.getElementById("btn-mic"),
  fileTop: document.querySelector(".file-labels--top"),
  fileBottom: document.querySelector(".file-labels--bottom"),
  rankLeft: document.querySelector(".rank-labels--left"),
  rankRight: document.querySelector(".rank-labels--right"),
};

let chess = new Chess();
let selectedSquare = null;
/** @type {'easy'|'medium'|'hard'} */
let lockedDifficulty = "medium";
let speechRec = null;

function squareColor(file, rank) {
  return (file + rank) % 2 === 0 ? "light" : "dark";
}

function buildBoardShell() {
  els.board.replaceChildren();
  for (let rank = 8; rank >= 1; rank--) {
    for (let f = 0; f < 8; f++) {
      const file = String.fromCharCode(97 + f);
      const sq = file + rank;
      const div = document.createElement("div");
      div.className = `square square--${squareColor(f, rank)}`;
      div.dataset.square = sq;
      div.setAttribute("role", "gridcell");
      div.setAttribute("aria-label", `Square ${sq}`);
      div.tabIndex = -1;
      els.board.appendChild(div);
    }
  }

  const files = "abcdefgh".split("");
  for (const el of [els.fileTop, els.fileBottom]) {
    el.replaceChildren();
    for (const c of files) {
      const span = document.createElement("span");
      span.textContent = c;
      el.appendChild(span);
    }
  }
  for (const el of [els.rankLeft, els.rankRight]) {
    el.replaceChildren();
    for (let r = 8; r >= 1; r--) {
      const span = document.createElement("span");
      span.textContent = String(r);
      el.appendChild(span);
    }
  }
}

function findKingSquare(color) {
  const b = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const c = b[r][f];
      if (c && c.type === "k" && c.color === color) {
        return String.fromCharCode(97 + f) + (8 - r);
      }
    }
  }
  return null;
}

function renderBoard() {
  const legal = selectedSquare
    ? chess.moves({ square: selectedSquare, verbose: true })
    : [];
  const destSet = new Map();
  for (const m of legal) {
    destSet.set(m.to, m.captured ? "capture" : "empty");
  }

  const inCheck = chess.inCheck();
  const side = chess.turn();
  const kingSq = inCheck ? findKingSquare(side) : null;

  for (const cell of els.board.children) {
    const sq = cell.dataset.square;
    const piece = chess.get(sq);
    cell.replaceChildren();
    cell.className = `square square--${squareColor(sq.charCodeAt(0) - 97, parseInt(sq[1], 10))}`;
    if (piece) {
      const span = document.createElement("span");
      span.className =
        piece.color === "w" ? "piece piece--white" : "piece piece--black";
      span.textContent = PIECE_GLYPHS[piece.type];
      span.setAttribute("aria-hidden", "true");
      cell.appendChild(span);
    }
    if (selectedSquare === sq) cell.classList.add("square--selected");
    if (kingSq === sq) cell.classList.add("square--check");
    const dest = destSet.get(sq);
    if (dest === "empty") cell.classList.add("square--legal-empty");
    if (dest === "capture") cell.classList.add("square--legal-capture");
  }

  renderMoveLog();
  updateStatus();
  updateControls();
}

function renderMoveLog() {
  const h = chess.history();
  els.moveLog.replaceChildren();
  for (let i = 0; i < h.length; i += 2) {
    const num = document.createElement("li");
    num.className = "num";
    num.textContent = `${Math.floor(i / 2) + 1}.`;
    const w = document.createElement("li");
    w.className = "w";
    w.textContent = h[i];
    els.moveLog.append(num, w);
    if (h[i + 1]) {
      const b = document.createElement("li");
      b.className = "b";
      b.textContent = h[i + 1];
      els.moveLog.append(b);
    } else {
      els.moveLog.append(document.createElement("li"));
    }
  }
}

function updateStatus(msg, isError = false) {
  els.status.classList.toggle("is-error", !!isError);
  if (msg !== undefined) {
    els.status.textContent = msg;
    return;
  }
  if (chess.isCheckmate()) {
    const winner = chess.turn() === "w" ? "Black" : "White";
    els.status.textContent = `Checkmate — ${winner} wins.`;
    return;
  }
  if (chess.isStalemate()) {
    els.status.textContent = "Stalemate — draw.";
    return;
  }
  if (chess.isDraw()) {
    els.status.textContent = "Draw.";
    return;
  }
  const side = chess.turn() === "w" ? "White" : "Black";
  const check = chess.inCheck() ? " — check" : "";
  els.status.textContent = `${side} to move${check}.`;
}

function updateControls() {
  const histLen = chess.history().length;
  const vsAi = els.mode.value === "pvai";
  els.btnUndo.disabled = histLen === 0;
  els.difficulty.disabled = !vsAi || histLen > 0;
  if (!vsAi) {
    els.difficulty.setAttribute("title", "Only used in vs Computer");
  } else {
    els.difficulty.removeAttribute("title");
  }
}

function isHumanTurn() {
  if (els.mode.value === "pvp") return true;
  return chess.turn() === "w";
}

function tryMove(from, to) {
  const legal = chess.moves({ square: from, verbose: true });
  const m = legal.find((x) => x.to === to);
  if (!m) return false;
  const opts = { from, to };
  if (m.promotion) opts.promotion = "q";
  const r = chess.move(opts);
  if (!r) return false;
  selectedSquare = null;
  renderBoard();
  afterHumanMove();
  return true;
}

function afterHumanMove() {
  if (chess.isGameOver()) return;
  if (els.mode.value === "pvai" && chess.turn() === "b") {
    scheduleAiMove();
  }
}

function scheduleAiMove() {
  updateStatus("Black is thinking…");
  const delay = lockedDifficulty === "hard" ? 120 : 60;
  setTimeout(runAiMove, delay);
}

function runAiMove() {
  if (chess.isGameOver() || chess.turn() !== "b") return;
  const choice = pickMove(chess, lockedDifficulty);
  if (!choice) return;
  const payload =
    choice.promotion != null
      ? { from: choice.from, to: choice.to, promotion: choice.promotion }
      : { from: choice.from, to: choice.to };
  chess.move(payload);
  selectedSquare = null;
  renderBoard();
}

function onSquareClick(sq) {
  if (chess.isGameOver()) return;
  if (!isHumanTurn()) return;

  const piece = chess.get(sq);
  const turn = chess.turn();

  if (selectedSquare) {
    const legal = chess.moves({ square: selectedSquare, verbose: true });
    const hit = legal.some((m) => m.to === sq);
    if (hit) {
      tryMove(selectedSquare, sq);
      return;
    }
  }

  if (piece && piece.color === turn) {
    selectedSquare = sq;
    renderBoard();
    return;
  }

  selectedSquare = null;
  renderBoard();
}

function newGame() {
  chess = new Chess();
  selectedSquare = null;
  if (els.mode.value === "pvai") {
    lockedDifficulty = /** @type {'easy'|'medium'|'hard'} */ (els.difficulty.value);
  }
  renderBoard();
  updateStatus();
}

function undoMove() {
  const n = chess.history().length;
  if (n >= 2) {
    chess.undo();
    chess.undo();
  } else if (n === 1) {
    chess.undo();
  }
  selectedSquare = null;
  renderBoard();
  updateStatus();
}

function setupMic() {
  speechRec = createSpeechRecognizer(
    (transcript) => {
      els.btnMic.classList.remove("is-listening");
      els.btnMic.setAttribute("aria-pressed", "false");
      if (!isHumanTurn() || chess.isGameOver()) return;
      const san = transcriptToSan(chess, transcript);
      if (!san) {
        updateStatus(`Could not understand “${transcript}”. Try e.g. e2 to e4 or knight f3.`, true);
        return;
      }
      const copy = new Chess(chess.fen());
      const ok = copy.move(san);
      if (!ok) {
        updateStatus(`Illegal move: ${san}`, true);
        return;
      }
      chess.move(san);
      selectedSquare = null;
      renderBoard();
      afterHumanMove();
    },
    () => {
      els.btnMic.classList.remove("is-listening");
      els.btnMic.setAttribute("aria-pressed", "false");
    }
  );

  if (!speechRec) {
    els.btnMic.hidden = true;
    return;
  }

  speechRec.onend = () => {
    els.btnMic.classList.remove("is-listening");
    els.btnMic.setAttribute("aria-pressed", "false");
  };

  els.btnMic.hidden = false;
  els.btnMic.addEventListener("click", () => {
    if (!isHumanTurn() || chess.isGameOver()) return;
    if (els.btnMic.classList.contains("is-listening")) {
      speechRec.stop();
      els.btnMic.classList.remove("is-listening");
      els.btnMic.setAttribute("aria-pressed", "false");
      return;
    }
    try {
      els.btnMic.classList.add("is-listening");
      els.btnMic.setAttribute("aria-pressed", "true");
      speechRec.start();
    } catch {
      els.btnMic.classList.remove("is-listening");
      updateStatus("Voice could not start. Check microphone permission.", true);
    }
  });
}

function init() {
  buildBoardShell();
  els.board.addEventListener("click", (e) => {
    const cell = e.target.closest(".square");
    if (!cell) return;
    onSquareClick(cell.dataset.square);
  });

  els.btnNew.addEventListener("click", newGame);
  els.btnUndo.addEventListener("click", undoMove);
  els.mode.addEventListener("change", newGame);
  els.difficulty.addEventListener("change", () => {
    if (els.mode.value === "pvai" && chess.history().length === 0) {
      lockedDifficulty = /** @type {"easy" | "medium" | "hard"} */ (els.difficulty.value);
    }
  });
  setupMic();
  newGame();
}

init();
