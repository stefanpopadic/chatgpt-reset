import { hashRequestIp } from "./visitor-id.mjs";
import {
  isSameOriginTapRequest,
  issueTapProof,
  readJsonBody,
  verifyTapProof,
} from "./tap-security.mjs";

function sendJson(response, statusCode, payload) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");

  if (typeof response.status === "function" && typeof response.json === "function") {
    return response.status(statusCode).json(payload);
  }

  response.statusCode = statusCode;
  response.end(JSON.stringify(payload));
  return undefined;
}

export async function handleCounterRequest(request, response, { counter, secret }) {
  try {
    const visitorHash = hashRequestIp(request, secret);

    if (request.method === "GET") {
      return sendJson(response, 200, {
        ...await counter.read(visitorHash),
        tapProof: issueTapProof(visitorHash, secret),
      });
    }

    if (request.method === "POST") {
      if (!isSameOriginTapRequest(request)) {
        return sendJson(response, 403, { error: "Tap verification failed. Refresh the page." });
      }

      let body;
      try {
        body = await readJsonBody(request);
      } catch {
        return sendJson(response, 400, { error: "Invalid tap request." });
      }

      if (!verifyTapProof(body.tapProof, visitorHash, secret)) {
        return sendJson(response, 403, { error: "Tap verification failed. Refresh the page." });
      }

      const result = await counter.increment(visitorHash);
      if (!result.accepted) {
        response.setHeader("Retry-After", String(result.retryAfter));
        return sendJson(response, 429, {
          error: "Too many taps. Try again after the cooldown.",
          retryAfter: result.retryAfter,
          tapCount: result.tapCount,
          myTapCount: result.myTapCount,
        });
      }

      return sendJson(response, 200, {
        ...result,
        tapProof: issueTapProof(visitorHash, secret),
      });
    }

    response.setHeader("Allow", "GET, POST");
    return sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return sendJson(response, 500, { error: "Counter unavailable" });
  }
}
