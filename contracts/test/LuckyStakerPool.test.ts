import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseUnits, encodeFunctionData } from "viem";

const USDC = (n: number) => parseUnits(n.toString(), 6);
const EPOCH = 7n * 24n * 60n * 60n;
const SWEEP_DELAY = 3n * 24n * 60n * 60n;
const APR_USDC = 600n; // 6%/year, within the 400-800 band
const APR_ARC = 300n; // 3%/year, within the 200-400 band

// weeklyPrizePool = eligibleTotal * aprBps / 10000 / 52, matching the contract's formula exactly.
function weeklyPrizePool(eligibleTotal: bigint, aprBps = APR_USDC): bigint {
  return (eligibleTotal * aprBps) / 10000n / 52n;
}

async function deployFixture() {
  const [admin, keeper, alice, bob, carol] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  const usdc = await hre.viem.deployContract("MockUSDC");
  const implementation = await hre.viem.deployContract("LuckyStakerPool");

  const initData = encodeFunctionData({
    abi: implementation.abi,
    functionName: "initialize",
    args: [usdc.address, getAddress(admin.account.address), getAddress(keeper.account.address)],
  });

  const proxy = await hre.viem.deployContract("ERC1967Proxy", [implementation.address, initData]);
  const pool = await hre.viem.getContractAt("LuckyStakerPool", proxy.address);

  // Simulates the multisig's upgrade transaction: same proxy, v2 state initialized.
  // referenceUSDC is set to the mock token's own address so currentAprBps() exercises
  // the USDC branch here, matching how it resolves in production against the real token.
  const adminPool = await poolAs(pool, admin);
  await adminPool.write.initializeV2([APR_USDC, APR_ARC, usdc.address]);

  for (const user of [alice, bob, carol]) {
    await usdc.write.mint([user.account.address, USDC(10_000)]);
    const userUsdc = await hre.viem.getContractAt("MockUSDC", usdc.address, { client: { wallet: user } });
    await userUsdc.write.approve([pool.address, USDC(10_000)]);
  }
  await usdc.write.mint([keeper.account.address, USDC(10_000)]);
  const keeperUsdc = await hre.viem.getContractAt("MockUSDC", usdc.address, { client: { wallet: keeper } });
  await keeperUsdc.write.approve([pool.address, USDC(10_000)]);

  return { admin, keeper, alice, bob, carol, usdc, pool, publicClient };
}

function poolAs(pool: any, wallet: any) {
  return hre.viem.getContractAt("LuckyStakerPool", pool.address, { client: { wallet } });
}

