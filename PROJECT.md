# LuckyStaker – mô tả dự án (bản as-built)

> Tài liệu này mô tả **những gì đã build và đang chạy thật**, để dùng làm nguyên
> liệu thảo luận core belief, viết landing page và trang GitHub.
>
> Phân biệt với 2 file còn lại: [`arc-prize-pool-spec.md`](./arc-prize-pool-spec.md)
> là spec thiết kế lúc chưa build (Bước 1–4), [`HANDOFF.md`](./HANDOFF.md) là
> trạng thái làm việc cho phiên sau. File này là bản chốt "sản phẩm là gì".

**Link:** https://luckystaker.pages.dev · **Repo:** https://github.com/KattyFury/LuckyStaker

---

## 1. Một câu

Xổ số không mất gốc trên Arc: gửi USDC vào pool, mỗi tuần một người may mắn
lấy trọn phần lãi của cả pool, còn ai không trúng vẫn rút lại đủ 100% tiền gốc
bất cứ lúc nào.

## 2. Core belief (nền tảng mọi quyết định)

Từ spec mục 2, và đây là chỗ cần bàn kỹ nhất:

> **Rủi ro mất tiền là thứ duy nhất ngăn người ta chơi trò may rủi.** Bỏ rủi ro
> đó đi mà vẫn giữ cảm giác hồi hộp và phần thưởng lớn, người ta sẽ hành động
> nhiều hơn hẳn so với một con số lãi suất cố định vô cảm.

Hai suy luận đi kèm, đều đã được chốt trong spec:

- **Yêu cầu quan trọng nhất là VUI, không phải tối ưu lợi nhuận.** Trải nghiệm
  hồi hộp / cào thẻ mới là sản phẩm; lãi suất chỉ là nhiên liệu.
- **"Cơ hội là free."** Vì gốc không mất, chi phí tham gia thực sự bằng 0 (chỉ
  mất phần lãi lẽ ra được chia). Nên phần thưởng phải **đủ đậm để đáng nhớ** —
  giữ jackpot lớn thay vì chia vụn thành nhiều giải nhỏ.

## 3. Cho ai

Người **đã hiểu crypto**, quen khái niệm staking/yield. Không phải người mới.
Căn cứ có thật (không phải phỏng đoán): vé số luôn có người mua dù kỳ vọng âm —
bản không-mất-gốc còn hấp dẫn hơn vé số thật vì loại bỏ hẳn rủi ro mất tiền.

## 4. Cơ chế (đúng như code đang chạy)

### Vé
- **1 USDC = 1 vé**, tính theo trọng số tiền gửi. Gửi 690/755 USDC trong pool
  thì xác suất trúng 91.4%.
- **Điều kiện hợp lệ: phải giữ tiền trong pool trọn một kỳ.** Tiền vừa gửi nằm ở
  `pendingBalance`, chỉ chuyển thành `eligibleBalance` khi kỳ hiện tại kết thúc.
- **Rút bất kỳ lúc nào trong kỳ = mất vé kỳ đó** (kể cả rút một phần), nhưng
  **không bao giờ mất tiền** — gốc rút được mọi lúc, không khoá dưới mọi hình thức.

### Chu kỳ & quay số
- Kỳ (epoch) dài **7 ngày**.
- **Randomness bằng commit-reveal 2 lớp**, không phải VRF: bot commit
  `hash(số bí mật)` lên contract từ đầu kỳ, cuối kỳ mới reveal số gốc, contract
  trộn với `blockhash` của block trước đó để ra kết quả. Lúc commit thì blockhash
  tương lai chưa tồn tại nên **không ai đoán trước được, kể cả bot hay admin**.
- ⚠️ Lý do không dùng `PREVRANDAO`: Arc docs xác nhận nó **luôn trả về 0**, dùng
  là lộ kết quả.

### Số người trúng & chia thưởng
```
numWinners = max(1, min(số người tham gia / 10, quỹ thưởng / $10))
```
| numWinners | Giải nhất | Phần còn lại |
|---|---|---|
| 1 | 100% | – |
| 2–5 | 50% | 50% chia đều cho (N−1) giải |
| 6–10 | 33% | 67% chia đều cho (N−1) giải |

