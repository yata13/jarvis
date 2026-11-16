import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanTranscript } from "./transcriber.js";

test("keeps the spoken words", () => {
  assert.equal(cleanTranscript("  Hello JARVIS, what is the time?  "), "Hello JARVIS, what is the time?");
});

test("drops whisper's no-speech markers", () => {
  assert.equal(cleanTranscript("[BLANK_AUDIO]"), "");
  assert.equal(cleanTranscript("[MUSIC] turn on the light"), "turn on the light");
  assert.equal(cleanTranscript("(silence)"), "");
});

test("squeezes extra spaces and newlines", () => {
  assert.equal(cleanTranscript("one\n  two   three\n"), "one two three");
});