describe("LuckyStakerPool", () => {
  it("accepts deposits and tracks withdrawable principal immediately", async () => {
    const { pool, alice } = await deployFixture();
    const alicePool = await poolAs(pool, alice);

    await alicePool.write.deposit([USDC(100)]);
    expect(await pool.read.balances([alice.account.address])).to.equal(USDC(100));
    // Fresh deposit is not yet eligible for the epoch in progress.
    expect(await pool.read.eligibleBalance([alice.account.address])).to.equal(0n);

    await alicePool.write.withdraw([USDC(40)]);
    expect(await pool.read.balances([alice.account.address])).to.equal(USDC(60));
  });

  it("makes a deposit eligible starting the epoch after it was made", async () => {
    const { pool, alice, keeper } = await deployFixture();
    const alicePool = await poolAs(pool, alice);
    await alicePool.write.deposit([USDC(1000)]);
    expect(await pool.read.eligibleBalance([alice.account.address])).to.equal(0n);

    await advanceEpochWithDraw(pool, keeper, 0n);

    // Now in epoch 2: alice's original deposit has rolled into eligibleBalance.
    expect(await pool.read.eligibleBalance([alice.account.address])).to.equal(USDC(1000));
  });

  it("forfeits the current epoch's ticket on any withdrawal", async () => {
    const { pool, alice, keeper } = await deployFixture();
    const alicePool = await poolAs(pool, alice);
    await alicePool.write.deposit([USDC(1000)]);
    await advanceEpochWithDraw(pool, keeper, 0n);

    expect(await pool.read.eligibleBalance([alice.account.address])).to.equal(USDC(1000));
    await alicePool.write.withdraw([USDC(1)]);
    expect(await pool.read.eligibleBalance([alice.account.address])).to.equal(0n);
    expect(await pool.read.pendingBalance([alice.account.address])).to.equal(USDC(999));
  });

  it("resolves currentAprBps by comparing poolToken to referenceUSDC", async () => {
    const { pool } = await deployFixture();
    // Fixture points referenceUSDC at the pool token itself, so the USDC branch applies.
    expect(await pool.read.currentAprBps()).to.equal(APR_USDC);
  });

  it("falls back to the ARC benchmark when the pool token isn't referenceUSDC", async () => {
    const [admin, keeper, someOtherAddress] = await hre.viem.getWalletClients();
    const usdc = await hre.viem.deployContract("MockUSDC");
    const implementation = await hre.viem.deployContract("LuckyStakerPool");
    const initData = encodeFunctionData({
      abi: implementation.abi,
      functionName: "initialize",
      args: [usdc.address, getAddress(admin.account.address), getAddress(keeper.account.address)],
    });
    const proxy = await hre.viem.deployContract("ERC1967Proxy", [implementation.address, initData]);
    const pool = await hre.viem.getContractAt("LuckyStakerPool", proxy.address);
    const adminPool = await poolAs(pool, admin);

    // referenceUSDC points at a DIFFERENT address than the pool's actual token, so
    // currentAprBps() must resolve through the ARC branch instead.
    await adminPool.write.initializeV2([APR_USDC, APR_ARC, getAddress(someOtherAddress.account.address)]);
    expect(await pool.read.currentAprBps()).to.equal(APR_ARC);
  });

  it("computes weeklyPrizePool only on the eligible (full-epoch) balance, funds it from pendingYield, and routes the rest to the vault", async () => {
    const { pool, usdc, alice, keeper } = await deployFixture();
    const alicePool = await poolAs(pool, alice);
    await alicePool.write.deposit([USDC(1000)]);
    await advanceEpochWithDraw(pool, keeper, 0n); // roll alice into eligible, no yield funded this cycle

    const expectedPrize = weeklyPrizePool(USDC(1000)); // 1000e6 * 600 / 10000 / 52
    const keeperPool = await poolAs(pool, keeper);
    const funded = expectedPrize + USDC(5); // fund more than the prize pool; the excess is surplus
    await keeperPool.write.fundYield([funded]);
    await drawEpoch(pool, keeper);

    const epoch = await pool.read.getEpoch([2n]);
    expect(epoch[5]).to.equal(expectedPrize); // weeklyYield field = weeklyPrizePool
    expect(epoch[6]).to.equal(1n); // numWinners
    expect(getAddress(epoch[9][0])).to.equal(getAddress(alice.account.address));

    const surplus = funded - expectedPrize;
    const half = surplus / 2n;
    expect(await pool.read.vaultReserve()).to.equal(half);
    expect(await pool.read.vaultDev()).to.equal(surplus - half);

    const cut = (expectedPrize * 500n) / 10000n;
    const netPrize = expectedPrize - cut;
    const before = await usdc.read.balanceOf([alice.account.address]);
    await alicePool.write.claim([2n]);
    const after = await usdc.read.balanceOf([alice.account.address]);
    expect(after - before).to.equal(netPrize);

    // Unreferred winner: the 5% cut on the prize itself also splits 50/50 into the vault,
    // on top of the surplus already routed at draw time.
    const cutHalf = cut / 2n;
    expect(await pool.read.vaultReserve()).to.equal(half + cutHalf);
    expect(await pool.read.vaultDev()).to.equal(surplus - half + (cut - cutHalf));
  });

  it("reverts the draw if the keeper funded less than the epoch's weeklyPrizePool", async () => {
    const { pool, alice, keeper } = await deployFixture();
    const alicePool = await poolAs(pool, alice);
    await alicePool.write.deposit([USDC(1000)]);
    await advanceEpochWithDraw(pool, keeper, 0n);

    const expectedPrize = weeklyPrizePool(USDC(1000));
    const keeperPool = await poolAs(pool, keeper);
    await keeperPool.write.fundYield([expectedPrize - 1n]); // one unit short
    const secret = 7n;
    await keeperPool.write.commitRandom([await hashSecret(secret)]);
    await hre.network.provider.send("evm_increaseTime", [Number(EPOCH)]);
    await hre.network.provider.send("evm_mine");
    await expect(keeperPool.write.revealAndDraw([secret])).to.be.rejectedWith("yield not funded");
  });

  it("pays a referrer's 5% cut on claim, once per prize, and lets them withdraw it", async () => {
    const { pool, usdc, alice, bob, keeper } = await deployFixture();
    const alicePool = await poolAs(pool, alice);
    const bobPool = await poolAs(pool, bob);

    await alicePool.write.setReferrer([bob.account.address]);
    await expect(alicePool.write.setReferrer([bob.account.address])).to.be.rejectedWith("referrer already set");

    await alicePool.write.deposit([USDC(1000)]);
    await advanceEpochWithDraw(pool, keeper, 0n);

    const expectedPrize = weeklyPrizePool(USDC(1000));
    const keeperPool = await poolAs(pool, keeper);
    await keeperPool.write.fundYield([expectedPrize]);
    await drawEpoch(pool, keeper);

    await alicePool.write.claim([2n]);
    const cut = (expectedPrize * 500n) / 10000n;
    expect(await pool.read.pendingRef([bob.account.address])).to.equal(cut);

    const before = await usdc.read.balanceOf([bob.account.address]);
    await bobPool.write.claimReferral();
    const after = await usdc.read.balanceOf([bob.account.address]);
    expect(after - before).to.equal(cut);
    expect(await pool.read.pendingRef([bob.account.address])).to.equal(0n);
  });

  it("rejects self-referral", async () => {
    const { pool, alice } = await deployFixture();
    const alicePool = await poolAs(pool, alice);
    await expect(alicePool.write.setReferrer([alice.account.address])).to.be.rejectedWith("no self-referral");
  });

  it("scales numWinners continuously via sqrt(eligibleBalance / $1000), splitting 50/50 above 1 winner", async () => {
    const { pool, alice, bob, carol, keeper } = await deployFixture();
    // $100,000 total eligible -> sqrt(100000/1000) = sqrt(100) = 10 winners.
    for (const [user, amount] of [
      [alice, 40_000],
      [bob, 40_000],
      [carol, 20_000],
    ] as const) {
      const p = await poolAs(pool, user);
      await usdcMintAndApprove(pool, user, amount);
      await p.write.deposit([USDC(amount)]);
    }
    await advanceEpochWithDraw(pool, keeper, 0n);

    const eligibleTotal = USDC(100_000);
    const expectedPrize = weeklyPrizePool(eligibleTotal);
    const keeperPool = await poolAs(pool, keeper);
    await keeperPool.write.fundYield([expectedPrize]);
    await drawEpoch(pool, keeper);

    const epoch = await pool.read.getEpoch([2n]);
    expect(epoch[6]).to.equal(10n); // numWinners

    const jackpot = await pool.read.prizeForRank([0n, 10n, expectedPrize]);
    const secondary = await pool.read.prizeForRank([1n, 10n, expectedPrize]);
    expect(jackpot).to.equal(expectedPrize / 2n);
    expect(secondary).to.equal((expectedPrize - jackpot) / 9n);
  });

  it("blocks new deposits when paused but always allows withdrawals", async () => {
    const { pool, admin, alice } = await deployFixture();
    const alicePool = await poolAs(pool, alice);
    await alicePool.write.deposit([USDC(100)]);

    const adminPool = await poolAs(pool, admin);
    await adminPool.write.pause();

    await expect(alicePool.write.deposit([USDC(1)])).to.be.rejected;
    await alicePool.write.withdraw([USDC(100)]); // must not revert
  });

  it("lets the keeper force-end an epoch early for fast testnet iteration", async () => {
    const { pool, keeper } = await deployFixture();
    const keeperPool = await poolAs(pool, keeper);

    await expect(keeperPool.write.forceEndEpoch()).to.be.rejected; // must commit first

    const secret = 42n;
    await keeperPool.write.commitRandom([await hashSecret(secret)]);
    await keeperPool.write.forceEndEpoch();
    await keeperPool.write.revealAndDraw([secret]); // succeeds immediately, no time travel needed

    expect((await pool.read.getEpoch([1n]))[8]).to.equal(true); // drawn
  });

  it("lets anyone sweep unclaimed prizes after the 3-day window", async () => {
    const { pool, usdc, alice, keeper, bob } = await deployFixture();
    const alicePool = await poolAs(pool, alice);
    await alicePool.write.deposit([USDC(1000)]);
    await advanceEpochWithDraw(pool, keeper, 0n);

    const expectedPrize = weeklyPrizePool(USDC(1000));
    const keeperPool = await poolAs(pool, keeper);
    await keeperPool.write.fundYield([expectedPrize]);
    await drawEpoch(pool, keeper);

    await hre.network.provider.send("evm_increaseTime", [Number(SWEEP_DELAY) + 1]);
    await hre.network.provider.send("evm_mine");

    const cut = (expectedPrize * 500n) / 10000n;
    const before = await usdc.read.balanceOf([alice.account.address]);
    const bobPool = await poolAs(pool, bob);
    await bobPool.write.sweep([2n]); // bob, not alice, triggers the payout
    const after = await usdc.read.balanceOf([alice.account.address]);
    expect(after - before).to.equal(expectedPrize - cut);
  });

  it("only lets the admin change aprBps within its band, and rate-limits changes", async () => {
    const { pool, admin } = await deployFixture();
    const adminPool = await poolAs(pool, admin);

    await expect(adminPool.write.setAprBpsUSDC([399n])).to.be.rejectedWith("out of band");
    await expect(adminPool.write.setAprBpsUSDC([801n])).to.be.rejectedWith("out of band");
    await adminPool.write.setAprBpsUSDC([700n]);
    expect(await pool.read.aprBpsUSDC()).to.equal(700n);
    await expect(adminPool.write.setAprBpsUSDC([650n])).to.be.rejectedWith("rate limited");

    await expect(adminPool.write.setAprBpsARC([199n])).to.be.rejectedWith("out of band");
    await expect(adminPool.write.setAprBpsARC([401n])).to.be.rejectedWith("out of band");
    await adminPool.write.setAprBpsARC([350n]);
    expect(await pool.read.aprBpsARC()).to.equal(350n);
  });

  it("lets the multisig withdraw reserve only while paused, and dev funds anytime, capped by the accrued balance", async () => {
    const { pool, usdc, admin, alice, keeper } = await deployFixture();
    const alicePool = await poolAs(pool, alice);
    await alicePool.write.deposit([USDC(1000)]);
    await advanceEpochWithDraw(pool, keeper, 0n);

    const expectedPrize = weeklyPrizePool(USDC(1000));
    const funded = expectedPrize + USDC(2); // small surplus to seed the vault
    const keeperPool = await poolAs(pool, keeper);
    await keeperPool.write.fundYield([funded]);
    await drawEpoch(pool, keeper);

    const adminPool = await poolAs(pool, admin);
    const reserve = await pool.read.vaultReserve();
    const dev = await pool.read.vaultDev();

    // Reserve is locked while unpaused.
    await expect(
      adminPool.write.withdrawReserve([reserve, admin.account.address, "test"]),
    ).to.be.rejected;

    // Dev funds move freely, but can't exceed the accrued balance.
    await expect(adminPool.write.withdrawDev([dev + 1n, admin.account.address])).to.be.rejectedWith(
      "insufficient dev balance",
    );
    const before = await usdc.read.balanceOf([admin.account.address]);
    await adminPool.write.withdrawDev([dev, admin.account.address]);
    const after = await usdc.read.balanceOf([admin.account.address]);
    expect(after - before).to.equal(dev);

    await adminPool.write.pause();
    await adminPool.write.withdrawReserve([reserve, admin.account.address, "incident payout"]);
    expect(await pool.read.vaultReserve()).to.equal(0n);
  });

  it("anchors epoch boundaries to Monday 00:00 UTC, self-correcting on the first draw after deploy", async () => {
    const { pool, keeper } = await deployFixture();
    const keeperPool = await poolAs(pool, keeper);

    // Fixture's epoch 1 was NOT Monday-aligned (started at fixture deploy time),
    // so this first draw is the "transition" — its result should still land
    // exactly on the next Monday, proving the self-correction.
    const secret1 = 111n;
    await keeperPool.write.commitRandom([await hashSecret(secret1)]);
    await keeperPool.write.forceEndEpoch();
    await keeperPool.write.revealAndDraw([secret1]);

    const epoch2 = await pool.read.getEpoch([2n]);
    const endTime1 = Number(epoch2[1]);
    const end1 = new Date(endTime1 * 1000);
    expect(end1.getUTCDay()).to.equal(1); // Monday
    expect(end1.getUTCHours()).to.equal(0);
    expect(end1.getUTCMinutes()).to.equal(0);
    expect(end1.getUTCSeconds()).to.equal(0);

    // Second draw, now already Monday-aligned: next boundary must be exactly
    // 7 days later, still a Monday — proving the steady state holds forever.
    // Uses real time travel to the actual scheduled endTime rather than
    // forceEndEpoch(), since forceEndEpoch overwrites endTime to "now" —
    // fine for skipping the wait, but it would clobber the real Monday
    // schedule this test is trying to verify.
    const secret2 = 222n;
    await keeperPool.write.commitRandom([await hashSecret(secret2)]);
    await hre.network.provider.send("evm_setNextBlockTimestamp", [endTime1]);
    await hre.network.provider.send("evm_mine");
    await keeperPool.write.revealAndDraw([secret2]);

    const epoch3 = await pool.read.getEpoch([3n]);
    const endTime2 = Number(epoch3[1]);
    expect(endTime2 - endTime1).to.equal(7 * 24 * 60 * 60);
    const end2 = new Date(endTime2 * 1000);
    expect(end2.getUTCDay()).to.equal(1);
  });
});

