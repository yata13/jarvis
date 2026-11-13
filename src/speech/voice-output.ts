/**
 * Anything that can speak text aloud.
 * To use another voice engine later, write a new class with these two methods
 * and change one line in index.ts. Nothing else needs to change.
 */
export interface VoiceOutput {
  /** Speak the text. Resolves when the voice has finished. */
  speak(text: string): Promise<void>;
  /** Stop speaking right now (for example, when the user quits). */
  stop(): void;
}

/**
 * Remove markdown symbols, so the voice does not read "asterisk" or "hash" aloud.
 * Lives here, not in one engine, because every engine needs it.
 */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/^\s*[-•]\s+/gm, "") // bullet points at the start of a line
    .replace(/[*_#`>]/g, "") // bold, headings, code marks, quotes
    .replace(/\s+/g, " ")
    .trim();
}
