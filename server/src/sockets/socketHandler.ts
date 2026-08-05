import { Server, Socket } from "socket.io";
import { RoomManager } from "../models/RoomManager";
import { RoomSettings, StrokeData } from "../types";

function clampSettings(input: Partial<RoomSettings>): Partial<RoomSettings> {
  const out: Partial<RoomSettings> = { ...input };
  if (out.maxPlayers !== undefined) out.maxPlayers = Math.min(20, Math.max(2, out.maxPlayers));
  if (out.rounds !== undefined) out.rounds = Math.min(10, Math.max(2, out.rounds));
  if (out.drawTime !== undefined) out.drawTime = Math.min(240, Math.max(15, out.drawTime));
  if (out.wordCount !== undefined) out.wordCount = Math.min(5, Math.max(1, out.wordCount));
  if (out.hints !== undefined) out.hints = Math.min(5, Math.max(0, out.hints));
  return out;
}

export function registerSocketHandlers(io: Server) {
  const roomManager = new RoomManager(io);

  io.on("connection", (socket: Socket) => {
    let currentRoomId: string | null = null;

    // ---------- Room & Lobby ----------

    socket.on("create_room", (payload: { hostName: string; settings?: Partial<RoomSettings> }) => {
      const room = roomManager.createRoom(clampSettings(payload.settings ?? {}));
      const player = room.addPlayer(socket.id, payload.hostName);
      currentRoomId = room.id;
      socket.join(room.id);

      socket.emit("room_created", {
        roomId: room.id,
        settings: room.settings,
        players: room.getPlayersPublic(),
        you: player.toPublic(),
      });
    });

    socket.on("join_room", (payload: { roomId: string; playerName: string }) => {
      const room = roomManager.getRoom(payload.roomId);
      if (!room) {
        socket.emit("error_message", { message: "Room not found." });
        return;
      }
      const activeCount = room.players.filter((p) => p.connected).length;
      if (activeCount >= room.settings.maxPlayers) {
        socket.emit("error_message", { message: "Room is full." });
        return;
      }
      if (room.game && room.game.phase !== "lobby" && room.game.phase !== "gameOver") {
        socket.emit("error_message", { message: "Game already in progress." });
        return;
      }

      const player = room.addPlayer(socket.id, payload.playerName);
      currentRoomId = room.id;
      socket.join(room.id);

      socket.emit("room_joined", {
        roomId: room.id,
        settings: room.settings,
        players: room.getPlayersPublic(),
        you: player.toPublic(),
        strokes: room.strokes,
        chatLog: room.chatLog,
      });
      socket.to(room.id).emit("player_joined", { player: player.toPublic(), players: room.getPlayersPublic() });
    });

    socket.on("update_settings", (payload: Partial<RoomSettings>) => {
      if (!currentRoomId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (!room) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player?.isHost) return;
      room.updateSettings(clampSettings(payload));
      io.to(room.id).emit("settings_updated", { settings: room.settings });
    });

    socket.on("start_game", () => {
      if (!currentRoomId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (!room) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player?.isHost) return;
      if (!room.canStart()) {
        socket.emit("error_message", { message: "Need at least 2 players to start." });
        return;
      }
      room.startGame();
    });

    // ---------- Game flow ----------

    socket.on("word_chosen", (payload: { word: string }) => {
      if (!currentRoomId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (!room?.game) return;
      room.game.chooseWord(socket.id, payload.word);
    });

    // ---------- Drawing ----------
    // Strokes are collected client-side and sent as a completed stroke (draw_data)
    // as well as incremental draw_move points, so viewers see live motion.

    socket.on("draw_data", (stroke: StrokeData) => {
      if (!currentRoomId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (!room) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player?.isDrawing) return;
      room.addStroke(stroke);
      socket.to(room.id).emit("draw_data", stroke);
    });

    socket.on("draw_move", (payload: { x: number; y: number; strokeId: string }) => {
      if (!currentRoomId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (!room) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player?.isDrawing) return;
      socket.to(room.id).emit("draw_move", payload);
    });

    socket.on("canvas_clear", () => {
      if (!currentRoomId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (!room) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player?.isDrawing) return;
      room.clearCanvas();
      io.to(room.id).emit("canvas_clear");
    });

    socket.on("draw_undo", () => {
      if (!currentRoomId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (!room) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player?.isDrawing) return;
      room.undoLastStroke();
      io.to(room.id).emit("draw_undo", { strokes: room.strokes });
    });

    // ---------- Chat & Guessing ----------

    socket.on("guess", (payload: { text: string }) => {
      if (!currentRoomId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (!room) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      const correct = room.handleGuess(socket.id, payload.text);

      if (!correct) {
        // Non-correct guesses show up as chat so everyone can see attempts
        const msg = room.addChatMessage(player.id, player.name, payload.text);
        io.to(room.id).emit("chat_message", msg);
      }
      // Correct guesses are broadcast via the Game's onGuessCorrect callback
      // (guess_result event) so we don't leak the word through chat.
    });

    socket.on("chat", (payload: { text: string }) => {
      if (!currentRoomId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (!room) return;
      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;
      const msg = room.addChatMessage(player.id, player.name, payload.text);
      io.to(room.id).emit("chat_message", msg);
    });

    // ---------- Disconnect ----------

    socket.on("disconnect", () => {
      if (!currentRoomId) return;
      const room = roomManager.getRoom(currentRoomId);
      if (!room) return;
      room.removePlayer(socket.id);
      io.to(room.id).emit("player_left", { playerId: socket.id, players: room.getPlayersPublic() });
      roomManager.cleanupEmptyRooms();
    });
  });
}
