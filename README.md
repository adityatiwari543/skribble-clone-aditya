# Skribblish — a skribbl.io clone

Real-time multiplayer drawing & guessing game. **React + TypeScript** frontend,
**Node/Express + Socket.IO** backend, **PostgreSQL** for persistence.

**Live URL:** _add your deployed link here after deploying, e.g. `https://skribblish.vercel.app`_

---

## 1. Project structure

```
skribbl-clone/
├── server/                 # Node + Express + Socket.IO + PostgreSQL
│   └── src/
│       ├── index.ts        # app bootstrap (Express + HTTP + Socket.IO)
│       ├── db/              # pool.ts, schema.sql, init.ts (seed script)
│       ├── models/          # Player, Game, Room, RoomManager (OOP core)
│       ├── sockets/          # socketHandler.ts — all Socket.IO event wiring
│       ├── data/words.ts     # word list + random word picker
│       └── utils/wordMatch.ts
└── client/                 # React + TypeScript + Vite
    └── src/
        ├── pages/            # Home.tsx, Room.tsx
        ├── components/       # Canvas, Toolbar, Chat, Leaderboard, Lobby, ...
        ├── hooks/useSocket.ts
        └── types/
```

## 2. Run locally

**Prerequisites:** Node 18+, a PostgreSQL database (local, or a free one from
Render/Railway/Neon/Supabase).

### Backend

```bash
cd server
cp .env.example .env      # fill in DATABASE_URL
npm install
npm run db:init           # creates tables + seeds word list
npm run dev                # http://localhost:4000
```

### Frontend

```bash
cd client
cp .env.example .env      # VITE_SERVER_URL=http://localhost:4000
npm install
npm run dev                # http://localhost:5173
```

Open two browser tabs on `http://localhost:5173` to test multiplayer locally.

## 3. Architecture overview

### WebSockets (Socket.IO)

A single Socket.IO server handles everything: rooms, lobby, drawing sync,
guessing, chat, and game-state broadcasts. Each socket joins a Socket.IO
"room" (channel) matching the game room's 6-character code, so `io.to(roomId).emit(...)`
fans out to every connected player with no manual bookkeeping.

Event categories (see `server/src/sockets/socketHandler.ts`):
- **Room & lobby**: `create_room`, `join_room`, `update_settings`, `start_game`
- **Game flow**: `round_start`, `word_chosen`, `game_state`, `round_end`, `game_over`
- **Drawing**: `draw_data` (a full stroke), `draw_move` (live incremental point
  for smoother viewer motion), `canvas_clear`, `draw_undo`
- **Chat/guessing**: `guess` (checked server-side against the secret word),
  `chat`, `chat_message`, `guess_result`

### How drawing strokes are captured, sent, and rendered

The drawer's `<canvas>` (`client/src/components/Canvas.tsx`) listens to
pointer events. While the pointer is down, each point is pushed into an
in-progress `StrokeData` object (`{ id, color, size, isEraser, points[] }`)
and drawn locally immediately (zero-latency local feedback), while a
lightweight `draw_move` event streams just the new `{x,y}` to other clients
so they see motion in near-real-time. When the pointer is released, the
**complete stroke** is emitted as `draw_data`. The server validates the
sender is the current drawer, appends the stroke to `Room.strokes` (an
in-memory history used to replay the canvas for players who join mid-round),
and rebroadcasts it so every other client renders the exact same stroke
(smooth line via `ctx.lineTo` through all points) — this keeps everyone in
sync even if a `draw_move` packet is dropped.

### How game state (rounds, turn order, scoring) is managed

All of this lives in the `Game` class (`server/src/models/Game.ts`), which a
`Room` (`server/src/models/Room.ts`) owns for the duration of one match. This
is the OOP core requested in the assignment:

- **`Player`** — id, name, score, `isDrawing`/`hasGuessedCorrectly` flags,
  `toPublic()` for safe client-facing serialization.
- **`Game`** — owns `phase` (`lobby → choosing → drawing → roundEnd → gameOver`),
  turn order (`drawOrder`), the current round/word/hints, and all timers. It
  never touches sockets directly — it calls callback hooks
  (`onRoundStart`, `onWordChosen`, `onTick`, `onHintReveal`, `onRoundEnd`,
  `onGameOver`, `onGuessCorrect`) that `Room` wires up to `io.to(roomId).emit(...)`.
  This keeps game logic testable and decoupled from transport.
- **`Room`** — owns players, room settings, the live canvas stroke history,
  chat log, and the `Game` instance. Also persists finished games to Postgres.
