# LuckyPot

**[luckypot.cc](https://luckypot.cc)** — a no-loss weekly USDC prize pool on [Arc](https://arc.io).

Deposit USDC, hold it for one week, and you're in the draw. The winner(s) take that
week's yield. Everyone else loses nothing — principal is withdrawable, in full, any time.

## The idea

Someone with a few hundred idle dollars looks at real yield and shrugs: $100 locked up
for a year at 5-6% nets $5-6, not worth the effort of researching a protocol, bridging
funds, and managing the risk. So the money just sits there, doing nothing.

LuckyPot gives that idle money one place to go, with one action — deposit. Principal is
never at risk and withdrawable at any time. In exchange, depositors get a shot at winning
something far bigger than real yield would ever pay, for close to zero effort. Odds are
weighted by what you actually put in, not split evenly across the pool.

This is built for people who **already understand crypto and yield** — not as an onboarding
funnel for people new to it. Lottery tickets sell despite negative expected value; a
no-loss version is a strictly better trade, because the only thing that normally keeps
people out of a raffle (losing the stake) is removed entirely.

## How it works

1. **Deposit USDC** into the pool.
2. **Hold it for a full epoch (7 days)** — that's what makes it a ticket. Withdraw
   mid-week and you forfeit that week's ticket, never your money.
3. **A winner is drawn** at the end of the week — two-layer commit-reveal randomness,
   verifiable on-chain. Nobody, not even the admin, can predict or steer who wins.
4. **Won? Scratch the card to claim.** Didn't win? Withdraw any time, no conditions.
   Unclaimed prizes aren't stuck either — after 3 days, anyone can call `sweep()` to
   push the payout to the winner's wallet automatically.

## Live right now

| | |
|---|---|
| App | [luckypot.cc](https://luckypot.cc) / [luckypot.cc/app](https://luckypot.cc/app) |
| Chain | Arc Testnet, chain ID `5042002` |
| Contract (proxy) | [`0x88dCB2f36356AA8DADdC2e8fb4A3E122Ba9D0Beb`](https://testnet.arcscan.app/address/0x88dCB2f36356AA8DADdC2e8fb4A3E122Ba9D0Beb) |
| Admin | 2-of-2 [Safe multisig](https://app.safe.global/home?safe=arc-testnet:0x0f5514fCA02b639229528a5521dafd0a61bb27ef) |

Real deposits, real draws, real winners — this isn't a static demo. The contract itself
is still named `LuckyStakerPool.sol`, from before the product was renamed to LuckyPot;
it's the same deployed contract, just an old internal filename that outlived the rebrand.

## Mechanics

**Yield.** `aprBps` is an admin-set benchmark (USDC ~6%/year, $ARC ~3%/year — staking is
safer than lending, so it pays less), bounded to a hard band and rate-limited so nobody
can move it right before a draw. Once Arc has a trustworthy on-chain yield source, this
gets replaced by reading a real rate instead of an admin-set one — the `IYieldSource`
interface is already declared for that, just not wired up yet.

```
weeklyPrizePool = eligibleBalance × aprBps / 10000 / 52   // only the full-week slice
realYieldEarned = totalPool      × aprBps / 10000 / 52   // the whole pool, incl. mid-week deposits
surplus         = realYieldEarned − weeklyPrizePool       // → vault, split 50/50
```

Prizes are funded only on `eligibleBalance` — the slice that's actually sat a full week —
not the whole pool, since counting fresh mid-week deposits would inflate the prize for
people who don't have a ticket yet. The yield those fresh deposits still earn is real; it
just isn't split with anyone that week, so it flows into the vault instead.

**Splitting the prize.**

```
numWinners = max(1, floor(sqrt(eligibleBalance / 1000)))
```

One winner takes 100%. More than one: first place takes 50%, the rest splits evenly. No
fixed dollar thresholds — winner count and prize size scale with pool size automatically.

**Referral.** A 5% cut comes out of every prize at claim time. Set a referrer once
(permanent, no self-referral) and their cut accrues for them to withdraw; unreferred, the
cut splits 50/50 into the same vault.

**Vault.** Two internal counters, not external wallets — funds stay inside the contract
until withdrawn, which is what makes the reserve's pause-gate mean anything. `vaultReserve`
is withdrawable only while the contract is paused (reserved for compensating an incident);
`vaultDev` withdraws normally, for ongoing costs.

## What's honest here, and what isn't

- **No loss, ever.** Withdraw your principal any time — there's no lock, no deadline
  that costs you money if you miss it.
- **The draw is verifiable**, not "trust us" — commit-reveal means not even the admin
  knows the outcome at commit time.
- **The yield is not real DeFi.** Arc doesn't have a trustworthy on-chain yield source
  yet, so the pool is funded by hand, following the formula above. That's a fact worth
  stating plainly rather than dressing up as "staking returns."
- **$ARC isn't live.** The USDC/$ARC toggle in the UI is scaffolding for when Arc's own
  token exists; today it's disabled.
- **Not audited, not mainnet.** This runs on Arc Testnet.
- **`forceEndEpoch()`** lets the keeper end an epoch immediately, for fast iteration
  while the product is still changing shape. It doesn't compromise the randomness, but it
  does let the "held a full week" rule be skipped — worth knowing before treating any
  given epoch as representative.
- **Admin is currently a 2-of-2 Safe *plus* one EOA** with equal admin rights, added
  temporarily to keep shipping fast without fighting Safe's UI mid-build. Tightening this
  back to Safe-only is tracked before any real yield goes live — see `HANDOFF.md`.

## Repo structure

- **`contracts/`** — `LuckyStakerPool.sol`, a UUPS-upgradeable Hardhat project (viem +
  Hardhat Ignition). Deposit/withdraw accounting, commit-reveal draw, referral + vault,
  self-serve claim and permissionless sweep after 3 days.
- **`frontend/`** — React + Vite dashboard (wagmi + viem + Privy) at `/app`, plus a static
  landing page at the domain root that reads live pool data straight from the contract.
- **`automation/`** — Keeper bot scripts (viem) that fund the weekly yield and run the
  commit-reveal draw on a schedule, via [`.github/workflows/keeper.yml`](./.github/workflows/keeper.yml).

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
npm run build:site          # builds the app (dist-site/app) + copies the landing page (dist-site/)

# 3. Automation (or let GitHub Actions run it on a cron)
cd ../automation
npm install
npm run fund-yield          # needs KEEPER_PRIVATE_KEY, POOL_ADDRESS in .env
npm run draw
```

## Known limitations

- **Scale**: the draw loop iterates all-time participants on-chain — fine at
  testnet/hackathon scale, but a large pool would need an off-chain-computed distribution.
- **Lost commit secret = that epoch is stuck.** Commit-reveal has no admin escape hatch;
  if the keeper loses the secret it committed, that epoch can never be revealed.
- **No automated faucet.** Circle's public testnet faucet is 10 USDC/24h with no API for
  externally-created wallets, so funding the keeper wallet is still a manual, daily click.

More detail on current deployed state, in-progress work, and design decisions: [`HANDOFF.md`](./HANDOFF.md). Original design spec: [`arc-prize-pool-spec.md`](./arc-prize-pool-spec.md).
