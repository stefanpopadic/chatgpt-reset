import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const TAP_PROOF_MAX_AGE_MS = 45 * 60_000;
const TAP_PROOF_FUTURE_TOLERANCE_MS = 30_000;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

function readHeader(request, name) {
  const headers = request?.headers;
  if (!headers) return undefined;
  if (typeof headers.get === "function") return headers.get(name) ?? undefined;

  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function signatureFor(payload, visitorHash, secret) {
  return createHmac("sha256", secret)
    .update(`chatgpt-reset:tap:${visitorHash}:${payload}`)
    .digest("base64url");
}

export function issueTapProof(visitorHash, secret, nowMs = Date.now()) {
  if (!secret) throw new Error("IP_HASH_SALT is required.");

  const payload = `${Math.floor(nowMs)}.${randomBytes(18).toString("base64url")}`;
  return `${payload}.${signatureFor(payload, visitorHash, secret)}`;
}

export function verifyTapProof(token, visitorHash, secret, nowMs = Date.now()) {
  if (!secret || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [timestampValue, nonce, suppliedSignature] = parts;
  const issuedAt = Number(timestampValue);
  if (!Number.isSafeInteger(issuedAt) || !NONCE_PATTERN.test(nonce)) return false;
  if (issuedAt > nowMs + TAP_PROOF_FUTURE_TOLERANCE_MS) return false;
  if (nowMs - issuedAt > TAP_PROOF_MAX_AGE_MS) return false;

  const expectedSignature = signatureFor(`${timestampValue}.${nonce}`, visitorHash, secret);
  const expectedBuffer = Buffer.from(expectedSignature);
  const suppliedBuffer = Buffer.from(suppliedSignature);

  return expectedBuffer.length === suppliedBuffer.length
    && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export function isSameOriginTapRequest(request) {
  const contentType = readHeader(request, "content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) return false;

  const origin = readHeader(request, "origin");
  const host = readHeader(request, "x-forwarded-host") || readHeader(request, "host");
  if (!origin || !host) return false;

  try {
    if (new URL(origin).host !== host) return false;
  } catch {
    return false;
  }

  const fetchSite = readHeader(request, "sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin";
}

export async function readJsonBody(request, maxBytes = 2_048) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body === "string") return JSON.parse(request.body);

  let size = 0;
  const chunks = [];

  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("Request body too large.");
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
