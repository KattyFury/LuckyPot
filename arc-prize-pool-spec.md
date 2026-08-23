# Arc Prize Pool — No-Loss Lottery (Spec, Bước 4)

## 0. Tóm tắt

dApp trên Arc: pool tiền gửi của nhiều người, mỗi tuần chọn ngẫu nhiên một số người trúng toàn bộ phần yield của tuần đó, thay vì chia đều lãi cho tất cả. Không ai mất gốc — không trúng thì rút lại 100% USDC đã gửi bất cứ lúc nào.

Bản MVP dùng USDC + yield giả lập. Thiết kế để sau này chuyển sang $ARC khi staking thật ra mắt mà không cần viết lại phần lõi.

---

## 1. Bước 1 — Ideation (case study, đúng định dạng repo hiện tại)

**Câu 0 — Định hướng Arc.** Không khớp thẳng 1 trong 4 hướng chính thức repo liệt kê (P2P payments, eCommerce checkout, Stablecoin FX, Agentic economy) — nhưng chấp nhận, vì 4 hướng đó là ví dụ minh hoạ chứ không phải danh sách đóng. Vẫn khai thác đặc thù Arc thật: USDC-native gas, finality dưới giây (quay số/claim nhanh), Multicall3From (gộp approve+deposit 1 chữ ký).

**Câu 1 — Thật, và đúng đối tượng.** Cho người đã hiểu crypto/staking. Căn cứ có thật, không tưởng tượng: vé số luôn có người mua dù kỳ vọng âm — bản no-loss (không mất gốc) còn hấp dẫn hơn vé số thật vì loại bỏ hẳn rủi ro mất tiền. **Yêu cầu quan trọng nhất: vui vẻ** (trải nghiệm hồi hộp/cào, không phải tốc độ hay riêng tư).

**Câu 2 — Dẫn đầu hay cạnh tranh.** PoolTogether đã làm mô hình pool+xổ số từ 2019 nhưng phụ thuộc Aave/Compound để sinh yield. Bản Arc-native khác biệt: không cần lending protocol ngoài, dùng ARC staking yield trực tiếp từ network khi PoS live — chưa ai làm bản này trên Arc.

**Câu 3 — Khả thi.** Bỏ qua bước hỏi chính thức qua khung chat docs.arc.io (đã quyết định không cần) — dùng feasibility đã xác lập xuyên suốt quá trình làm việc: không có $ARC token sống để stake (whitepaper + presale $222M đã công bố, nhưng PoS transition "không có timeline cố định"), mainnet public dự kiến 16/9/2026 (hiện đang private mainnet), USYC (nguồn yield thật duy nhất) bị khóa sau rào cản tổ chức $100k, `PREVRANDAO` luôn trả về 0 trên Arc (không dùng được cho random), Safe multisig deploy native không cần chỉnh sửa, USDC Testnet thật qua Circle faucet 20$/ngày.

**Kết luận: PASS**, với ràng buộc rõ: build trên testnet, yield mock theo công thức sống, random tự tạo bằng commit-reveal (không phải VRF), $ARC là roadmap tương lai chứ không phải nền tảng hiện tại.

### Lỗi quy trình gặp phải khi chạy 4 câu này

| # | Lỗi | Cách phát hiện/sửa |
|---|---|---|
| 1 | Ban đầu hiểu sai Arc có sẵn token $ARC để stake ngay | Tra Arc Docs xác nhận không có token biến động → sau đó tra thêm web mới phát hiện whitepaper $ARC thật đã công bố (thông tin nằm ngoài Arc Docs kỹ thuật) — phải đính chính 2 lần |
| 2 | "Yêu cầu quan trọng nhất" (câu 1) không được hỏi ngay từ đầu | Repo cập nhật thêm câu này sau khi Bước 1 ban đầu đã "xong" — phải quay lại bổ sung |
| 3 | Câu 3 không đi đúng kênh bắt buộc (docs.arc.io chat, tiếng Anh, hỏi thẳng SDK/kiến trúc) | Dùng nguồn khác (Arc Docs tool + web search) trải dài suốt cuộc trò chuyện thay vì 1 lần hỏi tập trung — chấp nhận được nhưng không đúng kỷ luật prompt gốc |

