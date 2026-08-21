# Open-Calculator — AI 開發指引

> 這份文件給 AI / LLM 閱讀，說明本專案的版面設計邏輯、元件慣例、JS 架構。
> 每次修改前請先讀完，可避免 90% 的來回調整。

---

## 1. 專案概覽

| 項目 | 說明 |
|------|------|
| 檔案結構 | **單一 HTML 檔**（`index.html`），CSS + JS 全部內嵌 |
| 部署位置 | GitHub Pages：`https://boboidvtw.github.io/` |
| 主要功能 | 計算機、單位換算、匯率、公式庫（內建 + 自建）、儲存記錄 |
| 支援語言 | 繁中 / 英文 / 簡中 / 日文（`i18n` 物件切換） |
| 主題 | 深色（預設）/ 淺色，`body.light` class 切換 |
| 廣告 | 目前**無任何廣告聯播網**（AdSense 2026-05 被拒、殘留 script 已於 v3.8.3 移除；Carbon Ads 2026-07 申請被拒）|

---

## 2. 版面架構

```
<body>
  <div class="container">            ← 最外層，max-width: 1200px
    <!-- Header -->
    <div class="header">             ← 標題 + 語言選擇器 + 主題切換 + ? 說明按鈕
    </div>

    <!-- 主內容雙欄 Grid -->
    <div class="main-grid"           ← display: grid; grid-template-columns: 1fr 1fr
         style="...">
      <!-- 左欄：主計算區 -->
      <div>
        <div class="panel">          ← 計算機主體（含 5 個 tab）
        </div>
      </div>

      <!-- 右欄：Sidebar（手機隱藏）-->
      <div class="main-sidebar">     ← 桌機顯示，手機 display:none
        <div class="panel">常用按鈕</div>
        <div class="panel">支援函數</div>
        <div class="panel">即時匯率</div>
      </div>
    </div>
  </div>

  <!-- Modal：說明（? 按鈕觸發）-->
  <div id="helpModal">...</div>

  <!-- Modal：公式計算（點公式卡片觸發）-->
  <div id="formulaModal">...</div>
</body>
```

### 響應式規則（v3.11.0 更新）

```css
/* 手機（≤ 768px）*/
@media (max-width: 768px) {
    /* 必須是 minmax(0, 1fr)，不能只寫 1fr */
    .main-grid { grid-template-columns: minmax(0, 1fr) !important; }

    /* 導覽三列收進三槓下拉選單 #navMenu */
    .controls, .tabs, .calc-cats { display: none !important; }
    .nav-toggle { display: inline-flex; }
}
```

**⚠️ `1fr` 是陷阱，不要改回去。** `1fr` 軌道的自動最小值是 min-content，而 `.panel`
的 min-content 被裡面 4 欄鍵盤撐到 411px。容器只有 335px，軌道會拒絕縮 —— 375px 寬時
整頁溢出到 478px、運算子整欄跑到畫面外。v3.11.0 修掉的就是這個。改寫時記得這條規則
自己帶 `!important`，元素上還有 inline 的 `grid-template-columns`，不帶就毫無作用。

**手機導覽**：`.controls`（7 顆 header 按鈕）、`.tabs`（5 個主分頁）、`.calc-cats`
（5 個鍵盤分類）在 ≤768px 隱藏，改由 header 右側的三槓下拉面板呈現。
**面板內容不要另外寫一份 markup** —— `renderNavMenu()` 每次開啟時從這三處的既有節點
投影產生，加新按鈕到 `.controls` / `.tabs` / `.calc-cats` 就會自動出現在選單裡。

**右欄 sidebar**：v3.5.2 起手機版不再是 `display: none`，而是底部固定浮動列
（只留 `π e ( ) ,` 五顆快捷鍵），因為手機沒有它就閉合不了 `sin(` 這類函式括號。

---

## 3. CSS 設計系統

### CSS 變數（色彩 Token）

