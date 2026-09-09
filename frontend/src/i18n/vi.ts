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
    summaryBefore: "Phần thưởng tuần này chia cho",
    summaryMiddle: "trong số",
    summaryAfter: ". Người trúng trả lại 5% cho giao thức.",
  },
  pool: {
    totalTickets: "Tổng vé",
    slashPool: "/ pool",
    myTickets: "Vé của tôi",
    slashDeposit: "/ đã gửi",
    inYourWallet: "Trong ví của bạn:",
    eligibleInfoLabel: "Pool thực sự đang giữ bao nhiêu tiền?",
    myEligibleInfoLabel: "Vì sao số vé của tôi khác với số tiền đã gửi?",
    eligibleModalTitle: "Vé là gì?",
    myEligibleModalTitle: "Vì sao vé không khớp với tiền đã gửi?",
    eligibleBodyPart1:
      "“Vé” là mỗi 1 USD đã nằm trong pool trọn 1 kỳ — từ 00:00 UTC thứ Hai tới 00:00 UTC thứ Hai kế tiếp — nên được tính vào lượt quay này. Pool hiện đang giữ thật",
    eligibleBodyPart2: "tổng cộng, lúc nào cũng rút được — nhưng chỉ",
    eligibleBodyPart3:
      "trong số đó đã nằm đủ lâu để được tính; tiền mới gửi sẽ tự chuyển thành vé vào mốc thứ Hai kế tiếp.",
    myEligibleBodyPart1: "Bạn đã gửi",
    myEligibleBodyPart2: ", lúc nào cũng rút được. Chỉ",
    myEligibleBodyPart3:
      "trong số đó đã nằm đủ trọn 1 kỳ, nên chỉ phần đó được tính vé cho lượt quay này — phần còn lại sẽ tự chuyển vào mốc thứ Hai kế tiếp.",
    tip: "Mẹo: gửi tiền ngay trước lúc quay số để tiền bắt đầu tính kỳ mới ngay, thay vì phải chờ hết kỳ hiện tại.",
  },
  dashboard: {
    arcNotLive: "$ARC chưa hoạt động – số liệu đang hiển thị là pool USDC.",
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
    noUsdcError: "Ví này chưa có USDC, mà USDC lại là token trả gas trên Arc — faucet USDC trước rồi mới bán được.",
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
      "Nền tảng thu 5% phí trên mỗi giải thưởng — 2.5% vào quỹ dự trữ, 2.5% dùng để vận hành và phát triển hệ sinh thái. Nhưng nếu bạn mời được người khác, phần 2.5% thứ hai đó sẽ trả thẳng vào",
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
    principalSafe: "Tiền gốc của bạn vẫn an toàn và còn nằm trong pool.",
    releasePrize: "Giải phóng tiền thưởng",
    claimNow: "Nhận ngay",
    pastWindowNote: "Đã qua 3 ngày tự nhận, nhưng tiền thưởng vẫn còn đó — bấm để giải phóng nó về ví bạn.",
    alreadyClaimed: "Đã nhận rồi.",
  },
  scratch: {
    prompt: "Cào để xem kết quả",
  },
  epochDetail: {
    eligiblePool: "Pool hợp lệ:",
    weeklyYield: "Lãi tuần này:",
    winners: "Số người trúng:",
    noWinners: "Kỳ này không có ai trúng – chưa đủ người chơi hoặc chưa bơm đủ lãi.",
  },
  deposit: {
    ticketsPreview: "Số vé bạn sẽ nhận nếu tiền này nằm trong pool trọn từ đầu tới cuối kỳ này:",
  },
  withdraw: {
    forfeitWarning: "Rút tiền bây giờ sẽ loại bạn khỏi lượt quay số của kỳ này.",
  },
} satisfies typeof en;
