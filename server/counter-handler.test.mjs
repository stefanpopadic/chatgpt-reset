import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createCounterService } from "./counter-service.mjs";
import { handleCounterRequest } from "./counter-handler.mjs";

const SECRET = "handler-test-secret";

function makeRequest(method, body) {
  const request = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
  request.method = method;
  request.headers = {
    host: "chatgptreset.com",
    origin: "https://chatgptreset.com",
    "content-type": "application/json",
    "sec-fetch-site": "same-origin",
    "x-forwarded-for": "203.0.113.9",
  };
  return request;
}

function makeResponse() {
  const headers = new Map();
  return {
    headers,
    setHeader(name, value) {
      headers.set(name.toLowerCase(), String(value));
    },
    end(value) {
      this.body = value ? JSON.parse(value) : undefined;
    },
  };
}

test("counter handler requires the signed browser proof before counting", async () => {
  const counter = createCounterService();
  const getResponse = makeResponse();
  await handleCounterRequest(makeRequest("GET"), getResponse, { counter, secret: SECRET });

  assert.equal(getResponse.statusCode, 200);
  assert.equal(typeof getResponse.body.tapProof, "string");

  const rejectedResponse = makeResponse();
  await handleCounterRequest(makeRequest("POST", { tapProof: "invalid" }), rejectedResponse, {
    counter,
    secret: SECRET,
  });
  assert.equal(rejectedResponse.statusCode, 403);

  const acceptedResponse = makeResponse();
  await handleCounterRequest(
    makeRequest("POST", { tapProof: getResponse.body.tapProof }),
    acceptedResponse,
    { counter, secret: SECRET },
  );

  assert.equal(acceptedResponse.statusCode, 200);
  assert.equal(acceptedResponse.body.tapCount, 1);
  assert.equal(acceptedResponse.body.myTapCount, 1);
});
