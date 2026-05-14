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
            const isTimeout = err.status === 404;
            container.innerHTML = `
                <p class="paypal-error">
                    ❌ 訂閱成功但授權簽發失敗：${err.message}<br>
                    <small>Subscription ID: ${subscriptionID}</small><br>
                    ${isTimeout
                        ? '<small>PayPal Webhook 可能延遲。請複製上方 ID，<a href="#" id="retry-issue" style="color:#fbbf24">點此重試</a></small>'
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
     * 等待 PayPal SDK 載入後渲染按鈕（最多 3 秒）
     */
    function waitForPayPalSDK(plan = 'monthly') {
        let attempts = 0;
        const timer = setInterval(() => {
            attempts++;
            if (typeof paypal !== 'undefined') {
                clearInterval(timer);
                renderPayPalButton(plan);
            } else if (attempts > 30) {
                clearInterval(timer);
                renderPayPalButton(plan);  // 觸發錯誤訊息
            }
        }, 100);
    }

    window.PayPalIntegration = Object.freeze({
        renderPayPalButton,
        waitForPayPalSDK,
    });
})();