- **`RoomManager`** — in-memory registry (`Map<roomId, Room>`) that generates
  unique 6-character room codes and cleans up empty rooms.

Turn rotation: `drawOrder` is a snapshot of player IDs when the game starts;
`drawerIndex` increments each round and wraps, incrementing `round` on wrap.
Scoring: correct guessers earn more points the earlier they guess (scaled by
remaining time), and the drawer earns a flat bonus per correct guesser.

### Word-matching logic

`server/src/utils/wordMatch.ts` normalizes both the guess and the secret word
(trim, lowercase, collapse internal whitespace) before an exact-match
comparison — so `" Ice Cream "` matches `icecream`-style entries case- and
whitespace-insensitively. A Levenshtein-distance helper (`isCloseMatch`) is
included for a "you're close!" UX hook, though it isn't scored. Correct
guesses are never echoed through the public `chat` channel (to avoid leaking
the word) — they're announced via a dedicated `guess_result` event instead.

### Hints

Hint letters are revealed on a timer proportional to `drawTime / (hints + 1)`,
picking a random not-yet-revealed letter index each tick and rebuilding a
`"_ _ a _ _"`-style string sent to everyone except the drawer (who already
sees the real word via a private `your_word` event).

### Database (PostgreSQL)

Gameplay state lives in memory (it's inherently real-time/ephemeral — no
value in a DB round-trip per stroke). Postgres is used for what should
survive server restarts: `rooms` (settings), `games` (one row per match,
winner), and `game_players` (final scores per player), plus a `words` table
seeded from `data/words.ts`. See `server/src/db/schema.sql`. A simple
`/api/leaderboard` REST endpoint aggregates all-time scores across games.

### Deployment setup and platform constraints

- **Vercel/Netlify** serve the frontend great but their serverless functions
  don't support long-lived WebSocket connections — so the Socket.IO **backend
  must run on a platform with a persistent Node process** (Render or Railway).
- This repo is split so `client/` deploys to Vercel/Netlify and `server/`
  deploys to Render/Railway independently, connected via `VITE_SERVER_URL`
  (client → server) and `CLIENT_URL` (server's CORS allow-list).

## 4. Deploying

### Backend → Render

1. Push this repo to GitHub.
2. On Render: **New → Web Service**, connect the repo, set **Root Directory**
   to `server`.
3. Build command: `npm install && npm run build`. Start command: `npm start`.
4. Add a **PostgreSQL** instance on Render (or use Railway/Neon/Supabase) and
   set `DATABASE_URL` in the web service's env vars. Set `DB_SSL=true`.
5. Set `CLIENT_URL` to your deployed frontend URL (step below) once you have it.
6. After first deploy, run `npm run db:init` once (Render Shell, or a local
   `psql`/`ts-node` run pointed at the same `DATABASE_URL`) to create tables.

A ready-made `render.yaml` is included at the repo root (Render's "Blueprint" format).

### Frontend → Vercel

1. On Vercel: **New Project**, import the repo, set **Root Directory** to `client`.
2. Framework preset: Vite. Build command: `npm run build`. Output dir: `dist`.
3. Add env var `VITE_SERVER_URL` = your Render backend URL (e.g.
   `https://skribbl-clone-server.onrender.com`).
4. Deploy, then go back to Render and set `CLIENT_URL` to this Vercel URL so
   CORS/Socket.IO allow it.

### Alternative: Railway for both

Railway supports full-stack + WebSockets in one place — you can deploy
`server/` and `client/` as two services in the same Railway project instead
of splitting across Vercel/Render, if you'd rather manage one platform.

## 5. Functional checklist (per assignment)

- [x] Create room with configurable settings (max players, rounds, draw time,
      word count, hints, private/public)
- [x] Join room via link or 6-character code
- [x] Lobby with player list, host-only "Start Game"
- [x] Turn-based rounds — one drawer, others guess, rotates every round
- [x] Real-time drawing sync (full-stroke + incremental live point streaming)
- [x] Word selection — drawer picks 1 of N choices, 15s auto-pick fallback
- [x] Guessing with scoring (time-weighted) + drawer bonus
- [x] Leaderboard + winner screen at game end
- [x] Brush, colors, brush size, eraser, undo, clear (drawer only)
- [x] Hints — letters revealed over time, host-configurable count
- [x] Chat (guesses shown as chat attempts; correct guesses announced
      separately without leaking the word)
- [x] Draw-time countdown with visual timer bar
- [x] Private rooms via invite link; public room support in `RoomManager.listPublicRooms()`
