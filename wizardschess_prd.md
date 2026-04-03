# Wizard's Chess — Product Requirements Document

**Version:** 1.1 | **Status:** Draft | **Date:** April 2026

| Field | Detail |
|---|---|
| Platform | Web (browser-based) |
| Stack | To be determined by developer |
| Target users | Casual chess players, Harry Potter fans |
| AI opponent | Three difficulty tiers: Easy (random), Medium (greedy heuristics), Hard (one-ply lookahead) |

---

## 1. Overview

Wizard's Chess is a browser-based chess application with a light Harry Potter–inspired presentation. The app supports two-player local play and single-player mode against the computer, with voice command input. Pieces update on the board as soon as a move is legal (no movement or capture animations in v1).

---

## 2. Goals & Non-Goals

### Goals

- Fully playable chess with all standard rules enforced
- Voice command input for moves using the Web Speech API
- Single-player mode with **three AI difficulty levels** (Easy, Medium, Hard); the active difficulty is set when a game starts and does not change mid-game until **New game**
- Responsive layout that works on desktop and tablet

### Non-Goals

- Piece movement or capture animations (instant board updates only in v1)
- Online multiplayer or matchmaking
- User accounts, profiles, or persistent game history
- 3D rendering or WebGL
- Engine-level AI (no Stockfish or external engine integration)
- Mobile-native app (iOS/Android)

---

## 3. User Stories

| User story | Acceptance criteria |
|---|---|
| As a player, I want to move pieces by clicking, so I can play intuitively. | Click a piece to select it; valid destinations are highlighted; click a destination to move. |
| As a player, I want to speak my move, so I can play hands-free. | Clicking the mic button activates voice input; saying a move in algebraic notation (e.g. "e2 to e4", "knight to f3") executes it if legal. |
| As a solo player, I want to choose how strong the computer is, so I can practice at my level. | A difficulty control offers Easy, Medium, and Hard; default is Medium. **New game** locks in the AI strength for that match; mid-game control changes do not change the current opponent (they may update only the setting used for the **next** New game, or the control may be disabled until New game — pick one pattern and make it obvious in the UI). |
| As a solo player, I want to play against a computer, so I can practice without a friend. | After white's move, the AI plays black within a short delay (optional brief "thinking" indicator in the status bar). |
| As a player, I want the game to enforce all chess rules, so I don't need to police moves myself. | Illegal moves are blocked; check, checkmate, stalemate, castling, en passant, and pawn promotion are all handled. |
| As a player, I want to undo my last move, so I can recover from mistakes. | An undo button reverts the last full move (white + black). Disabled if no moves have been made. |

---

## 4. Functional Requirements

### 4.1 Chess Engine

- All piece movement rules: pawn (including en passant, double push), knight, bishop, rook, queen, king
- Castling: kingside and queenside, with correct conditions (no prior move, no check, no squares attacked)
- Check and checkmate detection
- Stalemate detection
- Pawn promotion: auto-promote to queen, or optionally show a piece-selection dialog
- Move legality validation: only legal moves may be executed
- Move history: stored as algebraic notation for display in a scrollable log

### 4.2 Board & UI

- 8x8 board with alternating light/dark squares
- File (a–h) and rank (1–8) coordinate labels on the board edges
- Click-to-select then click-to-move interaction (no drag-and-drop required)
- Selected piece is highlighted; legal destinations are indicated with dot overlays (empty squares) and ring overlays (capture squares)
- King square highlighted in red when in check
- Status bar showing whose turn it is, check warnings, and game-over state
- Move log panel showing all moves in standard algebraic notation
- New game and undo buttons
- **AI difficulty control** (e.g. dropdown or segmented control): Easy | Medium | Hard; label clearly; default **Medium**. Effective difficulty for the current match is set at **New game** only and does not change until the next **New game**

### 4.3 Board updates (no animations)

- When a move is applied, the board reflects the new position **immediately** (no glide, stagger, or capture effects)
- No input-blocking period for animation; rely on normal turn rules and move legality only

### 4.4 Voice Commands

