import { spawn } from "node:child_process";
import { readdirSync, existsSync, copyFileSync, unlinkSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";

/** What the user wants to do on the PC. */
export interface ControlIntent {
  action: "openApp" | "openFolder" | "findFiles" | "copyFile" | "moveFile" | "typeText";
  arg: string;
  arg2?: string; // the destination folder (copy/move)
}

// Known apps we allow to open. Only these, so nothing unexpected can be launched.
// A few common misspellings are included so typing is forgiving.
const APPS: Record<string, string> = {
  chrome: "chrome",
  edge: "msedge",
  browser: "chrome",
  notepad: "notepad",
  calc: "calc", // "calculator", "calculate", "calculater" all match via startsWith
  paint: "mspaint",
  explorer: "explorer",
  files: "explorer",
  settings: "ms-settings:",
  word: "winword",
  excel: "excel",
  spotify: "spotify",
  vscode: "code",
  code: "code",
  cmd: "cmd",
  terminal: "wt",
};

// Known folders, found from your user folder.
const FOLDERS: Record<string, string> = {
  desktop: "Desktop",
  documents: "Documents",
  downloads: "Downloads",
  pictures: "Pictures",
  music: "Music",
  videos: "Videos",
  home: ".",
};

/**
 * Turn a sentence into a PC action, or null if it is not a control request.
 * To avoid hijacking normal chat ("open the door", "find a restaurant"), we only
 * act when the app/folder is one we know, or the user clearly says "file".
 * Pure, so it is easy to test.
 */
/**
 * Match a spoken/typed word to a known key, forgiving small spelling changes:
 * exact, or one starts with the other (4+ letters). So "calculate", "calculator"
 * and "calculater" all map to "calc". Returns the key, or null.
 */
function matchKey(name: string, keys: string[]): string | null {
  if (keys.includes(name)) return name;
  for (const k of keys) {
    if (k.length >= 4 && name.startsWith(k)) return k;
    if (name.length >= 4 && k.startsWith(name)) return k;
  }
  return null;
}

export function parseControl(text: string): ControlIntent | null {
  const t = text.trim().toLowerCase();

  // An "open" word (anywhere in the sentence) followed right away by a name we know.
  // The name must come just after the verb, so "show me your code" does NOT open VS Code,
  // but "jarvis, open chrome" and "please open the calculate app" do.
  const open = t.match(/\b(?:open|launch|start|run|show)\s+(?:the\s+|my\s+|a\s+|some\s+)?([a-z]+)\b/);
  if (open) {
    const name = open[1];
    const folderKey = matchKey(name, Object.keys(FOLDERS).filter((f) => f !== "home"));
    if (folderKey) return { action: "openFolder", arg: folderKey };
    const appKey = matchKey(name, Object.keys(APPS));
    if (appKey) return { action: "openApp", arg: appKey };
  }

  // "copy/move <name> to <folder>"
  const copyMove = t.match(/\b(copy|move)\s+(.+?)\s+to\s+(?:the\s+|my\s+)?(desktop|documents|downloads|pictures)\b/);
  if (copyMove) {
    const name = copyMove[2].replace(/\b(a|my|the|file|called|named)\b/g, "").trim();
    if (name) return { action: copyMove[1] === "copy" ? "copyFile" : "moveFile", arg: name, arg2: copyMove[3] };
  }

  // "type <text>" — types on the keyboard into whatever window is focused.
  const type = text.trim().match(/^type\s+(.+)$/i);
  if (type) return { action: "typeText", arg: type[1] };

  // "find/search ... <name> ... file" — the word "file" means they really mean files.
  if (/\b(find|search)\b/.test(t) && /\bfiles?\b/.test(t)) {
    const between = t.match(/\b(?:find|search)(?:\s+for)?\s+(.+?)\s+files?\b/);
    const query = (between ? between[1] : "")
      .replace(/\b(a|my|the|for|called|named)\b/g, "")
      .trim();
    if (query) return { action: "findFiles", arg: query };
  }

  return null;
}

/** Full path to a known folder (Desktop, Documents...). */
function folderPath(name: string): string | null {
  const home = process.env.USERPROFILE || process.env.HOME || ".";
  const sub = FOLDERS[name.toLowerCase()];
  if (!sub || sub === ".") return null;
  return join(home, sub);
}

/** Copy or move a file (found by name) into a folder. Returns a short reply. */
export function copyOrMoveFile(move: boolean, name: string, folder: string): string {
  const dest = folderPath(folder);
  if (!dest) return `I do not know the "${folder}" folder. Try desktop, documents or downloads.`;
  const matches = findFiles(name);
  if (matches.length === 0) return `I could not find a file called "${name}".`;
  const src = matches[0];
  const target = join(dest, basename(src));
  try {
    mkdirSync(dest, { recursive: true });
    copyFileSync(src, target);
    if (move) unlinkSync(src); // copy then delete, so it also works across drives
  } catch (e) {
    return `Sorry, I could not ${move ? "move" : "copy"} it: ${String(e)}`;
  }
  return `${move ? "Moved" : "Copied"} ${basename(src)} to your ${folder} folder.`;
}

/** Type text on the keyboard (into the focused window) using Windows SendKeys. */
export function typeText(text: string): string {
  // SendKeys treats + ^ % ~ ( ) { } [ ] as special, so wrap each in braces.
  const safe = text.replace(/[+^%~(){}\[\]]/g, "{$&}");
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "[System.Windows.Forms.SendKeys]::SendWait($env:JARVIS_TYPE)",
  ].join("; ");
  const p = spawn("powershell.exe", ["-NoProfile", "-Command", script], {
    env: { ...process.env, JARVIS_TYPE: safe },
    windowsHide: true,
  });
  p.on("error", () => {});
  return `Typing: ${text}`;
}

