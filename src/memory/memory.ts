import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

/** One thing JARVIS knows about you. */
export interface Fact {
  text: string;
  /** When it was saved, as an ISO date string. Helps JARVIS see patterns later. */
  savedAt: string;
}

/** Everything JARVIS remembers. Kept small and plain, so it is easy to read and change. */
interface MemoryData {
  facts: Fact[];
}

/**
 * JARVIS's long memory. It lives in one JSON file on your PC.
 * We use JSON, not a database, because it is simple and you can open and read it.
 * It is its own module, so we can move to SQLite later without touching the chat code.
 */
export class Memory {
  private data: MemoryData = { facts: [] };

  // Default path. Kept next to where you run JARVIS, in a "jarvis-data" folder.
  constructor(private file = "jarvis-data/memory.json") {
    this.load();
  }

  /** Read the file at startup. A missing or broken file just means "no memory yet". */
  private load(): void {
    if (!existsSync(this.file)) return;
    try {
      const parsed = JSON.parse(readFileSync(this.file, "utf8")) as Partial<MemoryData>;
      if (Array.isArray(parsed.facts)) this.data.facts = parsed.facts;
    } catch {
      // Broken file: start empty instead of crashing. We do not delete the file.
      console.error(`(Could not read ${this.file}. Starting with empty memory.)`);
    }
  }

  /** Save the file. Makes the folder first if it is missing. */
  private save(): void {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(this.data, null, 2));
  }

  /** Remember a new fact. Ignores empty text and exact repeats. */
  add(text: string): void {
    const clean = text.trim();
    if (!clean) return;
    if (this.data.facts.some((f) => f.text.toLowerCase() === clean.toLowerCase())) return;
    this.data.facts.push({ text: clean, savedAt: new Date().toISOString() });
    this.save();
  }

  /** All facts, oldest first. */
  all(): readonly Fact[] {
    return this.data.facts;
  }

  /** Remove the fact at a 1-based number (as shown to the user). Returns the removed text, or null. */
  removeByNumber(oneBased: number): string | null {
    const i = oneBased - 1;
    if (i < 0 || i >= this.data.facts.length) return null;
    const [removed] = this.data.facts.splice(i, 1);
    this.save();
    return removed.text;
  }

  /** The facts as plain lines, to put into the model's system prompt. Empty string if none. */
  asPromptText(): string {
    if (this.data.facts.length === 0) return "";
    const lines = this.data.facts.map((f) => `- ${f.text}`).join("\n");
    return `Here are facts you remember about the user:\n${lines}`;
  }
}
