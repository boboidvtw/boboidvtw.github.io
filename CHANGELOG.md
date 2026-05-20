# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.5.4] - 2026-05-20 — built-in 公式 render 統一 escape pattern（技術債清掃）

延續 v3.5.3 自建公式 XSS 修復——當時為避免擴大改動，built-in 公式 render（`renderFormulas()`）的同款不安全 `onclick=` 字串拼接 pattern 暫時保留為已知技術債（`builtInFormulas` 完全 dev-controlled、無使用者 injection 面）。本版統一兩條 render path 的 pattern，徹底清掃。

### Changed

- **built-in 公式 render 改用 `data-*` + `addEventListener` pattern（技術債清掃 / defense-in-depth）**：原 `renderFormulas()` 使用 `onclick="selectFormula(${f.id}, '${f.name}', '${f.expr}', ...)"` 內聯字串拼接，雖然 `builtInFormulas` 為 dev-controlled 無使用者 injection 面，但若日後加入含 `'` 的公式名稱會 break，且兩條 render path 不一致是維護負擔。**修法**：新增 `builtInFormulaItem()` + `bindBuiltInFormulaEvents()` 兩個輔助函式，與 v3.5.3 的 `customFormulaItem` / `bindCustomFormulaEvents` 結構完全對齊；name / expr / category / group 全部走 `escapeFormulaHtml()`；click 用 `addEventListener` 從 `data-formula-id` 反查物件後呼叫 `selectFormula`。
- **`sw.js` `CACHE_NAME` bump 至 `sigma-calc-v3.5.4`**：cache-first SW 必須 bump 讓既有使用者取得新 render path。

### Verified

- 63 張 built-in 公式卡全部以 `data-formula-source="builtin"` render，inline onclick 殘留 0 個。
- 端對端：圓的面積 r=5 → 78.539816339745、勾股定理 a=3 b=4 → 5、複利終值 P=10000 r=5 n=12 t=10 → 16470.0949769028。
- 自建公式 path 完全未動，相關函式（`customFormulaItem` / `bindCustomFormulaEvents`）與行為皆保留。
- console 零 error。

### Known / Next

- 統計（Phase 7）與 3D 表面繪圖（Phase 8）仍待真實 Pro token 驗證內部渲染品質（自 v3.5.3 起延續）。

---

## [3.5.3] - 2026-05-20 — 深審剩餘賣點 + 結構/安全/UX 三修

繼 v3.5.2 完成手機響應式 Bug C 後，對 README 強調但尚未深審的賣點（函數繪圖 / 統計 / 3D / 公式庫 / Pro gate）做了瀏覽器逐功能實測。Pro gate（7 個：tangent / integral / slope / intersect / statistics / 3d / svg）全部正確攔截；free 功能（mark / PNG / special points / formula library / parametric sliders）端對端通過。

過程中揪出三個既存問題並一次性修復：1 個 CRITICAL 結構錯誤（SEO/Footer 長期不渲染）、1 個 CRITICAL 安全漏洞（自建公式 XSS）、1 個 MEDIUM UX 問題（`y=` 前綴）。

### Fixed

- **graphModal 結構吞噬 `<section id="guide">` + `<footer>`（CRITICAL）**：原 HTML 中 `</div>` 閉合位置錯誤，把整個 SEO 教學專欄（AdSense 素材！）與頁尾 trust signals（版權、商標、條款、隱私、聯絡）誤包進 `#graphModal` 內。後果：
  - modal **關閉**時（使用者 99% 時間）兩者整段 `display:none`，**從 site launch 起從未對使用者渲染**——SEO 內容白寫、AdSense 素材白配、footer trust signals 全失。
  - modal **開啟**時 flex row 把它們橫向擠成 3 欄，graph modal 自身 content 被壓到 344px（max-width 應為 1100px）。
  - **修法**：移動 `</div>` 閉合位置，讓 `section#guide` 與 `<footer>` 解放為 `<body>` 直接子孫。線上驗證 `curl https://boboidvtw.github.io/` 確認線上版本同樣中招，本修復同步生效。
- **自建公式 XSS 注入漏洞（CRITICAL，CWE-79）**：`customFormulaItem()` 用樣板字串把使用者輸入的 `f.name` / `f.expr` 直接拼進 `onclick="selectFormula('${f.name}', ...)"`。PoC：name 填入 `test', '', []); window.__xss_fired__ = true; selectFormula(0, 'h` → 點該公式即執行任意 JS。攻擊面包含竊取 localStorage（含 Pro JWT token、saved/customFormulas、exchangeRates）、覆蓋 `gateProFeature` 繞過 Pro gate。**修法**：捨棄 inline `onclick=` 字串拼接，改用 `data-formula-id` + `data-formula-action="select|delete"` 屬性 + 渲染後 `addEventListener` 綁定（`bindCustomFormulaEvents()`）；name/expr/group 全部走新增的 `escapeFormulaHtml()` 五字元 HTML escape。完整 CRUD 端對端回歸（add → click → calc `(4/3)*π*3³`=113.097 → delete）通過、XSS payload 不再執行（`xssFired: false`）。Built-in 公式 render 採同樣不安全 pattern 但 data dev-controlled、無使用者 injection 面，本次未動。
- **函數繪圖 `y=` / `f(x)=` 前綴被誤判為參數（MEDIUM）**：使用者很自然輸入 `y=x^2`，原 add 邏輯接受、清單顯示 `y = y=x^2`、額外建出 `y` slider（把 `y` 誤判為自由參數，因為 `y` 不在保留字表中）。**修法**：`tryAdd()` 在送入 `addGraphFunction()` 前先用 `/^\s*(?:y|f\s*\(\s*x\s*\))\s*=\s*/i` strip `y =` 與 `f(x) =` 前綴。回歸測試確認：`y=x^2` / `y = sin(x)` / `f(x) = x^3` 三種輸入皆 strip 為純表達式；合法的 `x^2+y^2`（無 `=`）完整保留並正確建出 `y` slider，未誤殺。

