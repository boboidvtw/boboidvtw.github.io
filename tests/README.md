# tests

∑ Calc 的計算引擎與輸入驗證測試。2026-08-14 建立（v3.10.0）。

## 執行

```bash
node --test tests/*.test.js
```

也可以在 repo 根目錄直接跑 `node --test`（自動尋找 `*.test.js`）。

> **注意**：不要用 `node --test tests/`。Node 26 會把目錄當成模組去載入而不是當測試目錄，
> 得到的是 `MODULE_NOT_FOUND` 而不是測試結果。這個參數的行為隨 Node 版本而異，
> 上面那兩種寫法目前（Node 26）都可靠。

無需安裝任何相依套件（只用 Node 內建的 `node:test`）。

## 為什麼是「執行時從 index.html 抽取」

這個專案是單一 `index.html`（CSS + JS 全部內嵌），沒有模組系統可以 import。
`extract.js` 在**每次執行測試時**從 `../index.html` 讀出待測函式，用 `node:vm` 跑起來。

刻意不在這裡放一份程式碼副本：副本會與本體漂移，那時測試就只是在測自己，
而不是在測真正上線的那份程式。`extract.test.js` 專門守這件事 ——
函式改名或抽不到東西時，它會紅，而不是讓其他測試安靜地全綠。

## 檔案

| 檔案 | 守什麼 |
|---|---|
| `extract.js` | 從 index.html 抽出待測函式。任何一步抽不到就 throw |
| `extract.test.js` | 抽取器自身：marker 都在、抽出的是函式、找不到時大聲失敗 |
| `paste-sanitize.test.js` | 貼上／`#calc=` 的清洗與驗證邊界。接受的案例還要求引擎算出**正確答案** |
| `paste-security.test.js` | 具體的繞過構造（`abs.constructor`、`exp.call`、逗號運算子…）全部必須被拒 |

## 這些測試在守什麼

`calculate()` 最終是 `new Function('return (' + expr + ')')` 求值。
外部字串有兩條路能到達它：**剪貼簿貼上**與 **`#calc=` 網址參數**
（後者在 v3.10.0 之前完全沒有驗證，可以構造出可執行的連結 —— 見 CHANGELOG [3.10.0]）。
兩條路徑現在共用同一套文法驗證，這裡的測試就是那套驗證的守門。

改動 `sanitizePastedExpression` / `_resolveCommas` / `_pastedTokensAllowed` / `calculate` 之後，
請確認這些測試仍然全綠 —— 並且順手做一次變異驗證（例如把 tokenizer 改成永遠回 `true`），
確認它們真的會轉紅。全綠而什麼都沒守到，比失敗更危險。
