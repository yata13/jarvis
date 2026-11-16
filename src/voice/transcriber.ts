import { spawn } from "node:child_process";

/**
 * Turns a WAV file into text using whisper-cli (whisper.cpp).
 * Everything runs on your PC, so it is free and works offline after setup.
 */
export class Transcriber {
  constructor(
    private whisper: string,
    private model: string,
  ) {}

  transcribe(wavPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(
        this.whisper,
        [
          "-m", this.model,
          "-f", wavPath,
          "-l", "en", // English
          "-nt", // no timestamps, just the words
          "-np", // no progress prints
        ],
        { windowsHide: true },
      );

      let out = "";
      let err = "";
      proc.stdout?.on("data", (c: Buffer) => (out += c));
      proc.stderr?.on("data", (c: Buffer) => (err += c));

      proc.on("error", (e) => reject(new Error(`Cannot run whisper-cli: ${e.message}`)));
      proc.on("close", (code) => {
        if (code !== 0) return reject(new Error(err.trim() || `whisper-cli failed (code ${code})`));
        resolve(cleanTranscript(out));
      });
    });
  }
}

/** Tidy the whisper output: drop its "no speech" markers and extra spaces. */
export function cleanTranscript(raw: string): string {
  return raw
    .replace(/\[[^\]]*\]/g, "") // markers like [BLANK_AUDIO], [MUSIC]
    .replace(/\((?:silence|blank|music)\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
