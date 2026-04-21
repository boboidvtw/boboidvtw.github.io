# ∑ Super Calculator

> 一款功能強大的萬能計算機，內建完整公式庫，支援科學計算、工程運算與多語系介面。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

---

## 目錄

- [專案介紹](#專案介紹)
- [功能列表](#功能列表)
- [使用方式](#使用方式)
- [技術架構](#技術架構)
- [多語系支援](#多語系支援)
- [公式庫說明](#公式庫說明)
- [常見問題](#常見問題)
- [開發者指南](#開發者指南)
- [更新日誌](#更新日誌)
- [授權條款](#授權條款)

---

## 專案介紹

Super Calculator 是一款以純 HTML + JavaScript 開發的計算機應用程式，**無需安裝、無需網路**，直接在瀏覽器中執行。

設計理念：
- **零依賴**：單一 HTML 檔案，開箱即用
- **公式庫整合**：內建數學、物理、化學等多領域公式
- **直覺操作**：鍵盤與滑鼠雙模式支援
- **跨平台**：支援桌面與行動裝置

---

## 功能列表

### 基礎計算
- ➕ 四則運算（加、減、乘、除）
- 🔢 小數與分數計算
- 📐 括號與優先順序處理
- 🔄 清除（C）、全清（AC）、退格（⌫）

### 科學計算
- 📊 三角函數（sin、cos、tan 及反函數）
- 📈 指數與對數（log、ln、e^x）
- √ 平方根、立方根、n 次方根
- 🔢 階乘、排列、組合（n!、P、C）

### 工程計算
- 🔄 進位轉換（二進位、八進位、十六進位）
- 📐 角度與弧度切換
- 🧮 矩陣基本運算
- 📏 單位換算

### 公式庫
- 📐 幾何公式（面積、體積、周長）
- ⚡ 物理公式（力學、電磁學、熱力學）
- 🧪 化學公式（理想氣體定律、莫耳計算）
- 💹 財務公式（複利、貸款、報酬率）

---

## 使用方式

### 快速開始

1. 下載或複製 `index.html`
2. 用瀏覽器開啟（雙擊檔案即可）
3. 開始計算！

```bash
# 或直接 clone 此 repo
git clone https://github.com/boboidvtw/super-calculator.git
cd super-calculator
# 開啟 index.html
```

### 鍵盤快捷鍵

| 按鍵 | 功能 |
|------|------|
| `0–9` | 數字輸入 |
| `+ - * /` | 四則運算 |
| `Enter` / `=` | 計算結果 |
| `Escape` | 全清（AC） |
| `Backspace` | 退格 |
| `(` `)` | 括號 |

### 公式庫使用

1. 點擊「公式庫」按鈕開啟面板
2. 選擇分類（數學 / 物理 / 化學 / 財務）
3. 點選所需公式，自動帶入計算框
4. 填入數值，按 `=` 計算

---

## 技術架構

```
super-calculator/
├── index.html          # 主程式（單一檔案應用）
│   ├── HTML 結構       # 計算機 UI
│   ├── CSS 樣式        # 響應式設計
│   └── JavaScript      # 計算邏輯 + 公式庫
├── docs/
│   ├── FORMULAS.md     # 公式庫完整清單
│   └── FAQ.md          # 常見問題
├── assets/
│   └── screenshots/    # 截圖
├── CHANGELOG.md
├── LICENSE
└── README.md
```

**技術選型**：
- 純 HTML5 / CSS3 / Vanilla JavaScript
- 無外部框架依賴
- 本地 `localStorage` 儲存計算歷史

---

## 多語系支援

| 語言 | 狀態 |
|------|------|
| 繁體中文 | ✅ 完整支援 |
| English | ✅ 完整支援 |
| 簡體中文 | 🔄 規劃中 |
| 日本語 | 🔄 規劃中 |

切換語言：點擊介面右上角語言選單。

---

## 公式庫說明

詳細公式清單請見 [docs/FORMULAS.md](docs/FORMULAS.md)。

### 公式分類總覽

| 分類 | 公式數量 | 範例 |
|------|----------|------|
| 幾何 | 20+ | 圓面積、球體積 |
| 物理 | 30+ | 牛頓第二定律、歐姆定律 |
| 化學 | 15+ | 理想氣體定律、pH 值 |
| 財務 | 10+ | 複利公式、NPV |

---

## 常見問題

完整 FAQ 請見 [docs/FAQ.md](docs/FAQ.md)。

**Q：需要網路連線嗎？**
A：不需要，完全離線運行。

**Q：支援哪些瀏覽器？**
A：Chrome 90+、Firefox 88+、Safari 14+、Edge 90+。

**Q：計算歷史會保留嗎？**
A：會，儲存於瀏覽器 `localStorage`，清除快取後消失。

---

## 開發者指南

### 本地開發

```bash
git clone https://github.com/boboidvtw/super-calculator.git
cd super-calculator
# 用任意 HTTP 伺服器啟動
npx serve .
# 或
python -m http.server 8080
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

### 貢獻指南

1. Fork 此 repo
2. 建立 feature branch：`git checkout -b feat/your-feature`
3. Commit：`git commit -m 'feat: 新增某功能'`
4. Push：`git push origin feat/your-feature`
5. 開 Pull Request

---

## 更新日誌

完整更新記錄請見 [CHANGELOG.md](CHANGELOG.md)。

### v1.0.0 (2026-04-21)
- 🎉 初始發布
- ✅ 基礎四則運算
- ✅ 科學計算功能
- ✅ 公式庫系統
- ✅ 中英文雙語支援

---

## 授權條款

本專案採用 [MIT License](LICENSE) 授權。

Copyright © 2026

---

*如有問題或建議，歡迎開 [Issue](https://github.com/boboidvtw/super-calculator/issues)。*
