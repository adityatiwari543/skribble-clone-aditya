import { Player } from "./Player";
import { RoomSettings, GamePhase, GameStatePublic } from "../types";
import { getRandomWords } from "../data/words";

const POINTS_BASE = 100;
const POINTS_DRAWER_PER_GUESSER = 25;

interface GameCallbacks {
  onRoundStart: (payload: { drawerId: string; wordOptions: string[]; drawTime: number; round: number }) => void;
  onWordChosen: (payload: { drawerId: string; wordLength: number; hint: string }) => void;
  onTick: (timeLeft: number) => void;
  onHintReveal: (hint: string) => void;
  onRoundEnd: (payload: { word: string; scores: { id: string; score: number }[]; nextDrawerId: string | null }) => void;
  onGameOver: (payload: { winner: { id: string; name: string; score: number } | null; leaderboard: { id: string; name: string; score: number }[] }) => void;
  onGuessCorrect: (payload: { playerId: string; playerName: string; points: number }) => void;
}

/**
 * Game encapsulates all round/turn/scoring logic for a single room.
 * A Room owns exactly one Game instance while a match is in progress.
 */
export class Game {
  public phase: GamePhase = "lobby";
  public round: number = 0;
  public totalRounds: number;
  public drawerIndex: number = -1;
  public currentWord: string | null = null;
  public wordOptions: string[] = [];
  public timeLeft: number = 0;
  public revealedIndices: Set<number> = new Set();

  private players: Player[];
  private settings: RoomSettings;
  private callbacks: GameCallbacks;
  private timer: NodeJS.Timeout | null = null;
  private hintTimer: NodeJS.Timeout | null = null;
  private drawOrder: string[] = []; // player ids in turn order for this game
  private roundStartTime: number = 0;

  constructor(players: Player[], settings: RoomSettings, callbacks: GameCallbacks) {
    this.players = players;
    this.settings = settings;
    this.totalRounds = settings.rounds;
    this.callbacks = callbacks;
  }

  private getPlayer(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }

  start() {
    this.drawOrder = this.players.map((p) => p.id);
    this.round = 0;
    this.drawerIndex = -1;
    this.nextRound();
  }

  private nextRound() {
    // Clear any lingering timers
    this.clearTimers();

    this.drawerIndex++;
    if (this.drawerIndex >= this.drawOrder.length) {
      this.drawerIndex = 0;
      this.round++;
    }
    if (this.round === 0) this.round = 1;

    if (this.round > this.totalRounds) {
      this.endGame();
      return;
    }

    const activeIds = this.players.filter((p) => p.connected).map((p) => p.id);
    if (activeIds.length < 2) {
      this.endGame();
      return;
    }

    const drawerId = this.drawOrder[this.drawerIndex];
    const drawer = this.getPlayer(drawerId);
    if (!drawer || !drawer.connected) {
      // skip disconnected player's turn
      this.nextRound();
      return;
    }

    this.players.forEach((p) => p.resetForRound());
    drawer.isDrawing = true;

    this.phase = "choosing";
    this.currentWord = null;
    this.revealedIndices = new Set();
    this.wordOptions = getRandomWords(this.settings.wordCount, this.settings.wordMode);

    this.callbacks.onRoundStart({
      drawerId,
      wordOptions: this.wordOptions,
      drawTime: this.settings.drawTime,
      round: this.round,
    });

    // Auto-pick first word if drawer doesn't choose within 15s
    this.timer = setTimeout(() => {
      if (this.phase === "choosing") {
        this.chooseWord(drawerId, this.wordOptions[0]);
      }
    }, 15000);
  }

  chooseWord(drawerId: string, word: string) {
    if (this.phase !== "choosing") return;
    const drawer = this.getPlayer(drawerId);
    if (!drawer || !drawer.isDrawing) return;

    this.clearTimers();
    this.currentWord = word;
    this.phase = "drawing";
    this.timeLeft = this.settings.drawTime;
    this.roundStartTime = Date.now();

    this.callbacks.onWordChosen({
      drawerId,
      wordLength: word.replace(/\s/g, "").length,
      hint: this.buildHintString(),
    });

    this.timer = setInterval(() => {
      this.timeLeft--;
      this.callbacks.onTick(this.timeLeft);
      if (this.timeLeft <= 0) {
        this.endRound(null);
      }
    }, 1000);

    this.scheduleHints();
  }

