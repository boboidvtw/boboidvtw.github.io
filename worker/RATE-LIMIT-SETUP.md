# Rate Limiting — Cloudflare Worker v2.2.0 (KV-based)

> `/license/issue` 的雙層限速，**純 KV 實作，不需任何額外 binding**。
> 本文件取代舊版（v2.1.0 的 Cloudflare Rate Limiting binding 方案——已棄用）。

## 為什麼是 KV，不是 Cloudflare Rate Limiting binding

v2.1.0 原本用 Cloudflare Rate Limiting binding，2026-05-16 在 Sandbox 實測發現：

- ❌ **Dashboard 編輯器部署下，binding 計數器只在「單次 Worker 執行內」有效，不能跨請求** —
  而 rate limiting 本質上就是跨請求的，所以該 binding 對我們完全無效。
  （診斷證據：單請求內連呼 15 次會擋 11/4；15 個獨立請求固定 key 全部放行。）
- ❌ binding 期間硬鎖 10s / 60s，做不到 per-subscription 想要的 3600s 窗口。

KV fixed-window 方案：跨請求有效、支援任意窗口、邏輯全在程式碼可測。
取捨：並發 burst 下為近似限速（KV 最終一致 + 無原子遞增），
足以擋「持續濫用 / license 工廠」這個真實威脅；精準配額需 Durable Objects（未來升級）。

## 限速規則（寫在程式碼常數，非 Dashboard）

`worker/license-validator.js` 頂部：

| 常數 | 值 | 意義 |
|------|----|------|
| `RL_ISSUE_IP_LIMIT` | `10` | 每 IP 上限 |
| `RL_ISSUE_IP_WINDOW` | `60` | IP 窗口（秒） |
| `RL_ISSUE_SUB_LIMIT` | `5` | 每 subscriptionId 上限 |
| `RL_ISSUE_SUB_WINDOW` | `3600` | subscription 窗口（秒，1 小時） |

合法用戶：一次成功訂閱簽一張 7 天 JWT，正常用不到 1 次/小時，限速碰不到。

## 部署（Live + Sandbox 各做一次）

### 1. 複製最新程式碼（用 pbcopy，避免 terminal 選取截斷）

```bash
cat worker/license-validator.js | pbcopy
```

### 2. 貼進 Dashboard 並部署

`Workers & Pages` → 對應 Worker → `Edit code` →
全選舊碼刪除 → `Cmd+V` → 確認最後一行是 `};` → `Deploy`

Worker 名稱：
- Live：`supercalc-license-validator`
- Sandbox：`supercalc-license-validator-sandbox`

### 3. 健康檢查

```bash
curl -s https://supercalc-license-validator.boboidvtw.workers.dev/health
```

應回：

```json
{"status":"ok","version":"2.2.0","timestamp":"...","kv":true,"rateLimit":"kv"}
```

注意 `version` 為 `2.2.0`、`rateLimit` 為 `"kv"`。

## 驗證限速生效（建議只在 Sandbox 暴打）

```bash
for i in {1..15}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST \
    https://supercalc-license-validator-sandbox.boboidvtw.workers.dev/license/issue \
    -H 'Content-Type: application/json' \
    -d '{"subscriptionId":"I-TEST123"}'
done
```

預期：同一 `subscriptionId` 一小時只能 5 次 → 前 5 次回 404
（subscription not found，代表限速放行、邏輯正常），第 6 次起回 **429**。
（若同 IP 該分鐘內 ≥10 次，IP 層會更早擋。）

檢查 `Retry-After`：

```bash
curl -s -D - -X POST \
  https://supercalc-license-validator-sandbox.boboidvtw.workers.dev/license/issue \
  -H 'Content-Type: application/json' \
  -d '{"subscriptionId":"I-TEST123"}' | grep -i "http/\|retry-after"
```

被擋時應見 `HTTP/2 429` 與 `retry-after: <秒數>`（依窗口剩餘動態計算）。

⚠️ Live Worker 不建議暴打——會在真實 KV 留計數。驗 health 版本即可，
限速邏輯與 Sandbox 完全相同。

## 調整速率

改 `worker/license-validator.js` 頂部 `RL_ISSUE_*` 常數 → 重新部署。
（KV `expirationTtl` 最低 60s，故窗口值不要小於 60。）

## 回滾 / 暫停限速

把對應 `RL_ISSUE_*_LIMIT` 設成極大值（如 `999999`）→ 重新部署，
等同停用該層；或還原舊版程式碼。KV 故障時程式自動 graceful degrade（放行）。

## 清理：刪除舊的 Cloudflare Rate Limiting binding

v2.1.0 時若已在 Dashboard 加過 `RATE_LIMIT_ISSUE_IP` / `RATE_LIMIT_ISSUE_SUB`
binding（Live + Sandbox 共 4 個），v2.2.0 程式碼已不引用，可安全刪除：

`Workers & Pages` → Worker → `Settings` → `Bindings` → 點該 binding → 刪除。
刪除後不影響限速（KV 方案獨立運作）。

## 監控

Dashboard → Worker → `Logs`（即時）或 `Analytics`。
觀察 429 比例；異常飆高代表遭攻擊或速率值設太低。
KV 寫入量也可在 KV namespace 頁觀察（`rl:` 前綴的 key 會自動 TTL 過期）。
