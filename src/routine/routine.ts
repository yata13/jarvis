import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

/** One thing in the daily plan, like 09:00 "code". */
export interface RoutineItem {
  time: string; // "HH:MM", 24-hour
  activity: string;
}

/** When the routine is paused (trip, hospital...). */
export interface Pause {
  reason: string;
  until: string | null; // "YYYY-MM-DD", or null for "until I resume"
}

interface RoutineData {
  items: RoutineItem[];
  pause: Pause | null;
}

/** Turn "9:5" or "09:05" into "09:05". Returns null if it is not a real time. */
export function parseTime(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Today as "YYYY-MM-DD" in the computer's own time zone. */
function todayStr(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * The user's daily routine and whether it is paused.
 * Saved in one JSON file on the PC, like memory. Its own module so the phone
 * (through chat) and the PC share the same plan.
 */
export class Routine {
  private data: RoutineData = { items: [], pause: null };

  constructor(private file = "jarvis-data/routine.json") {
    this.load();
  }

  private load(): void {
    if (!existsSync(this.file)) return;
    try {
      const parsed = JSON.parse(readFileSync(this.file, "utf8")) as Partial<RoutineData>;
      if (Array.isArray(parsed.items)) this.data.items = parsed.items;
      if (parsed.pause && typeof parsed.pause.reason === "string") this.data.pause = parsed.pause;
    } catch {
      console.error(`(Could not read ${this.file}. Starting with an empty routine.)`);
    }
  }

  private save(): void {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(this.data, null, 2));
  }

  /** Add one plan item. Returns false if the time is not valid. */
  add(time: string, activity: string): boolean {
    const clean = parseTime(time);
    if (!clean || !activity.trim()) return false;
    this.data.items.push({ time: clean, activity: activity.trim() });
    this.save();
    return true;
  }

  /** The items, sorted by time (earliest first). */
  items(): RoutineItem[] {
    return [...this.data.items].sort((a, b) => a.time.localeCompare(b.time));
  }

  /** Remove the item at a 1-based number (as shown to the user). Returns it, or null. */
  removeByNumber(oneBased: number): RoutineItem | null {
    const sorted = this.items();
    const target = sorted[oneBased - 1];
    if (!target) return null;
    // Remove the first matching item from the real list.
    const i = this.data.items.findIndex((it) => it.time === target.time && it.activity === target.activity);
    if (i >= 0) this.data.items.splice(i, 1);
    this.save();
    return target;
  }

  /** Pause the routine (trip, hospital...). `until` is "YYYY-MM-DD" or null. */
  pause(reason: string, until: string | null = null): void {
    this.data.pause = { reason: reason.trim() || "a break", until };
    this.save();
  }

  /** Start the routine again. */
  resume(): void {
    this.data.pause = null;
    this.save();
  }

  /** Is the routine paused right now? (A past "until" date counts as resumed.) */
  isPaused(now = new Date()): boolean {
    const p = this.data.pause;
    if (!p) return false;
    if (p.until && todayStr(now) > p.until) return false; // the pause date has passed
    return true;
  }

  pauseInfo(): Pause | null {
    return this.data.pause;
  }

  /** The next item after the current time today, or null if none is left today. */
  next(now = new Date()): RoutineItem | null {
    const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return this.items().find((it) => it.time > nowHHMM) ?? null;
  }

  /** Text for the AI's system prompt: the plan, the time now, and the pause state. */
  asPromptText(now = new Date()): string {
    const lines: string[] = [];
    const day = now.toLocaleDateString("en-US", { weekday: "long" });
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    lines.push(`Right now it is ${day}, ${time}.`);

    if (this.data.items.length > 0) {
      lines.push("The user's daily routine:");
      for (const it of this.items()) lines.push(`- ${it.time} ${it.activity}`);
    }

    if (this.isPaused(now)) {
      const p = this.data.pause!;
      const until = p.until ? ` until ${p.until}` : "";
      lines.push(
        `The routine is PAUSED because of ${p.reason}${until}. ` +
          "Do not push the user about routine tasks. Be kind and supportive.",
      );
    } else if (this.data.items.length > 0) {
      const next = this.next(now);
      lines.push(next ? `The next thing in the plan is ${next.time} ${next.activity}.` : "Nothing is left in the plan today.");
    }

    return lines.join("\n");
  }
}
