import { Server } from "socket.io";
import { Player } from "./Player";
import { Game } from "./Game";
import { RoomSettings, StrokeData } from "../types";
import { pool } from "../db/pool";

const DEFAULT_SETTINGS: RoomSettings = {
  maxPlayers: 8,
  rounds: 3,
  drawTime: 80,
  wordCount: 3,
  hints: 2,
  wordMode: "normal",
  isPrivate: true,
};

export class Room {
  public id: string;
  public players: Player[] = [];
  public settings: RoomSettings;
  public game: Game | null = null;
  public strokes: StrokeData[] = []; // current canvas history for late joiners
  public chatLog: { playerId: string; playerName: string; text: string; ts: number }[] = [];

  private io: Server;
  private dbGameId: number | null = null;

  constructor(id: string, io: Server, settings: Partial<RoomSettings> = {}) {
    this.id = id;
    this.io = io;
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
  }

  private emit(event: string, payload?: unknown) {
    this.io.to(this.id).emit(event, payload);
  }

  addPlayer(id: string, name: string): Player {
    const isHost = this.players.length === 0;
    const player = new Player(id, name, isHost);
    this.players.push(player);
    return player;
  }

  removePlayer(id: string) {
    const player = this.players.find((p) => p.id === id);
    if (!player) return;

    // Mark disconnected instead of hard-remove during an active game,
    // so scores/turn order remain consistent; hard-remove in lobby.
    if (this.game && this.game.phase !== "lobby" && this.game.phase !== "gameOver") {
      player.connected = false;
    } else {
      this.players = this.players.filter((p) => p.id !== id);
    }

    // Reassign host if needed
    if (player.isHost) {
      const nextHost = this.players.find((p) => p.connected);
      if (nextHost) nextHost.isHost = true;
    }
  }

  isEmpty(): boolean {
    return this.players.every((p) => !p.connected) || this.players.length === 0;
  }

  getPlayersPublic() {
    return this.players.map((p) => p.toPublic());
  }

  updateSettings(partial: Partial<RoomSettings>) {
    this.settings = { ...this.settings, ...partial };
  }

  canStart(): boolean {
    return this.players.filter((p) => p.connected).length >= 2;
  }

  startGame() {
    if (!this.canStart()) return;
    this.strokes = [];
    this.players.forEach((p) => (p.score = 0));

    this.game = new Game(this.players, this.settings, {
      onRoundStart: (payload) => {
        this.strokes = [];
        this.emit("round_start", payload);
        this.emit("canvas_clear");
        this.emit("player_joined", { players: this.getPlayersPublic() });
      },
      onWordChosen: (payload) => {
        this.emit("game_state", this.game?.getPublicState());
        // Tell the drawer the real word privately
        const drawerSocket = this.io.sockets.sockets.get(payload.drawerId);
        if (drawerSocket) drawerSocket.emit("your_word", { word: this.game?.currentWord });
      },
      onTick: (timeLeft) => {
        this.emit("time_tick", { timeLeft });
      },
      onHintReveal: (hint) => {
        this.emit("hint_update", { hint });
      },
      onRoundEnd: (payload) => {
        this.emit("round_end", payload);
      },
      onGameOver: (payload) => {
        this.emit("game_over", payload);
        this.persistGameResult(payload).catch((err) =>
          console.error("Failed to persist game result:", err)
        );
      },
      onGuessCorrect: (payload) => {
        this.emit("guess_result", { correct: true, ...payload });
        this.emit("player_joined", { players: this.getPlayersPublic() });
      },
    });

    this.createDbGame().catch((err) => console.error("Failed to create db game row:", err));
    this.game.start();
  }

  handleGuess(playerId: string, text: string): boolean {
    if (!this.game) return false;
    return this.game.submitGuess(playerId, text);
  }

  addStroke(stroke: StrokeData) {
    this.strokes.push(stroke);
    // Cap history to avoid unbounded memory growth on very long strokes
    if (this.strokes.length > 2000) this.strokes.shift();
  }

  clearCanvas() {
    this.strokes = [];
  }

  undoLastStroke() {
    this.strokes.pop();
  }

  addChatMessage(playerId: string, playerName: string, text: string) {
    const msg = { playerId, playerName, text: text.slice(0, 200), ts: Date.now() };
    this.chatLog.push(msg);
    if (this.chatLog.length > 200) this.chatLog.shift();
    return msg;
  }

  private async createDbGame() {
    // Ensure room row exists (idempotent upsert)
    await pool.query(
      `INSERT INTO rooms (id, host_name, is_private, max_players, rounds, draw_time, word_count, hints)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        this.id,
        this.players.find((p) => p.isHost)?.name ?? "host",
        this.settings.isPrivate,
        this.settings.maxPlayers,
        this.settings.rounds,
        this.settings.drawTime,
        this.settings.wordCount,
        this.settings.hints,
      ]
    );
    const result = await pool.query(
      `INSERT INTO games (room_id) VALUES ($1) RETURNING id`,
      [this.id]
    );
    this.dbGameId = result.rows[0].id;
  }

  private async persistGameResult(payload: {
    winner: { id: string; name: string; score: number } | null;
    leaderboard: { id: string; name: string; score: number }[];
  }) {
    if (!this.dbGameId) return;
    await pool.query(`UPDATE games SET ended_at = NOW(), winner_name = $1 WHERE id = $2`, [
      payload.winner?.name ?? null,
      this.dbGameId,
    ]);
    for (const p of payload.leaderboard) {
      await pool.query(
        `INSERT INTO game_players (game_id, player_name, score) VALUES ($1, $2, $3)`,
        [this.dbGameId, p.name, p.score]
      );
    }
  }
}
