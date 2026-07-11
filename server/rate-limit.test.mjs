import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTapAttempt, TAP_RATE_LIMITS } from "./rate-limit.mjs";

test("allows a fast human burst and cools down the next tap", () => {
  let state;

  for (let index = 0; index < TAP_RATE_LIMITS.burstLimit; index += 1) {
    const result = evaluateTapAttempt(state, 1_000);
    assert.equal(result.allowed, true);
    state = result.state;
  }

  const blocked = evaluateTapAttempt(state, 1_000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfter, TAP_RATE_LIMITS.cooldownMs / 1_000);
});

test("limits more than 200 taps inside one minute", () => {
  let state;

  for (let index = 0; index < TAP_RATE_LIMITS.minuteLimit; index += 1) {
    const result = evaluateTapAttempt(state, index * 295);
    assert.equal(result.allowed, true);
    state = result.state;
  }

  const blocked = evaluateTapAttempt(state, 59_000);
  assert.equal(blocked.allowed, false);
});

test("accepts taps again after the temporary cooldown", () => {
  let state;

  for (let index = 0; index <= TAP_RATE_LIMITS.burstLimit; index += 1) {
    state = evaluateTapAttempt(state, 5_000).state;
  }

  const accepted = evaluateTapAttempt(state, 5_000 + TAP_RATE_LIMITS.cooldownMs + 1);
  assert.equal(accepted.allowed, true);
  assert.equal(accepted.state.minuteCount, 1);
  assert.equal(accepted.state.burstCount, 1);
});
