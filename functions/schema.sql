-- D1 schema for luckypot-history. Populated by automation/src/indexHistory.ts
-- (runs on the keeper's existing 6-hour GitHub Actions schedule) and read by
-- functions/api/history.js. Addresses are stored lowercase throughout so
-- lookups don't need a case-insensitive comparison.
CREATE TABLE IF NOT EXISTS history (
  wallet TEXT NOT NULL,
  type TEXT NOT NULL,          -- 'Deposited' | 'Withdrawn' | 'Won'
  amount TEXT NOT NULL,        -- base units (6 decimals), as a string - too big for a JS/SQLite number
  block_number TEXT NOT NULL,  -- string for the same reason
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  PRIMARY KEY (tx_hash, log_index)
);
CREATE INDEX IF NOT EXISTS idx_history_wallet ON history (wallet);

-- Single-row table tracking how far the indexer has scanned, so each run
-- only fetches logs since the last one instead of the whole chain.
CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_block TEXT NOT NULL
);

-- Who referred whom. One row per wallet - the contract's setReferrer() can
-- only ever be called once per address, so `referred` is a safe primary key.
CREATE TABLE IF NOT EXISTS referrals (
  referred TEXT PRIMARY KEY,
  referrer TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer);

-- One row per ReferralPaid/ReferralAccrued event. `referred` is filled in by
-- pairing each event with the Claimed/Swept event it fired alongside in the
-- same transaction (see automation/src/indexHistory.ts) - it's the winner
-- whose prize generated this cut, not stored directly by the contract event.
CREATE TABLE IF NOT EXISTS referral_earnings (
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  referrer TEXT NOT NULL,
  referred TEXT,
  amount TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  PRIMARY KEY (tx_hash, log_index)
);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer ON referral_earnings (referrer);
