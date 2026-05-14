/* =====================================================================
   pro-config.js — Pro 模組設定（上線時要改的東西全在這裡）
   建立日期：2026-05-14
   ===================================================================== */
(function () {
    'use strict';

    window.PRO_CONFIG = Object.freeze({
        // localStorage keys
        STORAGE_KEY:       'super_calc_pro_license',   // JWT token
        VERIFIED_AT_KEY:   'super_calc_pro_verified',  // 上次伺服器驗證時間戳
        TRIAL_KEY:         'super_calc_trial_start',
        SUBSCRIPTION_KEY:  'super_calc_paypal_sub_id',

        // Cloudflare Worker JWT 驗證服務
        WORKER_URL: 'https://supercalc-license-validator.boboidvtw.workers.dev',

        // 試用期天數
        TRIAL_DAYS: 7,

        // 重新驗證間隔（毫秒）— 每 6 小時打一次 /license/validate
        // （Worker 會查 KV 確認訂閱仍 active，撤銷可在 ≤6 小時內生效）
        REVERIFY_INTERVAL_MS: 6 * 60 * 60 * 1000,

        // Token 自動續期門檻（毫秒）— JWT 剩 < 48 小時就自動 issue 新 token
        // 配合 Worker v2 的 7 天短期 JWT
        TOKEN_REFRESH_BEFORE_EXPIRY_MS: 48 * 60 * 60 * 1000,

        // /license/issue retry 參數（PayPal Webhook 可能延遲幾秒才寫入 KV）
        ISSUE_RETRY_COUNT: 6,
        ISSUE_RETRY_DELAY_MS: 1500,

        // PayPal LIVE Plan IDs
        PAYPAL_PLAN_ID_MONTHLY: 'P-7YN578147A145924NNH6Y32I',
        PAYPAL_PLAN_ID_ANNUAL:  'P-6XU39039F20435621NH6Y5GI',

        // 價格顯示
        PRICE_MONTHLY: 2.99,
        PRICE_ANNUAL:  19.99,

        // Pro 功能清單（用於 modal 顯示功能名稱）
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
})();
