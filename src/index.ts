import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { Chat } from "./llm/chat.js";
import { cleanForSpeech, type VoiceOutput } from "./speech/voice-output.js";
import { WindowsVoice } from "./speech/windows-voice.js";
import { Memory } from "./memory/memory.js";
import { Routine } from "./routine/routine.js";
import { respond, buildContext } from "./assistant.js";
import { VoiceInput } from "./voice/voice-input.js";

/** Short error text for the screen. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function main(): Promise<void> {
  // Long memory: facts about the user, loaded from a file at startup.
  const memory = new Memory();
  // The daily routine (plan, missions, pause state).
  const routine = new Routine();
  // The chat reads memory + routine every turn, so changes are used right away.
  const chat = new Chat(() => buildContext(memory, routine));
  // To swap the voice engine later, change only this line.
  const voice: VoiceOutput = new WindowsVoice();
  const voiceInput = new VoiceInput();
  const rl = readline.createInterface({ input: stdin, output: stdout });

  // Ctrl+C or Ctrl+D closes the input. We stop the loop (and the voice) instead of crashing.
  let open = true;
  rl.on("close", () => {
    open = false;
    voice.stop();
  });

  /** Send one message to JARVIS, show the answer, and speak it if it is a real answer. */
  async function handleMessage(text: string): Promise<void> {
    const isLikelyCommand =
      /^(remember |forget |memory$|help$|what do you know about me$|routine$|add routine |remove routine |next$|pause|resume|mission$|plan$)/i.test(
        text,
      );
    if (!isLikelyCommand) console.log("(thinking...)");

    let reply;
    try {
      reply = await respond(text, memory, routine, chat);
    } catch (error) {
      console.error(`\nError: ${errorMessage(error)}\n`);
      return;
    }

    console.log(`\nJARVIS: ${reply.text}\n`);
    if (reply.isCommand) return; // command replies are system text, not spoken
    try {
      await voice.speak(cleanForSpeech(reply.text));
    } catch (error) {
      console.error(`(Voice error: ${errorMessage(error)})\n`);
    }
  }

  /** Record the microphone, turn it into text, and handle it like a typed message. */
  async function handleTalk(): Promise<void> {
    const missing = voiceInput.whatIsMissing();
    if (missing.length > 0) {
      console.log(`\nVoice is not set up yet. Missing: ${missing.join(", ")}.`);
      console.log("Run scripts\\setup-voice.cmd once, then try again.\n");
      return;
    }
    try {
      await voiceInput.start();
    } catch (error) {
      console.error(`\nCould not start recording: ${errorMessage(error)}\n`);
      return;
    }
    await rl.question("Recording... speak, then press Enter to stop. ");

    let said: string;
    try {
      said = await voiceInput.stopAndTranscribe();
    } catch (error) {
      console.error(`\nCould not understand the voice: ${errorMessage(error)}\n`);
      return;
    }
    if (!said) {
      console.log("\n(I heard nothing. Try again, and speak close to the microphone.)\n");
      return;
    }
    console.log(`\nYou (voice): ${said}\n`);
    await handleMessage(said);
  }

  console.log(
    `JARVIS is ready. I remember ${memory.all().length} thing(s) about you.\n` +
      'Type a message, type "talk" to speak, "help" for commands, or "exit" to quit.\n',
  );

  while (open) {
    let text: string;
    try {
      text = (await rl.question("You: ")).trim();
    } catch {
      break; // Input was closed while waiting.
    }

    if (!text) continue;
    const lower = text.toLowerCase();
    if (lower === "exit") break;

    if (lower === "talk" || lower === "voice") {
      await handleTalk();
      continue;
    }

    await handleMessage(text);
  }

  voice.stop();
  rl.close();
  console.log("\nGoodbye!");
}

main();