async function hashSecret(secret: bigint) {
  const { keccak256, encodePacked } = await import("viem");
  return keccak256(encodePacked(["uint256"], [secret]));
}

async function usdcMintAndApprove(pool: any, user: any, amount: number) {
  const usdcAddress = await pool.read.poolToken();
  const usdc = await hre.viem.getContractAt("MockUSDC", usdcAddress as `0x${string}`);
  await usdc.write.mint([user.account.address, USDC(amount)]);
  const userUsdc = await hre.viem.getContractAt("MockUSDC", usdcAddress as `0x${string}`, { client: { wallet: user } });
  await userUsdc.write.approve([pool.address, USDC(amount)]);
}

async function advanceEpochWithDraw(pool: any, keeper: any, yieldAmount: bigint) {
  const keeperPool = await poolAs(pool, keeper);
  if (yieldAmount > 0n) await keeperPool.write.fundYield([yieldAmount]);
  const secret = BigInt(Math.floor(Math.random() * 1e9) + 1);
  await keeperPool.write.commitRandom([await hashSecret(secret)]);
  await hre.network.provider.send("evm_increaseTime", [Number(EPOCH)]);
  await hre.network.provider.send("evm_mine");
  await keeperPool.write.revealAndDraw([secret]);
}

async function drawEpoch(pool: any, keeper: any) {
  const keeperPool = await poolAs(pool, keeper);
  const secret = BigInt(Math.floor(Math.random() * 1e9) + 1);
  await keeperPool.write.commitRandom([await hashSecret(secret)]);
  await hre.network.provider.send("evm_increaseTime", [Number(EPOCH)]);
  await hre.network.provider.send("evm_mine");
  await keeperPool.write.revealAndDraw([secret]);
}
