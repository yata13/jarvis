import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { Chat } from "./llm/chat.js";

async function main(): Promise<void> {
  const chat = new Chat();
  const rl = readline.createInterface({ input: stdin, output: stdout });

  // Ctrl+C or Ctrl+D closes the input. We stop the loop instead of crashing.
  let open = true;
  rl.on("close", () => {
    open = false;
  });

  console.log('JARVIS is ready. Type a message and press Enter. Type "exit" to quit.\n');

  while (open) {
    let text: string;
    try {
      text = (await rl.question("You: ")).trim();
    } catch {
      break; // Input was closed while waiting.
    }

    if (!text) continue;
    if (text.toLowerCase() === "exit") break;

    // On a CPU the answer can take a few seconds, so show that JARVIS is working.
    console.log("(thinking...)");

    try {
      const answer = await chat.send(text);
      console.log(`\nJARVIS: ${answer}\n`);
    } catch (error) {
      // Show the problem but keep the chat running, so one bad call does not end the session.
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\nError: ${message}\n`);
    }
  }

  rl.close();
  console.log("\nGoodbye!");
}

main();
