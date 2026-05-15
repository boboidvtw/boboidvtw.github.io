# ∑ Super Calculator

> 一款功能強大的萬能計算機，內建完整公式庫、函數繪圖、微積分可視化、統計圖表與 3D 表面繪圖，全部運行於單一 HTML 檔案中。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Version](https://img.shields.io/badge/version-3.3.1-blue.svg)](CHANGELOG.md)
[![Pro Tier](https://img.shields.io/badge/Pro-PayPal_Live-f59e0b?logo=paypal&logoColor=white)](#v33-安全架構升級-)
[![Security](https://img.shields.io/badge/license_validation-JWT_%2B_KV_backed-10b981?logo=cloudflare&logoColor=white)](#v33-安全架構升級-)

🌐 **線上版本**：https://boboidvtw.github.io/

---

## 目錄

- [專案介紹](#專案介紹)
- [v3.3 安全架構升級 🔐](#v33-安全架構升級-)
- [v3.1 Pro 訂閱制 💎](#v31-pro-訂閱制-)
- [v3.0 全新功能 ⭐](#v30-全新功能-)
- [功能總覽](#功能總覽)
- [快速開始](#快速開始)
- [使用方式](#使用方式)
- [技術架構](#技術架構)
- [數學驗證](#數學驗證)
- [多語系支援](#多語系支援)
- [公式庫說明](#公式庫說明)
- [常見問題](#常見問題)
- [開發者指南](#開發者指南)
- [更新日誌](#更新日誌)
- [授權條款](#授權條款)

---

## 專案介紹

Super Calculator 是一款以**純 HTML + JavaScript** 開發的計算機與數學可視化工具，**單一檔案、零依賴、開箱即用**。除了基本與科學計算外，還整合了完整的公式庫、互動式函數繪圖、微積分工具、統計圖表，以及自製的 3D 表面繪圖引擎。

### 設計理念

- 🎯 **零依賴**：單一 HTML 檔案，不需安裝、不需網路，雙擊即用
- 📚 **教育導向**：可視化複雜數學概念（微分、積分、迴歸、3D 曲面）
- 🌐 **完整離線**：所有運算與渲染都在本地 Canvas 完成
- 🔒 **安全優先**：使用者輸入經過 XSS 防護與表達式隔離評估
- 🌏 **跨平台**：桌面、平板、手機瀏覽器皆相容
- 🌍 **多語系**：繁中、英文、簡中、日文完整 i18n

---

## v3.3 安全架構升級 🔐

v3.3 系列（2026-05-14 一日內完成 v3.2.0 → v3.3.1）將 Pro 訂閱驗證從**純前端**升級為**伺服器簽署 + 即時撤銷**架構，徹底解決 v3.1 純前端授權碼的安全漏洞，並建立 Sandbox/Live 雙模式以便日後測試。

### 為什麼必須升級？

v3.1 用前端 FNV-1a 雜湊產生 Crockford 授權碼（`SUPC-XXXX-XXXX-XXXX`），**沒有實際驗證能力**。任何讀過 JS 原始碼的人都能本機產生有效授權碼，繞過付費。v3.2.1 後改為 **JWT + Cloudflare Worker + KV-backed 訂閱狀態驗證**，徹底封堵這個漏洞。

### 架構總覽

```
┌────────────────────────────────────────────────────────────┐
│  GitHub Pages (boboidvtw.github.io)                         │
│    └─ index.html + 5 個 JS 模組                              │
│       ├─ pro-config.js       設定（依模式切換 endpoints）   │
│       ├─ license-api.js      JWT API 客戶端 + retry          │
│       ├─ pro-manager.js      狀態管理 + 自動續期             │
│       ├─ paypal-integration.js  PayPal SDK 動態載入          │
│       └─ pro-ui.js           Modal、徽章、Sandbox banner     │
└──────────────────────────┬─────────────────────────────────┘
                           │ HTTPS (CORS)
                           ↓
┌────────────────────────────────────────────────────────────┐
│  Cloudflare Workers + KV                                    │
│    ┌─ Live Worker        :  *.workers.dev (real money)       │
│    │   └─ KV: LICENSES                                       │
│    └─ Sandbox Worker     :  *-sandbox.workers.dev (test)     │
│        └─ KV: LICENSES_SANDBOX                               │
│                                                              │
│    端點：                                                    │
│      GET  /health           健康檢查（含 KV ping）           │
│      POST /license/issue    要求 KV active 才簽 7 天 JWT     │
│      POST /license/validate JWT 簽名 + KV 即時撤銷檢查       │
│      POST /webhook/paypal   PayPal 簽名驗證 + 更新 KV state  │
│      GET  /subscription/:id 查 KV state（除錯用）            │
└──────────────────────────┬─────────────────────────────────┘
                           │ verify-webhook-signature API
                           ↓
                       PayPal
```

### 安全防禦矩陣

| 攻擊向量 | 防禦結果 | 驗證 |
|---------|---------|------|
| 偽造 `subscriptionId` 索取 JWT | ❌ 404 — KV 中查無此訂閱 | 真實測試通過 |
| 偽造 PayPal Webhook（無真 cert） | ❌ 401 — `verify-webhook-signature` API 拒絕 | Simulator 確認 |
| 真實 PayPal Webhook（用真 cert） | ✅ 200 通過驗證 | Sandbox e2e 驗證 |
| 訂閱取消後繼續用舊 JWT | ❌ 401 — 每次 validate 重查 KV | Sandbox e2e 驗證 |
| 訂閱取消後嘗試重簽 | ❌ 403 — KV `status !== 'active'` | 端點測試通過 |
| 竊取 `SECRET_KEY` | ❌ 存於 Cloudflare Secret，不在 code/repo 中 | 設計層級保證 |

### 即時撤銷機制（核心改進）

| 階段 | 行為 | 失效時間 |
|------|------|---------|
| 使用者取消訂閱 | PayPal 發送 `BILLING.SUBSCRIPTION.CANCELLED` Webhook | T |
| Worker 驗證簽名 + 更新 KV `status='cancelled'` | T + ~1 秒 |
| 使用者下次操作觸發 `/license/validate` | T + ?（依操作） |
| Worker 從 KV 讀到 cancelled → 401 | **立即失效** |
| 前端每 6 小時自動 `verifyWithServer` | **最遲 6 小時內失效** |

舊架構（純 JWT 1 年）若訂閱取消，使用者仍可繼續用一整年。新架構**最遲 6 小時內失效**，配合下次操作即可立即失效。

### Sandbox 雙模式

因台灣 PayPal 限制（賣家不能收同國買家付款），無法用 Live 環境自我測試。v3.3 引入 query param 切換：

| 模式 | 入口 | 用途 |
|------|------|------|
| Live | `https://boboidvtw.github.io/` | 正式付費客戶 |
| Sandbox | `https://boboidvtw.github.io/?sandbox=1` | 測試用，不會真扣款，**頂部顯示橘色警告條** |

Sandbox 模式使用獨立的 PayPal 測試帳號、獨立的 Cloudflare Worker、獨立的 KV namespace，且 `localStorage` keys 加 `_sb` 後綴避免污染正式資料。

### 模組職責

| 模組 | 行數 | 職責 |
|------|------|------|
| `pro-config.js` | 95 | 集中設定。偵測 `?sandbox=1` 切換 endpoints、PayPal client-id、plan IDs、storage keys |
| `license-api.js` | 124 | Worker API 客戶端。提供 `issueWithRetry`（404 / 403+pending 都會 retry）、`validate`、`parsePayload` |
| `pro-manager.js` | 236 | Pro 狀態管理。`isProActive` 同步快檢；`verifyWithServer` 背景重驗（6 小時間隔）；`refreshTokenIfNeeded` 自動續期（剩 48 小時觸發） |
| `paypal-integration.js` | 140 | PayPal Subscribe Button。`loadPayPalSDK` 動態載入 SDK（不再 hardcode client-id）；`onApprove` 帶 retry 進度顯示 |
| `pro-ui.js` | 320 | Modal、Pro 徽章、Plan 切換、Sandbox 警告條、初始化 |

### 部署檢查清單

| 項目 | 位置 | 必須設定 |
|------|------|---------|
| Cloudflare Worker (Live) | `supercalc-license-validator.boboidvtw.workers.dev` | 5 個 env vars + `LICENSES` KV binding |
| Cloudflare Worker (Sandbox) | `supercalc-license-validator-sandbox.boboidvtw.workers.dev` | 同樣 5 個 env vars + `LICENSES_SANDBOX` KV binding |
| PayPal Live Webhook | PayPal Dashboard | URL 指向 Live Worker，訂閱 8+ 個事件 |
| PayPal Sandbox Webhook | PayPal Sandbox Dashboard | URL 指向 Sandbox Worker |

Worker secret 命名：`SECRET_KEY`（JWT 簽名）、`PAYPAL_CLIENT_ID`、`PAYPAL_CLIENT_SECRET`。Plaintext 變數：`PAYPAL_API_BASE`、`PAYPAL_WEBHOOK_ID`。

### 給開發者：本地測試

不需要真實 PayPal 帳號即可測試前端模組：

```bash
cd boboidvtw.github.io
python3 -m http.server 8765
# 訪問 http://localhost:8765/?sandbox=1
```

Sandbox 模式會打到線上的 Sandbox Worker（不是本地的）。如需本地 Worker，使用 `wrangler dev`。

---

## v3.1 Pro 訂閱制 💎

v3.1 引入 **Pro 訂閱制**，將進階數學視覺化功能整合進付費層，由 **PayPal Live** 處理金流。免費版維持完整可用，所有基礎與函數繪圖功能不變，僅將 v3.0 推出的 Phase 5/6/7/8 視為 Pro 功能。

> 💡 v3.3 起，授權碼系統從純前端 Crockford 升級為 JWT + KV-backed 即時撤銷。詳見 [v3.3 安全架構升級](#v33-安全架構升級-)。

### 兩種訂閱方案

| 方案 | 月費 | 年費（推薦）|
|------|------|------------|
| 價格 | **$2.99 USD / 月** | **$19.99 USD / 年** |
| 等效月費 | $2.99 | $1.67（**省 44%**）|
| 7 天免費試用 | ✅ | ✅ |
| 隨時取消 | ✅ | ✅ |

### 免費版（Free）保留功能

- ✅ 完整基礎與科學計算（運算、進位、單位、公式庫）
- ✅ 函數繪圖 + 標記 + 特殊點偵測（零點 / 極值）
- ✅ PNG 匯出
- ✅ 4 國語言 + Light/Dark 主題
- 🟡 含 Google AdSense 廣告

### Pro 版解鎖功能

| Pro 功能 | 對應階段 | Free 可用？ |
|---------|----------|:---------:|
| 📐 切線可視化 | Phase 5 | ❌ |
| ∫ 積分區域著色 | Phase 5 | ❌ |
| ↗ 斜率場 | Phase 5 | ❌ |
| ⊕ 多函數交點求解 | Phase 6 | ❌ |
| 📊 統計圖表（直方圖 / 迴歸 / 盒狀） | Phase 7 | ❌ |
| 🎲 3D 表面繪圖 | Phase 8 | ❌ |
| 📥 SVG 向量匯出 | v2 enhancement | ❌ |

### 完整使用者流程

```
免費訪客
  → 點擊 Pro 功能（例如 📐 切線）
  → 跳出升級 Modal（含觸發功能名稱）
  → 切換月付 / 年付 → 看到 PayPal Subscribe 按鈕
  → 點擊 → PayPal 結帳視窗
  → 同意訂閱（首 7 天免費）
  → 自動產生授權碼 SUPC-XXXX-XXXX-XXXX 並儲存於 localStorage
  → 升級 Modal 顯示成功畫面 + 授權碼（可複製保存）
  → 主畫面 Header 徽章變為 💎 Pro
  → 全部 Pro 功能立即解鎖

換裝置 / 清快取
  → 主畫面點 ✨ 升級 Pro 按鈕
  → 展開「已經購買？」→ 貼回授權碼
  → 立即重新啟用 Pro
```

### 授權碼設計亮點

- 格式：`SUPC-XXXX-XXXX-XXXX`（3 段 × 4 字 = 12 個英數字）
- **Crockford alphabet**：排除 `0/O`、`1/I/L` 易混淆字
- **每位獨立 FNV-1a 雜湊** 避免 padStart 補零導致全是 `0` 的情況
- **格式寬容**：輸入大小寫、有無 dash 都能正確解析

### 客服聯絡

```
💌 boboidvtw+supercalc@gmail.com
```

完整 Pro 模組技術細節見 [docs/PRO_TIER.md](docs/PRO_TIER.md)。

---

## v3.0 全新功能 ⭐

### 📐 Phase 5 — 微積分可視化（Calculus Visualization）

| 工具 | 說明 | 演算法 |
|------|------|--------|
| **切線顯示** | 點擊曲線顯示該點切線 + 數值微分值 | 中央差分法 (h=1e-5) |
| **積分區域** | 點擊兩點顯示 ∫ 區域並計算面積 | Simpson 1/3 法則 (n=1000) |
| **斜率場** | 22×14 格點顯示函數的微分方向場 | 數值微分逐格計算 |

**驗證範例**：
- `f(x) = x²` 在 `x=2` 的切線斜率 = **4.000**（理論 `2x|x=2 = 4` ✓）
- `∫₋₂³ x² dx` = **11.667**（理論 `35/3 ≈ 11.6667` ✓）

### ⊕ Phase 6 — 方程求解器（Multi-Function Intersections）

點擊「⊕ 交點」按鈕，自動找出所有可見函數兩兩之間的交點。

- 演算法：800 點掃描 → 偵測 sign change → **Bisection 二分法精化** (1e-9 精度，最多 60 次迭代)
- 自動去重：相鄰候選點抑制
- 比 Newton-Raphson 更穩定，無發散風險

**驗證範例**：
- `x² ∩ (x+6)` → 找到精確交點 **(-2, 4)** 與 **(3, 9)**
- 解析解：`x²-x-6=0` → `x∈{-2, 3}` ✓

### 📊 Phase 7 — 統計圖表（Statistics Mode）

切換到「📉 統計」模式，輸入資料即可繪製：

| 圖表類型 | 輸出 | 用途 |
|----------|------|------|
| **直方圖 (Histogram)** | 12 bins、頻數、`n/mean/σ/min/max` | 單變量分布 |
| **散佈圖 + 線性迴歸** | `y = mx + b`、`R²` | 相關性分析 |
| **盒狀圖 (Box Plot)** | 五數摘要 + IQR + 離群點 | 分佈離散度 |

**驗證範例**：
- N(5, 2) 樣本 200 個 → `mean=5.052`, `σ=1.955`（誤差 < 3%）
- 線性迴歸 `y=2x+3+noise` → `y=1.999x+3.136`, **R²=0.9962**
- 50 正常 + 2 離群點 → 正確識別 `outliers=2`

### 🎲 Phase 8 — 3D 表面繪圖（z = f(x,y)）

切換到「🎲 3D」模式，輸入 `z = f(x,y)` 即可繪製互動式 3D 曲面：

- **自製輕量 3D 引擎**：純 Canvas 2D，不使用 WebGL/Three.js
- **三種渲染風格**：Surface（彩色填充）/ Wireframe（線框）/ Contour（等高階梯）
- **HSL 熱度圖**：低 z → 藍 (240°)，高 z → 紅 (0°)
- **互動操作**：滑鼠拖曳旋轉、滾輪縮放（0.2× ~ 5×）
- **畫家算法**：32×32 = 1024 個面，按平均 z 深度排序

**經典範例**：
- `z = sin(x)*cos(y)` → 馬鞍曲面（鞍點清晰可見）
- `z = sin(sqrt(x²+y²))` → 同心圓波紋
- `z = x²-y²` → 雙曲拋物面

---

## 功能總覽

### 🧮 基礎與科學計算
- 四則運算、括號優先級、退格、清除
- 三角函數（sin/cos/tan + 反函數）、指數對數、平方根、立方根、n 次方根
- 階乘、排列、組合、進位轉換、角度/弧度切換、矩陣運算、單位換算

### 📚 內建公式庫
- **幾何**：圓面積、球體積、勾股定理…（20+ 公式）
- **物理**：牛頓第二定律、歐姆定律、動能…（30+ 公式）
- **化學**：理想氣體定律、pH 值、莫耳濃度…（15+ 公式）
- **財務**：複利、貸款、NPV、IRR…（10+ 公式）

### 📈 函數繪圖（v2.0）
- 同時顯示 2-6 個函數，自動配色
- **參數動畫**：表達式中的 `a, b, c...` 自動產生滑桿，即時重繪
- **特殊點偵測**：零點（sign change）、極值點（3-點導數逼近）
- **匯出**：PNG（Canvas blob）/ SVG（DOM 重建，含座標軸與圖例）
- **點擊標記**：點擊曲線標記座標，自動 snap 至最近曲線
- **Hover 提示**：滑鼠移過顯示即時 `(x, f(x))` 座標

### 📐 微積分工具（v3.0 新增）
- 切線可視化、積分區域著色、斜率場

### ⊕ 方程求解（v3.0 新增）
- 多函數交點偵測（Bisection 二分法精化）

### 📊 統計圖表（v3.0 新增）
- 直方圖、散佈圖+線性迴歸、盒狀圖

### 🎲 3D 表面繪圖（v3.0 新增）
- z=f(x,y) 自製 Canvas 2D 引擎、三種渲染、互動旋轉縮放

### 🌐 多語系
- 繁體中文（zh-TW）、English、简体中文（zh-CN）、日本語（ja）— 完整 i18n

### 🎨 主題切換
- 淺色 / 深色模式，CSS Variables 驅動

---

## 快速開始

### 線上使用（推薦）

直接造訪 → **https://boboidvtw.github.io/**

### 本地離線使用

```bash
# 方法 1：直接下載
curl -O https://raw.githubusercontent.com/boboidvtw/boboidvtw.github.io/main/index.html
# 雙擊 index.html 開啟

# 方法 2：clone 整個 repo
git clone https://github.com/boboidvtw/boboidvtw.github.io.git
cd boboidvtw.github.io
# 雙擊 index.html 或：
python3 -m http.server 8080
# 瀏覽器開啟 http://localhost:8080
```

---

## 使用方式

### 鍵盤快捷鍵

| 按鍵 | 功能 |
|------|------|
| `0–9` | 數字輸入 |
| `+ - * /` | 四則運算 |
| `Enter` / `=` | 計算結果 |
| `Escape` | 全清（AC） |
| `Backspace` | 退格 |
| `(` `)` | 括號 |

### 函數繪圖工作流程

1. **開啟繪圖**：點擊主介面「📈 繪圖」按鈕
2. **選擇模式**：頂部 tabs 切換「📊 函數 / 📉 統計 / 🎲 3D」
3. **輸入函數**：例如 `x^2`、`sin(x)`、`a*sin(b*x)`
4. **設定範圍**：X min/max（預設 `-10` ~ `10`）

#### 📊 函數模式進階工具

選擇底部「工具列」：
- 🟢 **標記** — 點擊曲線標記座標
- 📐 **切線** — 點擊曲線顯示該點切線（再點同處可清除）
- ∫ **積分** — 點擊起點再點終點，自動著色積分區域
- 〽️ **斜率場** — 顯示視覺化微分場（再點關閉）
- ⊕ **交點** — 自動找出所有函數的兩兩交點

#### 📉 統計模式

1. 選擇圖表類型（直方圖 / 散佈圖 / 盒狀圖）
2. 輸入資料：
   - **單列數值**（直方圖、盒狀圖）：`1.5, 2.3, 3.1, 4.2, ...`
   - **x,y 對組**（散佈圖）：`0,1; 1,3; 2,5; 3,7; ...`
3. 點擊「繪製」即可

#### 🎲 3D 模式

1. 輸入 `z = f(x,y)` 表達式（例：`sin(x)*cos(y)`）
2. 設定 X / Y 範圍
3. 選擇渲染風格（Surface / Wireframe / Contour）
4. 點擊「渲染」
5. **拖曳旋轉**、**滾輪縮放**

### 表達式語法參考

| 寫法 | 對應 |
|------|------|
| `x^2` | x² |
| `sqrt(x)`、`x^0.5` | √x |
| `sin(x)`、`cos(x)`、`tan(x)` | 三角函數（弧度制） |
| `asin(x)`、`acos(x)`、`atan(x)` | 反三角函數 |
| `e^x`、`exp(x)` | 指數 |
| `ln(x)`、`log(x)` | 自然對數、常用對數 |
| `abs(x)` | 絕對值 |
| `pi`、`e` | π、e（Math.PI / Math.E） |
| `a*sin(b*x)` | 含參數 a, b（自動產生滑桿） |

### 公式庫使用

1. 點擊「公式庫」按鈕開啟面板
2. 選擇分類（數學 / 物理 / 化學 / 財務）
3. 點選所需公式，自動帶入計算框
4. 填入數值，按 `=` 計算

---

## 技術架構

```
boboidvtw.github.io/
├── index.html              # 主程式（225 KB，單一檔案應用）
│   ├── HTML 結構           # 計算機 UI + 繪圖 modal（3 模式 tabs）
│   ├── CSS 樣式            # 響應式設計、CSS Variables 主題
│   └── JavaScript          # 約 4,300 行
│       ├── 計算引擎        # 表達式解析、四則、科學運算
│       ├── 公式庫          # 數學/物理/化學/財務公式
│       ├── 繪圖引擎 v2.0   # 多函數、參數動畫、特殊點、匯出
│       ├── 微積分工具      # 切線、積分、斜率場
│       ├── 方程求解        # Bisection 交點偵測
│       ├── 統計圖表        # 直方圖、散佈、盒狀
│       └── 3D 引擎         # 自製 Canvas 2D 旋轉投影
├── docs/
│   ├── FORMULAS.md         # 公式庫完整清單
│   ├── FAQ.md              # 常見問題
│   ├── PHASE5-8_COMPLETION.md  # v3.0 技術完成報告
│   ├── RELEASE_NOTES.md    # 用戶向發行說明
│   └── GRAPHING_FEATURE.md # v2.0 繪圖功能技術參考
├── CHANGELOG.md
├── CLAUDE.md / Design.md   # AI 工具設計指南
├── LICENSE
├── README.md / README_EN.md
└── .gitignore
```

### 技術選型

| 領域 | 選擇 | 理由 |
|------|------|------|
| 渲染 | Canvas 2D | 零依賴、廣泛相容、易控制 |
| 3D | 自製旋轉投影 + 畫家算法 | 教育性、無需 WebGL |
| 數值微分 | 中央差分 | 二階精度、實作簡單 |
| 數值積分 | Simpson 1/3 | 四階精度、收斂快 |
| 求根 | Bisection | 穩健、保證收斂 |
| 迴歸 | 最小平方法 | 解析解、無迭代 |
| 儲存 | localStorage | 純前端、無伺服器 |
| i18n | data-i18n 屬性 + JSON 字典 | 純前端、可擴展 |

### 數值方法詳解

```javascript
// 中央差分（Phase 5 切線）
numericalDerivative(fn, x, params, h=1e-5)
  → (fn(x+h) - fn(x-h)) / (2*h)
  → 二階精度 O(h²)

// Simpson 1/3 法則（Phase 5 積分）
numericalIntegral(fn, a, b, params, n=1000)
  → (h/3) * [f(x₀) + 4·Σf(x_odd) + 2·Σf(x_even) + f(xₙ)]
  → 四階精度 O(h⁴)

// Bisection（Phase 6 交點精化）
refinePairBisection(fA, fB, lo, hi, params)
  → 對 g(x) = fA(x) - fB(x) 做二分
  → 收斂條件：|g(mid)| < 1e-9 或 (hi-lo)/2 < tol

// 3D 投影（Phase 8）
project3D(x, y, z, state, w, h)
  → 1. X 軸旋轉（仰角 rotX）
  → 2. Y 軸旋轉（方位 rotY）
  → 3. 正交投影（科學視覺化首選）
  → 4. 縮放 zoom
```

---

## 數學驗證

| 測試案例 | 期望值 | 實際輸出 | 狀態 |
|----------|--------|----------|:---:|
| `d/dx(x²)` at `x=2` | 4 | 4.000 | ✅ |
| `∫₋₂³ x² dx` | 35/3 ≈ 11.667 | 11.667 | ✅ |
| `x² ∩ (x+6)` 交點 | `{-2, 3}` | `{-2.000, 3.000}` | ✅ |
| `N(5, 2)` 樣本 (n=200) mean | ≈ 5 | 5.052 | ✅ |
| `N(5, 2)` 樣本 (n=200) σ | ≈ 2 | 1.955 | ✅ |
| 線性迴歸 `y=2x+3+noise` | `(m, b) = (2, 3)` | `(1.999, 3.136), R²=0.9962` | ✅ |
| `z=sin(x)cos(y)` 範圍 | `[-1, 1]` | `[-1.00, 1.00]` | ✅ |

完整技術細節見 [docs/PHASE5-8_COMPLETION.md](docs/PHASE5-8_COMPLETION.md)。

---

## 多語系支援

| 語言 | 計算機 | 公式庫 | 繪圖 | 統計 | 3D | 狀態 |
|------|:------:|:------:|:----:|:----:|:--:|:-----:|
| 繁體中文 (zh-TW) | ✅ | ✅ | ✅ | ✅ | ✅ | 完整（預設） |
| English (en) | ✅ | ✅ | ✅ | ✅ | ✅ | 完整 |
| 简体中文 (zh-CN) | ✅ | ✅ | ✅ | ✅ | ✅ | 完整 |
| 日本語 (ja) | ✅ | ✅ | ✅ | ✅ | ✅ | 完整 |

**切換語言**：點擊介面右上角語言選單。所有 UI 元素（按鈕、標籤、提示、錯誤訊息、繪圖工具列）會即時切換。v3.0 新增 22 個 i18n 鍵 × 4 語言 = **88 條翻譯**。

---

## 公式庫說明

完整公式清單請見 [docs/FORMULAS.md](docs/FORMULAS.md)。

### 公式分類總覽

| 分類 | 公式數量 | 範例 |
|------|----------|------|
| 幾何 | 20+ | 圓面積 `A=πr²`、球體積 `V=⁴⁄₃πr³`、勾股定理 |
| 物理 | 30+ | 牛頓第二定律 `F=ma`、歐姆定律 `V=IR`、動能 `E=½mv²` |
| 化學 | 15+ | 理想氣體定律 `PV=nRT`、pH = -log[H⁺] |
| 財務 | 10+ | 複利 `A=P(1+r)ⁿ`、NPV、IRR、貸款月付 |

---

## 常見問題

完整 FAQ 請見 [docs/FAQ.md](docs/FAQ.md)。

**Q：需要網路連線嗎？**
A：不需要。下載 `index.html` 後可完全離線運行，所有運算（包括 3D 渲染）都在本地完成。

**Q：支援哪些瀏覽器？**
A：Chrome 90+、Firefox 88+、Safari 14+、Edge 90+。3D 模式建議使用 2018 年以後的硬體。

**Q：為什麼選擇 Canvas 2D 而非 WebGL 做 3D？**
A：教育目的優先 — 自製旋轉矩陣 + 畫家算法讓學習者能完整理解 3D 渲染原理，且無需處理 WebGL 上下文相容性問題。32×32 解析度在多數裝置上流暢運行。

**Q：表達式可以多複雜？**
A：支援大部分 JavaScript `Math.*` 函數，包括巢狀括號。範例：`a*sin(b*x) + cos(c*x²) - sqrt(abs(x))`。但避免使用 `eval`，所有表達式經過 `new Function` 隔離編譯。

**Q：計算歷史會保留嗎？**
A：會，儲存於瀏覽器 `localStorage`，清除快取後消失。不會上傳任何資料。

**Q：交點偵測為什麼用 Bisection 而非 Newton-Raphson？**
A：Bisection 對所有 sign-change 區間**保證收斂**，避免 Newton 在反曲點附近的發散風險。雖然收斂速度較慢，但 1e-9 精度只需 ~30 次迭代，對使用者體驗無感。

---

## 開發者指南

### 本地開發

```bash
git clone https://github.com/boboidvtw/boboidvtw.github.io.git
cd boboidvtw.github.io

# 啟動靜態 HTTP 伺服器
python3 -m http.server 8080
# 或
npx serve .

# 瀏覽器開啟 http://localhost:8080
```

### 新增公式

在 `index.html` 的公式庫物件中新增：

```javascript
{
  name: "公式名稱",
  formula: "f(x) = ...",
  variables: ["x", "y"],
  category: "geometry",  // geometry | physics | chemistry | finance
  description: "公式說明"
}
```

### 新增 3D 預設曲面

在 3D 模式預設範例中加入：

```javascript
// 編輯 default3DExpr 區段
const presets = [
  { name: "馬鞍面", expr: "sin(x)*cos(y)" },
  { name: "波紋", expr: "sin(sqrt(x*x+y*y))" },
  // 新增此處
  { name: "高斯", expr: "exp(-(x*x+y*y))" }
];
```

### 貢獻指南

1. Fork 此 repo
2. 建立 feature branch：`git checkout -b feat/your-feature`
3. 開發並測試（瀏覽器手動驗證 + 數學正確性檢查）
4. Commit：`git commit -m 'feat: 新增某功能'`
5. Push：`git push origin feat/your-feature`
6. 開 Pull Request，附上測試說明與螢幕截圖

### Coding 規範

- 純 Vanilla JS，避免引入框架（保持單檔可攜性）
- 表達式評估必須經過 `new Function` 隔離（禁用 `eval`）
- 使用者輸入必須經過 `escapeHTML()` / `escapeXML()`
- 數值演算法務必附上理論值驗證（理論解 vs 實作值）
- 新增 UI 元素必須加 `data-i18n` 屬性，並在 4 語言字典補齊翻譯

---

## 更新日誌

完整更新記錄請見 [CHANGELOG.md](CHANGELOG.md)。

### v3.1.0 (2026-05-08) 💎
- 💳 PayPal Live 訂閱制（月費 $2.99 / 年費 $19.99，含 7 天免費試用）
- 🔐 授權碼系統（`SUPC-XXXX-XXXX-XXXX`，Crockford 字母表）
- 🎨 Header 動態 Pro 徽章（Free / Trial / Pro 三態）
- 🚪 7 個 Pro 功能保護點（Phase 5/6/7/8 + SVG 匯出）
- 🎁 升級 Modal 含月付/年付切換、觸發感知訊息、授權碼啟用

### v3.0.0 (2026-05-08) ⭐
- 📐 微積分可視化（切線 / 積分 / 斜率場）
- ⊕ 方程求解器（Bisection 多函數交點）
- 📊 統計圖表（直方圖 / 散佈+迴歸 / 盒狀圖）
- 🎲 3D 表面繪圖（純 Canvas 自製引擎）
- 🌍 i18n +22 鍵 × 4 語言

### v2.0.0 (2026-05-07)
- 📈 多函數繪圖系統（2-6 函數同顯）
- 🎮 參數動畫（自動產生滑桿）
- 📥 PNG / SVG 匯出
- 🖱️ 點擊標記、特殊點偵測（零點 / 極值）
- 🔒 XSS 防護、表達式安全隔離

### v1.0.0 (2026-04-21)
- 🎉 初始發布
- ✅ 基礎四則運算
- ✅ 科學計算功能
- ✅ 公式庫系統
- ✅ 中英文雙語支援

---

## 授權條款

本專案**程式碼**採用 [MIT License](LICENSE) 授權，您可以自由 fork、修改、再發布。

Copyright © 2026 MoneyAI168. All rights reserved (except where the MIT License explicitly grants rights to the source code).

### 🛡️ MIT 不涵蓋的部分

MIT 授權**只涵蓋程式碼**，下列內容由 MoneyAI168 獨立保留，**不在 MIT 範圍**：

- 🏷️ **商標與品牌**：`∑ Calc™`、`∑ Super Calculator™`、`∑ Calc Pro™`、`MoneyAI168™` — fork 時**必須改名**
- 🌐 **官方 SaaS 服務**：Live License Worker、KV namespace、PayPal merchant 帳號、訂閱者資料
- 🎨 **視覺資產**：Logo、Icon、行銷素材、文件截圖
- 🔗 **域名**：`boboidvtw.github.io`、`moneyai168.com` 及任何官方子域名

完整細節見 [NOTICE.md](NOTICE.md)。

### 📜 服務條款

使用本網站或 Pro 訂閱服務需遵守 [Terms of Service](TERMS.md)，與 MIT 授權**獨立並行**。

### 📧 聯絡

商標、商業合作、法律事務窗口：**legal@moneyai168.com**

---

## 致謝

- **實作**：Amy Agent（Claude Haiku 4.5 + Opus 4.7 協作）
- **架構**：Phase-based TDD 漸進開發
- **QA**：純瀏覽器整合測試 + 數學正確性驗證
- **文件**：完整的雙語 README + 技術完成報告

---

*如有問題或建議，歡迎開 [Issue](https://github.com/boboidvtw/boboidvtw.github.io/issues) 或提 [Pull Request](https://github.com/boboidvtw/boboidvtw.github.io/pulls)。*

**🌸 Made with care by Amy Agent.**
