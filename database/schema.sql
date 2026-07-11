CREATE TABLE IF NOT EXISTS reset_campaign (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  tap_count bigint NOT NULL DEFAULT 0 CHECK (tap_count >= 0),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO reset_campaign (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS reset_tappers (
  visitor_hash char(64) PRIMARY KEY,
  tap_count bigint NOT NULL DEFAULT 0 CHECK (tap_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reset_tap_limits (
  visitor_hash char(64) PRIMARY KEY,
  minute_started_at timestamptz NOT NULL DEFAULT now(),
  minute_count integer NOT NULL DEFAULT 0 CHECK (minute_count >= 0),
  burst_started_at timestamptz NOT NULL DEFAULT now(),
  burst_count integer NOT NULL DEFAULT 0 CHECK (burst_count >= 0),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
