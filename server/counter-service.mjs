import { neon } from "@neondatabase/serverless";

const RESET_TARGET = 10_000_000;

function serialize(row) {
  const tapCount = Number(row.tap_count);
  const myTapCount = Number(row.my_tap_count ?? 0);

  return {
    tapCount,
    myTapCount,
    resetTarget: RESET_TARGET,
    resetsEarned: Math.floor(tapCount / RESET_TARGET),
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: new Date(row.ends_at).toISOString(),
  };
}

export function createCounterService(databaseUrl) {
  if (!databaseUrl) {
    let tapCount = 0;
    const personalTaps = new Map();
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
      async increment(visitorHash) {
        tapCount += 1;
        personalTaps.set(visitorHash, (personalTaps.get(visitorHash) ?? 0) + 1);
        return this.read(visitorHash);
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
      const [row] = await sql`
        WITH personal AS (
          INSERT INTO reset_tappers (visitor_hash, tap_count)
          VALUES (${visitorHash}, 1)
          ON CONFLICT (visitor_hash) DO UPDATE
          SET tap_count = reset_tappers.tap_count + 1,
              updated_at = now()
          RETURNING tap_count AS my_tap_count
        ), campaign AS (
          UPDATE reset_campaign
          SET tap_count = tap_count + 1, updated_at = now()
          WHERE id = 1
          RETURNING tap_count, starts_at, ends_at
        )
        SELECT
          campaign.tap_count,
          campaign.starts_at,
          campaign.ends_at,
          personal.my_tap_count
        FROM campaign
        CROSS JOIN personal
      `;
      return serialize(row);
    },
  };
}
