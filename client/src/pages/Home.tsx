import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSocket } from "../hooks/useSocket";

export default function Home() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [error, setError] = useState("");

  // room settings for creation
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [rounds, setRounds] = useState(3);
  const [drawTime, setDrawTime] = useState(80);
  const [wordCount, setWordCount] = useState(3);
  const [hints, setHints] = useState(2);
  const [isPrivate, setIsPrivate] = useState(true);

  function createRoom() {
    if (!name.trim()) return setError("Enter your name first.");
    const socket = getSocket();
    setError("");

    socket.once("room_created", (payload: { roomId: string }) => {
      sessionStorage.setItem("playerName", name);
      navigate(`/room/${payload.roomId}`);
    });

    socket.emit("create_room", {
      hostName: name,
      settings: { maxPlayers, rounds, drawTime, wordCount, hints, isPrivate, wordMode: "normal" },
    });
  }

  function joinRoom() {
    if (!name.trim()) return setError("Enter your name first.");
    if (!joinCode.trim()) return setError("Enter a room code.");
    sessionStorage.setItem("playerName", name);
    navigate(`/room/${joinCode.trim().toUpperCase()}`);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="card" style={{ maxWidth: 440, width: "100%" }}>
        <h1 style={{ fontSize: 42, margin: "0 0 4px" }}>
          <span className="wobbly-underline" style={{ color: "var(--marker-blue)" }}>Skribbl</span>
          <span style={{ color: "var(--marker-red)" }}>ish</span>
        </h1>
        <p style={{ marginTop: 0, color: "#555" }}>Draw. Guess. Laugh at bad art.</p>

        <label style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>Your name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Abhishek"
          maxLength={20}
          style={{ width: "100%", marginBottom: 16 }}
        />

        {mode === "none" && (
          <div style={{ display: "flex", gap: 12 }}>
            <button className="primary" style={{ flex: 1 }} onClick={() => setMode("create")}>
              Create Room
            </button>
            <button style={{ flex: 1 }} onClick={() => setMode("join")}>
              Join Room
            </button>
          </div>
        )}

        {mode === "join" && (
          <>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>Room code</label>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="e.g. A1B2C3"
              maxLength={6}
              style={{ width: "100%", marginBottom: 16, textTransform: "uppercase" }}
            />
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ flex: 1 }} onClick={() => setMode("none")}>Back</button>
              <button className="primary" style={{ flex: 1 }} onClick={joinRoom}>Join</button>
            </div>
          </>
        )}

        {mode === "create" && (
          <div style={{ display: "grid", gap: 10 }}>
            <SettingRow label="Max players" value={maxPlayers} min={2} max={20} onChange={setMaxPlayers} />
            <SettingRow label="Rounds" value={rounds} min={2} max={10} onChange={setRounds} />
            <SettingRow label="Draw time (sec)" value={drawTime} min={15} max={240} step={5} onChange={setDrawTime} />
            <SettingRow label="Word choices" value={wordCount} min={1} max={5} onChange={setWordCount} />
            <SettingRow label="Hints" value={hints} min={0} max={5} onChange={setHints} />

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} style={{ width: "auto" }} />
              Private room (invite link only)
            </label>

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button style={{ flex: 1 }} onClick={() => setMode("none")}>Back</button>
              <button className="primary" style={{ flex: 1 }} onClick={createRoom}>Create</button>
            </div>
          </div>
        )}

        {error && <p style={{ color: "var(--marker-red)", fontWeight: 700, marginTop: 12 }}>{error}</p>}
      </div>
    </div>
  );
}

function SettingRow({
  label, value, min, max, step = 1, onChange,
}: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
        style={{ width: 80 }}
      />
    </div>
  );
}