- Activated by a toggle button (mic icon); button shows active state while listening
- Uses the browser Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`)
- If the API is unavailable, the button is hidden or shows a tooltip explaining lack of support
- Supported input formats:
  - Square-to-square: "e2 to e4", "e2 e4"
  - Piece + destination: "knight to f3", "bishop c4", "queen takes d5"
  - Voice input only applies during the human player's turn
- If the spoken move is illegal or unrecognised, display an error in the status bar; do not move anything

### 4.5 AI Opponent

- The AI plays as black in single-player mode
- A single implementation entry point (e.g. `pickMove(game, difficulty)`) branches on difficulty; all tiers use the same legal-move generation
- **Easy:** choose uniformly at random among all legal moves
- **Medium:** greedy heuristics — among legal moves, prefer (in rough priority order): winning material (captures ranked by victim value), delivering check if available, simple positional bonuses (e.g. center control, piece development); if tied, randomize among ties or pick arbitrarily
- **Hard:** one-ply lookahead — for each legal AI move, apply it, evaluate every legal opponent reply, assume the opponent picks the reply that is worst for the AI (using the same static evaluation as Medium), then undo; choose the AI move that maximizes that worst-case score. Use the same evaluation components as Medium (material, check/stalemate terminal awareness, positional bonuses) so behavior is consistent but tighter than Medium
- All difficulties must be able to castle when legal under the rules
- Optional: brief thinking indicator in the status bar before the AI move (especially useful for Hard)

---

## 5. Non-Functional Requirements

| Requirement | Target |
|---|---|
| AI response time | Easy/Medium effectively instant; Hard should remain responsive on a modern laptop (avoid noticeable UI freeze; batch or yield if needed) |
| Browser support | Latest Chrome, Firefox, Safari, Edge |
| Voice support | Chrome required; degrade gracefully in other browsers |
| No build step required | Must run from a single HTML file or simple static server |
| Accessibility | Keyboard navigation is a stretch goal; color should not be the only indicator of state |

---

## 6. Architecture Guidance

The developer is free to choose their own stack. The following is non-prescriptive guidance.

### Recommended separation of concerns

- **Chess logic module** — pure functions, no DOM dependency, easily testable
  - Board state as a 2D array or FEN string
  - `getLegalMoves(board, square) → square[]`
  - `applyMove(board, from, to) → newBoard`
  - `isInCheck` / `isCheckmate` / `isStalemate` predicates
- **Rendering module** — translates board state to DOM/Canvas/SVG
- **AI module** — `pickMove(state, difficulty)`; Easy / Medium / Hard strategies; Hard may apply temporary moves and undo (or use a copy of game state) for lookahead
- **Voice module** — wraps Web Speech API, emits parsed move events

### State management

- Keep a single source-of-truth board state
- Store full move history as an array of states (enables undo)
- Avoid mutating board state in place when probing moves inside the AI — clone or use library undo, especially for Hard

### Suggested libraries (optional)

- **chess.js** — handles all chess rules so you don't have to write them from scratch
- No framework required — vanilla JS is entirely sufficient for this project

---

## 7. Edge Cases & Known Complexity

- **Castling:** track whether king and each rook have moved; do not allow castling through or into check
- **En passant:** the capture window is exactly one move; must be cleared after the opponent's next move
- **Pawn promotion:** if showing a dialog, board input must be blocked until the player chooses
- **AI and castling:** all difficulty tiers should be able to castle when the rules permit
- **Voice + promotion:** if a pawn reaches the back rank via voice command, handle promotion cleanly
- **Difficulty change mid-game:** must not change the AI strength for the current game; only **New game** applies the currently selected difficulty (avoids inconsistency with moves already played)

---

## 8. Future Considerations (Out of Scope)

- Animated piece movement and dramatic capture effects (wizard "battle" theme)
- Deeper search (e.g. minimax with alpha-beta at fixed depth) as an additional "Expert" level
- Online multiplayer via WebSockets
- Openings book for the AI
- 3D board with Three.js
- Mobile touch drag-and-drop
- Game export / import via PGN
- Timer / clock for timed games
