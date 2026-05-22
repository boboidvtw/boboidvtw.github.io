# Wrangler 部署 SOP — ∑ Calc License Validator Worker

> **狀態：✅ wrangler 導入已於 2026-05-22 完成。**
> sandbox 與 production 兩個 Worker 現皆由 wrangler 管理，不再需要手動貼 Dashboard。
> 本文件為「日常部署 SOP」+「導入紀錄與踩過的坑」。

---

## 1. 日常部署 — 改完 Worker 怎麼上線

**前置**（每個新終端機視窗執行一次）：

```bash
export PATH="$HOME/.hermes/node/bin:$PATH"          # wrangler 不在預設 PATH
cd ~/程式倉庫/claudecode_project/boboidvtw.github.io/worker
```

**先部署 sandbox 測試：**

```bash
wrangler deploy --dry-run --env=""    # 預演（不上傳）
wrangler deploy --env=""              # 部署 sandbox
curl -s https://supercalc-license-validator-sandbox.boboidvtw.workers.dev/health
```

**sandbox 正常後再部署 production（正式，api.moneyai168.com）：**

```bash
wrangler deploy --dry-run --env production
wrangler deploy --env production      # 會顯示 diff，逐項確認後才按 Y
sleep 5 && curl -s https://api.moneyai168.com/health
```

**部署完同步回 git：**

```bash
cd .. && git add worker/ && git commit -m "feat(worker): ..." && git push origin main
```

⚠️ `wrangler deploy` 會比對 local `wrangler.toml` 與 remote Dashboard 設定，列出 diff 問 `(Y/n)`。
**每次都要看 diff**，確認只有你預期的變更才按 `Y`；冒出沒看過的項目先按 `n` 查清楚。

---

## 2. 設定檔 wrangler.toml

雙環境設計：top-level = **sandbox**（預設環境，誤觸 `wrangler deploy` 只影響測試），
`[env.production]` = **live**（需明確 `--env production`）。

| 項目 | sandbox | production |
|------|---------|------------|
| Worker 名稱 | `supercalc-license-validator-sandbox` | `supercalc-license-validator` |
| KV namespace | `LICENSES_SANDBOX` (`1378f7ee…`) | `LICENSES` (`cc17277e…`) |
| `PAYPAL_API_BASE` | `api-m.sandbox.paypal.com` | `api-m.paypal.com` |
| custom domain | 無（用 `*.workers.dev`）| `api.moneyai168.com` |

`account_id` `6cfa4082…`、`compatibility_date` `2026-05-14`、`observability` 啟用、
`workers_dev` 啟用 —— 皆與 Dashboard 現狀一致。

---

## 3. Secrets

4 個 secret 由 wrangler / Dashboard 管理，**不進 git**：
`SECRET_KEY` / `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID`

- `wrangler deploy` **不會動 secrets**，自動保留。
- 修改某個 secret：
  ```bash
  wrangler secret put <NAME> --env=""           # sandbox
  wrangler secret put <NAME> --env production    # live
  ```
- 列出：`wrangler secret list --env=""` / `--env production`

---

## 4. 導入紀錄與踩過的坑（2026-05-22）

導入過程實測，未來維護參考：

1. **var 與 secret 同名衝突**
   `PAYPAL_WEBHOOK_ID` 原是 Dashboard「純文字 var」。改用 secret 管理（避免 webhook id
   進公開 repo），但 `wrangler secret put` 遇同名 var 會報 `Binding name already in use`。
   解法：先在 Dashboard 刪掉純文字 var，再 `wrangler secret put`。

2. **殘留的 rate limiter binding**
   sandbox / live 各有 2 個 v2.1.0 遺留的 rate limiter binding（`RATE_LIMIT_ISSUE_IP/SUB`）。
   現行程式碼用 KV 限速、不引用它們。toml 刻意不宣告 → 首次 deploy 一併清除。
   已驗證：清除後 `/health` 的 `rateLimit` 仍為 `kv`、限速正常。

3. **deploy 會以 toml 覆寫 remote 設定**
   `wrangler deploy` 前會 diff local toml vs remote Dashboard。**toml 沒宣告的項目會被
   改成預設值**。導入時因此補了 `observability`（否則會被關閉）、`workers_dev = true`
   （否則 live 的 `*.workers.dev` 路由會被關）。新增 binding/設定時要留意這點。

4. **preview_urls 在多環境模式不生效**
   toml 頂層的 `preview_urls` 在 wrangler 4.93 + named-environment 模式下不被套用，
   Preview URLs 維持啟用。對本 worker 無害（僅多出版本化的預覽網址）。

5. **wrangler 不在 PATH**
   裝在 `~/.hermes/node/bin/`，需 `export PATH` 或用完整路徑呼叫。

---

## 5. 回滾

```bash
wrangler deployments list --env production
wrangler rollback --env production
```

KV 故障時 Worker 程式會自動 graceful degrade（放行），不致整體崩潰。
舊法備援：Dashboard「編輯代碼」貼回上一版 `license-validator.js` 仍可用。