  private scheduleHints() {
    const hintCount = this.settings.hints;
    if (hintCount <= 0 || !this.currentWord) return;

    const letterIndices = [...this.currentWord]
      .map((c, i) => (c !== " " ? i : -1))
      .filter((i) => i !== -1);

    const maxHints = Math.min(hintCount, Math.max(letterIndices.length - 1, 0));
    if (maxHints <= 0) return;

    const interval = Math.floor((this.settings.drawTime * 1000) / (maxHints + 1));

    let hintsGiven = 0;
    this.hintTimer = setInterval(() => {
      if (this.phase !== "drawing" || hintsGiven >= maxHints) {
        if (this.hintTimer) clearInterval(this.hintTimer);
        return;
      }
      const remainingIndices = letterIndices.filter((i) => !this.revealedIndices.has(i));
      if (remainingIndices.length === 0) return;
      const pick = remainingIndices[Math.floor(Math.random() * remainingIndices.length)];
      this.revealedIndices.add(pick);
      hintsGiven++;
      this.callbacks.onHintReveal(this.buildHintString());
    }, interval);
  }

  private buildHintString(): string {
    if (!this.currentWord) return "";
    return [...this.currentWord]
      .map((c, i) => (c === " " ? "  " : this.revealedIndices.has(i) ? c : "_"))
      .join(" ");
  }

  /** Returns true if the guess was correct */
  submitGuess(playerId: string, text: string): boolean {
    if (this.phase !== "drawing" || !this.currentWord) return false;
    const player = this.getPlayer(playerId);
    if (!player || player.isDrawing || player.hasGuessedCorrectly) return false;

    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const isCorrect = normalize(text) === normalize(this.currentWord);

    if (isCorrect) {
      player.hasGuessedCorrectly = true;

      // Earlier correct guesses score higher; scale with time remaining
      const timeRatio = this.settings.drawTime > 0 ? this.timeLeft / this.settings.drawTime : 0;
      const points = Math.round(POINTS_BASE * (0.5 + 0.5 * timeRatio));
      player.addScore(points);

      const drawer = this.players.find((p) => p.isDrawing);
      if (drawer) drawer.addScore(POINTS_DRAWER_PER_GUESSER);

      this.callbacks.onGuessCorrect({ playerId: player.id, playerName: player.name, points });

      const guessers = this.players.filter((p) => !p.isDrawing && p.connected);
      const allGuessed = guessers.every((p) => p.hasGuessedCorrectly);
      if (allGuessed) {
        this.endRound(this.currentWord);
      }
    }

    return isCorrect;
  }

  private endRound(revealedWord: string | null) {
    this.clearTimers();
    this.phase = "roundEnd";
    const word = revealedWord ?? this.currentWord ?? "";

    const nextIndex = (this.drawerIndex + 1) % this.drawOrder.length;
    const isLastOfRound = nextIndex === 0;
    const willExceedRounds = isLastOfRound && this.round >= this.totalRounds;

    this.callbacks.onRoundEnd({
      word,
      scores: this.players.map((p) => ({ id: p.id, score: p.score })),
      nextDrawerId: willExceedRounds ? null : this.drawOrder[nextIndex],
    });

    this.timer = setTimeout(() => {
      this.nextRound();
    }, 5000);
  }

  private endGame() {
    this.clearTimers();
    this.phase = "gameOver";
    const leaderboard = [...this.players]
      .sort((a, b) => b.score - a.score)
      .map((p) => ({ id: p.id, name: p.name, score: p.score }));

    this.callbacks.onGameOver({
      winner: leaderboard[0] ?? null,
      leaderboard,
    });
  }

  clearTimers() {
    if (this.timer) {
      clearTimeout(this.timer as NodeJS.Timeout);
      clearInterval(this.timer as NodeJS.Timeout);
      this.timer = null;
    }
    if (this.hintTimer) {
      clearInterval(this.hintTimer);
      this.hintTimer = null;
    }
  }

  getPublicState(): GameStatePublic {
    const drawer = this.players.find((p) => p.isDrawing);
    return {
      phase: this.phase,
      round: this.round,
      totalRounds: this.totalRounds,
      drawerId: drawer?.id ?? null,
      drawerName: drawer?.name ?? null,
      wordLength: this.currentWord ? this.currentWord.replace(/\s/g, "").length : null,
      revealedHint: this.currentWord ? this.buildHintString() : null,
      drawTime: this.settings.drawTime,
      timeLeft: this.timeLeft,
    };
  }
}