### Changed

- **`sw.js` `CACHE_NAME` bump 至 `sigma-calc-v3.5.3`**：cache-first SW 必須 bump 才能讓既有使用者立即取得三項修復（特別是安全修復）。

### Verified

- viewport 1280×900 + 375×812 雙 viewport 驗證：modal 開啟時 content 取得完整 1100px、關閉時 `section#guide` + `footer` 在頁面底部正常渲染、手機 v3.5.2 浮動鍵列共存無回歸。
- Pro gate 7 個 + free 功能 4 個全部行為符合預期，無誤鎖、無誤通。
- 自建公式 XSS payload 不再執行，正常公式 CRUD + 計算流程完全保留。
- 繪圖 / 公式 / 計算 console 全程零 error。

### Known / Next

- 統計（Phase 7）與 3D 表面繪圖（Phase 8）內部渲染品質尚未驗證——`ProManager.isProActive` 是 `writable:false` 無法 mock，需真實 Pro token 才能測。列入下一個有 Pro 環境時的待辦。

---

## [3.5.2] - 2026-05-20 — 手機響應式 Bug C 修復

修復 v3.5.1 Known/Next 列出的「手機側邊欄被隱藏導致函式無法閉合括號」嚴重缺陷。手機是計算機主場景，此 bug 使所有 `sin( cos( log( exp( asin( ... ` 函式於手機完全不可用。本次以純 CSS 響應式重排修復，DOM 零改動、桌機零回歸。

### Fixed

- **手機 `( ) , π e` 無法輸入（Bug C，HIGH）**：≤768px 時 `.main-sidebar` 原為 `display:none`，整組常用鍵與「支援函數」說明、「即時匯率」panel 一併消失。所有需要閉合括號的函式（`sin(`、`cos(`、`log(`、`exp(`、`asin(`、`acos(`、`atan(`、`sinh(`、`cosh(`、`tanh(`、`sqrt(`、`floor(`、`ceil(`、`abs(`、`nCr(`、`nPr(`）於手機按下後**完全無法閉合**，皆回傳 `Error`。修復策略：DOM 零改動、純 CSS 響應式重排。≤768px 時 `.main-sidebar` 改為 `position: fixed` 底部浮動列（業界標準的 mobile keyboard 模式），只保留 5 顆關鍵鍵（π e ( ) ,）橫向 5 欄等寬佈局，按鈕 `min-height: 44px` 符合 Apple HIG / Material 觸控標準，半透明背景 + `backdrop-filter: blur(12px)` 配合深淺主題自動切換；「常用按鈕」h3 標題、「支援函數」說明區、「即時匯率」整個 panel 於手機隱藏（手機已有「匯率」tab 可看，help modal 已有支援函數列表）；`body` 加上 `padding-bottom: calc(72px + env(safe-area-inset-bottom))` 預留浮動列空間並支援 iPhone Home Indicator safe area。`z-index: 90` 低於所有 modal（≥1000），不影響 help / formula / graph modal 互動。

### Verified

- 端對端流程：手機 viewport 375×812 完整流程 `sin(45)`=0.707106781187（DEG）、`nCr(5,2)`=10 通過。
- viewport 320 / 375 / 768 / 1280 全部正常；media query 邊界 768px 精準切換。
- 深 / 淺主題視覺均正確、零 console error。
- 桌機 1280：sidebar 回到 `position: static`、`display: flex`，h3 / 支援函數 / 匯率 panel 全部正常顯示，`body` padding-bottom 還原為 20px，**零回歸**。

### Changed

- **`sw.js` `CACHE_NAME` bump 至 `sigma-calc-v3.5.2`**：確保既有使用者立即取得本次修復（Service Worker 為 cache-first，舊版即會永久看不到修復）。

### Known / Next

- 函數繪圖 / 統計 / 3D 繪圖、公式庫實際套用流程、Pro gate 行為尚未深度審查，後續進行。

---

## [3.5.1] - 2026-05-20 — 進階模式審查修復

延續 v3.5.0 的使用性審查，深入測試先前未覆蓋的進位 / 工程 / 科學模式，修復 3 個影響功能可用性的問題（其中 1 個為 v3.5.0 引入的回歸）。所有修復經瀏覽器完整 UI 流程驗證、零回歸、零 console error。

