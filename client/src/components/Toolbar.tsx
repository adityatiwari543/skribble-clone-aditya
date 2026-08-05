import { getSocket } from "../hooks/useSocket";

const COLORS = [
  "#232323", "#ffffff", "#ff5a36", "#ffc93c", "#4caf6e",
  "#3e7cb1", "#9b6bcc", "#e85d9c", "#7a4a2b", "#7f8c8d",
];

interface ToolbarProps {
  color: string;
  setColor: (c: string) => void;
  size: number;
  setSize: (s: number) => void;
  isEraser: boolean;
  setIsEraser: (v: boolean) => void;
}

export default function Toolbar({ color, setColor, size, setSize, isEraser, setIsEraser }: ToolbarProps) {
  function clearCanvas() {
    getSocket().emit("canvas_clear");
  }
  function undo() {
    getSocket().emit("draw_undo");
  }

  return (
    <div className="card" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: 12 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => { setColor(c); setIsEraser(false); }}
            style={{
              width: 28, height: 28, padding: 0, borderRadius: "50%",
              background: c, border: "2px solid var(--ink)",
              boxShadow: color === c && !isEraser ? "0 0 0 3px var(--marker-blue)" : "2px 2px 0 var(--ink)",
            }}
            aria-label={`color ${c}`}
          />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Size</span>
        <input type="range" min={2} max={30} value={size} onChange={(e) => setSize(Number(e.target.value))} />
      </div>

      <button onClick={() => setIsEraser(!isEraser)} style={{ background: isEraser ? "var(--marker-yellow)" : undefined }}>
        Eraser
      </button>
      <button onClick={undo}>Undo</button>
      <button className="danger" onClick={clearCanvas}>Clear</button>
    </div>
  );
}
