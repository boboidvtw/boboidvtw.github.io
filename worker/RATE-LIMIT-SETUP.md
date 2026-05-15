# Rate Limiting Setup — Cloudflare Worker v2.1.0

> 本指南教你在 Cloudflare Dashboard 為 `supercalc-license-validator` 與
> `supercalc-license-validator-sandbox` 兩個 Worker 加上 Rate Limiting bindings，
> 啟動 `/license/issue` 的雙層限速防護。

## 為什麼要做

`/license/issue` 是 JWT 簽發端點，一次成功呼叫 = 一張 7 天有效的 license。
若不做限速：

- ❌ 攻擊者拿到別人的 `subscriptionId` 後，可當「license 工廠」每秒簽發數千張
- ❌ Worker 資源被惡意請求耗盡（CPU 時間 / 子請求配額）
- ❌ KV 寫入濫用（雖然 issue 不寫 KV，但相關 OAuth 緩存可能被 hit）

啟用後：

- ✅ 每 IP 最多 10 次/分鐘（合法用戶用不到 1 次）
- ✅ 每 subscriptionId 最多 5 次/小時（盜用無法當 license 工廠）
- ✅ 超限自動回 HTTP 429 含 `Retry-After`

## Graceful degrade

程式碼設計成：**若 binding 未設，跳過限速且不報錯**。
這代表你**可以分階段部署**：先 push 程式碼，後在 Dashboard 加 binding；
binding 加好那一刻才開始限速。

## 步驟（Live Worker）

### 1. 進入 Cloudflare Dashboard

`Workers & Pages` → `supercalc-license-validator` → `Settings` → `Bindings`

### 2. 新增第一個 binding：`RATE_LIMIT_ISSUE_IP`

點 **Add binding** → 選 **Rate limiting**：

| 欄位 | 值 |
|------|---|
| **Variable name** | `RATE_LIMIT_ISSUE_IP` |
| **Namespace ID** | 自動產生（保留預設） |
| **Limit** | `10` |
| **Period** | `60` 秒 |

存檔。

### 3. 新增第二個 binding：`RATE_LIMIT_ISSUE_SUB`

再點一次 **Add binding** → **Rate limiting**：

| 欄位 | 值 |
|------|---|
| **Variable name** | `RATE_LIMIT_ISSUE_SUB` |
| **Namespace ID** | 自動產生（保留預設） |
| **Limit** | `5` |
| **Period** | `3600` 秒 |

存檔。

### 4. 部署 Worker 程式碼

把本機 `worker/license-validator.js` 完整內容貼到 Dashboard 編輯器，
點 **Save and deploy**。

### 5. 健康檢查

```bash
curl -s https://supercalc-license-validator.boboidvtw.workers.dev/health
```

應回：

```json
{"status":"ok","version":"2.1.0","timestamp":"...","kv":true}
```

注意 `version` 應升為 `2.1.0`。

## 步驟（Sandbox Worker）

完全重複以上 5 步，但在：

- Worker 名稱：`supercalc-license-validator-sandbox`
- Binding 名稱保持一致：`RATE_LIMIT_ISSUE_IP` / `RATE_LIMIT_ISSUE_SUB`
- 速率值可以一致，或 Sandbox 設更寬鬆方便測試（如 IP 50/60s）

## 驗證 Rate Limiting 真的生效

### 測試 1：正常呼叫（應成功）

```bash
curl -s -X POST https://supercalc-license-validator-sandbox.boboidvtw.workers.dev/license/issue \
  -H 'Content-Type: application/json' \
  -d '{"subscriptionId":"I-NONEXISTENT123"}'
# 預期：404 subscription not found（代表限速沒擋，邏輯正常）
```

### 測試 2：暴打觸發 IP 限速

```bash
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST \
    https://supercalc-license-validator-sandbox.boboidvtw.workers.dev/license/issue \
    -H 'Content-Type: application/json' \
    -d '{"subscriptionId":"I-NONEXISTENT123"}'
done
# 預期：前 10 次回 404，第 11 次起回 429
```

### 測試 3：檢查 Retry-After header

```bash
curl -s -D - -X POST \
  https://supercalc-license-validator-sandbox.boboidvtw.workers.dev/license/issue \
  -H 'Content-Type: application/json' \
  -d '{"subscriptionId":"I-NONEXISTENT123"}' | head -20
# 觸發限速時應看到：
#   HTTP/2 429
#   retry-after: 60
```

## 調整速率

速率值**設在 Dashboard binding 配置**，不在程式碼。要調整：

1. Dashboard → Worker → Settings → Bindings → 點該 binding → 編輯 Limit / Period

不需要重新部署 Worker 程式碼。

## 監控

Dashboard → Worker → Analytics → 看 `429 Too Many Requests` 響應數。
若異常飆高 → 可能遭遇攻擊或速率值設太低。

## 回滾

若需暫時關閉限速：

- **快速**：把 binding 的 Limit 值改大（如 9999）
- **完全停用**：刪除該 binding，下次請求自動 graceful degrade

不必修改 Worker 程式碼。

## 進階：未來可加的限速

| 端點 | 建議速率 | 為什麼 |
|------|---------|--------|
| `/license/validate` | IP 60/60s | Pro 用戶會頻繁呼叫，速率要寬 |
| `/subscription/:id` | IP 5/60s | 除錯用端點，限嚴格 |

`/webhook/paypal` **不要**用 Rate Limit binding——由任務 3（WAF IP allowlist）保護更精準。
