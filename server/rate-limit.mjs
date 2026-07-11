export const TAP_RATE_LIMITS = Object.freeze({
  burstWindowMs: 5_000,
  burstLimit: 100,
  burstCooldownMs: 10 * 60_000,
  minuteWindowMs: 60_000,
  minuteLimit: 1_000,
  minuteCooldownMs: 60 * 60_000,
  longWindowMs: 2 * 60 * 60_000,
  longLimit: 5_000,
  longCooldownMs: 2 * 60 * 60_000,
});

export function evaluateTapAttempt(previousState, nowMs = Date.now()) {
  const now = Number(nowMs);
  const previous = previousState ?? {};

  if (Number(previous.blockedUntil) > now) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((previous.blockedUntil - now) / 1_000)),
      state: { ...previous, updatedAt: now },
    };
  }

  const minuteExpired = previous.minuteStartedAt == null
    || now - previous.minuteStartedAt >= TAP_RATE_LIMITS.minuteWindowMs;
  const burstExpired = previous.burstStartedAt == null
    || now - previous.burstStartedAt >= TAP_RATE_LIMITS.burstWindowMs;
  const longExpired = previous.longStartedAt == null
    || now - previous.longStartedAt >= TAP_RATE_LIMITS.longWindowMs;

  const minuteStartedAt = minuteExpired ? now : previous.minuteStartedAt;
  const burstStartedAt = burstExpired ? now : previous.burstStartedAt;
  const longStartedAt = longExpired ? now : previous.longStartedAt;
  const minuteCount = minuteExpired ? 1 : (previous.minuteCount ?? 0) + 1;
  const burstCount = burstExpired ? 1 : (previous.burstCount ?? 0) + 1;
  const longCount = longExpired ? 1 : (previous.longCount ?? 0) + 1;

  let reason = null;
  let cooldownMs = 0;

  if (longCount > TAP_RATE_LIMITS.longLimit) {
    reason = "long";
    cooldownMs = TAP_RATE_LIMITS.longCooldownMs;
  } else if (minuteCount > TAP_RATE_LIMITS.minuteLimit) {
    reason = "minute";
    cooldownMs = TAP_RATE_LIMITS.minuteCooldownMs;
  } else if (burstCount > TAP_RATE_LIMITS.burstLimit) {
    reason = "burst";
    cooldownMs = TAP_RATE_LIMITS.burstCooldownMs;
  }

  const blockedUntil = reason ? now + cooldownMs : null;

  return {
    allowed: !reason,
    reason,
    retryAfter: reason ? Math.ceil(cooldownMs / 1_000) : 0,
    state: {
      minuteStartedAt,
      minuteCount,
      burstStartedAt,
      burstCount,
      longStartedAt,
      longCount,
      blockedUntil,
      updatedAt: now,
    },
  };
}