---

## 2. Bước 2 — PRD

**Core value:** Rủi ro mất tiền là thứ duy nhất ngăn người ta chơi trò may rủi. Bỏ rủi ro đó đi mà vẫn giữ cảm giác hồi hộp/phần thưởng lớn → người ta hành động nhiều hơn hẳn so với một con số lãi suất cố định vô cảm.

1. **App là gì?** dApp trên Arc: gộp tiền gửi vào 1 pool, mỗi tuần xổ số ngẫu nhiên trúng phần yield thay vì chia đều
2. **Ai dùng?** Người đã hiểu crypto, quen khái niệm staking/yield
3. **Giải quyết vấn đề gì?** Lãi staking truyền thống quá nhạt, không đủ động lực — biến thành trải nghiệm vé số không mất gốc
4. **Tính năng nào?** Deposit/withdraw không khóa gốc · hiển thị số vé · đếm ngược tới kỳ quay · quay số commit-reveal verify được · scratch-to-claim · bảng minh bạch · auto-sweep sau 3 ngày nếu không claim
5. **Luồng sử dụng?** Connect wallet → deposit USDC → nhận vé → chờ kỳ quay → cào xem kết quả → trúng thì claim (hoặc auto về ví sau 3 ngày) → rút gốc bất kỳ lúc nào
6. **Không được làm gì?** Không khóa gốc/thưởng dưới mọi hình thức · không phí ẩn · không cho admin chọn người trúng · không cam kết lãi suất cố định (đang mock yield)

---

## 3. Bước 3 — Chi tiết kỹ thuật

### 3.1 Vé (tickets)
- 1 vé / $1 deposit, weighted theo số tiền, 1:1 không cần đổi (VD: $1,000 pool → 1,000 vé). Tỷ lệ này tránh việc gửi dưới ngưỡng bị 0 vé (như kiểu $1,000/vé cũ sẽ loại người gửi ít)
- **Điều kiện hợp lệ:** deposit phải có mặt từ đầu tới cuối tuần, không rút giữa chừng → mới tính vé tuần đó
- Rút bất kỳ lúc nào trong tuần = loại khỏi vé tuần đó (nhưng vẫn rút được tiền, không khóa gốc)
- Gửi thêm giữa tuần (top-up) khi đã có vé hợp lệ từ đầu tuần: phần cũ giữ nguyên vé tuần này, phần mới dồn sang tuần sau

### 3.2 Chu kỳ quay số
- **Hàng tuần** (không phải tháng) — giữ nhịp gắn bó người dùng

### 3.3 Số người trúng (numWinners)
```
numWinners = max(1, min(participants / K, weeklyYield / minPrize))
```
- **Chốt cho MVP: K=10, minPrize=$10** (khớp với mock yield $10/tuần → luôn ra đúng 1 giải trọn $10 khi testnet ít người)
- Set trước mỗi kỳ, công khai trên bảng minh bạch, không đổi sau khi có kết quả
- Trùng người trúng nhiều giải trong 1 kỳ: **cho phép** (đúng random thuần, không loại vé đã trúng)
- **Tương lai (production, pool lớn dần):** K và minPrize trở thành hàm theo quy mô pool thay vì hằng số cố định — pool nhỏ thì K nhỏ (nới lỏng, nhiều người có cơ hội hơn ở giai đoạn đầu), pool lớn thì K lớn (chọn lọc hơn). K có sàn tối thiểu 2. minPrize tăng theo quy mô pool để giải luôn có ý nghĩa

### 3.3b Chia thưởng theo bậc (numWinners)
| numWinners | Giải nhất | Phần còn lại |
|---|---|---|
| 1 | 100% | — |
| 2-5 | 50% | 50% chia đều cho (N-1) giải thường |
| 6-10 | 33% | 67% chia đều cho (N-1) giải thường |

