import { Server } from "socket.io";
import { customAlphabet } from "nanoid";
import { Room } from "./Room";
import { RoomSettings } from "../types";

const generateRoomCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  createRoom(settings: Partial<RoomSettings>): Room {
    let id = generateRoomCode();
    while (this.rooms.has(id)) id = generateRoomCode();
    const room = new Room(id, this.io, settings);
    this.rooms.set(id, room);
    return room;
  }

  getRoom(id: string): Room | undefined {
    return this.rooms.get(id.toUpperCase());
  }

  deleteRoom(id: string) {
    this.rooms.delete(id);
  }

  listPublicRooms() {
    return [...this.rooms.values()]
      .filter((r) => !r.settings.isPrivate && (!r.game || r.game.phase === "lobby"))
      .map((r) => ({
        id: r.id,
        players: r.players.filter((p) => p.connected).length,
        maxPlayers: r.settings.maxPlayers,
        rounds: r.settings.rounds,
      }));
  }

  cleanupEmptyRooms() {
    for (const [id, room] of this.rooms.entries()) {
      if (room.isEmpty()) {
        room.game?.clearTimers();
        this.rooms.delete(id);
      }
    }
  }
}
