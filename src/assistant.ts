import type { Chat } from "./llm/chat.js";
import type { Memory } from "./memory/memory.js";
import { handleCommand } from "./commands.js";

/** What JARVIS replies with for one input. */
export interface Reply {
  text: string;
  /** True if this was a typed command (remember, memory...). The terminal does not speak those. */
  isCommand: boolean;
}

/**
 * Turn one user input into a reply.
 * First it tries the typed commands (remember, forget...). If it is not a command,
 * it sends the text to the AI. Shared by the terminal (index.ts) and the phone server,
 * so both act the same way and both use the same memory.
 */
export async function respond(text: string, memory: Memory, chat: Chat): Promise<Reply> {
  const commandReply = handleCommand(text, memory);
  if (commandReply !== null) {
    return { text: commandReply, isCommand: true };
  }
  const answer = await chat.send(text);
  return { text: answer, isCommand: false };
}
