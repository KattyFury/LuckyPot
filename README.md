# LuckyPot

A no-loss weekly prize pool on [Arc](https://arc.io). Depositors pool USDC together;
each week the pool's yield (not anyone's principal) is raffled off to a handful of
depositors who kept their funds in for the full week. Nobody who doesn't win loses
anything — principal is withdrawable at any time.

Full product spec: [`arc-prize-pool-spec.md`](./arc-prize-pool-spec.md). Current project status, deployed addresses, and pending setup steps: [`HANDOFF.md`](./HANDOFF.md).

## Structure

- **`contracts/`** — `LuckyStakerPool.sol`, a UUPS-upgradeable Hardhat project (viem +
  Hardhat Ignition). Ticket accounting, commit-reveal weekly draw, tiered prize
  splits, self-serve claim + permissionless sweep after 3 days.
- **`frontend/`** — React + Vite dashboard (wagmi + viem + Privy) matching the
  design system in the spec (Roboto, 15-row grid, green/yellow/gray palette).
- **`automation/`** — Keeper bot scripts (viem) that fund the weekly yield and run
  the commit-reveal draw on a schedule, wired up in
  [`.github/workflows/keeper.yml`](./.github/workflows/keeper.yml).

## Getting started

Each workspace has its own `.env.example` — copy to `.env` and fill in before running.

```bash
# 1. Contracts — compile, test, deploy to Arc Testnet
cd contracts
npm install
npm test
npm run deploy:arcTestnet   # needs DEPLOYER_PRIVATE_KEY, ADMIN_SAFE_ADDRESS in .env

# 2. Frontend
cd ../frontend
npm install
npm run dev                 # needs VITE_PRIVY_APP_ID, VITE_POOL_ADDRESS in .env

# 3. Automation (or let GitHub Actions run it on a cron)
cd ../automation
npm install
npm run fund-yield          # needs KEEPER_PRIVATE_KEY, POOL_ADDRESS in .env
npm run draw
```

## Setup still needed before this goes live

- **Privy app** — create one at [dashboard.privy.io](https://dashboard.privy.io)
  (free tier) and set `VITE_PRIVY_APP_ID`.
- **Admin Safe** — create a 2-of-2 Safe at [app.safe.global](https://app.safe.global)
  on Arc Testnet; its address becomes `ADMIN_SAFE_ADDRESS` (`DEFAULT_ADMIN_ROLE` on
  the pool — controls upgrades and emergency pause).
- **Keeper wallet** — a separate EOA funded with testnet USDC via the
  [Circle faucet](https://faucet.circle.com) (Arc Testnet, 20 USDC/day). Grant it
  `KEEPER_ROLE` after deploy (see `contracts/ignition/modules/LuckyStakerPool.ts`).
- **GitHub Actions secrets** — `KEEPER_PRIVATE_KEY` and `POOL_ADDRESS` on this repo,
  for `.github/workflows/keeper.yml` to run unattended.

## Design notes worth knowing

- **Ticket eligibility**: a deposit only counts toward the draw starting the epoch
  *after* it was made — this is enforced by `pendingBalance` → `eligibleBalance`
  rollover in the contract, not by a timestamp check, since Solidity has no cheap
  way to say "present since exactly epoch start."
- **Randomness**: commit-reveal using a keeper-generated secret + the blockhash at
  reveal time (unknowable at commit time, since commit happens up to 7 days
  earlier). Not Chainlink VRF — Arc's `PREVRANDAO` always returns `0`, and VRF
  availability on Arc isn't confirmed yet.
- **Prize funding**: the contract doesn't compute the yield formula itself — the
  keeper bot computes `max($10, poolBalance × 10% ÷ 52)` off-chain and transfers
  that USDC in via `fundYield`. The contract just holds and distributes whatever
  it's given.
- **MVP scale**: the draw loop iterates all-time participants on-chain (weighted
  random selection + eligibility rollover), which is fine for testnet/hackathon
  scale but would need an off-chain-computed distribution for a large mainnet
  pool.
