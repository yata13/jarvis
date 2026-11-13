# JARVIS

A personal AI assistant for your Windows PC.
It runs **100% on your PC, for free**. No API key and no internet needed.
We build it step by step. **Now: Step 2, JARVIS speaks.**

| Step | What JARVIS gets | Status |
|---|---|---|
| 1 | Brain: chat with a free local AI | done |
| 2 | Mouth: speaks every answer (Windows voice) | done |
| 3 | Ears: you speak, it understands (Whisper, push-to-talk) | next |
| 4 | Memory: remembers facts about you | later |

## How it works

```
You type  ->  Ollama (AI model on your PC)  ->  answer on screen  ->  Windows voice speaks it
```

- **Ollama** is a free program that runs AI models on your computer.
- **Llama 3.2 3B** is the free AI model ("the brain"). It is about 2 GB and works without a graphics card.
- **Windows voice** is built into Windows. Free, offline, nothing to install.

## Folders

```
jarvis/
  package.json            packages and the "npm start" command
  tsconfig.json           TypeScript settings
  src/
    index.ts              starts JARVIS: reads what you type, shows and speaks the answer
    llm/
      chat.ts             talks to the AI model and keeps the chat history
    speech/
      voice-output.ts     what every voice engine must do (speak, stop)
      windows-voice.ts    the Windows voice engine
    memory/               (Step 4: saved facts)
```

Each part is its own module. To use another voice later, we write one new file in
`speech/` and change one line in `index.ts`.

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

## Test Step 2

1. Turn your speakers on. Type `Hello`. JARVIS should **show and speak** the answer.
2. Type `Tell me 3 fruits`. The voice should sound natural (no "asterisk" or "hash" read aloud).
3. Ask a long question, then press **Ctrl+C** while it speaks. The voice should stop at once.
4. Type `My name is Sam`, then `What is my name?`. It should say "Sam" (Step 1 still works).

## Change the model

Open `src/llm/chat.ts` and change `MODEL`. Download the new model first with `ollama pull <name>`.
Bigger models are smarter but slower on a CPU.
