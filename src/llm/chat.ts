// Ollama runs the AI model on this PC. This is its local address (no internet needed).
const OLLAMA_URL = "http://localhost:11434/api/chat";

// The free model. Download it once with:  ollama pull llama3.2:3b
// Small (about 2 GB), so it runs on a normal CPU without a graphics card.
const MODEL = "llama3.2:3b";

// Short, simple answers: the user's English is basic, a small model stays on track,
// and later JARVIS will speak them aloud.
const SYSTEM_PROMPT = `You are JARVIS, a personal assistant on the user's Windows PC.
The user's English is basic. Use simple words and short sentences.
Keep answers short, unless the user asks for more detail.`;

type Message = { role: "system" | "user" | "assistant"; content: string };

/**
 * One chat session with the local AI model.
 * The model remembers nothing between calls, so we keep the history here
 * and send all of it each time. The history lives only while the program runs.
 */
export class Chat {
  // The system message goes first, so the model knows who it is on every turn.
  private history: Message[] = [{ role: "system", content: SYSTEM_PROMPT }];

  /** Send the user's text and return JARVIS's answer as plain text. */
  async send(userText: string): Promise<string> {
    this.history.push({ role: "user", content: userText });

    let answer: string;
    try {
      answer = await askOllama(this.history);
    } catch (error) {
      // The message was not answered, so remove it. Otherwise the history breaks.
      this.history.pop();
      throw error;
    }

    this.history.push({ role: "assistant", content: answer });
    return answer || "(No answer. Please try again.)";
  }
}

/** Send the whole chat to Ollama and return the model's reply. */
async function askOllama(messages: Message[]): Promise<string> {
  let response: Response;
  try {
    response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // stream: false = wait for the full answer. Simpler, and Step 2 speaks whole answers.
      body: JSON.stringify({ model: MODEL, messages, stream: false }),
    });
  } catch {
    throw new Error("Cannot reach Ollama. Is the Ollama app running?");
  }

  const data = (await response.json()) as { message?: { content?: string }; error?: string };

  if (response.status === 404) {
    throw new Error(`The model is not downloaded yet. Run:  ollama pull ${MODEL}`);
  }
  if (!response.ok) {
    throw new Error(`Ollama error: ${data.error ?? response.status}`);
  }

  return data.message?.content?.trim() ?? "";
}
