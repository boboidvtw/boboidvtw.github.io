# Wrangler 導入 SOP — ∑ Calc License Validator Worker

> 目的：把 Worker 部署從「Dashboard 手動貼程式碼」改為 `wrangler` CLI 部署，
> 消除手貼易踩的坑（sandbox/live 混淆、最後一行 `};` 被截斷、非原子 deploy）。
>
> 本文件由 v3.5.9 收工時建立（2026-05-22）。**導入準備已完成，但實際部署需你本人操作**——
> 原因見下方「為什麼最後一步留給你」。

---

## 1. 現況：已完成 vs 待你執行

| 項目 | 狀態 |
|------|------|
| `wrangler` CLI 安裝 | ✅ 已裝 v4.93.1（路徑 `~/.hermes/node/bin/wrangler`，**不在 PATH**）|
| `worker/wrangler.toml` 設定檔 | ✅ 已建立，雙環境（sandbox 預設 / production），dry-run 驗證通過 |
| Worker bundle 驗證 | ✅ `wrangler deploy --dry-run` 兩環境皆通過（16.62 KiB / gzip 4.82 KiB）|
| 填入 3 個 `TODO_` 真實值 | ⬜ **待你執行**（需 Dashboard）|
| 設定 8 個 secrets | ⬜ **待你執行**（需 secret 明文）|
| `wrangler login` | ⬜ **待你執行**（瀏覽器 OAuth）|
| 實際部署 | ⬜ **待你執行**（先 sandbox 後 production）|

### 為什麼最後一步留給你

1. **`wrangler login` 是瀏覽器 OAuth 互動流程**，AI 代理無法代為完成。
2. **首次 `wrangler deploy --env production` 會接管 `api.moneyai168.com` 這個金流生產 Worker**。
   若 `wrangler.toml` 的 binding 與 Dashboard 現有設定不一致，部署會以 toml 為準覆蓋——
   設錯等於打掛正在運作的付費驗證服務。此步驟必須有人能即時觀察與搶救。
3. C 任務的本質是「工程改善」，Worker v2.3.0 目前健康，不該在無人值守時冒險變更。

---

## 2. 前置：讓 wrangler 可直接呼叫

`wrangler` 裝在 `~/.hermes/node/bin/`，預設不在 PATH。擇一：

```bash
# 方式 A：暫時加 PATH（僅當前終端機）
export PATH="$HOME/.hermes/node/bin:$PATH"
wrangler --version          # 應顯示 4.93.1

# 方式 B：永久加入（寫進 ~/.zshrc 後重開終端）
echo 'export PATH="$HOME/.hermes/node/bin:$PATH"' >> ~/.zshrc

# 方式 C：每次都打完整路徑
~/.hermes/node/bin/wrangler --version
```

接著登入（會開瀏覽器）：

```bash
wrangler login
wrangler whoami             # 確認登入成功，並記下 Account ID
```

---

## 3. 步驟一：填入 wrangler.toml 的 3 個 TODO

`worker/wrangler.toml` 有 3 個 `TODO_` 佔位符要換成真實值：

| 佔位符 | 取得方式 |
|--------|----------|
| `TODO_ACCOUNT_ID` | `wrangler whoami` 的 Account ID，或 Dashboard 右側欄 |
| `TODO_SANDBOX_KV_NAMESPACE_ID` | `wrangler kv namespace list` → 找 sandbox 用的 LICENSES namespace 的 `id` |
| `TODO_LIVE_KV_NAMESPACE_ID` | 同上指令 → 找 live 用的 LICENSES namespace 的 `id` |

> ⚠️ **sandbox 與 live 用的是不同的 KV namespace**（否則測試會污染正式資料）。
> 若 `wrangler kv namespace list` 只看到一個，代表目前 sandbox/live 共用同一個 KV——
> 這本身是個風險，建議先在 Dashboard 為 sandbox 另開一個 namespace 再導入。

另外確認 `compatibility_date`：到 Dashboard → Worker → Settings → Runtime 看現有 Worker 的
實際 compatibility date，把 `wrangler.toml` 裡的 `2026-05-14` 改成一致值。

---

## 4. 步驟二：設定 8 個 secrets

`wrangler.toml` 不存放機密。secrets 用指令逐一設定，**sandbox 與 production 各一套**
（PayPal sandbox 與 live 的金鑰本來就不同）：

