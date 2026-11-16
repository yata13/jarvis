# JARVIS

A personal AI assistant for your Windows PC.
It runs **100% on your PC, for free**. No API key and no internet needed.
We build it step by step. **Now: Step 4, JARVIS remembers you.**

| Step | What JARVIS gets | Status |
|---|---|---|
| 1 | Brain: chat with a free local AI | done |
| 2 | Mouth: speaks every answer (Windows voice) | done |
| 4 | Memory: remembers facts about you | done |
| 3 | Ears: you speak, it understands (Whisper, push-to-talk) | next |

## How it works

```
You type  ->  Ollama (AI model on your PC)  ->  answer on screen  ->  Windows voice speaks it
                         ^
                         |
            memory: facts about you, loaded from a file on your PC
```

- **Ollama** is a free program that runs AI models on your computer.
- **Llama 3.2 3B** is the free AI model ("the brain"). It is about 2 GB and works without a graphics card.
- **Windows voice** is built into Windows. Free, offline, nothing to install.
- **Memory** is a simple file on your PC (`jarvis-data/memory.json`). It never leaves your PC.

## Folders

```
jarvis/
  package.json            packages and the "npm start" command
  tsconfig.json           TypeScript settings
  src/
    index.ts              starts JARVIS: reads what you type, shows and speaks the answer
    commands.ts           the typed commands: remember, memory, forget, help
    llm/
      chat.ts             talks to the AI model, with your memory in the system prompt
    speech/
      voice-output.ts     what every voice engine must do (speak, stop)
      windows-voice.ts    the Windows voice engine
    memory/
      memory.ts           saves and loads facts about you (JSON file on your PC)
  jarvis-data/            your memory file lives here (not on GitHub)
```

Each part is its own module. To use another voice later, we write one new file in
`speech/` and change one line in `index.ts`. Memory can move to SQLite later without
touching the chat code.

## Setup (one time)

1. Install **Node.js 22 or newer** (the "LTS" version) from https://nodejs.org
2. Install **Ollama for Windows** from https://ollama.com/download
   After install, it runs in the background (you see its icon near the clock).
3. Open PowerShell and download the AI model (about 2 GB):

   ```
   ollama pull llama3.2:3b
   ```

4. Go to the `jarvis` folder and install the packages:

   ```
   npm install
   ```

## Run

```
npm start
```

Type a message and press Enter. JARVIS shows the answer and speaks it.
Type `exit` (or press Ctrl+C) to quit. Ctrl+C also stops the voice at once.

The **first answer is slower** (10 to 30 seconds), because the model loads into memory.

## Teach JARVIS about you (memory)

JARVIS keeps facts about you in a file and loads them every time it starts.
It uses them in every answer. Commands:

```
remember I like football        save a fact
remember I wake up at 6am        save another
memory                           show everything JARVIS knows (with numbers)
forget 2                         remove fact number 2
help                             show all commands
```

Tell it your hobbies, skills, goals and daily routine. The more it knows, the
more it can help and see your patterns. Your memory stays on your PC only.

## Test Step 4

1. Type `remember I like football`. JARVIS says it will remember.
2. Type `memory`. It should show your fact with a number.
3. Type `what do I like?`. The answer should know **football**.
4. Type `exit`, then `npm start` again. Type `what do I like?`. It should **still** know.
   (This is the big difference from before: memory now survives a restart.)

## Run the tests

```
npm test
```

This checks the memory and commands (saving, loading, forget).

## Change the model

Open `src/llm/chat.ts` and change `MODEL`. Download the new model first with `ollama pull <name>`.
Bigger models are smarter but slower on a CPU.
