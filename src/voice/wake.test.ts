import { test } from "node:test";
import assert from "node:assert/strict";
import { extractCommand } from "./wake.js";

test("takes the command after the wake word", () => {
  assert.equal(extractCommand("jarvis what is the time"), "what is the time");
  assert.equal(extractCommand("hey jarvis, open chrome"), "open chrome");
  assert.equal(extractCommand("okay JARVIS tell me a joke"), "tell me a joke");
});

test("wake word alone gives an empty command (ask next)", () => {
  assert.equal(extractCommand("jarvis"), "");
  assert.equal(extractCommand("hey jarvis!"), "");
});

test("no wake word is ignored (null)", () => {
  assert.equal(extractCommand("what is the time"), null);
  assert.equal(extractCommand(""), null);
});
