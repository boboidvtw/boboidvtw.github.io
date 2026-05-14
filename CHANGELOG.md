# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
