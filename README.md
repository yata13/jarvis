# JARVIS

A personal AI assistant for your Windows PC.
It runs **100% on your PC, for free**. No API key and no internet needed.
We build it step by step. **Now: Step 4, JARVIS remembers you.**

| Step | What JARVIS gets | Status |
|---|---|---|
| 1 | Brain: chat with a free local AI | done |
| 2 | Mouth: speaks every answer (Windows voice) | done |
| 4 | Memory: remembers facts about you | done |
| — | Phone chat: talk to this PC from your phone | done |
| 3 | Ears: you speak, it understands (Whisper, push-to-talk) | done |

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
    voice/                voice input (you speak -> text)
      recorder.ts         records the microphone with ffmpeg
      transcriber.ts      turns the sound into text with whisper.cpp
      voice-input.ts      ties them together; tools.ts finds the programs
    memory/
      memory.ts           saves and loads facts about you (JSON file on your PC)
    routine/              your daily plan and missions
  scripts/                start-server, install-autostart, setup-voice
  jarvis-data/            your memory and routine live here (not on GitHub)
  voice-tools/            the voice programs after setup-voice (not on GitHub)
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

## Chat from your phone

JARVIS can also answer your phone. The AI stays on this PC; the phone just sends
messages to it over a free private link (**Tailscale**).

1. Install Tailscale on the PC and the phone (same account): https://tailscale.com/download
2. On the PC, start the server:

   ```
   npm run serve
   ```

   It prints a **PC address** (like `100.90.10.5:11435`) and a **Token**. Keep it open.
3. In the phone app (JARVIS), tap **Chat with JARVIS**, open **Settings**, and type that
   address and token. Then chat.

The phone uses the same memory as the PC. Full steps are in the phone app's README.

### Start the server by itself when the PC turns on

So you do not have to run `npm run serve` by hand every time:

1. Open the `jarvis\scripts` folder.
2. Double-click **install-autostart.cmd** (run it once).

Now the server starts as a small window each time you log in. (Ollama already
auto-starts.) To stop this later, double-click **uninstall-autostart.cmd**.
To start it now without restarting, double-click **start-server.cmd**.

## Daily routine and missions

JARVIS can hold your daily plan, tell you what is next, give you small missions,
and pause when you are on a trip or in the hospital. It knows the time and your
plan, so normal chat ("what should I do now?") is aware of them too.

```
add routine 09:00 code      add something to your day
add routine 13:00 gym
routine                     show your plan (with numbers)
remove routine 2            remove one item
next                        what is next in your day
pause   (or: I am on a trip / I am in the hospital)   pause the plan
resume  (or: I am back)     start the plan again
mission                     get a small self-improvement mission
```

When paused, JARVIS will not push you about the plan. Type `resume` when you are back.
The plan is saved in `jarvis-data/routine.json` on your PC. The phone chat uses it too.

## Talk to JARVIS (voice input)

You can speak instead of type. Your voice becomes text with **Whisper**, which
runs on your PC, so it is free and works offline after setup.

### Set up voice (one time, about 160 MB)

1. Open the `jarvis\scripts` folder.
2. Double-click **setup-voice.cmd**. It downloads three small tools into a
   `voice-tools` folder: whisper.cpp, a small Whisper model, and ffmpeg (to record).

### Use it

1. `npm start`
2. Type `talk` and press Enter.
3. Speak, then press **Enter** to stop.
4. JARVIS shows what you said, answers, and speaks the answer.

Notes:
- A terminal cannot feel a key being held, so for now it is "press to start,
  Enter to stop". True hold-to-talk needs a small window app (a later step).
- The small model (`ggml-tiny.en`) is fast and fine for short, simple English.
  For better accuracy, download `ggml-base.en.bin` (about 142 MB) into
  `voice-tools\models` and set `JARVIS_WHISPER_MODEL` to it.
- If the mic is not found, set `JARVIS_MIC` to its exact name (the setup window
  and `ffmpeg -list_devices true -f dshow -i dummy` show the names).

## Run the tests

```
npm test
```

This checks the memory, commands, and the phone server (saving, loading, token, auth).

## Change the model

Open `src/llm/chat.ts` and change `MODEL`. Download the new model first with `ollama pull <name>`.
Bigger models are smarter but slower on a CPU.
