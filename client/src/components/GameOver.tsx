import { useNavigate } from "react-router-dom";

interface GameOverProps {
  winner: { id: string; name: string; score: number } | null;
  leaderboard: { id: string; name: string; score: number }[];
}

export default function GameOver({ winner, leaderboard }: GameOverProps) {
  const navigate = useNavigate();

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(31,58,46,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }}>
      <div className="card" style={{ minWidth: 320, textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>Game Over!</h2>
        {winner && (
          <p style={{ fontSize: 20 }}>
            🏆 <strong style={{ color: "var(--marker-yellow)", background: "var(--ink)", padding: "2px 8px", borderRadius: 6 }}>{winner.name}</strong> wins with {winner.score} points!
          </p>
        )}
        <ol style={{ textAlign: "left", padding: "0 0 0 24px" }}>
          {leaderboard.map((p) => (
            <li key={p.id} style={{ marginBottom: 4 }}>
              {p.name} — <strong>{p.score}</strong>
            </li>
          ))}
        </ol>
        <button className="primary" style={{ marginTop: 12 }} onClick={() => navigate("/")}>
          Back to Home
        </button>
      </div>
    </div>
  );
}
