import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseUnits, encodeFunctionData } from "viem";

const USDC = (n: number) => parseUnits(n.toString(), 6);
const EPOCH = 7n * 24n * 60n * 60n;
const SWEEP_DELAY = 3n * 24n * 60n * 60n;

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

    await advanceEpochWithDraw(pool, keeper, USDC(10));

    // Now in epoch 2: alice's original deposit has rolled into eligibleBalance.
    expect(await pool.read.eligibleBalance([alice.account.address])).to.equal(USDC(1000));
  });

  it("forfeits the current epoch's ticket on any withdrawal", async () => {
    const { pool, alice, keeper } = await deployFixture();
    const alicePool = await poolAs(pool, alice);
    await alicePool.write.deposit([USDC(1000)]);
    await advanceEpochWithDraw(pool, keeper, USDC(0));

    expect(await pool.read.eligibleBalance([alice.account.address])).to.equal(USDC(1000));
    await alicePool.write.withdraw([USDC(1)]);
    expect(await pool.read.eligibleBalance([alice.account.address])).to.equal(0n);
    expect(await pool.read.pendingBalance([alice.account.address])).to.equal(USDC(999));
  });

  it("runs a full commit-reveal draw and pays the single winner 100%", async () => {
    const { pool, usdc, alice, keeper } = await deployFixture();
    const alicePool = await poolAs(pool, alice);
    await alicePool.write.deposit([USDC(1000)]);
    await advanceEpochWithDraw(pool, keeper, USDC(0)); // roll alice into eligible

    const keeperPool = await poolAs(pool, keeper);
    await keeperPool.write.fundYield([USDC(10)]);
    await drawEpoch(pool, keeper);

    const epoch = await pool.read.getEpoch([2n]);
    expect(epoch[6]).to.equal(1n); // numWinners
    expect(getAddress(epoch[9][0])).to.equal(getAddress(alice.account.address));

    const before = await usdc.read.balanceOf([alice.account.address]);
    await alicePool.write.claim([2n]);
    const after = await usdc.read.balanceOf([alice.account.address]);
    expect(after - before).to.equal(USDC(10));
  });

  it("splits the prize 50/50 across the remaining winners for numWinners in 2-5", async () => {
    expect(await deployFixture().then(({ pool }) => pool.read.prizeForRank([0n, 3n, USDC(100)]))).to.equal(USDC(50));
    const { pool } = await deployFixture();
    expect(await pool.read.prizeForRank([1n, 3n, USDC(100)])).to.equal(USDC(25));
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
    await advanceEpochWithDraw(pool, keeper, USDC(0));

    const keeperPool = await poolAs(pool, keeper);
    await keeperPool.write.fundYield([USDC(10)]);
    await drawEpoch(pool, keeper);

    await hre.network.provider.send("evm_increaseTime", [Number(SWEEP_DELAY) + 1]);
    await hre.network.provider.send("evm_mine");

    const before = await usdc.read.balanceOf([alice.account.address]);
    const bobPool = await poolAs(pool, bob);
    await bobPool.write.sweep([2n]); // bob, not alice, triggers the payout
    const after = await usdc.read.balanceOf([alice.account.address]);
    expect(after - before).to.equal(USDC(10));
  });
});

async function hashSecret(secret: bigint) {
  const { keccak256, encodePacked } = await import("viem");
  return keccak256(encodePacked(["uint256"], [secret]));
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
