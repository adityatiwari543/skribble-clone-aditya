export interface RoomSettings {
  maxPlayers: number;   // 2-20
  rounds: number;       // 2-10
  drawTime: number;     // 15-240 seconds
  wordCount: number;    // 1-5
  hints: number;        // 0-5
  wordMode: "normal" | "hidden" | "combination";
  isPrivate: boolean;
}

export type GamePhase = "lobby" | "choosing" | "drawing" | "roundEnd" | "gameOver";

export interface StrokePoint {
  x: number;
  y: number;
}

export interface StrokeData {
  id: string;
  color: string;
  size: number;
  points: StrokePoint[];
  isEraser: boolean;
}

export interface PlayerPublic {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  isDrawing: boolean;
  hasGuessedCorrectly: boolean;
  connected: boolean;
}

export interface GameStatePublic {
  phase: GamePhase;
  round: number;
  totalRounds: number;
  drawerId: string | null;
  drawerName: string | null;
  wordLength: number | null;
  revealedHint: string | null; 
  drawTime: number;
  timeLeft: number;
}
