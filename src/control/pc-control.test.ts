import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseControl, findFiles, copyOrMoveFile } from "./pc-control.js";

test("opens known apps, even with words before the verb", () => {
  assert.deepEqual(parseControl("open chrome"), { action: "openApp", arg: "chrome" });
  assert.deepEqual(parseControl("launch spotify"), { action: "openApp", arg: "spotify" });
  assert.deepEqual(parseControl("open the calculator app"), { action: "openApp", arg: "calc" });
  // Extra words and a typo before/around the command still work.
  assert.deepEqual(parseControl("hi jarvis open calculater app"), { action: "openApp", arg: "calc" });
  assert.deepEqual(parseControl("jarvis please open chrome"), { action: "openApp", arg: "chrome" });
});

test("opens known folders", () => {
  assert.deepEqual(parseControl("open my downloads folder"), { action: "openFolder", arg: "downloads" });
  assert.deepEqual(parseControl("show desktop"), { action: "openFolder", arg: "desktop" });
});

test("does NOT hijack normal chat", () => {
  assert.equal(parseControl("open the door please"), null); // unknown app
  assert.equal(parseControl("show me your code"), null); // name not right after the verb
  assert.equal(parseControl("find a good restaurant"), null); // no "file"
  assert.equal(parseControl("how are you"), null);
});

test("finds files only when the user says 'file'", () => {
  assert.deepEqual(parseControl("find my cv file"), { action: "findFiles", arg: "cv" });
  assert.deepEqual(parseControl("search for budget files"), { action: "findFiles", arg: "budget" });
  assert.equal(parseControl("find my cv"), null); // no "file" word
});

test("findFiles finds matching names and ignores others", () => {
  const dir = mkdtempSync(join(tmpdir(), "jarvis-find-"));
  mkdirSync(join(dir, "sub"));
  writeFileSync(join(dir, "my-cv.pdf"), "x");
  writeFileSync(join(dir, "sub", "cv-old.docx"), "x");
  writeFileSync(join(dir, "photo.png"), "x");
  const hits = findFiles("cv", [dir]);
  assert.equal(hits.length, 2);
  assert.ok(hits.every((h) => h.toLowerCase().includes("cv")));
  rmSync(dir, { recursive: true, force: true });
});

test("forgives spelling variants of calculator", () => {
  for (const w of ["calc", "calculate", "calculator", "calculater"]) {
    assert.deepEqual(parseControl(`open ${w} app`), { action: "openApp", arg: "calc" }, `failed for ${w}`);
  }
});

test("parses copy/move and type", () => {
  assert.deepEqual(parseControl("copy yata.jpg to desktop"), { action: "copyFile", arg: "yata.jpg", arg2: "desktop" });
  assert.deepEqual(parseControl("move my report to documents"), { action: "moveFile", arg: "report", arg2: "documents" });
  assert.deepEqual(parseControl("type hello world"), { action: "typeText", arg: "hello world" });
  assert.equal(parseControl("copy that idea to your head"), null); // unknown folder
});

test("copyOrMoveFile copies a found file into a folder", () => {
  const dir = mkdtempSync(join(tmpdir(), "jarvis-copy-"));
  mkdirSync(join(dir, "Desktop"));
  mkdirSync(join(dir, "Downloads"));
  writeFileSync(join(dir, "Downloads", "yata.jpg"), "img");
  const old = process.env.USERPROFILE;
  process.env.USERPROFILE = dir;
  try {
    const msg = copyOrMoveFile(false, "yata", "desktop");
    assert.match(msg, /Copied/);
    assert.ok(existsSync(join(dir, "Desktop", "yata.jpg")));
    assert.ok(existsSync(join(dir, "Downloads", "yata.jpg"))); // copy keeps the original
  } finally {
    if (old === undefined) delete process.env.USERPROFILE; else process.env.USERPROFILE = old;
    rmSync(dir, { recursive: true, force: true });
  }
});