- Dải này phủ hết MVP (K=10 → numWinners tối đa 10 khi có ≥100 người tham gia)
- N > 10 (bản production, pool/participants lớn hơn nhiều): chưa định nghĩa, để chung với phần "K/minPrize theo hàm pool size" ở mục tương lai
- Lý do giữ jackpot lớn thay vì chia đều: "cơ hội là free" (gốc không mất, chi phí tham gia = 0) nhưng phần thưởng phải đủ đậm để đáng nhớ — không chia vụn thành nhiều giải be bé. Chưa build cho MVP — over-engineer cho demo, để dành bản thật

### 3.4 Nguồn yield (giai đoạn MVP)
- **Công thức: `weeklyYield = max($10, poolBalance × 10% ÷ 52)`** — sàn $10/tuần khi pool còn nhỏ (dưới ~$5,200), tự vượt sàn theo công thức thật khi pool lớn hơn. Admin vẫn là người bơm tiền thật vào (vì Arc chưa có DeFi/staking thật), nhưng SỐ TIỀN bơm tính theo công thức sống, không phải số cố định admin tự chọn
- Tương lai (bản $ARC, khi staking thật live): nguồn funding chuyển từ "admin bơm tay theo công thức" sang "yield thật tự động từ network" — công thức giữ nguyên, sàn $10 tự nhiên biến mất khi yield thật đủ lớn

### 3.5 Randomness
- **MVP (USDC):** commit-reveal kết hợp blockhash tương lai + số bí mật do 1 ví bot tự sinh ngẫu nhiên (crypto.randomBytes), chạy tự động qua script định kỳ (cùng cơ chế GitHub Actions dùng để bơm yield) — không cần admin/con người can thiệp:
  1. Trước khi đóng cửa sổ gửi tiền tuần đó: script commit hash(số bí mật) lên contract
  2. Sau khi tới lúc quay số: script reveal số gốc, contract verify khớp hash đã commit, dùng số đó + blockhash để ra kết quả
  - Không ai (kể cả script/admin) biết trước kết quả tại thời điểm commit vì blockhash tương lai chưa tồn tại lúc đó
- **Tương lai (bản $ARC):** nâng cấp Chainlink VRF khi staking thật live (chưa xác nhận VRF đã deploy trên Arc)
- ⚠️ Không dùng `block.prevrandao`/`block.difficulty` một mình — Arc docs xác nhận `PREVRANDAO` luôn trả về 0, làm lottery bị đoán trước được

### 3.6 Claim & phân phối thưởng
- Kết quả fix on-chain ngay khi kỳ quay kết thúc (qua commit-reveal) — **không** tự động chuyển vào ví
- User "cào" (bấm claim) → tiền về ví ngay, giữ cảm giác hồi hộp thật (không phải animation giả trên số dư đã có sẵn)
- Không cào trong 3 ngày → **auto-transfer** qua permissionless sweep function — ai cũng gọi được hàm này để đẩy tiền về ví người trúng, không cần tin admin, không cần Chainlink Automation
- Không bao giờ có hạn chót làm mất thưởng — chỉ mất animation, không mất tiền

### 3.7 Bảng minh bạch (transparency board)
Công khai mỗi kỳ: số kỳ quay · tổng pool · tổng vé · danh sách ví trúng · hash/block dùng để reveal (verify lại được) · trạng thái đã claim/chưa

### 3.8 Thiết kế cho tương lai
- Pool token là **biến/địa chỉ có thể swap**, không hardcode USDC → sau này đổi sang $ARC khi staking thật live chỉ cần đổi địa chỉ token, không viết lại lõi

---

