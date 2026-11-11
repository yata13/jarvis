# JARVIS

A personal AI assistant for your Windows PC.
It runs **100% on your PC, for free**. No API key and no internet needed.
We build it step by step. **Now: Step 1, terminal chat.**

## How it works

```
You type  ->  JARVIS (this code)  ->  Ollama (runs the AI model on your PC)  ->  answer
```

- **Ollama** is a free program that runs AI models on your computer.
- **Llama 3.2 3B** is the free AI model ("the brain"). It is about 2 GB and works without a graphics card.

## Folders

```
jarvis/
  package.json     packages and the "npm start" command
  tsconfig.json    TypeScript settings
  src/
    index.ts       starts JARVIS: reads what you type, prints the answer
    llm/
      chat.ts      talks to the AI model and keeps the chat history
    speech/        (Step 2 and 3: voice output and voice input)
    memory/        (Step 4: saved facts)
```

Each part is its own module. Later we can add new parts (for example, PC control) without changing the others.

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

Type a message and press Enter. Type `exit` (or press Ctrl+C) to quit.

The **first answer is slower** (10 to 30 seconds), because the model loads into memory.
After that, answers take a few seconds.

## Test Step 1

1. Type `Hello`. JARVIS should answer.
2. Type `My name is Sam`. Then type `What is my name?`. JARVIS should say "Sam".
   This shows the history works.
3. Quit and start again. Ask `What is my name?`. JARVIS should NOT know.
   History lives only while the program runs. (Saved memory comes in Step 4.)
4. Close Ollama (right-click its icon, Quit) and send a message.
   You should see: "Cannot reach Ollama. Is the Ollama app running?"

## Change the model

Open `src/llm/chat.ts` and change `MODEL`. Download the new model first with `ollama pull <name>`.
Bigger models are smarter but slower on a CPU.
