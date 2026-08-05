import { PlayerPublic } from "../types";

interface LeaderboardProps {
  players: PlayerPublic[];
  myPlayerId: string;
}

export default function Leaderboard({ players, myPlayerId }: LeaderboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="card" style={{ padding: 12 }}>
      <h3 style={{ margin: "0 0 10px" }}>Players ({players.filter((p) => p.connected).length})</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((p, i) => (
          <div
            key={p.id}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
              borderRadius: 10, background: p.id === myPlayerId ? "var(--paper-line)" : "transparent",
              opacity: p.connected ? 1 : 0.4,
            }}
          >
            <span style={{ fontWeight: 800, width: 18 }}>{i + 1}</span>
            <span style={{ flex: 1, fontWeight: p.isDrawing ? 800 : 500 }}>
              {p.name} {p.isHost && "👑"} {p.isDrawing && "✏️"} {p.hasGuessedCorrectly && "✅"}
            </span>
            <span style={{ fontWeight: 700, color: "var(--marker-blue)" }}>{p.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
