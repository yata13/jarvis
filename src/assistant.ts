import type { Chat } from "./llm/chat.js";
import type { Memory } from "./memory/memory.js";
import type { Routine } from "./routine/routine.js";
import { handleCommand } from "./commands.js";
import { handleControl } from "./control/pc-control.js";

/** What JARVIS replies with for one input. */
export interface Reply {
  text: string;
  /** True if this was a typed command (remember, memory...). The terminal does not speak those. */
  isCommand: boolean;
}

/**
 * Turn one user input into a reply.
 * First it tries the typed commands (remember, routine, mission...). If it is not a command,
 * it sends the text to the AI. Shared by the terminal (index.ts) and the phone server,
 * so both act the same way and both use the same memory and routine.
 */
export async function respond(text: string, memory: Memory, routine: Routine, chat: Chat): Promise<Reply> {
  // 1. Typed commands (remember, routine...).
  const commandReply = handleCommand(text, memory, routine);
  if (commandReply !== null) {
    return { text: commandReply, isCommand: true };
  }
  // 2. PC control (open an app, find a file...). Only known, safe actions.
  const controlReply = await handleControl(text);
  if (controlReply !== null) {
    return { text: controlReply, isCommand: true };
  }
  // 3. Otherwise, ask the AI.
  const answer = await chat.send(text);
  return { text: answer, isCommand: false };
}

/**
 * The extra text that goes in the AI's system prompt each turn:
 * what JARVIS remembers, plus the routine, the time now, and the pause state.
 * Used by both the terminal and the phone server.
 */
export function buildContext(memory: Memory, routine: Routine): string {
  return [memory.asPromptText(), routine.asPromptText()].filter(Boolean).join("\n\n");
}
