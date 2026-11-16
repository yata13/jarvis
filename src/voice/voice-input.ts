import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";
import { Recorder, detectMic } from "./recorder.js";
import { Transcriber } from "./transcriber.js";
import { resolveVoiceTools, missingTools, type VoiceTools } from "./tools.js";

/**
 * Push-to-talk voice input for the PC.
 * You start it, speak, then stop it; it gives back the text of what you said.
 * It is one module so the voice engine (whisper) can be swapped later.
 */
export class VoiceInput {
  private tools: VoiceTools;
  private recorder: Recorder | null = null;
  private transcriber: Transcriber;
  private device = "";
  private wavPath = join(tmpdir(), "jarvis-voice.wav");

  constructor() {
    this.tools = resolveVoiceTools();
    this.transcriber = new Transcriber(this.tools.whisper, this.tools.model);
  }

  /** What the voice tools need, if anything is missing. Empty means ready. */
  whatIsMissing(): string[] {
    return missingTools(this.tools);
  }

  /** Begin recording the microphone. Call stopAndTranscribe() when the user is done. */
  async start(): Promise<void> {
    if (!this.device) {
      // JARVIS_MIC lets the user name the mic by hand if auto-detect fails.
      this.device = process.env.JARVIS_MIC || (await detectMic(this.tools.ffmpeg)) || "default";
    }
    this.recorder = new Recorder(this.tools.ffmpeg, this.device);
    this.recorder.start(this.wavPath);
  }

  /** Stop recording and return the text of what was said. */
  async stopAndTranscribe(): Promise<string> {
    if (this.recorder) {
      await this.recorder.stop();
      this.recorder = null;
    }
    try {
      return await this.transcriber.transcribe(this.wavPath);
    } finally {
      // The recording is personal; remove it once we have the text.
      try {
        rmSync(this.wavPath, { force: true });
      } catch {
        /* ignore */
      }
    }
  }
}
