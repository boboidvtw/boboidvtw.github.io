/* =====================================================================
   license-api.js — Cloudflare Worker JWT API 客戶端
   建立日期：2026-05-14

   端點：
     POST /license/issue    { subscriptionId } → { success, token, expiresIn }
     POST /license/validate { token }          → { valid, subscriptionId, expiresAt }
     GET  /health                              → { status, timestamp }
   ===================================================================== */
(function () {
    'use strict';

    const { WORKER_URL } = window.PRO_CONFIG;

    /**
     * 通用 POST helper
     * @throws {Error} 網路錯誤或 5xx
     */
    async function postJson(path, body) {
        const res = await fetch(`${WORKER_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        // 把 HTTP 狀態碼附在資料上，呼叫端可自行判斷
        return { ok: res.ok, status: res.status, data };
    }

    /**
     * 解析 JWT payload（不驗證簽名，只用於 UI 顯示）
     * @returns {object|null}
     */
    function parsePayload(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            // base64url → base64
            let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            while (payload.length % 4) payload += '=';
            return JSON.parse(atob(payload));
        } catch (_) {
            return null;
        }
    }

    /**
     * 從 PayPal subscriptionId 簽發 JWT
     * @throws {Error} 失敗時 err.status 帶 HTTP code，err.body 帶完整回應
     */
    async function issue(subscriptionId) {
        if (!subscriptionId) throw new Error('subscriptionId is required');
        const { ok, status, data } = await postJson('/license/issue', { subscriptionId });
        if (!ok || !data.token) {
            const err = new Error(data.error || `Issue failed (HTTP ${status})`);
            err.status = status;
            err.body = data;
            throw err;
        }
        return data;  // { success, token, subscriptionId, expiresIn, status, plan }
    }

    /**
     * issue() 加 retry 機制 — 處理 PayPal Webhook 的時序問題
     *
     * 兩種 retryable 情況：
     *   1) 404 "subscription not found" — webhook 完全還沒到（CREATED 都沒寫 KV）
     *   2) 403 "subscription not active" + currentStatus='pending'
     *      — CREATED 已寫入但 ACTIVATED 還沒到，pending → active 過渡期
     *
     * 不 retry 的情況：
     *   - 403 + currentStatus='cancelled'/'suspended'/'expired'/'refunded'/'disputed'
     *   - 500 / 網路錯誤等
     *
     * @param {string} subscriptionId
     * @param {{retries?: number, delayMs?: number, onRetry?: (attempt: number, total: number) => void}} opts
     */
    async function issueWithRetry(subscriptionId, opts = {}) {
        const { retries = 6, delayMs = 1500, onRetry = null } = opts;
        let lastErr;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await issue(subscriptionId);
            } catch (err) {
                lastErr = err;
                const isPending404 = err.status === 404;
                const isPending403 = err.status === 403 && err.body?.currentStatus === 'pending';
                const shouldRetry = (isPending404 || isPending403) && attempt < retries;

                if (shouldRetry) {
                    if (typeof onRetry === 'function') onRetry(attempt, retries);
                    await new Promise(r => setTimeout(r, delayMs));
                    continue;
                }
                throw err;
            }
        }
        throw lastErr;
    }

    /**
     * 驗證 JWT 簽名 + 過期時間（向 Worker 確認）
     * @returns {Promise<{valid: boolean, subscriptionId?: string, expiresAt?: string, error?: string}>}
     */
    async function validate(token) {
        if (!token) return { valid: false, error: 'token required' };
        try {
            const { data } = await postJson('/license/validate', { token });
            return data;
        } catch (err) {
            // 網路錯誤 → 回傳 valid: false 但帶 networkError 旗標讓呼叫端可區分
            return { valid: false, error: err.message, networkError: true };
        }
    }

    /**
     * 健康檢查
     */
    async function healthCheck() {
        try {
            const res = await fetch(`${WORKER_URL}/health`);
            return await res.json();
        } catch (err) {
            return { status: 'error', error: err.message };
        }
    }

    window.LicenseAPI = Object.freeze({
        issue,
        issueWithRetry,
        validate,
        healthCheck,
        parsePayload,
    });
})();
