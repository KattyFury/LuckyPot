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