### 3.9 Admin & Vận hành (Bước 3 — Product Discovery, nhóm chính thức)
- **Quyền admin: Safe (Gnosis Safe) 2-of-2 multisig**, không dùng 1 ví đơn (EOA). SAFE deploy và chạy trên Arc y hệt chain khác — cùng factory, cùng proxy pattern, không cần chỉnh sửa. Setup qua app.safe.global, dùng địa chỉ Safe làm `admin` trong contract
- **Bơm yield: tự động qua script định kỳ** (GitHub Actions) thay vì admin tự tay bơm mỗi tuần — chấp nhận bơm thường xuyên số nhỏ, không cần đúng khớp lịch draw
- **Emergency control: pause loại 2 — chỉ chặn deposit/draw mới, KHÔNG bao giờ khóa rút gốc.** Không có nút "khóa toàn bộ" — rút tiền luôn mở bất kể trạng thái, đúng nguyên tắc "không khóa gốc dưới mọi hình thức"
- **Contract: upgradable (proxy pattern)**, không phải immutable. Quyết định này phụ thuộc trực tiếp vào multisig ở trên — 2-of-2 multisig giảm đủ rủi ro "1 key bị lộ = mất toàn quyền upgrade" nên upgradable chấp nhận được. Nếu admin từng là 1 EOA đơn, kết hợp với upgradable sẽ là rủi ro rug-pull toàn phần — tổ hợp cần tránh
- Khi lên mainnet/staking $ARC thật: deploy hẳn contract mới cho bản production, không cần bản testnet này "sống mãi"

### 3.10 Bảo mật & Rủi ro (Bước 3 — chốt xong)
- Reentrancy ở claim/rút gốc: chuẩn OpenZeppelin (ReentrancyGuard + checks-effects-interactions — đánh dấu đã claim TRƯỚC khi gửi tiền, không phải sau)
- Sybil (nhiều ví nhỏ ăn vé rác): không phải rủi ro thật — vé tính theo tổng tiền (1:1), chia ví nhỏ hay giữ 1 ví không đổi tổng vé/kỳ vọng trúng, chỉ tốn gas thêm vô ích. Không cần xử lý
- Blockhash bị validator PoA biết trước: vá bằng commit-reveal 2 lớp (xem mục 3.5) — số bí mật tự sinh tự động qua script, không cần admin
- USDC Testnet: thật qua Circle faucet, 20 USDC/ngày/địa chỉ — đủ nuôi pool nhiều tuần qua script tự động

## 3b. Bước 3 — Vòng 2: Stack theo luồng

| Luồng | Tech chọn | Lý do ngắn gọn |
|---|---|---|
| Smart contract & deploy | Hardhat + Hardhat Ignition + OpenZeppelin Contracts Upgradeable + viem | AI viết code cần stack nhiều tài liệu nhất để tự debug; OZ Upgradeable có sẵn ReentrancyGuard + proxy pattern chuẩn |
| Frontend & kết nối ví | React + Vite + wagmi + viem + **Privy** | Đã chạy thật trên Arc (ezwallet); Privy gộp cả ví có sẵn lẫn tạo ví mới qua social trong 1 luồng |
| Deposit / Withdraw | Multicall3From (Arc native) + viem | Gộp approve+deposit thành 1 chữ ký, đã kiểm chứng qua ezwallet |
| Automation (yield + commit-reveal) | GitHub Actions (cron) + Node.js + viem, ví bot riêng | Chỉ cần chạy theo lịch, không cần server sống 24/7; đúng công cụ cron mày đã dùng |
| Claim / Scratch | Canvas API (native browser) + viem | Hiệu ứng cào chỉ là lớp trình bày, không cần thư viện ngoài, nhẹ cho demo |
| Bảng minh bạch | Cloudflare KV (cache hiển thị) + link Arc block explorer (verify thật) | Đọc nhanh, rẻ; verify luôn trỏ on-chain, không phụ thuộc cache |

**Cần cài:** Node.js, Hardhat, `@openzeppelin/contracts-upgradeable`, React+Vite project, wagmi/viem, Privy SDK

**Cần đăng ký tài khoản:** GitHub (đã có) · Privy dashboard (free tier) · Cloudflare (đã có, tạo KV namespace mới) · Safe — app.safe.global, tạo Safe 2-of-2 cho admin

