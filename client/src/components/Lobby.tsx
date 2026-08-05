import { PlayerPublic, RoomSettings } from "../types";
import { getSocket } from "../hooks/useSocket";

interface LobbyProps {
  roomId: string;
  players: PlayerPublic[];
  settings: RoomSettings;
  isHost: boolean;
}

export default function Lobby({ roomId, players, settings, isHost }: LobbyProps) {
  function copyLink() {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url);
  }

  function startGame() {
    getSocket().emit("start_game");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="card" style={{ maxWidth: 520, width: "100%" }}>
        <h2 style={{ marginTop: 0 }}>Room <span style={{ color: "var(--marker-blue)" }}>{roomId}</span></h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={copyLink}>Copy invite link</button>
          {settings.isPrivate ? <span className="card" style={{ padding: "6px 10px", fontSize: 13 }}>🔒 Private</span> : <span className="card" style={{ padding: "6px 10px", fontSize: 13 }}>🌐 Public</span>}
        </div>

        <h3>Players ({players.filter((p) => p.connected).length}/{settings.maxPlayers})</h3>
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 6, marginBottom: 16 }}>
          {players.map((p) => (
            <li key={p.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span>{p.name}</span>
              {p.isHost && <span title="Host">👑</span>}
            </li>
          ))}
        </ul>

        <div className="card" style={{ background: "var(--paper)", marginBottom: 16, fontSize: 14 }}>
          <strong>Settings:</strong> {settings.rounds} rounds · {settings.drawTime}s/round · {settings.wordCount} word choices · {settings.hints} hints
        </div>

        {isHost ? (
          <button className="primary" style={{ width: "100%" }} disabled={players.filter((p) => p.connected).length < 2} onClick={startGame}>
            {players.filter((p) => p.connected).length < 2 ? "Need at least 2 players" : "Start Game"}
          </button>
        ) : (
          <p style={{ textAlign: "center", fontStyle: "italic" }}>Waiting for host to start the game...</p>
        )}
      </div>
    </div>
  );
}