```css
:root {
    --primary:             #06b6d4;   /* 青色，主視覺色 */
    --primary-dark:        #0891b2;   /* hover 狀態 */
    --bg-dark:             #0f172a;   /* 最深背景 */
    --bg-dark-secondary:   #1e293b;   /* Panel 背景 */
    --bg-dark-tertiary:    #334155;   /* Input / 按鈕背景 */
    --text-dark:           #ffffff;   /* 主要文字 */
    --text-dark-secondary: #cbd5e1;   /* 次要文字 */
    --border-dark:         #475569;   /* 邊框：僅裝飾性分隔線用 */

    /* 對比專用 token —— 飽和強調色直接當「文字色」或「互動邊界」時，
       兩個主題各有一側不及格，故與視覺色分家。完整清單見 index.html 的 :root。 */
    --border-interactive:  #94a3b8;   /* 表單控制項邊界，需對底 3:1（1.4.11）*/
    --border-accent:       var(--primary);
    --border-accent-green: var(--green);
    --primary-text:        #22d3ee;   /* 青色當文字色用，需 4.5:1（1.4.3）*/
    --green-text:          #34d399;
    --text-on-accent:      #0f172a;   /* 實心強調色底上的文字，固定深色不翻轉 */
}

/* 淺色主題：body.light 覆蓋同名變數 */
body.light {
    --bg-dark:             #f8fafc;
    --bg-dark-secondary:   #ffffff;
    --bg-dark-tertiary:    #f1f5f9;
    --text-dark:           #0f172a;
    --text-dark-secondary: #475569;
    --border-dark:         #cbd5e1;
    /* --primary 不變，保持青色；但它對淺底只有 2.43:1，
       凡是要達對比門檻的用途一律走下面這組加深版，不要直接用 --primary */
    --border-interactive:  #64748b;
    --border-accent:       #0e7490;
    --border-accent-green: #047857;
    --primary-text:        #155e75;
    --green-text:          #065f46;
}
```

**規則**：所有顏色必須用變數，不得 hardcode hex。淺色主題只需覆蓋背景與文字變數，強調色保持不變。

### ⚠️ 固定深底容器不可用會翻轉的 token（v3.11.1）

**前提**：站上有三個容器的底色是**寫死深色、不隨 `body.light` 翻轉**的：

| 容器 | 內容 | 風險 |
|------|------|------|
| `.pro-modal-content` | 含可聚焦元件與主題 token | **會出事，已釘住** |
| `.nav-scrim` | 空 div，純遮罩 | 無 |
| `.graph-hover-info` | tooltip，用 `var(--primary)` | 目前安全 —— `--primary` 兩個主題同值。但若日後為了對比改用 `--border-accent`，就會踩同一個坑 |

其餘固定深底的（`.panel` / `.display` / `.base-displays` / `.sidebar-note` / `.main-sidebar`）
都已有 `body.light` 覆寫，不屬此類。

在這種容器裡用 `--border-accent` / `--primary-text` / `--border-accent-green` 這類
**會跟著主題翻轉**的 token，會在淺色主題下爆掉 —— token 換成了為淺底設計的深色值，
底卻還是深的。v3.11.1 實測：焦點環 `#0e7490` 落在 `#1e293b` 上只有 **2.73:1**，
不合 WCAG 1.4.11 的 3:1。

**做法**：在容器根節點把 token 釘回深色版，讓底下所有子元素自動繼承正確值 ——
不要逐個元素去覆寫顏色。

```css
.pro-modal-overlay {
    /* 底色固定深色不隨主題翻轉，accent token 必須一併釘回深色版 */
    --border-accent: #06b6d4;
}
```

**新增固定配色容器時**，一律問一句：裡面有沒有用到會翻轉的 token？有就在容器根節點釘住。
反過來，**優先做法是讓容器跟著主題翻**（加 `body.light` 覆寫），像 `.main-sidebar` /
`.panel` / `.base-displays` 那樣 —— 固定配色是例外，不是預設。

> 量測陷阱：這類容器常用 `background-image: linear-gradient(...)`，此時
> `getComputedStyle(el).backgroundColor` 是**透明**的。只讀 `backgroundColor` 會往上
> 抓到遮罩層而算出完全錯誤的對比值（v3.11.1 第一版量測就這樣誤判成 PASS）。
> 另外元件多帶 `transition`，`focus()` 後要等收斂再讀，否則量到動畫中途值。

### 常用 CSS Class

