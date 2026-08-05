interface TimerProps {
  timeLeft: number;
  drawTime: number;
}

export default function Timer({ timeLeft, drawTime }: TimerProps) {
  const pct = drawTime > 0 ? Math.max(0, Math.min(100, (timeLeft / drawTime) * 100)) : 0;
  const urgent = timeLeft <= 10;

  return (
    <div style={{ width: "100%" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginBottom: 4,
      }}>
        <span>Time left</span>
        <span style={{ color: urgent ? "var(--marker-red)" : "inherit" }}>{Math.max(0, timeLeft)}s</span>
      </div>
      <div style={{ height: 10, background: "var(--paper-line)", borderRadius: 6, border: "2px solid var(--ink)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%", width: `${pct}%`,
            background: urgent ? "var(--marker-red)" : "var(--marker-green)",
            transition: "width 0.9s linear",
          }}
        />
      </div>
    </div>
  );
}
