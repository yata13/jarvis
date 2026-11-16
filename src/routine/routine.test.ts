import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Routine, parseTime } from "./routine.js";

function tempRoutine(): { routine: Routine; file: string; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), "jarvis-rt-"));
  const file = join(dir, "routine.json");
  return { routine: new Routine(file), file, dir };
}

test("parseTime normalizes and rejects bad times", () => {
  assert.equal(parseTime("9:05"), "09:05");
  assert.equal(parseTime("23:59"), "23:59");
  assert.equal(parseTime("24:00"), null);
  assert.equal(parseTime("9:99"), null);
  assert.equal(parseTime("hello"), null);
});

test("adds items and keeps them sorted by time", () => {
  const { routine, dir } = tempRoutine();
  routine.add("13:00", "gym");
  routine.add("09:00", "code");
  const items = routine.items();
  assert.deepEqual(items.map((i) => i.time), ["09:00", "13:00"]);
  rmSync(dir, { recursive: true, force: true });
});

test("routine stays after restart (loads from the file)", () => {
  const { routine, file, dir } = tempRoutine();
  routine.add("09:00", "code");
  const again = new Routine(file);
  assert.equal(again.items().length, 1);
  rmSync(dir, { recursive: true, force: true });
});

test("next() finds the next item after a time", () => {
  const { routine, dir } = tempRoutine();
  routine.add("09:00", "code");
  routine.add("13:00", "gym");
  routine.add("20:00", "read");
  const noon = new Date();
  noon.setHours(12, 0, 0, 0);
  assert.equal(routine.next(noon)?.activity, "gym");
  const night = new Date();
  night.setHours(22, 0, 0, 0);
  assert.equal(routine.next(night), null); // nothing left
  rmSync(dir, { recursive: true, force: true });
});

test("pause and resume, and a past 'until' date auto-resumes", () => {
  const { routine, dir } = tempRoutine();
  routine.pause("a trip", null);
  assert.equal(routine.isPaused(), true);
  routine.resume();
  assert.equal(routine.isPaused(), false);

  // Paused until yesterday = already resumed.
  routine.pause("a trip", "2000-01-01");
  assert.equal(routine.isPaused(new Date()), false);
  rmSync(dir, { recursive: true, force: true });
});

test("prompt text includes the time, the plan, and the pause state", () => {
  const { routine, dir } = tempRoutine();
  routine.add("09:00", "code");
  const active = routine.asPromptText(new Date());
  assert.match(active, /daily routine/);
  assert.match(active, /09:00 code/);

  routine.pause("hospital", null);
  assert.match(routine.asPromptText(new Date()), /PAUSED/);
  rmSync(dir, { recursive: true, force: true });
});
