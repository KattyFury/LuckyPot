import { en } from "./en";

// Vietnamese never inflects nouns for number, so every count-based function
// here ignores its argument - kept as a function anyway so callers don't need
// to know which language they're in. `satisfies typeof en` makes a missing or
// mis-shaped key a compile error instead of a silent fallback to English.
export const vi = {
  common: {
    connectWallet: "Kết nối ví",
    connecting: "Đang kết nối...",
    copyAddress: "Sao chép địa chỉ",
    deposit: "Gửi tiền",
    withdraw: "Rút tiền",
    drawHistory: "Lịch sử quay số",
    myHistory: "Lịch sử của tôi",
    myReferral: "Giới thiệu của tôi",
    disconnect: "Ngắt kết nối",
    confirm: "Xác nhận",
    confirming: "Đang xác nhận...",
    claim: "Nhận thưởng",
    claiming: "Đang nhận...",
    max: "TỐI ĐA",
    latestResult: "Kết quả gần nhất",
    epochWord: "Kỳ",
    amountUsdcLabel: "Số tiền (USDC)",
    walletBalance: "Số dư ví:",
    available: "Có thể rút:",
    you: "Bạn",
    dateLocale: "vi-VN",
    winnerWord: (): string => "người trúng",
    playerWord: (): string => "người chơi",
    depositorWord: (): string => "người gửi",
    drawWord: (): string => "lượt quay",
    winWord: (): string => "lần trúng",
    referralWord: (): string => "lượt giới thiệu",
  },
  epoch: {
    drawIn: "Quay số sau",
    summaryBefore: "Tuần này, tiền thưởng chia cho",
    summaryMiddle: "trong số",
    summaryAfter: ". Người trúng trích lại 5% cho nền tảng.",
  },
  pool: {
    totalTickets: "Tổng vé",
    slashPool: "/ pool",
    myTickets: "Vé của tôi",
    slashDeposit: "/ đã gửi",
    inYourWallet: "Trong ví của bạn:",
    eligibleInfoLabel: "Pool đang thực sự giữ bao nhiêu tiền?",
    myEligibleInfoLabel: "Sao số vé của tôi lại khác số tiền đã gửi?",
    eligibleModalTitle: "Vé là gì?",
    myEligibleModalTitle: "Sao vé không khớp với tiền đã gửi?",
    eligibleBodyPart1:
      "Cứ 1 USD bạn gửi vào và giữ đủ 1 tuần (từ 0h thứ Hai tới 0h thứ Hai tuần sau, giờ UTC) là thành 1 vé, được tính vào lượt quay này. Pool hiện đang giữ",
    eligibleBodyPart2: "tất cả, lúc nào cũng rút được. Nhưng chỉ có",
    eligibleBodyPart3: "là đã nằm đủ lâu để tính vé; tiền mới gửi sẽ tự thành vé vào đúng 0h thứ Hai tuần sau.",
    myEligibleBodyPart1: "Bạn đã gửi",
    myEligibleBodyPart2: ", lúc nào cũng rút được. Nhưng chỉ",
    myEligibleBodyPart3:
      "là đã nằm đủ 1 tuần, nên chỉ phần này được tính vé cho lượt quay này. Phần còn lại sẽ tự thành vé vào tuần sau.",
    tip: "Mẹo: gửi tiền ngay sát giờ quay số thì gần như được tính vé ngay, khỏi phải chờ gần hết cả tuần.",
  },
  dashboard: {
    arcNotLive: "$ARC chưa ra mắt – số bạn đang xem là của pool USDC.",
    hasBeenDrawnSuffix: "đã quay xong —",
    scratchCard: "cào thẻ của bạn",
    referralLead: "Mời bạn bè và nhận 2.5% mỗi khi họ trúng thưởng.",
    getYourLink: "Lấy link mời",
  },
  drawHistory: {
    noDraws: "Chưa có lượt quay nào.",
  },
  myHistory: {
    connectPrompt: "Kết nối ví để xem lịch sử của bạn.",
    noActivity: "Chưa có hoạt động nào.",
    typeLabels: {
      Deposited: "Đã gửi",
      Withdrawn: "Đã rút",
      Won: "Đã trúng",
      Claimed: "Đã nhận",
    } as Record<"Deposited" | "Withdrawn" | "Won" | "Claimed", string>,
  },
  faucet: {
    noUsdcError: "Ví này chưa có USDC – mà USDC chính là loại tiền dùng trả phí gas trên Arc. Bạn cần faucet ít USDC trước, rồi mới bán được.",
    sellFailed: "bán thất bại",
    sellingEurc: "Đang bán EURC...",
    sellingCirbtc: "Đang bán cirBTC...",
    clickToSell: "Bấm vào đây để bán EURC và cirBTC sang USDC",
    lead: "Nếu bạn faucet cả EURC & cirBTC, mình giúp đổi hết sang USDC.",
    tapToFaucet: "Bấm vào đây để faucet.",
  },
  referral: {
    modalTitle: "Mời bạn & Nhận thưởng",
    feeExplanationPart1:
      "Mỗi lần có người trúng thưởng, hệ thống giữ lại 5%: 2.5% để dự phòng rủi ro, 2.5% để duy trì và phát triển dự án. Nhưng nếu bạn mời được bạn bè tham gia, phần 2.5% thứ hai đó sẽ chuyển thẳng vào",
    feeExplanationBold: "ví của bạn",
    feeExplanationPart2: "mỗi khi họ trúng thưởng.",
    connectPrompt: "Kết nối ví để lấy link mời riêng của bạn.",
    unclaimedLabel: "Hoa hồng giới thiệu chưa nhận:",
    totalEarned: "Tổng đã nhận:",
    nobodyYet: "Chưa có ai — chia sẻ link ở trên đi.",
  },
  result: {
    modalTitleSuffix: "kết quả của bạn",
    youWon: "Bạn đã trúng",
    goodLuck: "Chúc may mắn kỳ sau",
    principalSafe: "Tiền gốc của bạn vẫn an toàn, vẫn còn nguyên trong pool.",
    releasePrize: "Đẩy thưởng về ví",
    claimNow: "Nhận ngay",
    pastWindowNote: "Đã qua 3 ngày tự nhận, nhưng tiền thưởng vẫn còn nguyên – bấm nút trên để đẩy nó về ví bạn.",
    alreadyClaimed: "Đã nhận rồi.",
  },
  scratch: {
    prompt: "Cào để xem kết quả",
  },
  epochDetail: {
    eligiblePool: "Số tiền tính vé:",
    weeklyYield: "Lãi tuần này:",
    winners: "Số người trúng:",
    noWinners: "Kỳ này không ai trúng cả – có thể do chưa đủ người chơi, hoặc lãi chưa được bơm vào.",
  },
  deposit: {
    ticketsPreview: "Nếu giữ tiền này trong pool đủ hết kỳ này, bạn sẽ được tính vé:",
  },
  withdraw: {
    forfeitWarning: "Rút tiền bây giờ sẽ mất vé quay số của kỳ này – tiền thì vẫn lấy lại đủ, chỉ mất cơ hội trúng thôi.",
  },
} satisfies typeof en;
