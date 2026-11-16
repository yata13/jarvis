import type { Memory } from "./memory/memory.js";
import type { Routine } from "./routine/routine.js";
import { parseTime } from "./routine/routine.js";
import { pickMission } from "./routine/missions.js";

/**
 * Handles the special typed commands (memory, routine, missions, help).
 * Returns a reply to show, or null if the text is a normal message for the AI.
 * Kept separate from the AI and the screen code, so it is easy to test.
 */
export function handleCommand(text: string, memory: Memory, routine: Routine): string | null {
  const lower = text.toLowerCase().trim();

  // --- Memory ---

  if (lower.startsWith("remember ")) {
    const fact = text.slice("remember ".length).trim();
    if (!fact) return "Tell me what to remember, like: remember I like football.";
    memory.add(fact);
    return `Okay, I will remember that: ${fact}`;
  }

  if (lower === "memory" || lower === "what do you know about me") {
    const facts = memory.all();
    if (facts.length === 0) return "I do not know anything about you yet. Use: remember <fact>.";
    const lines = facts.map((f, i) => `${i + 1}. ${f.text}`).join("\n");
    return `I remember these about you:\n${lines}`;
  }

  if (lower.startsWith("forget ")) {
    const n = Number(text.slice("forget ".length).trim());
    if (!Number.isInteger(n)) return "Say a number, like: forget 2. Type 'memory' to see the numbers.";
    const removed = memory.removeByNumber(n);
    return removed ? `Forgotten: ${removed}` : `There is no fact number ${n}. Type 'memory' to see the list.`;
  }

  // --- Routine ---

  // "add routine 09:00 code"
  if (lower.startsWith("add routine ")) {
    const rest = text.slice("add routine ".length).trim();
    const space = rest.indexOf(" ");
    const time = space === -1 ? rest : rest.slice(0, space);
    const activity = space === -1 ? "" : rest.slice(space + 1).trim();
    if (!parseTime(time) || !activity) {
      return "Use: add routine <time> <activity>. Example: add routine 09:00 code.";
    }
    routine.add(time, activity);
    return `Added to your routine: ${parseTime(time)} ${activity}`;
  }

  if (lower.startsWith("remove routine ")) {
    const n = Number(text.slice("remove routine ".length).trim());
    if (!Number.isInteger(n)) return "Say a number, like: remove routine 2. Type 'routine' to see the numbers.";
    const removed = routine.removeByNumber(n);
    return removed ? `Removed: ${removed.time} ${removed.activity}` : `There is no routine item ${n}. Type 'routine' to see the list.`;
  }

  if (lower === "routine" || lower === "my routine" || lower === "plan") {
    const items = routine.items();
    const parts: string[] = [];
    if (items.length === 0) {
      parts.push("Your routine is empty. Add one, like: add routine 09:00 code.");
    } else {
      parts.push("Your daily routine:");
      items.forEach((it, i) => parts.push(`${i + 1}. ${it.time} ${it.activity}`));
    }
    if (routine.isPaused()) {
      const p = routine.pauseInfo()!;
      parts.push(`(Paused because of ${p.reason}${p.until ? ` until ${p.until}` : ""}. Type 'resume' to start again.)`);
    }
    return parts.join("\n");
  }

  if (lower === "next" || lower === "what is next" || lower === "what's next" || lower === "whats next") {
    if (routine.isPaused()) return "Your routine is paused. Enjoy your break. Type 'resume' when you are back.";
    const n = routine.next();
    return n ? `Next: ${n.time} ${n.activity}` : "Nothing is left in your plan today.";
  }

  // Pause: explicit, or natural phrases like "I am on a trip" / "I am in the hospital".
  if (
    lower === "pause" ||
    lower === "pause routine" ||
    /\b(on a trip|travel|traveling|travelling|in (the )?hospital|sick|not feeling well)\b/.test(lower)
  ) {
    const reason = /trip|travel/.test(lower) ? "a trip" : /hospital|sick|well/.test(lower) ? "being unwell" : "a break";
    // Optional "until YYYY-MM-DD".
    const untilMatch = lower.match(/until (\d{4}-\d{2}-\d{2})/);
    routine.pause(reason, untilMatch ? untilMatch[1] : null);
    return `Okay. I paused your routine because of ${reason}${untilMatch ? ` until ${untilMatch[1]}` : ""}. Take care. Type 'resume' when you are back.`;
  }

  if (lower === "resume" || lower === "resume routine" || lower === "i am back" || lower === "im back") {
    routine.resume();
    return "Welcome back. Your routine is active again.";
  }

  // --- Missions ---

  if (lower === "mission" || lower === "give me a mission" || lower === "challenge me") {
    return `Your mission: ${pickMission()}`;
  }

  // --- Help ---

  if (lower === "help") {
    return [
      "You can just chat with me. Special commands:",
      "  remember <fact>         save something about you",
      "  memory                  show what I remember",
      "  forget <number>         remove one fact",
      "  add routine <time> <x>  add to your day, e.g. add routine 09:00 code",
      "  routine                 show your daily plan",
      "  remove routine <number> remove one plan item",
      "  next                    what is next in your day",
      "  pause / resume          pause for a trip or hospital, then resume",
      "  mission                 get a small self-improvement mission",
      "  talk                    speak instead of type (hold a short talk, press Enter to stop)",
      "  exit                    quit",
    ].join("\n");
  }

  return null; // not a command: send it to the AI
}
