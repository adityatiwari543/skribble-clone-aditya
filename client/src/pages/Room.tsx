import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSocket } from "../hooks/useSocket";
import {
  RoomSettings, PlayerPublic, GameStatePublic, StrokeData, ChatMessage,
} from "../types";
import Lobby from "../components/Lobby";
import Canvas from "../components/Canvas";
import Toolbar from "../components/Toolbar";
import Chat from "../components/Chat";
import Leaderboard from "../components/Leaderboard";
import WordDisplay from "../components/WordDisplay";
import Timer from "../components/Timer";
import WordChoice from "../components/WordChoice";
import GameOver from "../components/GameOver";

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const [myId, setMyId] = useState("");
  const [players, setPlayers] = useState<PlayerPublic[]>([]);
  const [settings, setSettings] = useState<RoomSettings | null>(null);
  const [gameState, setGameState] = useState<GameStatePublic | null>(null);
  const [initialStrokes, setInitialStrokes] = useState<StrokeData[]>([]);
  const [initialChat, setInitialChat] = useState<ChatMessage[]>([]);

  const [wordOptions, setWordOptions] = useState<string[] | null>(null);
  const [myWord, setMyWord] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [wordLength, setWordLength] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [drawTime, setDrawTime] = useState(80);
  const [round, setRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(3);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"lobby" | "choosing" | "drawing" | "roundEnd" | "gameOver">("lobby");
  const [gameOverPayload, setGameOverPayload] = useState<{ winner: any; leaderboard: any[] } | null>(null);

  const [color, setColor] = useState("#232323");
  const [size, setSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    const playerName = sessionStorage.getItem("playerName");

    if (!playerName) {
      navigate("/");
      return;
    }

    setMyId(socket.id ?? "");

    function handleRoomJoined(payload: any) {
      setJoined(true);
      setPlayers(payload.players);
      setSettings(payload.settings);
      setInitialStrokes(payload.strokes ?? []);
      setInitialChat(payload.chatLog ?? []);
      setMyId(socket.id ?? "");
    }
    function handleRoomCreated(payload: any) {
      setJoined(true);
      setPlayers(payload.players);
      setSettings(payload.settings);
      setMyId(socket.id ?? "");
    }
    function handlePlayerJoined(payload: any) {
      setPlayers(payload.players);
    }
    function handlePlayerLeft(payload: any) {
      setPlayers(payload.players);
    }
    function handleSettingsUpdated(payload: { settings: RoomSettings }) {
      setSettings(payload.settings);
    }
    function handleErrorMessage(payload: { message: string }) {
      setError(payload.message);
    }
    function handleRoundStart(payload: any) {
      setPhase("choosing");
      setDrawerId(payload.drawerId);
      setWordOptions(payload.drawerId === socket.id ? payload.wordOptions : null);
      setDrawTime(payload.drawTime);
      setRound(payload.round);
      setMyWord(null);
      setHint(null);
    }
    function handleYourWord(payload: { word: string }) {
      setMyWord(payload.word);
    }
    function handleGameState(payload: GameStatePublic) {
      setGameState(payload);
      setPhase(payload.phase);
      setWordLength(payload.wordLength);
      setTotalRounds(payload.totalRounds);
      if (payload.phase === "drawing") {
        setWordOptions(null);
        setTimeLeft(payload.timeLeft || payload.drawTime);
      }
    }
    function handleTimeTick(payload: { timeLeft: number }) {
      setTimeLeft(payload.timeLeft);
    }
    function handleHintUpdate(payload: { hint: string }) {
      setHint(payload.hint);
    }
    function handleRoundEnd() {
      setPhase("roundEnd");
      setWordOptions(null);
    }
    function handleGameOver(payload: any) {
      setPhase("gameOver");
      setGameOverPayload(payload);
    }

    socket.on("room_joined", handleRoomJoined);
    socket.on("room_created", handleRoomCreated);
    socket.on("player_joined", handlePlayerJoined);
    socket.on("player_left", handlePlayerLeft);
    socket.on("settings_updated", handleSettingsUpdated);
    socket.on("error_message", handleErrorMessage);
    socket.on("round_start", handleRoundStart);
    socket.on("your_word", handleYourWord);
    socket.on("game_state", handleGameState);
    socket.on("time_tick", handleTimeTick);
    socket.on("hint_update", handleHintUpdate);
    socket.on("round_end", handleRoundEnd);
    socket.on("game_over", handleGameOver);

    // If we don't already have a room (e.g. came here directly / refreshed), join it
    if (!joined) {
      socket.emit("join_room", { roomId, playerName });
    }

    return () => {
      socket.off("room_joined", handleRoomJoined);
      socket.off("room_created", handleRoomCreated);
      socket.off("player_joined", handlePlayerJoined);
      socket.off("player_left", handlePlayerLeft);
      socket.off("settings_updated", handleSettingsUpdated);
      socket.off("error_message", handleErrorMessage);
      socket.off("round_start", handleRoundStart);
      socket.off("your_word", handleYourWord);
      socket.off("game_state", handleGameState);
      socket.off("time_tick", handleTimeTick);
      socket.off("hint_update", handleHintUpdate);
      socket.off("round_end", handleRoundEnd);
      socket.off("game_over", handleGameOver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card">
          <p style={{ color: "var(--marker-red)", fontWeight: 700 }}>{error}</p>
          <button onClick={() => navigate("/")}>Back to Home</button>
        </div>
      </div>
    );
  }

  if (!joined || !settings) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p className="display" style={{ fontSize: 24 }}>Joining room...</p>
      </div>
    );
  }

  const me = players.find((p) => p.id === myId);
  const isDrawer = me?.isDrawing ?? false;

  if (phase === "lobby") {
    return <Lobby roomId={roomId!} players={players} settings={settings} isHost={me?.isHost ?? false} />;
  }

  return (
    <div style={{ minHeight: "100vh", padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      {wordOptions && wordOptions.length > 0 && <WordChoice options={wordOptions} />}
      {phase === "gameOver" && gameOverPayload && (
        <GameOver winner={gameOverPayload.winner} leaderboard={gameOverPayload.leaderboard} />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Round {round}/{totalRounds}</h2>
        <div style={{ width: 240 }}>
          <Timer timeLeft={timeLeft} drawTime={drawTime} />
        </div>
      </div>

      <WordDisplay isDrawer={isDrawer} myWord={myWord} hint={hint} wordLength={wordLength} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Canvas isDrawer={isDrawer} color={color} size={size} isEraser={isEraser} initialStrokes={initialStrokes} />
          {isDrawer && (
            <Toolbar color={color} setColor={setColor} size={size} setSize={setSize} isEraser={isEraser} setIsEraser={setIsEraser} />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Leaderboard players={players} myPlayerId={myId} />
          <Chat isDrawer={isDrawer} hasGuessedCorrectly={me?.hasGuessedCorrectly ?? false} myPlayerId={myId} />
        </div>
      </div>
    </div>
  );
}
