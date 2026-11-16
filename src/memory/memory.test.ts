import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Memory } from "./memory.js";

/** A fresh temp file for each test, so tests do not touch real memory or each other. */
function tempMemory(): { memory: Memory; file: string; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), "jarvis-mem-"));
  const file = join(dir, "memory.json");
  return { memory: new Memory(file), file, dir };
}

test("saves a fact and reads it back", () => {
  const { memory, dir } = tempMemory();
  memory.add("I like football");
  assert.equal(memory.all().length, 1);
  assert.equal(memory.all()[0].text, "I like football");
  rmSync(dir, { recursive: true, force: true });
});

test("does not save the same fact twice", () => {
  const { memory, dir } = tempMemory();
  memory.add("I live in Gondar");
  memory.add("i live in gondar"); // same fact, different case
  assert.equal(memory.all().length, 1);
  rmSync(dir, { recursive: true, force: true });
});

test("memory stays after restart (loads from the file)", () => {
  const { memory, file, dir } = tempMemory();
  memory.add("My goal is to be a developer");
  const again = new Memory(file); // like starting JARVIS again
  assert.equal(again.all().length, 1);
  assert.equal(again.all()[0].text, "My goal is to be a developer");
  rmSync(dir, { recursive: true, force: true });
});

test("forget by number removes the right fact", () => {
  const { memory, dir } = tempMemory();
  memory.add("one");
  memory.add("two");
  assert.equal(memory.removeByNumber(1), "one");
  assert.equal(memory.all().length, 1);
  assert.equal(memory.all()[0].text, "two");
  assert.equal(memory.removeByNumber(5), null); // out of range
  rmSync(dir, { recursive: true, force: true });
});

test("prompt text lists the facts, and is empty when there are none", () => {
  const { memory, dir } = tempMemory();
  assert.equal(memory.asPromptText(), "");
  memory.add("I wake up at 6am");
  assert.match(memory.asPromptText(), /I wake up at 6am/);
  rmSync(dir, { recursive: true, force: true });
});
