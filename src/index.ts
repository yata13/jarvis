import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { Chat } from "./llm/chat.js";
import { cleanForSpeech, type VoiceOutput } from "./speech/voice-output.js";
import { WindowsVoice } from "./speech/windows-voice.js";
import { Memory } from "./memory/memory.js";
import { respond } from "./assistant.js";

/** Short error text for the screen. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function main(): Promise<void> {
  // Long memory: facts about the user, loaded from a file at startup.
  const memory = new Memory();
  // The chat reads memory every turn, so facts saved during the chat are used right away.
  const chat = new Chat(() => memory.asPromptText());
  // To swap the voice engine later, change only this line.
  const voice: VoiceOutput = new WindowsVoice();
  const rl = readline.createInterface({ input: stdin, output: stdout });

  // Ctrl+C or Ctrl+D closes the input. We stop the loop (and the voice) instead of crashing.
  let open = true;
  rl.on("close", () => {
    open = false;
    voice.stop();
  });

  const known = memory.all().length;
  console.log(
    `JARVIS is ready. I remember ${known} thing(s) about you. ` +
      'Type "help" for commands, or "exit" to quit.\n',
  );

  while (open) {
    let text: string;
    try {
      text = (await rl.question("You: ")).trim();
    } catch {
      break; // Input was closed while waiting.
    }

    if (!text) continue;
    if (text.toLowerCase() === "exit") break;

    // A command answers at once; a real message goes to the AI, which can take a few seconds.
    const isLikelyCommand = /^(remember |forget |memory$|help$|what do you know about me$)/i.test(text);
    if (!isLikelyCommand) console.log("(thinking...)");

    let reply;
    try {
      reply = await respond(text, memory, chat);
    } catch (error) {
      // Show the problem but keep the chat running, so one bad call does not end the session.
      console.error(`\nError: ${errorMessage(error)}\n`);
      continue;
    }

    console.log(`\nJARVIS: ${reply.text}\n`);

    // Speak only real answers, not command replies (those are system text).
    if (reply.isCommand) continue;
    // Wait until JARVIS finishes speaking, so it does not talk over the next answer.
    try {
      await voice.speak(cleanForSpeech(reply.text));
    } catch (error) {
      // A voice problem should not stop the chat: the answer is already on screen.
      console.error(`(Voice error: ${errorMessage(error)})\n`);
    }
  }

  voice.stop();
  rl.close();
  console.log("\nGoodbye!");
}

main();
