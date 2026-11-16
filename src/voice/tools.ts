import { existsSync } from "node:fs";
import { join } from "node:path";

/** Where the voice tools live after you run scripts/setup-voice.cmd. */
const BASE = "voice-tools";

export interface VoiceTools {
  ffmpeg: string; // records the microphone
  whisper: string; // whisper-cli.exe, turns sound into text
  model: string; // the Whisper model file
}

/** Is this a bare command name (on PATH), not a file path? */
function isBareCommand(p: string): boolean {
  return !p.includes("/") && !p.includes("\\");
}

/**
 * Find the voice tools. You can override any of them with an environment variable
 * (JARVIS_FFMPEG, JARVIS_WHISPER, JARVIS_WHISPER_MODEL). Otherwise it looks in the
 * voice-tools folder that setup-voice.cmd fills, and falls back to ffmpeg on PATH.
 */
export function resolveVoiceTools(): VoiceTools {
  const bundledFfmpeg = join(BASE, "ffmpeg", "ffmpeg.exe");
  return {
    ffmpeg: process.env.JARVIS_FFMPEG || (existsSync(bundledFfmpeg) ? bundledFfmpeg : "ffmpeg"),
    whisper: process.env.JARVIS_WHISPER || join(BASE, "whisper", "whisper-cli.exe"),
    model: process.env.JARVIS_WHISPER_MODEL || join(BASE, "models", "ggml-tiny.en.bin"),
  };
}

/** List what is missing, so we can tell the user to run setup. ffmpeg on PATH is not checked here. */
export function missingTools(tools: VoiceTools): string[] {
  const missing: string[] = [];
  if (!isBareCommand(tools.ffmpeg) && !existsSync(tools.ffmpeg)) missing.push("ffmpeg (recorder)");
  if (!existsSync(tools.whisper)) missing.push("whisper-cli (speech to text)");
  if (!existsSync(tools.model)) missing.push("the Whisper model");
  return missing;
}
