import test from "node:test";
import assert from "node:assert/strict";
import {
  isSameOriginTapRequest,
  issueTapProof,
  TAP_PROOF_MAX_AGE_MS,
  verifyTapProof,
} from "./tap-security.mjs";

const SECRET = "test-secret";
const VISITOR = "visitor-a";

test("tap proof is bound to the visitor and expires", () => {
  const issuedAt = 1_000_000;
  const token = issueTapProof(VISITOR, SECRET, issuedAt);

  assert.equal(verifyTapProof(token, VISITOR, SECRET, issuedAt + 1_000), true);
  assert.equal(verifyTapProof(token, "visitor-b", SECRET, issuedAt + 1_000), false);
  assert.equal(
    verifyTapProof(token, VISITOR, SECRET, issuedAt + TAP_PROOF_MAX_AGE_MS + 1),
    false,
  );
});

test("tap request must be JSON from the same origin", () => {
  const validRequest = {
    headers: {
      "content-type": "application/json",
      host: "chatgptreset.com",
      origin: "https://chatgptreset.com",
      "sec-fetch-site": "same-origin",
    },
  };

  assert.equal(isSameOriginTapRequest(validRequest), true);
  assert.equal(isSameOriginTapRequest({
    headers: { ...validRequest.headers, origin: "https://bot.example" },
  }), false);
  assert.equal(isSameOriginTapRequest({
    headers: { ...validRequest.headers, "content-type": "text/plain" },
  }), false);
});
