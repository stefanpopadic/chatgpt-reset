import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTapAttempt, TAP_RATE_LIMITS } from "./rate-limit.mjs";

test("allows a fast human burst and gives a ten-minute pause after 100 taps", () => {
  let state;

  for (let index = 0; index < TAP_RATE_LIMITS.burstLimit; index += 1) {
    const result = evaluateTapAttempt(state, 1_000);
    assert.equal(result.allowed, true);
    state = result.state;
  }

  const blocked = evaluateTapAttempt(state, 1_000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "burst");
  assert.equal(blocked.retryAfter, TAP_RATE_LIMITS.burstCooldownMs / 1_000);
});

test("gives a one-hour pause after more than 1,000 taps inside one minute", () => {
  let state;

  for (let index = 0; index < TAP_RATE_LIMITS.minuteLimit; index += 1) {
    const result = evaluateTapAttempt(state, index * 59);
    assert.equal(result.allowed, true);
    state = result.state;
  }

  const blocked = evaluateTapAttempt(state, 59_000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "minute");
  assert.equal(blocked.retryAfter, TAP_RATE_LIMITS.minuteCooldownMs / 1_000);
});

test("gives a two-hour pause after more than 5,000 taps in two hours", () => {
  let state;

  for (let index = 0; index < TAP_RATE_LIMITS.longLimit; index += 1) {
    const result = evaluateTapAttempt(state, index * 1_400);
    assert.equal(result.allowed, true);
    state = result.state;
  }

  const blocked = evaluateTapAttempt(state, 7_000_000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, "long");
  assert.equal(blocked.retryAfter, TAP_RATE_LIMITS.longCooldownMs / 1_000);
});

test("accepts taps again after the temporary cooldown", () => {
  let state;

  for (let index = 0; index <= TAP_RATE_LIMITS.burstLimit; index += 1) {
    state = evaluateTapAttempt(state, 5_000).state;
  }

  const accepted = evaluateTapAttempt(state, 5_000 + TAP_RATE_LIMITS.burstCooldownMs + 1);
  assert.equal(accepted.allowed, true);
  assert.equal(accepted.state.minuteCount, 1);
  assert.equal(accepted.state.burstCount, 1);
});