/** Open a known app by name (used by the agent tools too). */
export function openApp(name: string): string {
  const key = matchKey(name.trim().toLowerCase(), Object.keys(APPS));
  if (!key) return `I can only open apps I know (chrome, notepad, calculator, spotify...). I do not know "${name}".`;
  openWith(APPS[key]);
  return `Opening ${key}.`;
}

/** The folders we look in when finding files. */
function searchRoots(home = process.env.USERPROFILE || process.env.HOME || "."): string[] {
  const names = ["Desktop", "Documents", "Downloads"];
  const roots: string[] = [];
  for (const base of [home, join(home, "OneDrive")]) {
    for (const n of names) {
      const p = join(base, n);
      if (existsSync(p)) roots.push(p);
    }
  }
  return roots.length > 0 ? roots : [home];
}

/** Find files whose name contains the query, in the common folders. Read-only and safe. */
export function findFiles(query: string, roots = searchRoots(), limit = 10): string[] {
  const needle = query.toLowerCase();
  const found: string[] = [];

  const walk = (dir: string, depth: number): void => {
    if (depth > 4 || found.length >= limit) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // no permission, skip
    }
    for (const e of entries) {
      if (found.length >= limit) return;
      if (e.name.startsWith(".")) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else if (e.name.toLowerCase().includes(needle)) found.push(full);
    }
  };

  for (const root of roots) walk(root, 0);
  return found;
}

/** Do the action and return a short reply. Only known apps and folders; search is read-only. */
export async function runControl(intent: ControlIntent): Promise<string> {
  if (intent.action === "openApp") {
    const cmd = APPS[intent.arg];
    if (!cmd) {
      return `I can only open apps I know (like chrome, notepad, calculator, spotify). I do not know "${intent.arg}".`;
    }
    openWith(cmd);
    return `Opening ${intent.arg}.`;
  }

  if (intent.action === "openFolder") {
    const home = process.env.USERPROFILE || process.env.HOME || ".";
    const sub = FOLDERS[intent.arg];
    const path = sub === "." ? home : join(home, sub);
    const p = spawn("explorer", [path], { windowsHide: true, detached: true });
    p.on("error", () => {}); // a missing command must never crash JARVIS
    p.unref();
    return `Opening your ${intent.arg} folder.`;
  }

  if (intent.action === "copyFile") return copyOrMoveFile(false, intent.arg, intent.arg2 ?? "desktop");
  if (intent.action === "moveFile") return copyOrMoveFile(true, intent.arg, intent.arg2 ?? "desktop");
  if (intent.action === "typeText") return typeText(intent.arg);

  // findFiles
  const files = findFiles(intent.arg);
  if (files.length === 0) return `I did not find any file with "${intent.arg}" in your Desktop, Documents or Downloads.`;
  return `I found ${files.length} file(s) with "${intent.arg}":\n${files.join("\n")}`;
}

/** Open an app via Windows "start". detached so JARVIS does not wait for it. */
function openWith(cmd: string): void {
  // cmd /c start "" "<cmd>"  launches the app and returns at once.
  const p = spawn("cmd", ["/c", "start", "", cmd], { windowsHide: true, detached: true });
  p.on("error", () => {}); // a missing command must never crash JARVIS
  p.unref();
}

/** Try to handle the text as a PC action. Returns a reply, or null if it is not one. */
export async function handleControl(text: string): Promise<string | null> {
  const intent = parseControl(text);
  if (!intent) return null;
  return runControl(intent);
}
