/* =====================================================================
   pro-config.js — Pro 模組設定（雙模式：Live + Sandbox）
   建立日期：2026-05-14
   更新日期：2026-05-14 (加入 sandbox switch via ?sandbox=1)

   切換 Sandbox 模式：
     https://boboidvtw.github.io/?sandbox=1
   或設定 localStorage：
     localStorage.setItem('super_calc_force_sandbox', '1')
   ===================================================================== */
(function () {
    'use strict';

    // 偵測 sandbox 模式（query param 或 localStorage 強制）
    const params = new URLSearchParams(location.search);
    const isSandbox =
        params.has('sandbox') ||
        localStorage.getItem('super_calc_force_sandbox') === '1';

    // localStorage key 加 _sb 後綴隔離 sandbox 資料，避免污染 Live
    const ns = (key) => isSandbox ? `${key}_sb` : key;

    // Live + Sandbox 配置
    const LIVE = {
        WORKER_URL: 'https://api.moneyai168.com',
        PAYPAL_CLIENT_ID: 'BAAwe1vut4JSk6JhmXFWzzvQRUswxr3UWYOPNvhFYnsd60xmFL44_mEqaXSFr4mlRyW-eIlo7yprky-9L0',
        PAYPAL_PLAN_ID_MONTHLY: 'P-7YN578147A145924NNH6Y32I',
        PAYPAL_PLAN_ID_ANNUAL:  'P-6XU39039F20435621NH6Y5GI',
    };
    const SANDBOX = {
        WORKER_URL: 'https://supercalc-license-validator-sandbox.boboidvtw.workers.dev',
        PAYPAL_CLIENT_ID: 'ARsg9OYpS2sah6TGWw_DPxyj-p2O6j_JRmUcgInTsuWKreOVUH9jdliSBzYRXg1xKuFsUe0jMF4rmyDL',
        PAYPAL_PLAN_ID_MONTHLY: 'P-9EP53164NM591910NNH6UWJY',
        PAYPAL_PLAN_ID_ANNUAL:  'P-3815018227551592KNH6UXIQ',
    };
    const active = isSandbox ? SANDBOX : LIVE;

    window.PRO_CONFIG = Object.freeze({
        // 模式旗標（其他模組會讀這個來決定 UI 顯示）
        IS_SANDBOX: isSandbox,

        // localStorage keys（sandbox 模式加 _sb 後綴隔離）
        STORAGE_KEY:       ns('super_calc_pro_license'),
        VERIFIED_AT_KEY:   ns('super_calc_pro_verified'),
        SUBSCRIPTION_KEY:  ns('super_calc_paypal_sub_id'),
        TRIAL_KEY:         'super_calc_trial_start',  // trial 不分模式（避免 free → sandbox 重置試用期）

        // Cloudflare Worker JWT 驗證服務
        WORKER_URL: active.WORKER_URL,

        // PayPal SDK client-id（由 paypal-integration.js 動態載入時使用）
        PAYPAL_CLIENT_ID: active.PAYPAL_CLIENT_ID,

        // 試用期天數
        TRIAL_DAYS: 7,

        // 重新驗證間隔（毫秒）— 每 6 小時打一次 /license/validate
        REVERIFY_INTERVAL_MS: 6 * 60 * 60 * 1000,

        // Token 自動續期門檻（毫秒）— JWT 剩 < 48 小時就自動 issue 新 token
        TOKEN_REFRESH_BEFORE_EXPIRY_MS: 48 * 60 * 60 * 1000,

        // /license/issue retry 參數（PayPal Webhook 可能延遲幾秒才寫入 KV）
        ISSUE_RETRY_COUNT: 6,
        ISSUE_RETRY_DELAY_MS: 1500,

        // PayPal Plan IDs
        PAYPAL_PLAN_ID_MONTHLY: active.PAYPAL_PLAN_ID_MONTHLY,
        PAYPAL_PLAN_ID_ANNUAL:  active.PAYPAL_PLAN_ID_ANNUAL,

        // 價格顯示（兩模式相同）
        PRICE_MONTHLY: 2.99,
        PRICE_ANNUAL:  19.99,

        // Pro 功能清單
        FEATURES: {
            'tangent':    { name: '切線可視化（Phase 5）' },
            'integral':   { name: '積分區域著色（Phase 5）' },
            'slope':      { name: '斜率場（Phase 5）' },
            'intersect':  { name: '多函數交點求解（Phase 6）' },
            'statistics': { name: '統計圖表（Phase 7）' },
            '3d':         { name: '3D 表面繪圖（Phase 8）' },
            'svg':        { name: 'SVG 向量匯出' },
        }
    });

    // Console 提示（方便除錯）
    if (isSandbox) {
        console.warn('🧪 ∑ Calc Pro: SANDBOX MODE active. Worker:', active.WORKER_URL);
    }
})();
