import { PlayerPublic } from "../types";

export class Player {
  public id: string;          // socket.id
  public name: string;
  public score: number = 0;
  public isHost: boolean = false;
  public isDrawing: boolean = false;
  public hasGuessedCorrectly: boolean = false;
  public connected: boolean = true;

  constructor(id: string, name: string, isHost = false) {
    this.id = id;
    this.name = name.trim().slice(0, 20) || "Player";
    this.isHost = isHost;
  }

  addScore(points: number) {
    this.score += points;
  }

  resetForRound() {
    this.isDrawing = false;
    this.hasGuessedCorrectly = false;
  }

  toPublic(): PlayerPublic {
    return {
      id: this.id,
      name: this.name,
      score: this.score,
      isHost: this.isHost,
      isDrawing: this.isDrawing,
      hasGuessedCorrectly: this.hasGuessedCorrectly,
      connected: this.connected,
    };
  }
}
