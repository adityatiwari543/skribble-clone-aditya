interface WordDisplayProps {
  isDrawer: boolean;
  myWord: string | null;
  hint: string | null;
  wordLength: number | null;
}

export default function WordDisplay({ isDrawer, myWord, hint, wordLength }: WordDisplayProps) {
  const display = isDrawer && myWord ? myWord : hint ?? (wordLength ? "_ ".repeat(wordLength).trim() : "");

  return (
    <div style={{ textAlign: "center", padding: "8px 0" }}>
      <span
        className="display"
        style={{
          fontSize: 28,
          letterSpacing: 4,
          color: isDrawer ? "var(--marker-green)" : "var(--ink)",
        }}
      >
        {display || "Waiting..."}
      </span>
    </div>
  );
}
