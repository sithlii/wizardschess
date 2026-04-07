# Wizard’s Chess

**Enchanted pieces. Mortal rules. One browser tab.**

Wizard’s Chess is a polished, in-browser chess experience that leans into the fantasy of the name without breaking a single rule of the real game. Click squares, duel a custom AI, pass the laptop for a hot-seat match, or—where the magic really shows—**call your moves out loud** and watch the board obey.

No install. No account. Just chess, dressed for a midnight tournament in a tower library.

---

## Why it’s worth your time

This isn’t a throwaway demo. The board is built for clarity and drama: legal moves glow on empty squares, captures pulse a different color, and when your king is in trouble, you’ll **feel** it. The typography and palette (deep night blues, warm stone squares, gold accents) make every session feel like a session—whether you’re grinding out an endgame or blitzing openings against the machine.

The AI isn’t a black box from a generic engine you’ve seen a hundred times. It’s **hand-tuned** for this project: greedy tactics on Medium, real lookahead on Hard, and Easy when you want the computer to stumble like a mortal. You play **White** against the computer (Black); difficulty locks once the game is underway so your choices matter.

And if your browser supports the Web Speech API, you get **voice moves**—speak in natural-ish chess language (`e2 to e4`, `knight f3`, castles, even a bit of SAN) and the game parses it against the **actual legal move list**, so nonsense doesn’t slip through.

---

## Key features

| Feature | What you get |
|--------|----------------|
| **Vs computer** | Three strengths: Easy, Medium, Hard — from chaotic to calculating. |
| **Local two-player** | One screen, two minds; perfect for couch or classroom. |
| **Full rules** | Standard chess via [chess.js](https://github.com/jhlywa/chess.js): check, checkmate, stalemate, draws, promotion, etc. |
| **Smart UI** | Rank & file labels, highlighted legal moves, check indication, live move list. |
| **Undo** | Walk back when your hand moved faster than your brain (handles AI turns sensibly). |
| **Voice input** | Optional mic button when supported — speak moves, keep your hands free. |
| **Responsive layout** | Board and panels adapt; looks at home on desktop and smaller screens. |

---

## Tech stack

- **Vanilla JavaScript (ES modules)** — no build step required to play.
- **chess.js** — battle-tested move generation and game state.
- **Custom AI** (`js/ai.js`) — material + positional heuristics; Hard uses a 2-ply search (Black maximizes, assumes White’s best reply).
- **Web Speech API** — optional voice recognition (`js/voice.js`).
- **CSS** — custom dark fantasy theme; Cinzel + Source Serif 4 via Google Fonts.

---

## Run it locally

Because everything is static, you can:

1. **Open `index.html` directly** in a modern browser (some environments restrict ES modules from `file://`; if so, use a local server).

2. **Serve the folder**, for example:

   ```bash
   npx serve .
   ```

   Then open the URL shown (often `http://localhost:3000`).

Voice features need **HTTPS or localhost** and microphone permission in most browsers.

---

## Project layout

```
wizardschess/
├── index.html      # Shell & UI
├── css/styles.css  # Theme & layout
└── js/
    ├── app.js      # Board, input, game loop
    ├── ai.js       # Difficulty levels & evaluation
    └── voice.js    # Speech → SAN parsing
```

---

**Wizard’s Chess** — where the pieces are legendary and the rules are still FIDE-solid. ♔♚
