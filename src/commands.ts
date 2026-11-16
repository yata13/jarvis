import type { Memory } from "./memory/memory.js";

/**
 * Handles the special typed commands (remember, forget, memory, help).
 * Returns a reply to show, or null if the text is a normal message for the AI.
 * Kept separate from the AI and the screen code, so it is easy to test.
 */
export function handleCommand(text: string, memory: Memory): string | null {
  const lower = text.toLowerCase();

  // "remember <something>" saves a fact.
  if (lower.startsWith("remember ")) {
    const fact = text.slice("remember ".length).trim();
    if (!fact) return "Tell me what to remember, like: remember I like football.";
    memory.add(fact);
    return `Okay, I will remember that: ${fact}`;
  }

  // Show everything JARVIS knows, with numbers (used for "forget").
  if (lower === "memory" || lower === "what do you know about me") {
    const facts = memory.all();
    if (facts.length === 0) return "I do not know anything about you yet. Use: remember <fact>.";
    const lines = facts.map((f, i) => `${i + 1}. ${f.text}`).join("\n");
    return `I remember these about you:\n${lines}`;
  }

  // "forget <number>" removes one fact by its number from the list above.
  if (lower.startsWith("forget ")) {
    const n = Number(text.slice("forget ".length).trim());
    if (!Number.isInteger(n)) return "Say a number, like: forget 2. Type 'memory' to see the numbers.";
    const removed = memory.removeByNumber(n);
    return removed ? `Forgotten: ${removed}` : `There is no fact number ${n}. Type 'memory' to see the list.`;
  }

  if (lower === "help") {
    return [
      "You can just chat with me. Special commands:",
      "  remember <fact>   save something about you",
      "  memory            show what I remember",
      "  forget <number>   remove one fact",
      "  exit              quit",
    ].join("\n");
  }

  return null; // not a command: send it to the AI
}
