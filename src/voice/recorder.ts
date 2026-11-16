import { spawn, type ChildProcess } from "node:child_process";

/**
 * Records the microphone to a WAV file using ffmpeg.
 * Whisper wants 16000 Hz, mono, so we record exactly that.
 * Push-to-talk: start() begins, stop() ends and saves the file.
 */
export class Recorder {
  private proc: ChildProcess | null = null;

  constructor(
    private ffmpeg: string,
    private device: string,
  ) {}

  /** Start recording into wavPath. On Windows the microphone comes from DirectShow (dshow). */
  start(wavPath: string): void {
    this.proc = spawn(
      this.ffmpeg,
      [
        "-y", // overwrite the file if it exists
        "-f", "dshow",
        "-i", `audio=${this.device}`,
        "-ac", "1", // mono
        "-ar", "16000", // 16 kHz
        wavPath,
      ],
      // Keep stdin open so we can send "q" to stop cleanly; ignore the noisy output.
      { stdio: ["pipe", "ignore", "ignore"], windowsHide: true },
    );
  }

  /** Stop recording and wait until the file is fully written. */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      const p = this.proc;
      this.proc = null;
      if (!p) return resolve();

      p.on("close", () => resolve());
      // "q" tells ffmpeg to finish and write the file properly.
      try {
        p.stdin?.write("q");
        p.stdin?.end();
      } catch {
        p.kill();
      }
      // Safety: if it does not stop in 3 seconds, force it.
      setTimeout(() => {
        if (!p.killed) p.kill();
      }, 3000);
    });
  }
}

/**
 * Ask ffmpeg for the microphone name. Windows needs the exact name, and it differs per PC.
 * Returns the first audio input it finds, or null. You can skip this by setting JARVIS_MIC.
 */
export function detectMic(ffmpeg: string): Promise<string | null> {
  return new Promise((resolve) => {
    const proc = spawn(ffmpeg, ["-hide_banner", "-list_devices", "true", "-f", "dshow", "-i", "dummy"], {
      windowsHide: true,
    });
    let text = "";
    // ffmpeg prints the device list to stderr.
    proc.stderr?.on("data", (chunk: Buffer) => (text += chunk));
    proc.on("error", () => resolve(null));
    proc.on("close", () => {
      // Lines look like:  [dshow @ ...] "Microphone (Realtek)" (audio)
      for (const line of text.split("\n")) {
        if (line.includes("(audio)")) {
          const match = line.match(/"([^"]+)"/);
          if (match) return resolve(match[1]);
        }
      }
      resolve(null);
    });
  });
}
