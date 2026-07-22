/* =====================================================================
   paypal-integration.js — PayPal Subscribe Button + JWT 簽發整合
   建立日期：2026-05-14

   流程：
   1. 使用者點 PayPal Subscribe → 走 PayPal 流程
   2. onApprove 回傳 data.subscriptionID
   3. 呼叫 ProManager.activateSubscription(subscriptionID)
      → 內部呼叫 Worker /license/issue 換 JWT → 存 localStorage
   4. 顯示 success state（由 ProUI 負責）
   ===================================================================== */
(function () {
    'use strict';

    const { PRO_CONFIG, ProManager } = window;

    /**
     * sha256(text) 前 12 hex 字元 — 與 Worker /health 的 paypal_client_id_hash 對位用
     * @param {string} text
     * @returns {Promise<string>}
     */
    async function shortSha256(text) {
        const data = new TextEncoder().encode(text);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(digest))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
            .slice(0, 12);
    }

    /**
     * 前後端 PayPal Client ID 一致性檢查（fail-loud）
     * 背景：2026-06-14 曾發生前端 Client ID 打錯一個字元（eIIo vs eIlo）
     * 導致 PayPal 按鈕整段消失，肉眼幾乎無法辨識、也不會拋出任何 error。
     * 做法：向 Worker /health 要後端 Client ID 的 hash，與前端自己算的比對。
     * 網路失敗 / 舊版 Worker（無此欄位）→ 視為無法判斷，放行但印警告，不阻擋購買流程。
     * 只有「兩邊都拿得到 hash 且不一致」才判定為真的設定錯誤並擋下 SDK 載入。
     * @returns {Promise<void>}
     */
    async function verifyClientIdMatchesBackend() {
        const clientId = PRO_CONFIG.PAYPAL_CLIENT_ID;
        let serverHash;
        try {
            const res = await fetch(`${PRO_CONFIG.WORKER_URL}/health`);
            const body = await res.json();
            serverHash = body.paypal_client_id_hash;
        } catch (e) {
            console.warn('⚠️ 無法向 Worker 取得 paypal_client_id_hash 做一致性檢查（略過，不阻擋）：', e.message);
            return;
        }
        if (!serverHash) {
            console.warn('⚠️ Worker /health 未回傳 paypal_client_id_hash（可能是舊版 Worker），略過一致性檢查');
            return;
        }
        const localHash = await shortSha256(clientId);
        if (localHash !== serverHash) {
            const message =
                `PayPal Client ID 前後端不一致（前端 hash ${localHash} ≠ 後端 hash ${serverHash}）。` +
                '請檢查 js/pro-config.js 的 PAYPAL_CLIENT_ID 是否與 Worker secrets 同步。';
            console.error('🚨 ' + message);
            throw new Error(message);
        }
    }

    /**
     * 動態載入 PayPal SDK
     * 為什麼動態：sandbox/live 使用不同 client-id，無法在 index.html 寫死
     * @returns {Promise<void>} resolves 後可使用 window.paypal
     */
    async function loadPayPalSDK() {
        await verifyClientIdMatchesBackend();

        return new Promise((resolve, reject) => {
            if (typeof paypal !== 'undefined') {
                resolve();
                return;
            }
            // 若 script 已存在（避免重複載入）
            const existing = document.querySelector('script[data-paypal-sdk]');
            if (existing) {
                existing.addEventListener('load', () => resolve());
                existing.addEventListener('error', () => reject(new Error('PayPal SDK load failed')));
                return;
            }

            const clientId = PRO_CONFIG.PAYPAL_CLIENT_ID;
            const script = document.createElement('script');
            script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription&currency=USD`;
            script.dataset.sdkIntegrationSource = 'button-factory';
            script.dataset.paypalSdk = '1';  // marker for dedup
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('PayPal SDK script failed to load'));
            document.head.appendChild(script);
        });
    }

    /**
     * 處理 PayPal onApprove 事件 — 抽成獨立函式以便 retry 按鈕重用
     */
    async function handleApprove(subscriptionID, container) {
        const setStatus = (msg) => {
            container.innerHTML = `
                <div style="padding:1rem;text-align:center;color:#94a3b8">
                    ${msg}
                </div>`;
        };
        setStatus('⏳ PayPal 訂閱已建立，正在驗證…');

        try {
            const token = await ProManager.activateSubscription(subscriptionID, {
                onRetry: (attempt, total) => {
                    setStatus(`⏳ 正在等待 PayPal 確認訂閱 (${attempt}/${total})…<br>
                        <small style="color:#64748b">通常 1-5 秒內完成</small>`);
                }
            });
            if (window.ProUI && typeof window.ProUI.showSuccessState === 'function') {
                window.ProUI.showSuccessState(token, subscriptionID);
            }
            if (window.ProUI && typeof window.ProUI.updateProBadge === 'function') {
                window.ProUI.updateProBadge();
            }
        } catch (err) {
            console.error('License issue failed:', err);
            // 404 或 403+pending → 顯示重試（webhook 時序問題）
            const isRetryable =
                err.status === 404 ||
                (err.status === 403 && err.body?.currentStatus === 'pending');
            container.innerHTML = `
                <p class="paypal-error">
                    ❌ 訂閱成功但授權簽發失敗：${err.message}<br>
                    <small>Subscription ID: ${subscriptionID}</small><br>
                    ${isRetryable
                        ? '<small>PayPal 訂閱仍在啟用中。請複製上方 ID，<a href="#" id="retry-issue" style="color:#fbbf24">點此重試</a></small>'
                        : '<small>請聯絡客服並提供上方 ID</small>'}
                </p>`;
            const retryBtn = document.getElementById('retry-issue');
            if (retryBtn) {
                retryBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    handleApprove(subscriptionID, container);
                });
            }
        }
    }

    /**
     * 渲染 PayPal 按鈕
     * @param {'monthly' | 'annual'} plan
     */
    function renderPayPalButton(plan = 'monthly') {
        const container = document.getElementById('paypal-button-container');
        if (!container) return;
        container.innerHTML = '';

        if (typeof paypal === 'undefined') {
            container.innerHTML = '<p class="paypal-error">⚠️ PayPal SDK 載入中…請稍候</p>';
            return;
        }

        const planId = plan === 'monthly'
            ? PRO_CONFIG.PAYPAL_PLAN_ID_MONTHLY
            : PRO_CONFIG.PAYPAL_PLAN_ID_ANNUAL;

        if (planId.includes('PLACEHOLDER')) {
            container.innerHTML = `
                <div style="padding:1rem;background:rgba(239,68,68,.1);border:1px dashed #ef4444;border-radius:8px;color:#fca5a5;font-size:.85rem;text-align:center">
                    ⚠️ 開發者：請在 PRO_CONFIG 換成真實 PayPal Plan ID
                </div>`;
            return;
        }

        try {
            paypal.Buttons({
                style: { shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' },

                createSubscription(_data, actions) {
                    return actions.subscription.create({
                        plan_id: planId,
                        application_context: {
                            brand_name:  '∑ Calc Pro',
                            user_action: 'SUBSCRIBE_NOW',
                        }
                    });
                },

                onApprove: (data) => handleApprove(data.subscriptionID, container),

                onError(err) {
                    console.error('PayPal error:', err);
                    container.innerHTML = `<p class="paypal-error">❌ 結帳失敗，請稍後再試</p>`;
                },

                onCancel() {
                    console.log('User cancelled PayPal flow');
                },
            }).render('#paypal-button-container');
        } catch (e) {
            container.innerHTML = `<p class="paypal-error">⚠️ ${e.message}</p>`;
        }
    }

    /**
     * 載入 SDK + 渲染按鈕（取代舊的 waitForPayPalSDK）
     * SDK 動態載入後立即 render
     */
    async function loadAndRender(plan = 'monthly') {
        const container = document.getElementById('paypal-button-container');
        if (container) {
            container.innerHTML = `<div style="padding:1rem;text-align:center;color:#94a3b8">⏳ PayPal SDK 載入中…</div>`;
        }
        try {
            await loadPayPalSDK();
            renderPayPalButton(plan);
        } catch (err) {
            if (container) {
                container.innerHTML = `<p class="paypal-error">⚠️ PayPal SDK 載入失敗：${err.message}</p>`;
            }
        }
    }

    window.PayPalIntegration = Object.freeze({
        renderPayPalButton,
        loadAndRender,
        loadPayPalSDK,
        // 保留舊名作 alias（向下相容）
        waitForPayPalSDK: loadAndRender,
    });
})();