### Fixed

- **工程模式 `mod` 鍵失效（HIGH，v3.5.0 回歸）**：v3.5.0 的百分比預處理會把 `mod` 鍵產生的 `%` 字元（`7%3`）誤判為百分比改寫成 `(7/100)3` → `Error`。修正：`mod` 鍵改插入 ` mod ` 文字（顯示更清楚），`calculate()` 在百分比處理**之後**才將 ` mod ` 轉為 JS 取模 `%`，兩者不再衝突。`7 mod 3`=1、`10 mod 4`=2；百分比 `50%`=0.5、`100+5%`=105 不受影響。
- **進位模式 HEX 缺 `C` 鍵（HIGH）**：十六進位需要 A–F，但按鍵盤漏掉 `C`，使用者無法輸入任何含 C 的十六進位數（`C0`、`CAFE`、顏色碼 `#CCC` 等）。引擎本身支援（`BASE_VALID_DIGITS.HEX` 含 C、enable 邏輯資料驅動），純 HTML 缺按鈕。補回 `C` 並重排佈局為 `A B C CLR / D E F ←`。`C0`→DEC 192 正確。
- **`nCr(n,r)` / `nPr(n,r)` 無法輸入參數（HIGH）**：科學模式有 `nCr(` `nPr(` 鍵，引擎支援，但全站沒有逗號 `,` 按鈕，使用者無法輸入參數分隔符，功能形同虛設。於側邊欄「常用按鈕」區（與 `( )` 同組）新增 `,` 鍵。`nCr(5,2)`=10、`nPr(5,2)`=20 完整 UI 流程可用。

### Changed

- **`sw.js` `CACHE_NAME` bump 至 `sigma-calc-v3.5.1`**：確保既有使用者立即取得本次修復（Service Worker 為 cache-first）。

### Known / Next

- `( ) π e ,` 等鍵於小螢幕被隱藏的響應式問題已於 v3.5.2（2026-05-20）修復。
- 函數繪圖 / 統計 / 3D 繪圖、公式庫套用與 Pro gate 尚未深度審查，後續進行。

---

## [3.5.0] - 2026-05-19 — 計算核心修復 + 角度模式

本次為一輪完整的使用性體驗審查（瀏覽器逐功能實測），修復 4 個影響核心計算的問題並新增角度模式。所有修復皆經瀏覽器驗證、零回歸、零 console error。

### Fixed — 計算引擎

- **`%` 百分比運算符完全失效（CRITICAL）**：主鍵盤 `%` 鍵任何用法（`50%`、`100+5%`）皆回傳 `Error`。`calculate()` 原本未處理 `%`，原樣送入 JS eval（JS `%` 為 modulo 二元運算子，`50%` 為語法錯誤）。新增百分比語意預處理，採標準計算機行為：`50%`→0.5、`100+5%`→105、`200−10%`→180、`200×10%`→20、`80÷50%`→160。
- **函數鍵在初始狀態無法使用（HIGH）**：顯示為初始 `0` 時按 `sin( cos( tan( log( ln( √(` 會產生無效的 `0sin(…)` → `Error`。任何「以函數開頭」的算式第一步即失敗。修正輸入處理：顯示為 `0` 時，除小數點外的按鍵（含函數鍵、左括號）皆取代前導 0。
- **`√` 雙重替換隱藏 bug**：上述修復後暴露的既有問題——`√`→`Math.sqrt` 後又被 `sqrt(`→`Math.sqrt(` 二次替換成 `Math.Math.sqrt(`。改為 `√`→`sqrt` 統一走單一替換路徑。`√(16)`=4、`9+√(16)`=13 正常。
- **單位換算結果框空白（MEDIUM）**：換算結果 ≥ 1000 時，`formatUnitVal` 以 `toLocaleString` 產生含千分位逗號的字串，賦值給 `type="number"` 的 input 會被瀏覽器拒絕並清空。兩個單位 input 改為 `type="text"` + `inputmode="decimal"`，反向換算 parse 時去除逗號。雙向換算、類別切換、溫度特殊轉換皆正常。

### Added — 角度模式

- **DEG / RAD 切換鈕**（頂部工具列），狀態以 `localStorage` 持久化，**預設 DEG**（角度）。三角函數依模式自動換算：DEG 模式 `sin(90)`=1、`tan(45)`=1（符合一般使用者預期）；RAD 模式 `sin(π÷2)`=1。反三角函數結果亦依模式回傳角度或弧度。雙曲函數不受影響（恆為弧度）。

### Changed

- **`sw.js` `CACHE_NAME` bump 至 `sigma-calc-v3.5.0`**：Service Worker 為 cache-first，若不更新快取名稱，既有使用者會繼續取得舊版 `index.html`，看不到本次修復。bump 後 `activate` 會清除舊快取，修復對所有使用者立即生效。

---

## [3.4.0] - 2026-05-16 — IP protection + Worker hardening

### Added — Legal / IP protection layer

