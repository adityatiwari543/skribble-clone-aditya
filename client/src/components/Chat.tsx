import { useEffect, useRef, useState } from "react";
import { getSocket } from "../hooks/useSocket";
import { ChatMessage } from "../types";

interface ChatProps {
  isDrawer: boolean;
  hasGuessedCorrectly: boolean;
  myPlayerId: string;
}

export default function Chat({ isDrawer, hasGuessedCorrectly, myPlayerId }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = getSocket();

    const onChatMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };
    const onGuessResult = (payload: { correct: boolean; playerId: string; playerName: string; points: number }) => {
      if (payload.correct) {
        setMessages((prev) => [
          ...prev,
          { playerId: payload.playerId, playerName: payload.playerName, text: `guessed the word! (+${payload.points})`, ts: Date.now(), isSystem: true },
        ]);
      }
    };
    const onRoundEnd = (payload: { word: string }) => {
      setMessages((prev) => [
        ...prev,
        { playerId: "system", playerName: "Game", text: `The word was: ${payload.word}`, ts: Date.now(), isSystem: true },
      ]);
    };
    const onRoomJoined = (payload: { chatLog?: ChatMessage[] }) => {
      if (payload.chatLog) setMessages(payload.chatLog);
    };

    socket.on("chat_message", onChatMessage);
    socket.on("guess_result", onGuessResult);
    socket.on("round_end", onRoundEnd);
    socket.on("room_joined", onRoomJoined);

    return () => {
      socket.off("chat_message", onChatMessage);
      socket.off("guess_result", onGuessResult);
      socket.off("round_end", onRoundEnd);
      socket.off("room_joined", onRoomJoined);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text) return;
    const socket = getSocket();
    if (!isDrawer && !hasGuessedCorrectly) {
      socket.emit("guess", { text });
    } else {
      socket.emit("chat", { text });
    }
    setInput("");
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: 340, padding: 12 }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ fontSize: 14 }}>
            {m.isSystem ? (
              <span style={{ color: "var(--marker-green)", fontWeight: 700 }}>
                {m.playerName === "Game" ? m.text : `${m.playerName} ${m.text}`}
              </span>
            ) : (
              <>
                <strong style={{ color: m.playerId === myPlayerId ? "var(--marker-blue)" : "inherit" }}>{m.playerName}:</strong>{" "}
                <span>{m.text}</span>
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={isDrawer ? "Chat..." : hasGuessedCorrectly ? "You got it! Chat away" : "Type your guess..."}
          style={{ flex: 1 }}
          maxLength={100}
        />
        <button className="primary" onClick={send}>Send</button>
      </div>
    </div>
  );
}