```bash
# --- SANDBOX（top-level，不帶 --env）---
wrangler secret put SECRET_KEY
wrangler secret put PAYPAL_CLIENT_ID
wrangler secret put PAYPAL_CLIENT_SECRET
wrangler secret put PAYPAL_WEBHOOK_ID

# --- PRODUCTION（帶 --env production）---
wrangler secret put SECRET_KEY --env production
wrangler secret put PAYPAL_CLIENT_ID --env production
wrangler secret put PAYPAL_CLIENT_SECRET --env production
wrangler secret put PAYPAL_WEBHOOK_ID --env production
```

每個指令會提示你貼上明文值。這 4 個 secret 的值，目前存在 Dashboard 現有 Worker 的
Settings → Variables and Secrets（Dashboard 只顯示「已加密」，看不到原值）。
**若你手上沒有原始明文，需重新產生**：`SECRET_KEY` 可自訂新隨機字串
（但換掉後已簽發的 JWT 會全部失效，使用者需重新驗證）；PayPal 三項到 PayPal 開發者後台取得。

> 用 wrangler 設過 secret 後，Dashboard 仍會顯示同名 secret——這是正常的，
> wrangler 與 Dashboard 操作的是同一份 secret store。

---

## 5. 步驟三：部署 SANDBOX 並驗證（先做這個！）

```bash
# dry-run（不上傳，僅本地 build 確認無誤）
wrangler deploy --dry-run

# 正式部署 sandbox
wrangler deploy

# 驗證
curl -s https://supercalc-license-validator-sandbox.boboidvtw.workers.dev/health
```

預期 health 回傳 `{"status":"ok","version":"2.3.0","kv":true,"rateLimit":"kv",...}`。
接著照 `RATE-LIMIT-SETUP.md` 的「驗證限速生效」對 sandbox 暴打測試，確認限速正常。

**sandbox 一切正常前，不要碰 production。**

---

## 6. 步驟四：部署 PRODUCTION（高風險，逐項確認）

sandbox 驗證通過後：

```bash
# 1. dry-run production，逐項核對輸出的 binding
wrangler deploy --dry-run --env production
```

部署前**逐一比對** dry-run 輸出的 binding 與 Dashboard 現有 Worker 的設定：

- [ ] `env.LICENSES` 指向的 KV namespace id 與 Dashboard live Worker 現用的**完全一致**
- [ ] `env.PAYPAL_API_BASE` = `https://api-m.paypal.com`（live，非 sandbox 的 `api-m.sandbox.paypal.com`）
- [ ] 4 個 secrets 已用 `--env production` 設定完成
- [ ] `compatibility_date` 與 Dashboard 現值一致
- [ ] custom domain `api.moneyai168.com` 路由無誤

全部打勾後才部署：

```bash
wrangler deploy --env production
sleep 15
curl -s https://api.moneyai168.com/health
```

預期回 `version: 2.3.0`、`kv: true`。若異常，立即執行下方回滾。

---

## 7. 風險清單

| 風險 | 後果 | 防範 |
|------|------|------|
| KV namespace id 填錯 | live Worker 讀不到 license/訂閱資料，付費驗證全掛 | 步驟六逐項比對；先 sandbox |
| secrets 未設就部署 | Worker 拿不到 `SECRET_KEY`，JWT 簽發/驗證全失敗 | 步驟四先設滿 8 個 |
| 誤把 sandbox PayPal 金鑰設到 production | 正式金流對到測試環境 | sandbox/production 分開設、值來源分清 |
| 漏帶 `--env production` | 想部署 live 卻只更新 sandbox（或反之） | toml 已設 sandbox 為預設（誤觸只影響 sandbox）|
| `compatibility_date` 不一致 | Worker 執行期行為悄悄改變 | 步驟一與 Dashboard 對齊 |
| custom domain 路由衝突 | `api.moneyai168.com` 短暫無法連線 | 部署後立即 curl /health |

---

## 8. 回滾方案

```bash
# 看部署歷史
wrangler deployments list --env production

# 回滾到上一版
wrangler rollback --env production
```

或臨時手段：回到 Dashboard「Edit code」貼回上一版 `license-validator.js`（舊流程仍可用）。
KV 故障時 Worker 程式本身會 graceful degrade（放行），不會整個服務崩潰。

---

## 9. 導入後的日常部署流程

導入完成後，改 Worker 就不必再手貼 Dashboard：

```bash
# 改完 worker/license-validator.js 後
cd worker
wrangler deploy --dry-run --env production   # 先 dry-run 確認
wrangler deploy --env production              # 部署 live
sleep 15 && curl -s https://api.moneyai168.com/health   # 驗證
cd .. && git add worker/ && git commit -m "feat(worker): ..." && git push
```

調整限速值（`RL_ISSUE_*` 常數）也是同一套流程。
