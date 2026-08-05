export const WORD_LIST: Record<string, string[]> = {
  animals: [
    "elephant", "giraffe", "penguin", "kangaroo", "octopus", "dolphin",
    "butterfly", "crocodile", "squirrel", "peacock", "tiger", "zebra",
  ],
  objects: [
    "umbrella", "guitar", "telescope", "backpack", "candle", "bicycle",
    "laptop", "hammer", "clock", "ladder", "scissors", "wallet",
  ],
  food: [
    "pizza", "burger", "sushi", "pancake", "watermelon", "popcorn",
    "sandwich", "spaghetti", "icecream", "donut", "taco", "cupcake",
  ],
  actions: [
    "swimming", "dancing", "juggling", "sleeping", "climbing", "painting",
    "singing", "fishing", "skating", "cooking", "reading", "laughing",
  ],
  places: [
    "beach", "mountain", "airport", "castle", "hospital", "library",
    "stadium", "desert", "volcano", "waterfall", "forest", "lighthouse",
  ],
};

export function getRandomWords(count: number, mode: "normal" | "hidden" | "combination" = "normal"): string[] {
  const all = Object.values(WORD_LIST).flat();
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  if (mode === "combination") {
    // combine two words together for harder rounds
    const picks = shuffled.slice(0, count * 2);
    const combos: string[] = [];
    for (let i = 0; i < count; i++) {
      combos.push(`${picks[i * 2]} ${picks[i * 2 + 1]}`);
    }
    return combos;
  }
  return shuffled.slice(0, count);
}
