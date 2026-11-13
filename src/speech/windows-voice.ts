import { spawn, type ChildProcess } from "node:child_process";
import type { VoiceOutput } from "./voice-output.js";

// PowerShell can use the voice that is built into Windows (free, offline, nothing to install).
// The text comes from an environment variable, not from the command itself,
// so quotes or symbols in the answer can never break the command.
const SPEAK_SCRIPT = [
  "Add-Type -AssemblyName System.Speech",
  "$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer",
  "$voice.Speak($env:JARVIS_SAY)",
].join("; ");

/** Speaks with the built-in Windows voice. */
export class WindowsVoice implements VoiceOutput {
  private current: ChildProcess | null = null;

  speak(text: string): Promise<void> {
    if (!text) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const child = spawn(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-Command", SPEAK_SCRIPT],
        {
          env: { ...process.env, JARVIS_SAY: text },
          stdio: ["ignore", "ignore", "pipe"],
          windowsHide: true, // no black window pops up
        },
      );
      this.current = child;

      let errorText = "";
      child.stderr?.on("data", (chunk) => (errorText += chunk));

      child.on("error", (error) => {
        this.current = null;
        reject(new Error(`Cannot start the Windows voice: ${error.message}`));
      });

      child.on("close", (code, signal) => {
        this.current = null;
        // Stopped on purpose (stop() was called): that is not an error.
        if (code === 0 || signal) resolve();
        else reject(new Error(errorText.trim() || `Windows voice failed (code ${code})`));
      });
    });
  }

  stop(): void {
    // Ending PowerShell ends the speech at once.
    this.current?.kill();
    this.current = null;
  }
}
