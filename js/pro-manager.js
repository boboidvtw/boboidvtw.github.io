/* =====================================================================
   pro-manager.js — Pro 狀態管理（JWT-based）
   建立日期：2026-05-14

   設計原則：
   - isProActive() 是同步的（解析 JWT exp，不打 API）— 用於 UI 即時判斷
   - verifyWithServer() 是 async（呼叫 Worker /license/validate）— 用於開機自檢
   - 試用期邏輯保留原樣
   - 偵測到舊的 SUPC-XXXX 格式會自動清除（防止假冒）
   ===================================================================== */
(function () {
    'use strict';

    const { PRO_CONFIG, LicenseAPI } = window;

    /* ---------- localStorage 存取 ---------- */
    function getToken() {
        return localStorage.getItem(PRO_CONFIG.STORAGE_KEY);
    }
    function setToken(token) {
        localStorage.setItem(PRO_CONFIG.STORAGE_KEY, token);
        localStorage.setItem(PRO_CONFIG.VERIFIED_AT_KEY, Date.now().toString());
    }
    function clearToken() {
        localStorage.removeItem(PRO_CONFIG.STORAGE_KEY);
        localStorage.removeItem(PRO_CONFIG.VERIFIED_AT_KEY);
    }
    function getLastVerifiedAt() {
        const ts = localStorage.getItem(PRO_CONFIG.VERIFIED_AT_KEY);
        return ts ? parseInt(ts, 10) : 0;
    }

    /* ---------- JWT 判斷（同步） ---------- */
    /**
     * 同步檢查目前 token：格式正確 + 未過期
     * 不呼叫網路，只解析 JWT payload
     */
    function hasValidLocalToken() {
        const token = getToken();
        if (!token) return false;

        // 防呆：偵測到舊的 Crockford SUPC- 格式 → 強制清除
        if (/^SUPC-/i.test(token)) {
            clearToken();
            return false;
        }

        const payload = LicenseAPI.parsePayload(token);
        if (!payload) {
            clearToken();
            return false;
        }
        if (payload.exp && Date.now() / 1000 > payload.exp) {
            clearToken();
            return false;
        }
        return true;
    }

    /* ---------- 試用期邏輯 ---------- */
    function startTrial() {
        if (!localStorage.getItem(PRO_CONFIG.TRIAL_KEY)) {
            localStorage.setItem(PRO_CONFIG.TRIAL_KEY, Date.now().toString());
            return true;
        }
        return false;
    }
    function isTrialActive() {
        const start = localStorage.getItem(PRO_CONFIG.TRIAL_KEY);
        if (!start) return false;
        const elapsedDays = (Date.now() - parseInt(start, 10)) / 86_400_000;
        return elapsedDays < PRO_CONFIG.TRIAL_DAYS;
    }
    function getTrialDaysLeft() {
        const start = localStorage.getItem(PRO_CONFIG.TRIAL_KEY);
        if (!start) return PRO_CONFIG.TRIAL_DAYS;
        const elapsedDays = (Date.now() - parseInt(start, 10)) / 86_400_000;
        return Math.max(0, Math.ceil(PRO_CONFIG.TRIAL_DAYS - elapsedDays));
    }

    /* ---------- Pro 狀態（公開 API） ---------- */
    function isProActive() {
        return hasValidLocalToken() || isTrialActive();
    }

    function hasValidLicense() {
        return hasValidLocalToken();
    }

    /**
     * 取得 JWT payload 資訊（用於 UI 顯示）
     * @returns {{ subscriptionId, expiresAt } | null}
     */
    function getLicenseInfo() {
        const token = getToken();
        if (!token) return null;
        const payload = LicenseAPI.parsePayload(token);
        if (!payload) return null;
        return {
            subscriptionId: payload.sub,
            expiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
        };
    }

    /* ---------- 訂閱成功流程 ---------- */
    /**
     * PayPal onApprove → 呼叫 Worker /license/issue 換取 JWT（帶 retry）
     *
     * 為何要 retry：PayPal 同時觸發前端 onApprove 與後端 Webhook，但 Webhook 寫
     * KV 比 onApprove 慢 1-5 秒。若立刻打 /license/issue 可能 404（KV 還沒有資料），
     * 需要等 Webhook 落地。
     *
     * @param {string} subscriptionId
     * @param {{onRetry?: (attempt: number, total: number) => void}} opts
     * @returns {Promise<string>} JWT token
     */
    async function activateSubscription(subscriptionId, opts = {}) {
        if (!subscriptionId) throw new Error('subscriptionId is required');
        localStorage.setItem(PRO_CONFIG.SUBSCRIPTION_KEY, subscriptionId);
        const { token } = await LicenseAPI.issueWithRetry(subscriptionId, {
            retries: PRO_CONFIG.ISSUE_RETRY_COUNT,
            delayMs: PRO_CONFIG.ISSUE_RETRY_DELAY_MS,
            onRetry: opts.onRetry,
        });
        setToken(token);
        return token;
    }

    /**
     * 自動續期 — 當 JWT 剩 < TOKEN_REFRESH_BEFORE_EXPIRY_MS 時，背景重新 issue
     * 需要 localStorage 中有 subscriptionId（PayPal 成功時已儲存）
     *
     * @returns {Promise<{refreshed?: true, revoked?: true, skipped?: true, reason?: string, error?: string}>}
     */
    async function refreshTokenIfNeeded() {
        const token = getToken();
        if (!token) return { skipped: true, reason: 'no token' };

        const payload = LicenseAPI.parsePayload(token);
        if (!payload || !payload.exp) return { skipped: true, reason: 'no exp' };

        const remainingMs = payload.exp * 1000 - Date.now();
        if (remainingMs > PRO_CONFIG.TOKEN_REFRESH_BEFORE_EXPIRY_MS) {
            return { skipped: true, reason: 'plenty of time left' };
        }

        const subId = localStorage.getItem(PRO_CONFIG.SUBSCRIPTION_KEY);
        if (!subId) return { skipped: true, reason: 'no subscriptionId saved' };

        try {
            const { token: newToken } = await LicenseAPI.issue(subId);
            setToken(newToken);
            return { refreshed: true };
        } catch (err) {
            // 403 (not active) / 404 (not in KV) → 訂閱已撤銷，清除 token
            if (err.status === 403 || err.status === 404) {
                clearToken();
                return { revoked: true, error: err.message };
            }
            // 網路錯誤等 → 保留 token，下次再試
            return { skipped: true, reason: err.message };
        }
    }

    /**
     * 使用者手動貼上 JWT → 呼叫 Worker /license/validate 確認
     * @returns {Promise<{ ok: boolean, error?: string }>}
     */
    async function activateToken(token) {
        const result = await LicenseAPI.validate(token);
        if (result.valid) {
            setToken(token);
            if (result.subscriptionId) {
                localStorage.setItem(PRO_CONFIG.SUBSCRIPTION_KEY, result.subscriptionId);
            }
            return { ok: true };
        }
        return { ok: false, error: result.error || 'invalid token' };
    }

    /* ---------- 開機自檢（背景驗證） ---------- */
    /**
     * 進入頁面時呼叫，如果距上次驗證超過 REVERIFY_INTERVAL_MS 就重新驗證
     * 網路失敗時保留 token（避免離線時誤判）
     */
    async function verifyWithServer({ force = false } = {}) {
        const token = getToken();
        if (!token) return { skipped: true };

        const sinceLast = Date.now() - getLastVerifiedAt();
        if (!force && sinceLast < PRO_CONFIG.REVERIFY_INTERVAL_MS) {
            return { skipped: true, reason: 'within reverify window' };
        }

        const result = await LicenseAPI.validate(token);
        if (result.networkError) {
            // 網路失敗 → 不動 token，等下次
            return { skipped: true, reason: 'network error' };
        }
        if (result.valid) {
            localStorage.setItem(PRO_CONFIG.VERIFIED_AT_KEY, Date.now().toString());
            return { verified: true };
        }
        // 伺服器明確說 invalid → 撤銷本地 token
        clearToken();
        return { revoked: true, error: result.error };
    }

    /* ---------- 重設（測試用） ---------- */
    function reset() {
        clearToken();
        localStorage.removeItem(PRO_CONFIG.TRIAL_KEY);
        localStorage.removeItem(PRO_CONFIG.SUBSCRIPTION_KEY);
    }

    window.ProManager = Object.freeze({
        // 同步狀態
        isProActive,
        hasValidLicense,
        isTrialActive,
        getTrialDaysLeft,
        getLicenseInfo,

        // 操作
        activateSubscription,
        activateToken,
        startTrial,
        verifyWithServer,
        refreshTokenIfNeeded,
        reset,

        // 低階存取（給其他模組用）
        getToken,
        clearToken,
    });
})();