**Khó đổi (chốt sớm vì đổi sau tốn công):**
- Hardhat — nền toàn bộ contract/test, đổi sang Foundry giữa chừng phải viết lại test suite
- Privy — quản lý cả identity lẫn ví user, đổi provider sau cần user migrate ví
- Cấu trúc dữ liệu chính trong contract (dù upgradable, đổi core logic vé/pool vẫn phức tạp hơn đổi UI)

## 4. Bối cảnh roadmap Arc (để tham chiếu khi build)

- Arc hiện đang **private mainnet** (>100 đối tác tổ chức), **public mainnet dự kiến 16/9/2026**
- $ARC: whitepaper công bố 11/5/2026, tổng cung 10B, presale $222M ở FDV $3B, issuance ban đầu ~2-3%/năm (giảm dần)
- $ARC TGE (token generation event) **chưa có ngày cụ thể** — có thể trùng mainnet, sau đó, hoặc gắn với lúc chuyển PoS (PoS transition cũng "không có timeline cố định" theo whitepaper)
- USYC (nguồn yield thật duy nhất hiện có trên Arc) chỉ dành cho tổ chức, tối thiểu $100k, cần allowlist — không khả thi cho hackathon cá nhân

---

## 5. Wireframe

**Màn 1 — Dashboard (grid chi tiết, đủ để đưa thẳng vào Claude Design không cần giải thích thêm)**

Chia dọc 15 hàng bằng nhau, spacing 10px giữa các hàng. Toàn bộ box bo góc `radius: 15`.

| Hàng | Nội dung |
|---|---|
| 1/15 | Navbar: logo trái, địa chỉ ví phải, line mỏng ngăn cách ở đáy hàng |
| 2/15 | Full-width: box thông báo (nền `#FFCC00`, chữ đen) |
| 3-6/15 | Chia ngang: trái 1/3 = box EPOCH, phải 2/3 = box (TOTAL POOL + MY TICKETS), cách nhau 10px sau khi trừ lề |
| 7-14/15 | Chia ngang: trái 2/3 = box DRAW HISTORY, phải 1/3 = box MY HISTORY (cả 2 cùng cao 8 hàng, 7-14) |
| 15/15 | Trống |

**Box EPOCH (3-6/15), nội dung theo hàng con:**
1. "EPOCH #0002 end in"
2. "2d 14h 25m 45s"
3-4. Chú thích nhỏ: *"The pool gets placed into trusted DeFi protocol, weekly yield gets raffled off among {numWinners} people who kept their funds deposited for the full week. TLDR: 1 dollar = 1 ticket."*

**Box TOTAL POOL + MY TICKETS (3-6/15), nội dung theo hàng con:**
1. "TOTAL POOL" (trái) · "MY TICKETS (USDC deposited)" (phải)
2. "$18,600/151 depositors" (trái) · số vé hiện tại, VD "1,234" (phải)
3. "My Wallet's Balance: $543"
4. 3 nút chia đều: Deposit · Withdraw · Latest Result

**Box DRAW HISTORY (7-14/15):**
1. Header "DRAW HISTORY"
2. Kỳ gần nhất: "Epoch #0002   $18,600/151 depositors"
3. Kỳ trước đó: "Epoch #0001   $15,600/121 depositors"
4-8. Trống nếu chưa có thêm lịch sử; scroll được khi đầy

Click vào 1 dòng epoch → **popup chi tiết**: ví nào trúng, mua bao nhiêu vé, trúng bao nhiêu tiền. Mọi popup đồng bộ cùng 1 layout: hàng 1 = header căn trái, nội dung từ hàng 2 trở xuống. Width popup = 3/4 màn hình trên mobile, gấp đôi con số đó trên desktop (chỉ chiều ngang, chiều dọc theo nội dung).

**Box MY HISTORY (7-14/15):**
1. Header "MY HISTORY"
2+. Từng dòng lịch sử cá nhân, VD: "Aug 22, 2026   Deposited   $1,234" — scroll được