Ở quy mô hiện tại (3 người, quỹ $10/tuần) → luôn ra **đúng 1 người trúng trọn $10**.

### Nhận thưởng
- Kết quả **chốt on-chain ngay khi quay**, không tự động chuyển vào ví.
- Người trúng vào **cào thẻ** để lộ kết quả rồi bấm Claim → tiền về ví. Cào **chỉ
  1 lần duy nhất** cho mỗi kỳ, lần sau mở lại hiện thẳng kết quả.
- Không cào trong **3 ngày** → **bất kỳ ai** cũng gọi được hàm `sweep()` để đẩy
  tiền về ví người trúng. Không cần tin admin, không cần Chainlink Automation.
- **Không bao giờ có hạn chót làm mất thưởng** — quá hạn chỉ mất hiệu ứng cào,
  không mất tiền.

### Quản trị
- **Admin là Safe 2-of-2 multisig**, không phải ví đơn.
- Contract **upgradable (UUPS proxy)** — chấp nhận được *chỉ vì* admin là
  multisig; nếu admin là 1 ví đơn thì tổ hợp này là rủi ro rug-pull toàn phần.
- **Pause loại 2:** chỉ chặn gửi tiền/quay số mới, **KHÔNG bao giờ khoá rút gốc**.
  Không tồn tại nút "khoá toàn bộ".
- Chống reentrancy chuẩn OpenZeppelin, đánh dấu đã claim **trước** khi chuyển tiền.

## 5. Khác gì PoolTogether

PoolTogether làm mô hình pool + xổ số từ 2019 nhưng **phụ thuộc Aave/Compound**
để sinh lãi. Bản này thiết kế **Arc-native**: không cần lending protocol bên
ngoài, và pool token là **biến có thể đổi** nên khi Arc bật staking thật thì chỉ
đổi địa chỉ token, không viết lại phần lõi.

## 6. Ranh giới trung thực – được nói gì và KHÔNG được nói gì

Phần này quan trọng cho landing page: **đừng để copy nói quá sự thật.**

**ĐƯỢC nói:**
- Không mất gốc, rút bất cứ lúc nào, không khoá.
- Quay số verify được on-chain, admin không chọn được người trúng.
- Không phí ẩn.
- Nhận thưởng không cần tin admin (sweep permissionless).
- Chạy thật trên Arc Testnet, đã có kỳ quay thật với người trúng thật.

**KHÔNG được nói:**
- ❌ *"Lãi từ DeFi"* — Arc chưa có DeFi/staking thật cho cá nhân. Nguồn lãi hiện
  tại là **ví bot bơm USDC thật vào theo công thức sống**
  `max($10, pool × 10%/năm ÷ 52)`. Số tiền tính theo công thức, nhưng **người
  bơm là mình**, không phải protocol.
- ❌ *"Staking $ARC"* — $ARC **chưa tồn tại**. Whitepaper đã công bố (11/5/2026,
  cung 10B, presale $222M) nhưng **TGE chưa có ngày**, PoS transition "không có
  timeline cố định". Toggle `USDC | $ARC` trên UI là chỗ dành sẵn cho tương lai;
  khi bật $ARC, app tự hiện dòng cảnh báo là số liệu vẫn là pool USDC.
- ❌ *"Lãi suất X%"* — không cam kết lãi suất cố định, đang là yield mô phỏng.
- ❌ *"Đã audit"* / *"Mainnet"* — chưa, đang testnet.
- ⚠️ **`forceEndEpoch()`** — có một hàm cho phép ví bot kết thúc kỳ ngay lập tức
  để test. Nó không phá tính công bằng của random, nhưng **cho phép bỏ qua luật
  "giữ đủ 1 tuần"**. Phải thu quyền này (hoặc bỏ hàm) trước khi mở cho người
  ngoài gửi tiền thật.

## 7. Giới hạn kỹ thuật đã biết

- **Quy mô:** vòng quay lặp qua toàn bộ người tham gia on-chain — ổn ở quy mô
  testnet/hackathon, nhưng pool lớn thì phải tính phân phối off-chain.
