import { getSocket } from "../hooks/useSocket";

interface WordChoiceProps {
  options: string[];
}

export default function WordChoice({ options }: WordChoiceProps) {
  function choose(word: string) {
    getSocket().emit("word_chosen", { word });
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(31,58,46,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }}>
      <div className="card" style={{ textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>Pick a word to draw</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          {options.map((w) => (
            <button key={w} className="primary" onClick={() => choose(w)} style={{ fontSize: 16, padding: "12px 20px" }}>
              {w}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