---

**Màn 2 — Deposit**
- Input số USDC muốn gửi
- Số vé sẽ nhận, tính live theo input (1 USDC = 1 vé)
- Cảnh báo nhỏ: "Giữ đủ 1 tuần mới tính vé kỳ này"
- Nút Confirm → ký giao dịch ví

**Màn 3 — Withdraw**
- Input số muốn rút (mặc định = full balance)
- Cảnh báo nếu đang trong tuần hợp lệ: "Rút sẽ loại bạn khỏi vé tuần này"
- Nút Confirm

**Màn 4 — Cào kết quả**
- Thẻ cào full màn hình, tap/swipe để lộ kết quả
- Trúng giải nhất (50% hoặc 33% tuỳ numWinners, xem mục 3.3b): hiển thị nổi bật hơn hẳn (badge/màu riêng) + số tiền + nút "Claim ngay"
- Trúng giải thường: hiển thị số tiền (phần chia đều còn lại) + nút "Claim ngay"
- Không trúng: "Chúc may mắn kỳ sau", gốc vẫn nguyên
- Nếu đã quá hạn 3 ngày (đã auto-sweep): hiện thẳng kết quả, bỏ animation

*(Bảng minh bạch và lịch sử cá nhân không còn là màn riêng — đã gộp vào Dashboard ở trên: DRAW HISTORY = bảng minh bạch, MY HISTORY = lịch sử cá nhân.)*

---

## 5b. Design System (cho Claude Design)

**Grid:** chia dọc 15 hàng bằng nhau mỗi trang, spacing 10px giữa hàng. Mọi box bo góc `radius: 15`.

**Màu (chốt cứng, không phải gợi ý nữa):**
| Vai trò | Mã màu |
|---|---|
| Primary/thương hiệu (header, điểm nhấn) | `#16A34A` |
| Text chính | Đen (`#000000`) |
| Text phụ | `#8E8E93` |
| Box thông báo (luôn cố định, không đổi theo trạng thái) | Nền `#FFCC00`, chữ đen |
| Box thường (card nội dung) | `#D9D9D9` |
| Scrollbar | Track trắng, thumb kéo `#8E8E93` |

**Font:** chỉ dùng **Roboto**, xoay vòng giữa các biến thể (Regular, Bold, Condensed) tuỳ hàng — không dùng font khác (bỏ Roboto Mono đã đề xuất trước đó, không cần). Thang cỡ chữ cố định dùng xuyên suốt: **35 / 30 / 25 / 20 / 15** — chọn từ thang này để nhấn nhá, không tự chế cỡ khác.

**Kích thước trang tham chiếu:** 1290×1080px desktop (= 430px mobile width × 3), popup detail = 3/4 chiều ngang trên mobile, gấp đôi trên desktop.

## 6. Còn mở (cần chốt trước khi build)

- [ ] Hackathon cụ thể (tên, deadline) chưa xác định — "hackathon tiếp theo"

## 7. Nice-to-have cho tương lai (không cần cho MVP)

- **TwabController (PoolTogether)** — nâng cấp cho luật vé thay vì rule nhị phân "phải có mặt đủ 1 tuần" hiện tại. Tính số dư trung bình theo trọng số thời gian, công bằng hơn cho gửi/rút giữa tuần. Nguồn tham khảo: https://dev.pooltogether.com/protocol/design/twab-controller, code mở tại GitHub GenerationSoftware — có thể fork trực tiếp thay vì tự viết.
- **Quyết định giữ nguyên rule "đủ 1 tuần" cho bản chính thức (không chỉ MVP):** đơn giản hơn TWAB để duy trì, và chủ động chừa lại 1 khoảng chênh lệch (tiền vào pool nhưng chưa được tính vé kỳ đó) có thể trở thành nguồn lợi nhuận cho founder sau này — khác với TWAB vốn phân bổ công bằng tuyệt đối, không chừa khoảng trống nào. Cân nhắc kỹ hơn khi có mô hình kinh doanh rõ ràng.