- **Mất secret = kỳ đó đứng vĩnh viễn.** Commit-reveal không có đường thoát cho
  admin; nếu bot mất số bí mật đã commit thì kỳ đó không bao giờ reveal được.
  Hiện secret nằm trong cache của GitHub Actions.
- **Faucet không tự động được.** Public faucet của Circle cho 10 USDC/24h và
  **không có API** (endpoint `/v1/faucet/drips` yêu cầu nâng cấp mainnet, console
  faucet chỉ phục vụ ví tạo bằng nền tảng Circle). Nên nạp tiền cho ví bot vẫn
  phải bấm tay mỗi ngày.
- **Luật vé nhị phân** ("đủ 1 tuần hay không") đơn giản hơn TWAB của PoolTogether,
  nhưng chủ động chừa một khoảng chênh: tiền đã vào pool mà chưa được tính vé kỳ
  đó. Spec ghi nhận đây **có thể là nguồn lợi nhuận cho founder sau này**.

## 8. Hiện trạng (2026-08-23)

| | |
|---|---|
| Web | https://luckystaker.pages.dev (Cloudflare Pages) |
| Chain | Arc Testnet, chainId `5042002` |
| Contract (proxy) | `0x88dCB2f36356AA8DADdC2e8fb4A3E122Ba9D0Beb` |
| Admin Safe 2-of-2 | `0x0f5514fCA02b639229528a5521dafd0a61bb27ef` |
| Ví bot (keeper) | `0x4672A3B3C14727629107711D9853B52e8E1E26B1` |
| Pool | ~685 USDC / 3 người gửi |
| Test contract | 8/8 pass |

**Đã chứng minh chạy thật, không phải "chắc là được":**
- **Epoch 4 đã quay thật:** 755 USDC / 3 người, quỹ thưởng 10 USDC,
  **1 người trúng** (`0xb0ea48…A12E`, giữ 690/755 vé → xác suất 91.4%), đã claim.
- **Epoch 3 ra 0 người trúng** — đúng luật: cả 3 người đều gửi tiền *giữa* kỳ nên
  chưa ai đủ điều kiện. Đây là bằng chứng luật vé hoạt động thật, không phải bug.

## 9. Câu hỏi còn mở (cần bàn trước khi làm landing page)

1. **Nói thật thế nào về nguồn lãi?** Hiện là mình bơm theo công thức. Có 3 hướng:
   nói thẳng "yield mô phỏng cho testnet", nói tránh "phần thưởng tuần", hay đợi
   có yield thật mới launch. Chọn sai là mất uy tín ngay từ dòng đầu.
2. **Giải $10/tuần có đủ hấp dẫn không?** Core belief nói phần thưởng phải "đủ đậm
   để đáng nhớ", nhưng $10 thì không. Muốn giải to hơn phải đổi công thức (tỉ lệ
   10%/năm hoặc sàn tối thiểu), chứ bơm thêm tiền vào ví bot **không** tự làm
   giải to lên.
3. **Đối tượng có thật sự là "người đã hiểu crypto" không?** Cơ chế no-loss vốn
   là thứ dễ giải thích nhất cho người mới. Nếu đổi đối tượng thì UI phải đổi theo.
4. **Hackathon nào, deadline nào?** Spec mục 6 vẫn để trống — chưa xác định.
5. **Tên gọi "kỳ" đối ngoại:** code dùng "epoch". Với người dùng phổ thông thì
   "tuần" hay "mùa" dễ hiểu hơn.

## 10. Nguyên tắc thiết kế UI (cho landing page dùng lại)

- Màu: xanh thương hiệu `#16A34A`, nền thẻ `#D9D9D9`, thông báo vàng `#FFCC00`,
  chữ phụ `#8E8E93`.
- Font **Roboto** + **Roboto Condensed** cho số liệu. Thang chữ **35/30/25/20/15**,
  chú thích **17**.
- Lưới hàng cố định 50px, bo góc 15px, khe 10px. Desktop 860px = đúng 2× mobile
  430px; ngoài khung đổ nền xám, không giãn full màn hình.
- **Mọi thứ là popup**, không có trang thứ hai.