- **`NOTICE.md`** — supplements MIT License with explicit trademark reservations (`∑ Calc™`, `∑ Super Calculator™`, `∑ Calc Pro™`, `MoneyAI168™`), SaaS service scope clarification, visual asset reservation, and operated-domain list.
- **`TERMS.md`** — comprehensive English Terms of Service covering acceptable use (no reverse engineering, no API abuse, no impersonation, no payment circumvention), Pro subscription terms (pricing, billing, refunds, revocation), forks-must-rename rule, privacy disclosure, liability limitation, and Republic of China (Taiwan) governing law.
- **README.md / README_EN.md** — License sections expanded with trademark list, MIT-not-covered scope, `legal@moneyai168.com` contact.
- **`docs/terms.html`** — Section 3 (Intellectual Property) rewritten to list MoneyAI168 trademarks and link to NOTICE.md / TERMS.md.
- **`index.html` footer** — added trademark notice line (`∑ Calc™, ∑ Super Calculator™, ∑ Calc Pro™ and MoneyAI168™ are trademarks of MoneyAI168. Pro subscription powered by the official MoneyAI168 service only.`).

### Changed — Custom domain migration

- **Live Worker now served via `https://api.moneyai168.com`** (Cloudflare Workers Custom Domain bound to `supercalc-license-validator`). `js/pro-config.js` `LIVE.WORKER_URL` switched from `supercalc-license-validator.boboidvtw.workers.dev` to the custom domain. The `*.workers.dev` URL stays active in parallel (zero-downtime; no breaking change).
- Removed a stale conflicting manual `api` CNAME (pointed to a non-existent cross-account `supercalc-license.moneyai168.workers.dev` → Cloudflare error 1014) that had been blocking Custom Domain creation. Sandbox stays on `*.workers.dev`.
- A custom domain (a real Cloudflare zone) is also the prerequisite for any future WAF rule escalation on `/webhook/paypal`.

### Added — Worker v2.2.0 KV-based rate limiting

- **`/license/issue` dual-layer rate limiting**, fixed-window counters stored in the existing `LICENSES` KV namespace:
  - per `cf-connecting-ip` — 10 req / 60s (anti-DDoS / bot)
  - per `subscriptionId` — 5 req / 3600s (anti license-factory abuse if a subscription ID is leaked)
- **429 response** with dynamic `Retry-After` (computed from window remainder) and `scope` field (`per-ip` / `per-subscription`).
- **KV failure → graceful degrade**: on any KV error the request is allowed (never blocks a legitimate user).
- Rate values are code constants (`RL_ISSUE_*`); tune by editing + redeploying.

#### Why KV instead of Cloudflare Rate Limiting bindings

- v2.1.0 first attempted Cloudflare Rate Limiting bindings. Empirically verified (Sandbox, 2026-05-16): when a Worker is deployed via the **Dashboard editor**, the binding's counter **only persists within a single Worker invocation, not across separate requests** — making it useless for real rate limiting (which is inherently cross-request).
- The binding is also hard-locked to 10s/60s periods, so the desired 3600s per-subscription window was impossible.
- KV-based counters work cross-request, support arbitrary windows (incl. 3600s), and are fully in-code/testable. Trade-off: approximate under concurrent bursts (KV eventual consistency, no atomic increment) — acceptable for the real threat model (sustained abuse). Precise quota would require Durable Objects (future upgrade path, needs wrangler deploy).

### Added — Worker v2.3.0 webhook source-IP observation (log-only)

