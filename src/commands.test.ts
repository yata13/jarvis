import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Memory } from "./memory/memory.js";
import { Routine } from "./routine/routine.js";
import { handleCommand } from "./commands.js";

function tempMemory(): { memory: Memory; routine: Routine; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), "jarvis-cmd-"));
  return { memory: new Memory(join(dir, "memory.json")), routine: new Routine(join(dir, "routine.json")), dir };
}

test("a normal message is not a command (returns null)", () => {
  const { memory, routine, dir } = tempMemory();
  assert.equal(handleCommand("what is the weather", memory, routine), null);
  rmSync(dir, { recursive: true, force: true });
});

test("'remember ...' saves a fact", () => {
  const { memory, routine, dir } = tempMemory();
  const reply = handleCommand("remember I like football", memory, routine);
  assert.match(reply ?? "", /remember/i);
  assert.equal(memory.all()[0].text, "I like football");
  rmSync(dir, { recursive: true, force: true });
});

test("'memory' lists facts with numbers", () => {
  const { memory, routine, dir } = tempMemory();
  memory.add("fact one");
  const reply = handleCommand("memory", memory, routine);
  assert.match(reply ?? "", /1\. fact one/);
  rmSync(dir, { recursive: true, force: true });
});

test("'forget 1' removes the first fact", () => {
  const { memory, routine, dir } = tempMemory();
  memory.add("fact one");
  const reply = handleCommand("forget 1", memory, routine);
  assert.match(reply ?? "", /Forgotten/);
  assert.equal(memory.all().length, 0);
  rmSync(dir, { recursive: true, force: true });
});

test("'forget abc' asks for a number instead of crashing", () => {
  const { memory, routine, dir } = tempMemory();
  const reply = handleCommand("forget abc", memory, routine);
  assert.match(reply ?? "", /number/);
  rmSync(dir, { recursive: true, force: true });
});

test("'add routine' then 'routine' shows the plan", () => {
  const { memory, routine, dir } = tempMemory();
  handleCommand("add routine 9:00 code", memory, routine);
  handleCommand("add routine 13:00 gym", memory, routine);
  const reply = handleCommand("routine", memory, routine);
  assert.match(reply ?? "", /09:00 code/);
  assert.match(reply ?? "", /13:00 gym/);
  rmSync(dir, { recursive: true, force: true });
});

test("'add routine' with a bad time is refused", () => {
  const { memory, routine, dir } = tempMemory();
  const reply = handleCommand("add routine 99:99 sleep", memory, routine);
  assert.match(reply ?? "", /Example/);
  assert.equal(routine.items().length, 0);
  rmSync(dir, { recursive: true, force: true });
});

test("'I am on a trip' pauses the routine, 'resume' starts it again", () => {
  const { memory, routine, dir } = tempMemory();
  const paused = handleCommand("I am on a trip", memory, routine);
  assert.match(paused ?? "", /paused/i);
  assert.equal(routine.isPaused(), true);
  const back = handleCommand("resume", memory, routine);
  assert.match(back ?? "", /active/i);
  assert.equal(routine.isPaused(), false);
  rmSync(dir, { recursive: true, force: true });
});

test("'mission' gives a mission", () => {
  const { memory, routine, dir } = tempMemory();
  const reply = handleCommand("mission", memory, routine);
  assert.match(reply ?? "", /mission/i);
  rmSync(dir, { recursive: true, force: true });
});
