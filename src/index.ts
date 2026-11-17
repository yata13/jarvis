import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { Agent } from "./agent/agent.js";
import { cleanForSpeech, type VoiceOutput } from "./speech/voice-output.js";
import { WindowsVoice } from "./speech/windows-voice.js";
import { Memory } from "./memory/memory.js";
import { Routine } from "./routine/routine.js";
import { respond, buildContext } from "./assistant.js";
import { VoiceInput } from "./voice/voice-input.js";
import { WakeListener, extractCommand, CHUNK_SECONDS } from "./voice/wake.js";

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
  const agent = new Agent(() => buildContext(memory, routine));
  // To swap the voice engine later, change only this line.
  const voice: VoiceOutput = new WindowsVoice();
  const voiceInput = new VoiceInput();
  const wake = new WakeListener();
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
      reply = await respond(text, memory, routine, agent);
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

  /** Keep listening for the wake word "JARVIS". Each command is answered, then it listens again. */
  async function handleListen(): Promise<void> {
    const missing = wake.whatIsMissing();
    if (missing.length > 0) {
      console.log(`\nVoice is not set up yet. Missing: ${missing.join(", ")}.`);
      console.log("Run scripts\\setup-voice.cmd once, then try again.\n");
      return;
    }

    // Enter stops listening. We set a flag that the loop checks.
    let listening = true;
    const stopOnEnter = rl.question('Listening for "JARVIS"... press Enter to stop.\n').then(() => {
      listening = false;
    });

    while (listening) {
      let heard: string;
      try {
        heard = await wake.listenChunk(CHUNK_SECONDS);
      } catch (error) {
        console.error(`\n(Listening error: ${errorMessage(error)})\n`);
        break;
      }
      if (!listening) break;

      const command = extractCommand(heard);
      if (command === null) continue; // no wake word in this chunk

      let toAnswer = command;
      if (!toAnswer) {
        // Heard only "JARVIS": ask for the command and record one more chunk.
        console.log("\nYes?");
        await voice.speak("Yes?").catch(() => {});
        toAnswer = (await wake.listenChunk(CHUNK_SECONDS)).trim();
        if (!toAnswer) continue;
      }

      console.log(`\nYou (voice): ${toAnswer}\n`);
      await handleMessage(toAnswer);
      if (listening) console.log('Listening for "JARVIS"... press Enter to stop.');
    }

    await stopOnEnter;
  }

  console.log(
    `JARVIS is ready. I remember ${memory.all().length} thing(s) about you.\n` +
      'Type a message, "talk" to speak once, "listen" for the wake word, "help", or "exit".\n',
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

    if (lower === "listen" || lower === "hey jarvis") {
      await handleListen();
      continue;
    }

    await handleMessage(text);
  }

  voice.stop();
  rl.close();
  console.log("\nGoodbye!");
}

main();
