import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";
import { recordFixed, detectMic } from "./recorder.js";
import { Transcriber } from "./transcriber.js";
import { resolveVoiceTools, missingTools, type VoiceTools } from "./tools.js";

/** How many seconds each listening chunk is. Short, so JARVIS reacts quickly. */
export const CHUNK_SECONDS = 4;

/**
 * Pull the command out of a heard sentence.
 * - If it has the wake word "jarvis", return the words AFTER it (the command).
 * - "jarvis" with nothing after it returns "" (wake only: ask for the command next).
 * - No wake word returns null (ignore this chunk).
 * Pure, so it is easy to test.
 */
export function extractCommand(heard: string): string | null {
  const lower = heard.toLowerCase();
  // Accept "hey jarvis" too. Take whatever comes after the last "jarvis".
  const idx = lower.lastIndexOf("jarvis");
  if (idx === -1) return null;
  const after = heard.slice(idx + "jarvis".length);
  return after.replace(/^[\s,.:;!?-]+/, "").trim();
}

/**
 * The "Hey JARVIS" listener. It records a short chunk, turns it into text,
 * and checks for the wake word. Uses the same tools as voice input (whisper + ffmpeg).
 */
export class WakeListener {
  private tools: VoiceTools;
  private transcriber: Transcriber;
  private device = "";
  private wavPath = join(tmpdir(), "jarvis-wake.wav");

  constructor() {
    this.tools = resolveVoiceTools();
    this.transcriber = new Transcriber(this.tools.whisper, this.tools.model);
  }

  whatIsMissing(): string[] {
    return missingTools(this.tools);
  }

  /** Find the mic once (or use JARVIS_MIC). */
  private async ensureDevice(): Promise<void> {
    if (!this.device) {
      this.device = process.env.JARVIS_MIC || (await detectMic(this.tools.ffmpeg)) || "default";
    }
  }

  /** Record one chunk and return what was heard (empty string if silence). */
  async listenChunk(seconds = CHUNK_SECONDS): Promise<string> {
    await this.ensureDevice();
    await recordFixed(this.tools.ffmpeg, this.device, this.wavPath, seconds);
    try {
      return await this.transcriber.transcribe(this.wavPath);
    } finally {
      try {
        rmSync(this.wavPath, { force: true });
      } catch {
        /* ignore */
      }
    }
  }
}
