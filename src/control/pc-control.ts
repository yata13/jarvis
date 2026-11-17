import { spawn } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

/** What the user wants to do on the PC. */
export interface ControlIntent {
  action: "openApp" | "openFolder" | "findFiles";
  arg: string;
}

// Known apps we allow to open. Only these, so nothing unexpected can be launched.
const APPS: Record<string, string> = {
  chrome: "chrome",
  edge: "msedge",
  browser: "chrome",
  notepad: "notepad",
  calculator: "calc",
  calc: "calc",
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
export function parseControl(text: string): ControlIntent | null {
  const t = text.trim().toLowerCase();

  // "open/launch/start/show <something>" — only for apps and folders we know.
  const open = t.match(/^(?:open|launch|start|show)\s+(?:the\s+|my\s+)?(.+)$/);
  if (open) {
    const target = open[1].replace(/\b(app|application|folder)\b/g, "").trim();
    if (target in FOLDERS) return { action: "openFolder", arg: target };
    if (target in APPS) return { action: "openApp", arg: target };
    return null; // unknown: let the AI answer instead
  }

  // "find/search [for] <name> file" — the word "file" means they really mean files.
  const find = t.match(/^(?:find|search)(?:\s+for)?\s+(?:a\s+|my\s+|the\s+)?(.+)$/);
  if (find && /\bfiles?\b/.test(t)) {
    const query = find[1].replace(/\b(file|files)\b/g, "").replace(/\b(a|my|the|for)\b/g, "").trim();
    if (query) return { action: "findFiles", arg: query };
  }

  return null;
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