| Class | 用途 |
|-------|------|
| `.panel` | 所有卡片容器，圓角 + 深色背景 |
| `.tab` | 主功能 tab 按鈕（計算/單位/匯率/公式/儲存） |
| `.tab.active` | 選中的 tab，底線 + primary 色 |
| `.tab-content` | Tab 對應內容，`hidden` class 控制顯示 |
| `.btn` | 計算機按鈕基底 |
| `.btn-number` | 數字按鈕 |
| `.btn-operator` | 運算符按鈕 |
| `.btn-function` | 函數按鈕（sin、log 等） |
| `.btn-equals` | 等號按鈕，primary 色 |
| `.empty-state` | 無資料時的提示文字 |
| `.formula-item` | 公式卡片（內建） |
| `.formula-item-custom` | 自建公式卡片（含刪除按鈕） |
| `.fcbtn` | 公式分類 tab 按鈕 |
| `.fcbtn-custom` | 自建分類按鈕，橘色 `#fb923c` |
| `.ucbtn` | 單位分類按鈕 |

---

## 4. 主要 Tab 系統

### 5 個主 Tab

```
計算（calcPanel）→ 主計算機，含按鈕分類 tab
單位（unitPanel）→ 單位換算，8 個分類
匯率（currencyPanel）→ 貨幣換算，雙向同步
公式（formulaPanel）→ 內建 + 自建公式
儲存（savedPanel）→ 計算歷史
```

### Tab 切換邏輯

```javascript
// 全部 .tab-content 加 hidden，移除目標的 hidden
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabContents.forEach(c => c.classList.add('hidden'));
        document.getElementById(tabName + 'Panel').classList.remove('hidden');
        // 特定 tab 需要觸發 render：
        if (tabName === 'formula')   { renderFormulas(); renderCustomFormulas(); }
        if (tabName === 'saved')     { renderSaved(); }
        if (tabName === 'currency')  { renderCurrencyGrid(); syncFromTWD(); }
    });
});
```

---

## 5. 公式系統

### 內建公式資料結構

```javascript
// builtInFormulas 陣列
{
    id: 39,
    name: '複利終值',
    expr: 'P*(1+r/n)^(n*t)',
    group: '金融',          // 分類：數學/工程/科學/物理/金融
    tags: ['財務', '金融'],
    vars: ['P', 'r', 'n', 't'],
    varDescMap: {           // 變數說明（顯示在 Modal placeholder）
        P: '本金',
        r: '年利率（%）',
        n: '每年複利次數',
        t: '年數'
    }
}
```

### 自動利率換算（varTransform）

```javascript
// 某些公式的變數輸入前需要自動換算（如年利率% → 月利率小數）
const varTransform = {
    39: { r: v => v / 100 },        // 複利終值：年利率% → 小數
    40: { r: v => v / 100 / 12 },   // 月繳貸款：年利率% → 月利率
    41: { r: v => v / 100 },
    // ...
};
// 使用者輸入 5（%），實際計算用 0.05 或 0.05/12
```

### 公式分類 Tab 邏輯

| Tab | 內建公式顯示 | 自建公式顯示 |
|-----|------------|------------|
| 全部 | 全部 | 全部 |
| 數學/工程/科學/物理/金融 | 該分類 | 該分類（空則顯示「尚無自建公式」） |
| 自建 | 隱藏 | 全部 + 新增表單 |

**重要**：每個分類 tab 底部永遠顯示「✏️ 自建公式」區塊（`#customMatchSection`），即使空白也要顯示。

### 自建公式儲存

```javascript
// localStorage key: 'customFormulas'
// 結構：[{ id, name, expr, group, vars[] }, ...]
```

---

## 6. 匯率系統

### 雙向同步防迴圈

```javascript
let _syncingCurrency = false;

function syncFromForeign() {
    if (_syncingCurrency) return;
    _syncingCurrency = true;
    // 計算並更新 TWD 欄位
    _syncingCurrency = false;
}

function syncFromTWD() {
    if (_syncingCurrency) return;
    _syncingCurrency = true;
    // 計算並更新外幣欄位
    _syncingCurrency = false;
}
```

