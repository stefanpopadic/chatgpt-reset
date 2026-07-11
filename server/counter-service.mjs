import { neon } from "@neondatabase/serverless";
import { evaluateTapAttempt, TAP_RATE_LIMITS } from "./rate-limit.mjs";

const RESET_TARGET = 10_000_000;

function serialize(row) {
  const tapCount = Number(row.tap_count);
  const myTapCount = Number(row.my_tap_count ?? 0);

  const payload = {
    tapCount,
    myTapCount,
    resetTarget: RESET_TARGET,
    resetsEarned: Math.floor(tapCount / RESET_TARGET),
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
  };

  if (row.accepted !== undefined) payload.accepted = Boolean(row.accepted);
  if (row.retry_after !== undefined) payload.retryAfter = Number(row.retry_after);

  return payload;
}

export function createCounterService(databaseUrl) {
  if (!databaseUrl) {
    let tapCount = 0;
    const personalTaps = new Map();
    const tapLimits = new Map();
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + 30 * 86_400_000);

    return {
      async read(visitorHash) {
        return serialize({
          tap_count: tapCount,
          my_tap_count: personalTaps.get(visitorHash) ?? 0,
          starts_at: startsAt,
          ends_at: endsAt,
        });
      },
      async increment(visitorHash, options = {}) {
        const decision = evaluateTapAttempt(tapLimits.get(visitorHash), options.now ?? Date.now());
        tapLimits.set(visitorHash, decision.state);

        if (!decision.allowed) {
          return {
            ...await this.read(visitorHash),
            accepted: false,
            retryAfter: decision.retryAfter,
          };
        }

        tapCount += 1;
        personalTaps.set(visitorHash, (personalTaps.get(visitorHash) ?? 0) + 1);
        return {
          ...await this.read(visitorHash),
          accepted: true,
          retryAfter: 0,
        };
      },
    };
  }

  const sql = neon(databaseUrl);

  return {
    async read(visitorHash) {
      const [row] = await sql`
        SELECT
          campaign.tap_count,
          campaign.starts_at,
          campaign.ends_at,
          COALESCE(personal.tap_count, 0) AS my_tap_count
        FROM reset_campaign AS campaign
        LEFT JOIN reset_tappers AS personal
          ON personal.visitor_hash = ${visitorHash}
        WHERE campaign.id = 1
      `;
      return serialize(row);
    },
    async increment(visitorHash) {
      const burstWindowSeconds = TAP_RATE_LIMITS.burstWindowMs / 1_000;
      const minuteWindowSeconds = TAP_RATE_LIMITS.minuteWindowMs / 1_000;
      const longWindowSeconds = TAP_RATE_LIMITS.longWindowMs / 1_000;
      const burstCooldownSeconds = TAP_RATE_LIMITS.burstCooldownMs / 1_000;
      const minuteCooldownSeconds = TAP_RATE_LIMITS.minuteCooldownMs / 1_000;
      const longCooldownSeconds = TAP_RATE_LIMITS.longCooldownMs / 1_000;
      const [row] = await sql`
        WITH guard AS (
          INSERT INTO reset_tap_limits (
            visitor_hash,
            minute_started_at,
            minute_count,
            burst_started_at,
            burst_count,
            long_started_at,
            long_count,
            blocked_until,
            updated_at
          )
          VALUES (
            ${visitorHash},
            statement_timestamp(),
            1,
            statement_timestamp(),
            1,
            statement_timestamp(),
            1,
            NULL,
            statement_timestamp()
          )
          ON CONFLICT (visitor_hash) DO UPDATE
          SET minute_started_at = CASE
                WHEN reset_tap_limits.minute_started_at <= statement_timestamp() - make_interval(secs => ${minuteWindowSeconds})
                THEN statement_timestamp()
                ELSE reset_tap_limits.minute_started_at
              END,
              minute_count = CASE
                WHEN reset_tap_limits.minute_started_at <= statement_timestamp() - make_interval(secs => ${minuteWindowSeconds})
                THEN 1
                ELSE reset_tap_limits.minute_count + 1
              END,
              burst_started_at = CASE
                WHEN reset_tap_limits.burst_started_at <= statement_timestamp() - make_interval(secs => ${burstWindowSeconds})
                THEN statement_timestamp()
                ELSE reset_tap_limits.burst_started_at
              END,
              burst_count = CASE
                WHEN reset_tap_limits.burst_started_at <= statement_timestamp() - make_interval(secs => ${burstWindowSeconds})
                THEN 1
                ELSE reset_tap_limits.burst_count + 1
              END,
              long_started_at = CASE
                WHEN reset_tap_limits.long_started_at <= statement_timestamp() - make_interval(secs => ${longWindowSeconds})
                THEN statement_timestamp()
                ELSE reset_tap_limits.long_started_at
              END,
              long_count = CASE
                WHEN reset_tap_limits.long_started_at <= statement_timestamp() - make_interval(secs => ${longWindowSeconds})
                THEN 1
                ELSE reset_tap_limits.long_count + 1
              END,
              blocked_until = CASE
                WHEN reset_tap_limits.blocked_until > statement_timestamp()
                THEN reset_tap_limits.blocked_until
                WHEN (
                  CASE
                    WHEN reset_tap_limits.long_started_at <= statement_timestamp() - make_interval(secs => ${longWindowSeconds})
                    THEN 1
                    ELSE reset_tap_limits.long_count + 1
                  END
                ) > ${TAP_RATE_LIMITS.longLimit}
                THEN statement_timestamp() + make_interval(secs => ${longCooldownSeconds})
                WHEN (
                  CASE
                    WHEN reset_tap_limits.minute_started_at <= statement_timestamp() - make_interval(secs => ${minuteWindowSeconds})
                    THEN 1
                    ELSE reset_tap_limits.minute_count + 1
                  END
                ) > ${TAP_RATE_LIMITS.minuteLimit}
                THEN statement_timestamp() + make_interval(secs => ${minuteCooldownSeconds})
                WHEN (
                  CASE
                    WHEN reset_tap_limits.burst_started_at <= statement_timestamp() - make_interval(secs => ${burstWindowSeconds})
                    THEN 1
                    ELSE reset_tap_limits.burst_count + 1
                  END
                ) > ${TAP_RATE_LIMITS.burstLimit}
                THEN statement_timestamp() + make_interval(secs => ${burstCooldownSeconds})
                ELSE NULL
              END,
              updated_at = statement_timestamp()
          RETURNING visitor_hash, blocked_until
        ), decision AS (
          SELECT
            visitor_hash,
            (blocked_until IS NULL OR blocked_until <= statement_timestamp()) AS accepted,
            CASE
              WHEN blocked_until > statement_timestamp()
              THEN GREATEST(1, CEIL(EXTRACT(EPOCH FROM (blocked_until - statement_timestamp()))))::integer
              ELSE 0
            END AS retry_after
          FROM guard
        ), personal AS (
          INSERT INTO reset_tappers (visitor_hash, tap_count)
          SELECT visitor_hash, 1
          FROM decision
          WHERE accepted
          ON CONFLICT (visitor_hash) DO UPDATE
          SET tap_count = reset_tappers.tap_count + 1,
              updated_at = now()
          RETURNING tap_count AS my_tap_count
        ), campaign AS (
          UPDATE reset_campaign
          SET tap_count = tap_count + 1, updated_at = now()
          WHERE id = 1
            AND EXISTS (SELECT 1 FROM decision WHERE accepted)
          RETURNING tap_count, starts_at, ends_at
        )
        SELECT
          COALESCE(campaign.tap_count, current_campaign.tap_count) AS tap_count,
          current_campaign.starts_at,
          current_campaign.ends_at,
          COALESCE(personal.my_tap_count, current_personal.tap_count, 0) AS my_tap_count,
          decision.accepted,
          decision.retry_after
        FROM reset_campaign AS current_campaign
        CROSS JOIN decision
        LEFT JOIN campaign ON true
        LEFT JOIN personal ON true
        LEFT JOIN reset_tappers AS current_personal
          ON current_personal.visitor_hash = decision.visitor_hash
        WHERE current_campaign.id = 1
      `;
      return serialize(row);
    },
  };
}
