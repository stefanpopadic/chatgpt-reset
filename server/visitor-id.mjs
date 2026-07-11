import { createHmac } from "node:crypto";

function readHeader(request, name) {
  const headers = request?.headers;
  if (!headers) return undefined;
  if (typeof headers.get === "function") return headers.get(name) ?? undefined;

  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function normalizeIp(value) {
  let ip = String(value || "unknown").split(",")[0].trim();

  if (ip.startsWith("[")) ip = ip.slice(1, ip.indexOf("]"));
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.replace(/:\d+$/, "");
  if (["::1", "127.0.0.1", "localhost"].includes(ip)) return "loopback";

  return ip;
}

export function hashRequestIp(request, secret) {
  if (!secret) throw new Error("IP_HASH_SALT is required.");

  const ip = normalizeIp(
    readHeader(request, "x-forwarded-for")
      || readHeader(request, "x-real-ip")
      || readHeader(request, "cf-connecting-ip")
      || request?.socket?.remoteAddress,
  );

  return createHmac("sha256", secret).update(ip).digest("hex");
}
