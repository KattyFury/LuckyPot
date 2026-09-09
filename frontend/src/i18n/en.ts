// English strings. This is the canonical shape - vi.ts is typed against it
// (`satisfies typeof en`) so a missing translation is a compile error, not a
// silently-blank label at runtime.
export const en = {
  common: {
    connectWallet: "Connect Wallet",
    connecting: "Connecting...",
    copyAddress: "Copy address",
    deposit: "Deposit",
    withdraw: "Withdraw",
    drawHistory: "Draw history",
    myHistory: "My history",
    myReferral: "My referral",
    disconnect: "Disconnect",
    confirm: "Confirm",
    confirming: "Confirming...",
    claim: "Claim",
    claiming: "Claiming...",
    max: "MAX",
    latestResult: "Latest result",
    epochWord: "Epoch",
    amountUsdcLabel: "Amount (USDC)",
    walletBalance: "Wallet balance:",
    available: "Available:",
    you: "You",
    dateLocale: "en-US",
    winnerWord: (n: number | bigint): string => (Number(n) === 1 ? "winner" : "winners"),
    playerWord: (n: number | bigint): string => (Number(n) === 1 ? "player" : "players"),
    depositorWord: (n: number | bigint): string => (Number(n) === 1 ? "depositor" : "depositors"),
    drawWord: (n: number | bigint): string => (Number(n) === 1 ? "draw" : "draws"),
    winWord: (n: number | bigint): string => (Number(n) === 1 ? "win" : "wins"),
    referralWord: (n: number | bigint): string => (Number(n) === 1 ? "referral" : "referrals"),
  },
  epoch: {
    drawIn: "Draw in",
    summaryBefore: "This week’s yield goes to",
    summaryMiddle: "out of",
    // Deliberately no leading space - it follows playerWord directly, same as
    // the original JSX's `{plural(...)}. Winners return...`.
    summaryAfter: ". Winners return 5% to the protocol.",
  },
  pool: {
    totalTickets: "Total tickets",
    slashPool: "/ pool",
    myTickets: "My tickets",
    slashDeposit: "/ deposit",
    inYourWallet: "In your wallet:",
    eligibleInfoLabel: "How much money does the pool actually hold?",
    myEligibleInfoLabel: "Why is my ticket count different from what I deposited?",
    eligibleModalTitle: "What's a ticket?",
    myEligibleModalTitle: "Why don't my tickets match my deposit?",
    eligibleBodyPart1:
      "“Tickets” is every $1 that sat in the pool through a whole epoch — Monday 00:00 UTC to the next Monday 00:00 UTC — and so counts toward this draw. The pool actually holds",
    eligibleBodyPart2: "in total, always withdrawable — but only",
    eligibleBodyPart3:
      "of that has been in long enough to count; fresh deposits roll into tickets at the next Monday boundary.",
    myEligibleBodyPart1: "You've deposited",
    myEligibleBodyPart2: ", always withdrawable. Only",
    myEligibleBodyPart3:
      "of that sat through a whole epoch, so that's the only part counted as tickets for this draw — the rest rolls in at the next Monday boundary.",
    tip: "Tip: deposit just before a draw, so your money starts a full epoch immediately instead of waiting out the rest of this one.",
  },
  dashboard: {
    arcNotLive: "$ARC isn't live yet – figures are the USDC pool.",
    hasBeenDrawnSuffix: "has been drawn —",
    scratchCard: "scratch your card",
    referralLead: "Invite a friend and earn 2.5% each time they win.",
    getYourLink: "Get your link",
  },
  drawHistory: {
    noDraws: "No draws yet.",
  },
  myHistory: {
    connectPrompt: "Connect your wallet to see your history.",
    noActivity: "No activity yet.",
    typeLabels: {
      Deposited: "Deposited",
      Withdrawn: "Withdrawn",
      Won: "Won",
      Claimed: "Claimed",
    } as Record<"Deposited" | "Withdrawn" | "Won" | "Claimed", string>,
  },
  faucet: {
    noUsdcError: "This wallet has no USDC, and USDC is the gas token on Arc — faucet some first, then sell.",
    sellFailed: "sell failed",
    sellingEurc: "Selling EURC...",
    sellingCirbtc: "Selling cirBTC...",
    clickToSell: "Click here to sell EURC and cirBTC to USDC",
    lead: "If you faucet EURC & cirBTC too, I can help turn them into USDC.",
    tapToFaucet: "Tap here to faucet.",
  },
  referral: {
    modalTitle: "Invite & Earn",
    feeExplanationPart1:
      "The platform takes a 5% fee on every prize won — 2.5% funds the reserve pool, 2.5% goes toward running and growing the ecosystem. Invite a friend, though, and that second 2.5% is paid straight to",
    feeExplanationBold: "your wallet",
    feeExplanationPart2: "instead, every time they win.",
    connectPrompt: "Connect your wallet to get your personal invite link.",
    unclaimedLabel: "Unclaimed referral earnings:",
    totalEarned: "Total earned:",
    nobodyYet: "Nobody yet — share your link above.",
  },
  result: {
    modalTitleSuffix: "your result",
    youWon: "You won",
    goodLuck: "Good luck next epoch",
    principalSafe: "Your principal is safe and still deposited.",
    releasePrize: "Release prize",
    claimNow: "Claim now",
    pastWindowNote: "The 3-day self-claim window passed, but your prize is still there — this releases it.",
    alreadyClaimed: "Already claimed.",
  },
  scratch: {
    prompt: "Scratch to reveal",
  },
  epochDetail: {
    eligiblePool: "Eligible pool:",
    weeklyYield: "Weekly yield:",
    winners: "Winners:",
    noWinners: "No winners this epoch – not enough participants or yield funded yet.",
  },
  deposit: {
    ticketsPreview: "Tickets you'll receive once this sits in the pool from this epoch's start to its end:",
  },
  withdraw: {
    forfeitWarning: "Withdrawing now will remove you from this epoch's ticket draw.",
  },
};