**規則**：任何新的雙向同步功能都必須用相同的 flag 防迴圈模式。

### 匯率資料來源

```javascript
// 從 exchangeRates[currency] 取得對 TWD 的匯率
// API: https://api.exchangerate-api.com/v4/latest/TWD
// 儲存: localStorage 'exchangeRates' + 'exchangeRatesTime'（24h 快取）
```

---

## 7. 單位換算系統

### 資料結構

```javascript
UNIT_DATA = {
    '長度': {
        units: { '公尺 (m)': 1, '公里 (km)': 1000, ... },
        // special: true → 使用 toBase/fromBase 函數（溫度）
    },
    '溫度': {
        units: { '攝氏 (°C)': ..., },
        special: true,
        toBase: { '攝氏 (°C)': v => v, '華氏 (°F)': v => (v-32)*5/9, ... },
        fromBase: { '攝氏 (°C)': v => v, '華氏 (°F)': v => v*9/5+32, ... }
    }
}
```

### 雙向同步

與匯率相同，使用 `_syncingUnit` flag 防迴圈。

### Mobile 數字鍵盤

所有數值 input 必須加 `inputmode="decimal"`，讓手機彈出數字鍵盤：

```html
<input type="number" inputmode="decimal" ...>
```

---

## 8. 主題切換

```javascript
// localStorage key: 'theme' ('dark' | 'light')
function updateTheme() {
    document.body.classList.toggle('light', currentTheme === 'light');
    themeBtn.textContent = currentTheme === 'light' ? '🌙' : '☀️';
}
```

---

## 9. 國際化（i18n）

```javascript
const i18n = {
    'zh-TW': { tab_calc: '計算', tab_unit: '單位', ... },
    'en':    { tab_calc: 'Calc', tab_unit: 'Unit', ... },
    'zh-CN': { ... },
    'ja':    { ... }
};

// HTML 元素加 data-i18n="key"，updateLanguage() 會自動更新
```

---

## 10. 說明 Modal（? 按鈕）

- 按鈕：`.help-btn`（header 右側，青色圓形）
- Modal：`#helpModal`（`display:none` 預設隱藏）
- 內容：手風琴（Accordion）結構，每節 `.help-section` 含 header + body
- 展開/收合：點 header toggle `.help-body` display

---

## 11. 廣告版位規劃（目前無聯播網）

> 2026-07 狀態：AdSense 被拒（2026-05）、Carbon Ads 被拒（2026-07），**目前站上無任何廣告**。
> Pricing modal Free 方案文案為「未來可能顯示贊助廣告」。若日後接入任何廣告，沿用下列版位原則：

| 位置 | 尺寸 | 顯示 |
|------|------|------|
| 右側欄底部（第四個 panel） | 小型固定版位 | 桌機 only（手機 sidebar 隱藏即自動隱藏） |

**注意**：廣告不得放在計算機按鈕旁，避免誤點；Pro / Trial 用戶一律隱藏廣告（`ProManager.isProActive()` 條件渲染）。

---

## 12. 開發禁忌

| 禁止 | 原因 |
|------|------|
| 拆分成多個 HTML/CSS/JS 檔 | 單檔是核心設計，便於 GitHub Pages 部署 |
| Hardcode 顏色 hex | 破壞深/淺色主題切換 |
| 在計算機按鈕區放廣告 | AdSense 政策違規 + 使用者體驗差 |
| 雙向同步不加 flag | 會觸發無限迴圈 |
| input 數值不加 `inputmode="decimal"` | 手機無法彈出數字鍵盤 |
| 自建公式分類邏輯改為「全域顯示」 | 會讓不相關分類顯示到無關公式 |
| 固定深底容器內直接用會翻轉的 token | 淺色主題下 token 變深色、底也是深的，對比爆掉（見 § 3） |

---

## 13. Git / 部署

```bash
# 本地路徑
C:\claudecode\Open-Calculator\

# Remote
https://github.com/boboidvtw/boboidvtw.github.io.git

# 部署：push to main 即自動部署（GitHub Pages）
git add index.html
git commit -m "feat: ..."
git push origin main
```

Commit 格式：`feat:` / `fix:` / `refactor:` / `docs:`
