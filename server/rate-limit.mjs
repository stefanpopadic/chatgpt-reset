export const TAP_RATE_LIMITS = Object.freeze({
  burstWindowMs: 5_000,
  burstLimit: 40,
  minuteWindowMs: 60_000,
  minuteLimit: 200,
  cooldownMs: 5 * 60_000,
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

  const minuteStartedAt = minuteExpired ? now : previous.minuteStartedAt;
  const burstStartedAt = burstExpired ? now : previous.burstStartedAt;
  const minuteCount = minuteExpired ? 1 : (previous.minuteCount ?? 0) + 1;
  const burstCount = burstExpired ? 1 : (previous.burstCount ?? 0) + 1;
  const exceeded = minuteCount > TAP_RATE_LIMITS.minuteLimit
    || burstCount > TAP_RATE_LIMITS.burstLimit;
  const blockedUntil = exceeded ? now + TAP_RATE_LIMITS.cooldownMs : null;

  return {
    allowed: !exceeded,
    retryAfter: exceeded ? Math.ceil(TAP_RATE_LIMITS.cooldownMs / 1_000) : 0,
    state: {
      minuteStartedAt,
      minuteCount,
      burstStartedAt,
      burstCount,
      blockedUntil,
      updatedAt: now,
    },
  };
}
