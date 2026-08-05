
export function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isExactMatch(guess: string, word: string): boolean {
  return normalize(guess) === normalize(word);
}

/** "Close guess" detection - useful for a soft "you're close!" chat hint (not scored) */
export function isCloseMatch(guess: string, word: string): boolean {
  const a = normalize(guess);
  const b = normalize(word);
  if (a === b) return false; // exact match handled separately
  if (Math.abs(a.length - b.length) > 2) return false;

  // simple levenshtein distance
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length] <= 2;
}
