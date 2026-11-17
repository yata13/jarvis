import { OLLAMA_HOST, MODEL } from "../llm/chat.js";
import { openApp, findFiles, copyOrMoveFile, typeText } from "../control/pc-control.js";

const OLLAMA_URL = `${OLLAMA_HOST}/api/chat`;

// The agent has "hands": tools it can call to really do things on the PC.
const SYSTEM_PROMPT = `You are JARVIS, a personal assistant on the user's Windows PC.
The user's English is basic. Use simple words and short sentences, and keep answers short.
Your answers are read aloud, so write plain sentences: no lists, no symbols.
You have tools to DO things: open an app, find files, copy or move a file, and type text.
When the user asks you to DO something on the PC, CALL the right tool. Do not just say you did it.
If a tool gives a result, tell the user plainly what happened. If you cannot do something, say so.`;

/** A message in the agent conversation (Ollama shape). */
interface Msg {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_name?: string;
}
interface ToolCall {
  function: { name: string; arguments: Record<string, unknown> };
}

// The tools we give the model. Each maps to a real function below.
const TOOLS = [
  tool("open_app", "Open an app on the PC (chrome, notepad, calculator, spotify, settings...).", {
    name: { type: "string", description: "the app name" },
  }),
  tool("find_files", "Find files on the PC by part of their name (Desktop, Documents, Downloads).", {
    query: { type: "string", description: "part of the file name" },
  }),
  tool("copy_file", "Copy a file (found by name) into a folder (desktop, documents, downloads).", {
    name: { type: "string", description: "part of the file name" },
    to_folder: { type: "string", description: "desktop, documents or downloads" },
  }),
  tool("move_file", "Move a file (found by name) into a folder (desktop, documents, downloads).", {
    name: { type: "string" },
    to_folder: { type: "string" },
  }),
  tool("type_text", "Type text on the keyboard into the window that is focused.", {
    text: { type: "string", description: "the text to type" },
  }),
];

function tool(name: string, description: string, properties: Record<string, unknown>) {
  return {
    type: "function",
    function: { name, description, parameters: { type: "object", properties, required: Object.keys(properties) } },
  };
}

/** Run one tool and return a short text result for the model and the user. */
function runTool(name: string, args: Record<string, unknown>): string {
  const s = (k: string) => String(args[k] ?? "").trim();
  switch (name) {
    case "open_app":
      return openApp(s("name"));
    case "find_files": {
      const files = findFiles(s("query"));
      return files.length ? `Found:\n${files.join("\n")}` : "No file found with that name.";
    }
    case "copy_file":
      return copyOrMoveFile(false, s("name"), s("to_folder") || "desktop");
    case "move_file":
      return copyOrMoveFile(true, s("name"), s("to_folder") || "desktop");
    case "type_text":
      return typeText(s("text"));
    default:
      return `I do not have a tool called ${name}.`;
  }
}

/** How many times the model may call tools before it must answer. Stops runaway loops. */
const MAX_ROUNDS = 5;

/**
 * The agent: it chats AND can call tools to really do things.
 * Same job as Chat, but with hands. Keeps the conversation and the memory/routine context.
 */
export class Agent {
  private history: Msg[] = [];

  constructor(private getContext: () => string = () => "") {}

  async send(userText: string): Promise<string> {
    const context = this.getContext();
    const system = context ? `${SYSTEM_PROMPT}\n\n${context}` : SYSTEM_PROMPT;

    // Build the messages for this turn: system + past turns + the new message.
    const messages: Msg[] = [{ role: "system", content: system }, ...this.history, { role: "user", content: userText }];

    let answer = "";
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const reply = await askOllama(messages);
      messages.push(reply);

      if (reply.tool_calls && reply.tool_calls.length > 0) {
        for (const call of reply.tool_calls) {
          const result = runTool(call.function.name, call.function.arguments ?? {});
          messages.push({ role: "tool", tool_name: call.function.name, content: result });
        }
        continue; // let the model see the results and keep going
      }

      answer = (reply.content ?? "").trim();
      break;
    }

    // Keep the conversation short in memory: just the user line and the final answer.
    this.history.push({ role: "user", content: userText });
    this.history.push({ role: "assistant", content: answer });
    return answer || "(Done.)";
  }
}

/** One call to Ollama with the tools. Returns the model's message. */
async function askOllama(messages: Msg[]): Promise<Msg> {
  let response: Response;
  try {
    response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, messages, tools: TOOLS, stream: false }),
    });
  } catch {
    throw new Error(`Cannot reach Ollama at ${OLLAMA_HOST}. Is the Ollama app running?`);
  }

  const data = (await response.json()) as { message?: Msg; error?: string };
  if (response.status === 404) throw new Error(`The model is not downloaded yet. Run:  ollama pull ${MODEL}`);
  if (!response.ok) throw new Error(`Ollama error: ${data.error ?? response.status}`);
  return data.message ?? { role: "assistant", content: "" };
}