- **`/webhook/paypal` source-IP observation**: each webhook's `cf-connecting-ip` is matched against PayPal's 8 published CIDR ranges; non-matching sources emit a `[webhook-ip-observe]` `console.warn` (event type + id) but are **never blocked**.
- Rationale: PayPal **officially discourages IP allowlisting** (IPs change without notice; a hard block risks silently dropping real webhooks → subscriptions never activate → revenue loss). Signature verification (already implemented via `verify-webhook-signature`) remains the primary, PayPal-recommended defense. This layer is purely observational — collect real traffic data before deciding whether to escalate to a hard block.
- A Cloudflare WAF custom rule cannot target `*.workers.dev` (not a zone in the account), so the check is implemented **in-Worker** instead — works now, version-controlled, unit-tested (13/13 CIDR boundary cases).
- PayPal CIDRs are a code constant (`PAYPAL_WEBHOOK_CIDRS`); IPv4-only matching (PayPal's published ranges are all IPv4).

### Notes

- Source code remains MIT-licensed; this release does not change the LICENSE file. New protection layers operate alongside MIT, covering what MIT explicitly does not (trademarks, brand identity, operated SaaS service).
- No extra Cloudflare binding required for rate limiting. Any previously-added `RATE_LIMIT_ISSUE_*` bindings can be deleted (code no longer references them).
- A future hard-block escalation for `/webhook/paypal` would belong on the custom domain (`api.moneyai168.com`) as a WAF rule, gated on observation data showing all real PayPal traffic stays within the published CIDRs.
- Still pending in this milestone: custom domain migration to `api.moneyai168.com`.

---

## [3.3.1] - 2026-05-14 — Webhook timing retry fix

### Fixed

#### Retry on `403 + currentStatus='pending'`
- **Bug discovered during sandbox e2e test**: PayPal often sends `BILLING.SUBSCRIPTION.CREATED` (status=`pending`) before `BILLING.SUBSCRIPTION.ACTIVATED` (status=`active`). Old `issueWithRetry` only retried on `404`, so it gave up during the pending→active transition window, leaving the user with a "subscription not active" error even though the subscription was about to become active.
- **Fix**: `issueWithRetry` now also retries when `err.status === 403` AND `err.body.currentStatus === 'pending'`.
- Terminal statuses (`cancelled`/`suspended`/`expired`/`refunded`/`disputed`) still fail fast without retry.
- Error UI in `paypal-integration.js` now shows the manual "retry" link for both `404` and `403+pending` scenarios.

### Verified

- Sandbox subscription `I-R2SFXX7U1SW2` reached `status=active` after PayPal's webhook flow completed.
- Manual `ProManager.activateSubscription()` succeeded against the active KV record.
- PayPal `BILLING.SUBSCRIPTION.CANCELLED` webhook arrived within 5 seconds and the previously-issued JWT was invalidated by the next `/license/validate` call.

---

## [3.3.0] - 2026-05-14 — Sandbox / Live dual-mode

### Added

#### 🧪 Sandbox / Live dual-mode switching
- **Query-param toggle**: visit `https://boboidvtw.github.io/?sandbox=1` to switch the entire frontend to PayPal Sandbox + Sandbox Worker.
- **Orange banner** at the top of the page when sandbox mode is active, with a one-click "switch back to Live" link.
- **`localStorage` key isolation**: sandbox tokens use `_sb` suffix (`super_calc_pro_license_sb`) so test data never contaminates the production license.
- **Dynamic PayPal SDK loading**: the SDK script tag is no longer hardcoded in `index.html`. `paypal-integration.js` now injects the correct client-id based on mode (Live or Sandbox), enabling clean mode switching without rebuilding the page.

#### Sandbox infrastructure (deployed alongside Live)
- **Separate Cloudflare Worker**: `supercalc-license-validator-sandbox.boboidvtw.workers.dev`
- **Separate KV namespace**: `LICENSES_SANDBOX` (`1378f7ee501c4cc3921f1b8f80d1650d`)
- **Separate PayPal Webhook**: ID `1L223054P9312233E`, points to the sandbox worker
- **Sandbox env vars**: `PAYPAL_API_BASE=https://api-m.sandbox.paypal.com`, sandbox `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`
- Shared `SECRET_KEY` with Live (JWTs from each environment can't cross-validate due to different worker URLs anyway).

### Changed

- `index.html` no longer ships the static `<script src="paypal.com/sdk/js?client-id=...">` tag. `paypal-integration.js` loads the SDK dynamically with the active mode's client-id.
- `pro-config.js` exposes new flags: `IS_SANDBOX`, `PAYPAL_CLIENT_ID`, and mode-aware `STORAGE_KEY` / `SUBSCRIPTION_KEY` / `VERIFIED_AT_KEY`.

### Why sandbox mode exists

PayPal blocks Taiwan-registered seller accounts from receiving payments from Taiwan-registered buyer accounts (including guest checkout). Live self-testing is therefore impossible from the seller's own market. Sandbox mode allows full end-to-end verification using PayPal-provided test buyer accounts at zero cost.

---

## [3.2.1] - 2026-05-14 — KV-backed license validation (security upgrade)

### 🚨 Security: Closes critical license-forging vulnerability

In v3.2.0, `/license/issue` accepted **any** `subscriptionId` and signed a JWT for it, with no verification that the ID corresponded to a real PayPal subscription. Anyone could `POST /license/issue` with a fake ID and receive a valid Pro license. **This release closes that hole.**

### Added

#### Cloudflare Worker v2.0.0 (KV-backed)
- **`LICENSES` KV namespace** stores subscription state by `subscriptionId`:
  - `status`: `pending` / `active` / `cancelled` / `suspended` / `expired` / `refunded` / `disputed`
  - `planId`, `activatedAt`, `cancelledAt`, `lastEventType`, `lastEventId`, etc.
- **`POST /webhook/paypal`**: receives PayPal webhook events
  - Verifies signature via PayPal `/v1/notifications/verify-webhook-signature` API (requires real PayPal cert — attackers can't forge)
  - Idempotency: event IDs cached in KV for 30 days, duplicates return `{status: 'duplicate'}`
  - Maps 8 subscription events + 3 payment/dispute events into KV state updates
- **`POST /license/issue` now requires KV record**: only signs a JWT if `status === 'active'` in KV. Fake IDs return `404`. Pending/cancelled IDs return `403`.
- **`POST /license/validate` checks KV on every call**: even if the JWT signature is valid and not expired, validation fails if KV shows the subscription was cancelled. This is the **instant revocation** mechanism.
- **`GET /subscription/:id`**: debug endpoint to inspect KV state.
- **Short-lived JWT**: lifetime reduced from 1 year → 7 days. Combined with KV-backed validate, revocation propagates within ≤6 hours (reverify interval).
- **OAuth token caching**: PayPal `client_credentials` token cached in KV for 8 hours to avoid token churn.

#### Frontend (5 modules, +123 lines)
- `LicenseAPI.issueWithRetry`: handles webhook delay (404 → retry up to 6×, 1.5s between attempts)
- `ProManager.refreshTokenIfNeeded`: auto-renews token when <48 h remaining before JWT expiry
- `ProManager.verifyWithServer`: background re-validation every 6 hours, clears token if KV says cancelled
- PayPal `onApprove` shows live retry progress and a manual retry link on timeout
- Legacy `SUPC-XXXX-XXXX-XXXX` format auto-detected on startup → cleared (no security value)

### Security model

| Attack vector | Defense |
|---|---|
| Forge `subscriptionId` to mint a JWT | ❌ 404 — KV has no such subscription |
| Forge a PayPal webhook | ❌ 401 — signature verification fails without real PayPal cert |
| Reuse a valid JWT after subscription cancel | ❌ 401 — KV state checked on every validate |
| Steal `SECRET_KEY` | ❌ Stored as Cloudflare Worker Secret, never in code or KV |
| DDoS `/license/issue` | 🟡 Not rate-limited yet (planned) |

### Verification

- **Test A** (vulnerability patch): `POST /license/issue` with fake `subscriptionId` returns `404 "subscription not found"` ✅
- **Test B** (KV-backed flow): manually seeded KV `sub:I-TEST-MANUAL-001` with `status=active` → issue succeeded → validate succeeded ✅
- **Test C** (signature verification): PayPal Webhook Simulator events return `401` because the simulator doesn't use the real PayPal cert — confirms verification is active ✅
- **Test D** (revocation): manually flipped KV `status` to `cancelled` → next `validate` returns `401 "subscription no longer active"`, next `issue` returns `403 "subscription not active"` ✅

---

## [3.2.0] - 2026-05-14 — Modular frontend refactor

### Changed

#### 🧩 Modular extraction of Pro module
- **`index.html` reduced from 5,326 → 4,992 lines** (`-334` lines of inline JS).
- **5 standalone JS modules** under `/js/`:
  - `pro-config.js` (~52 lines): central config constants
  - `license-api.js` (~92 lines): Cloudflare Worker JWT client
  - `pro-manager.js` (~188 lines): Pro state management
  - `paypal-integration.js` (~119 lines): PayPal Subscribe button + onApprove handler
  - `pro-ui.js` (~285 lines): modal, badge, plan toggle, init
- Service worker `sw.js` bumped to `v3.2.0` and now caches the 5 JS modules.
- All inline `onclick=` handlers replaced with `addEventListener` (CSP-friendly).

### Removed

- Crockford `makeSegment` / `generateLicenseFromSubscription` (pure-frontend FNV-1a hashing — no actual security value)
- Inline 341-line `<script>` block in `index.html`

### Why modularize

- High cohesion / low coupling
- 200–400 lines per file (target), 800 max
- Easier to review, test, and maintain than a monolithic `index.html`

---

## [3.1.0] - 2026-05-08 — Pro Tier with PayPal Live Subscriptions

### Added

#### 💎 Pro Subscription System
- **Two pricing tiers** with PayPal Smart Subscribe Buttons:
  - **Monthly** — `$2.99 USD / month` (Plan ID `P-7YN578147A145924NNH6Y32I`)
  - **Annual** — `$19.99 USD / year` (Plan ID `P-6XU39039F20435621NH6Y5GI`, ~44% savings)
- **7-day free trial** on both plans, no charge until day 8
- **Production-ready PayPal Live integration** — real subscriptions, real revenue
- **Sandbox credentials retained in source comments** for fast switch-back during development

#### 🔐 License Activation System
- **Auto-generated license code** on successful subscription: `SUPC-XXXX-XXXX-XXXX`
- **Crockford alphabet** — excludes confusable chars `0/O`, `1/I/L` for human-friendly typing
- **Per-character independent FNV-1a hashing** with position salt — eliminates leading-zero patterns
- **localStorage persistence** — license survives browser restart, validates on every load
- **Cross-device recovery** — paste license code into any device to re-activate Pro

#### 🎨 Header Pro Badge (state-aware)
- **`✨ 升級 Pro`** (orange/red gradient) — Free state, click to open upgrade modal
- **`⏱️ 試用 N 天`** (cyan) — Trial active, shows remaining days
- **`💎 Pro`** (gold gradient) — License active, click to view subscription info

#### 🚪 Pro Feature Gates (7 protection points)
- `tangent` — Phase 5 tangent line tool
- `integral` — Phase 5 integral region shading
- `slope` — Phase 5 slope field
- `intersect` — Phase 6 multi-function intersection solver
- `statistics` — Phase 7 statistics mode (histogram / regression / box plot)
- `3d` — Phase 8 3D surface plotting mode
- `svg` — SVG vector export

#### 🎁 Upgrade Modal
- **Side-by-side tier comparison** — Free vs Pro feature lists
- **Monthly / Annual toggle** with auto-computed price equivalent (`$1.67/月 if billed annually`)
- **Trigger-aware messaging** — modal shows which feature blocked entry (e.g., "切線可視化 是 Pro 專屬功能")
- **License entry section** — collapsible, accepts any input format (with/without dashes, lower/upper case)
- **PayPal Subscribe button + Debit/Credit card alternative** — both rendered by PayPal SDK
- **Success state** with copyable license display + Subscription ID

### Architecture
- **`gateProFeature(featureKey, callback)`** helper — wraps any function behind Pro check
- **`ProManager`** state object — `isProActive()`, `hasValidLicense()`, `isTrialActive()`, `setSubscription()`, `reset()`
- **`generateLicenseFromSubscription(subId)`** — deterministic per-subscription license derivation
- **Modular injection** — Pro CSS / HTML / JS designed as 4 separate blocks for clean integration into any single-file app

### Security
- License validation client-side only (MVP — known limitation, suitable for honor-system pricing)
- PayPal handles all payment processing; no credit card data ever touches our origin
- `Secret key` never embedded in client code (Live API secrets only used for backend OAuth, which we don't run)

### Documentation
- Added `docs/PRO_TIER.md` — full technical reference for the Pro module (architecture, API, gating points, PayPal setup walkthrough)
- Updated `README.md` and `README_EN.md` with Pro tier sections

### Verification
- **Local smoke test**: Live PayPal SDK loads without error; Subscribe button renders 2 iframes (PayPal + card) for both Monthly and Annual plans
- **All 7 gates verified**: blocked when Free, unlocked when Trial or Pro
- **Phase 5/6/7/8 features end-to-end tested under Pro**:
  - `x² ∩ (x+6)` returns `{(-2, 4), (3, 9)}` — exact analytical match
  - `N(5, 2)` sample (n=200) → mean `4.952` (within tolerance)
  - `z = sin(x)·cos(y)` renders saddle surface with HSL heat-map
- **License code format check**: regex `/^SUPC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/` validates both old (Sandbox) and new (Crockford) formats
- **Production deploy verified**: `https://boboidvtw.github.io/` serves 252KB index with `client-id=BAAwe...prky-9L0` (Live)

### Changed
- `index.html` grew from `225 KB` to `252 KB` (+27 KB, +788 LOC) — Pro module fully embedded, single-file architecture preserved

### Known Limitations
- Client-side license validation can be bypassed by tech-savvy users via DevTools (acceptable for v1; backend validation planned for v4 if revenue justifies)
- No automated email delivery of license codes — users see code in success modal and must save it themselves (compensated by `localStorage` persistence)
- License regeneration requires re-subscribing (no "lost license" recovery flow yet — falls back to manual support email)

---

## [3.0.0] - 2026-05-08 — Advanced Math Visualization

### Added

#### 📐 Phase 5 — Calculus Visualization
- **Tangent line tool**: Click any point on a curve to display the tangent line and the numerical derivative value `f'(x)`.
  - Algorithm: central difference formula with `h = 1e-5`.
  - Verified: `d/dx(x²)` at `x=2` returns `4.000` (exact analytical value).
- **Integral shading**: Click two points on a curve to shade the integration region between them and display `∫=value`.
  - Algorithm: Simpson's 1/3 rule with `n=1000` segments.
  - Verified: `∫₋₂³ x² dx` returns `11.667` (analytical: `35/3 ≈ 11.6667`).
- **Slope field**: Visualize the derivative direction over a `22×14` grid across the visible plane.
  - Useful for understanding ODE dynamics and qualitative behavior of derivatives.

#### ⊕ Phase 6 — Equation Solver (Multi-Function Intersections)
- **Bisection-refined intersection finder**: Sweep visible functions in pairs, detect sign changes, and refine roots to `1e-9` precision.
  - Algorithm: 800-point initial scan + bisection (max 60 iterations).
  - Auto-deduplication for nearby candidate roots.
  - Verified: `x² ∩ (x+6)` returns `{-2, 3}` exactly (analytical: roots of `x²-x-6=0`).
- More robust than Newton-Raphson — guaranteed convergence on sign-change intervals, no divergence risk.

#### 📊 Phase 7 — Statistics Mode
- **Histogram**: 12-bin auto-distribution with frequency labels and statistical summary (`n`, `mean`, `σ`, `min`, `max`).
  - Verified: `N(5, 2)` sample (n=200) → `mean=5.052`, `σ=1.955` (within expected tolerance).
- **Scatter + Linear Regression**: Least-squares regression line `y = mx + b` with coefficient of determination `R²`.
  - Verified: `y = 2x + 3 + noise` → regression `y = 1.999x + 3.136`, `R² = 0.9962`.
- **Box Plot**: Five-number summary (`min`, `Q1`, `median`, `Q3`, `max`) with whiskers at `1.5 × IQR` and red outlier markers.
  - Verified: `50 normal + 2 outliers` → correctly identifies `outliers = 2`.

#### 🎲 Phase 8 — 3D Surface Plotting
- **Pure Canvas 2D engine** — no WebGL, no Three.js, zero dependencies.
- Three render styles:
  - **Surface**: Filled quads with HSL heat-map color (low z → blue, high z → red).
  - **Wireframe**: Edge-only rendering for transparent overlay reading.
  - **Contour**: Stepped 10-level color quantization for elevation visualization.
- **Painter's algorithm** for correct depth ordering across `32×32 = 1024` faces.
- **Interactive controls**:
  - Mouse drag → rotate (`rotX`, `rotY`).
  - Scroll wheel → zoom (`0.2× ~ 5×`).
- Auto z-range computation with three-axis indicators (X red, Y green, Z blue).
- Verified: `z = sin(x)·cos(y)` produces a clean saddle surface; `z = sin(√(x²+y²))` produces concentric ripples.

### Architecture
- **3-mode tab system**: Function / Statistics / 3D — toggleable inside the graphing modal.
- **Tool selector** (function mode): Mark / Tangent / Integral / Slope, with dynamic tool hints.
- **Mode dispatch pattern**: `drawGraph` reassigned to `drawGraphDispatch` for backward compatibility while routing by active mode.
- **22 new i18n keys** localized across **4 languages** (zh-TW, en, zh-CN, ja) — 88 strings total.

### Changed
- `super-calc-index.html` grew from ~155 KB to ~225 KB (+700 LOC JS, +80 LOC CSS, +50 LOC HTML).
- Modal layout redesigned with two-tier navigation: mode tabs → tool/control bar → main canvas + side panel.

### Documentation
- Added `docs/PHASE5-8_COMPLETION.md` — full technical completion report with math verification table.
- Added `docs/RELEASE_NOTES.md` — user-facing release information.
- Added `docs/GRAPHING_FEATURE.md` — Phase 0-4 (v2.0) technical reference, retained for archival.
- Updated `README.md` and `README_EN.md` with detailed Phase 5-8 sections.

### Performance
- 3D rendering: ~30-60 fps on `32×32` surface (mid-range hardware).
- Statistics drawing: <50 ms for `n=200` samples.
- Intersection finding: <100 ms for 6 functions over `[-10, 10]` range.

### Known Limitations
- 3D resolution fixed at `32×32` (higher resolutions noticeably slower).
- Statistics charts use single color per chart (no grouping).
- Tangent / integral tools require explicit clicks (no drag-to-adjust).
- Slope field grid density fixed at `22×14`.

---

## [2.0.0] - 2026-05-07 — Function Graphing System

### Added

#### 📈 Multi-Function Plotting
- Display 2-6 functions simultaneously with distinct colors (6-color palette: cyan, purple, green, amber, red, pink).
- Toggle function visibility via checkboxes.
- Auto-scale Y-axis based on combined function ranges.

#### 🎮 Parameter Animation
- Extract parameters (`a, b, c, ...`) from expressions like `a*sin(b*x)`.
- Real-time sliders for parameter manipulation (range `-10` to `+10`, step `0.1`).
- Instant graph redraw on slider change.

#### 📥 Graph Export
- **PNG export** via `canvas.toDataURL()`.
- **SVG export** with full DOM reconstruction (text, paths, legend, theme-aware).

#### 🖱️ Interactive Marking
- Click any curve to mark coordinates with auto-snap (25 px threshold).
- Marked points display location and source function label.

#### 🔍 Special Point Detection
- **Zeros**: Sign-change interpolation between sample points.
- **Extrema**: 3-point derivative approximation (critical points where slope ≈ 0).
- 500-point sampling for accuracy.

### Security
- **XSS prevention**: User expressions (`fn.expr`) escaped via `escapeHTML()` before DOM injection.
- **Expression isolation**: Compiled with `new Function` in isolated scope (no `eval`).
- **Parameter safety**: Single-letter parameter regex excludes reserved math names (`sin`, `cos`, `exp`, ...).

### Fixed
- Scientific notation regex bug: `e` in `2e3` was incorrectly substituted with `Math.E`.
  - Old: `/(?<![a-zA-Z])e(?![a-zA-Z0-9])/g`
  - New: `/(?<![a-zA-Z0-9])e(?![a-zA-Z0-9])/g`

---

## [1.0.0] - 2026-04-21 — Initial Release

### Added
- Basic arithmetic operations (add, subtract, multiply, divide).
- Scientific calculation: trigonometric functions, logarithm, exponent, roots.
- Engineering calculation: base conversion, degree/radian toggle.
- Built-in formula library (Geometry, Physics, Chemistry, Finance).
- Traditional Chinese and English bilingual interface.
- Keyboard shortcut support.
- Calculation history via `localStorage`.
- Responsive design for desktop and mobile.
- MIT License.

---

## [Unreleased]

### Planned
- Multivariable calculus (partial derivatives, double integrals).
- Contour map for `z = f(x, y)` (2D projection of 3D surfaces).
- Animated surface evolution (parameter-driven).
- Histogram + normal distribution overlay.
- 3D cross-section / slice view.
- Export 3D scene as interactive HTML / SVG.
- Slider input debouncing for performance.
- High-DPI canvas scaling.
- PWA support (offline install).
