/* =====================================================================
   pro-ui.js — Pro Modal、徽章、Plan 切換、初始化
   建立日期：2026-05-14
   ===================================================================== */
(function () {
    'use strict';

    const { PRO_CONFIG, ProManager, PayPalIntegration } = window;

    /* =====================================================================
       gateProFeature ─ Pro 功能保護 helper
       ===================================================================== */
    function gateProFeature(featureKey, callback) {
        if (ProManager.isProActive()) {
            callback();
            return true;
        }
        showProModal({ feature: featureKey });
        return false;
    }

    /* =====================================================================
       Modal 控制
       ===================================================================== */
    function showProModal(opts = {}) {
        const modal       = document.getElementById('pro-modal');
        const triggerMsg  = document.getElementById('pro-trigger-msg');
        const triggerName = document.getElementById('trigger-feature-name');

        if (opts.feature && PRO_CONFIG.FEATURES[opts.feature]) {
            triggerName.textContent = PRO_CONFIG.FEATURES[opts.feature].name;
            triggerMsg.hidden = false;
        } else {
            triggerMsg.hidden = true;
        }

        modal.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function hideProModal() {
        document.getElementById('pro-modal').hidden = true;
        document.body.style.overflow = '';
    }

    /* =====================================================================
       授權碼啟用（接受 JWT token，由 Worker 驗證簽名）
       ===================================================================== */
    async function activateLicense() {
        const input = document.getElementById('license-input');
        const msg   = document.getElementById('license-msg');
        const key   = input.value.trim();

        if (!key) {
            msg.textContent = '請輸入授權碼';
            msg.className   = 'license-feedback error';
            return;
        }

        // JWT 格式快速檢查：應該有兩個點
        if (key.split('.').length !== 3) {
            msg.textContent = '❌ 授權碼格式錯誤（應為 JWT 格式）';
            msg.className   = 'license-feedback error';
            return;
        }

        msg.textContent = '⏳ 驗證中…';
        msg.className   = 'license-feedback';

        const result = await ProManager.activateToken(key);
        if (result.ok) {
            msg.textContent = '✅ 啟用成功！全部 Pro 功能已解鎖';
            msg.className   = 'license-feedback success';
            setTimeout(() => {
                hideProModal();
                updateProBadge();
            }, 1200);
        } else {
            msg.textContent = `❌ ${result.error || '授權碼無效'}`;
            msg.className   = 'license-feedback error';
        }
    }

    /* =====================================================================
       Plan 切換（月 / 年）
       ===================================================================== */
    function setupPlanToggle() {
        const buttons = document.querySelectorAll('.pro-billing-toggle button');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updatePriceDisplay(btn.dataset.plan);
                PayPalIntegration.renderPayPalButton(btn.dataset.plan);
            });
        });
    }

    function updatePriceDisplay(plan) {
        const amount    = document.getElementById('pro-amount');
        const period    = document.getElementById('pro-period');
        const secondary = document.getElementById('pro-secondary');

        if (plan === 'monthly') {
            amount.textContent    = `$${PRO_CONFIG.PRICE_MONTHLY}`;
            period.textContent    = '/月';
            secondary.textContent = '隨時取消，無長期合約';
        } else {
            amount.textContent    = `$${PRO_CONFIG.PRICE_ANNUAL}`;
            period.textContent    = '/年';
            const monthlyEquiv    = (PRO_CONFIG.PRICE_ANNUAL / 12).toFixed(2);
            secondary.textContent = `相當於每月 $${monthlyEquiv}（節省 44%）`;
        }
    }

    /* =====================================================================
       訂閱成功 UI（由 paypal-integration.js 呼叫）
       ===================================================================== */
    function showSuccessState(token, subscriptionId) {
        const content = document.querySelector('.pro-modal-content');
        if (!content) return;

        // 縮短 token 顯示（前 16 字 + ... + 後 8 字）
        const shortToken = token.length > 30
            ? `${token.slice(0, 16)}…${token.slice(-8)}`
            : token;

        content.innerHTML = `
            <button class="pro-close" id="pro-success-close">×</button>
            <div class="pro-success">
                <div class="pro-icon">🎉</div>
                <h3>訂閱成功！歡迎加入 Pro</h3>
                <p style="color:#cbd5e1">感謝你支持 ∑ Calc</p>
                <p style="color:#94a3b8;font-size:.9rem;margin:1.5rem 0 .5rem">
                    你的授權碼已自動儲存於本裝置
                </p>
                <code class="license-display" id="pro-token-display" title="點擊複製完整 token">${shortToken}</code>
                <p class="small">
                    📌 換裝置時請複製完整 token 並貼到本對話框「啟用」<br>
                    <button id="pro-copy-token" style="margin-top:.5rem;padding:.3rem .8rem;font-size:.8rem">複製完整 Token</button>
                </p>
                <button id="pro-start-using">開始使用 Pro 功能</button>
                <p style="color:#475569;font-size:.7rem;margin-top:1.5rem;font-family:monospace">
                    Subscription ID: ${subscriptionId}
                </p>
            </div>
        `;

        // 綁定事件（取代 inline onclick，避免 CSP unsafe-inline）
        document.getElementById('pro-success-close')?.addEventListener('click', () => {
            hideProModal();
            updateProBadge();
        });
        document.getElementById('pro-start-using')?.addEventListener('click', () => {
            hideProModal();
            updateProBadge();
        });
        document.getElementById('pro-copy-token')?.addEventListener('click', () => {
            navigator.clipboard.writeText(token).then(() => {
                const btn = document.getElementById('pro-copy-token');
                if (btn) {
                    btn.textContent = '✅ 已複製';
                    setTimeout(() => { btn.textContent = '複製完整 Token'; }, 1500);
                }
            });
        });
    }

    /* =====================================================================
       Header Pro 徽章狀態更新
       ===================================================================== */
    function updateProBadge() {
        const btn = document.getElementById('proBadgeBtn');
        if (!btn) return;
        btn.classList.remove('is-free', 'is-trial', 'is-pro');

        if (ProManager.hasValidLicense()) {
            btn.classList.add('is-pro');
            btn.textContent = '💎 Pro';
            btn.title = '已啟用 Pro · 點擊查看訂閱資訊';
        } else if (ProManager.isTrialActive()) {
            const days = ProManager.getTrialDaysLeft();
            btn.classList.add('is-trial');
            btn.textContent = `⏱️ 試用 ${days} 天`;
            btn.title = '試用中 · 點擊升級為 Pro';
        } else {
            btn.classList.add('is-free');
            btn.textContent = '✨ 升級 Pro';
            btn.title = '升級到 Pro 解鎖進階功能';
        }
    }

    /* =====================================================================
       授權碼輸入框：JWT 格式自動 trim（不再強制 Crockford 分段）
       ===================================================================== */
    function setupLicenseInput() {
        const input = document.getElementById('license-input');
        if (!input) return;
        // JWT 不需要分段格式化，只去除空白
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\s+/g, '');
        });
    }

    /* =====================================================================
       Modal 關閉事件（點背景 / ESC）
       ===================================================================== */
    function setupModalDismiss() {
        const modal = document.getElementById('pro-modal');
        if (!modal) return;
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'pro-modal') hideProModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.hidden) hideProModal();
        });
    }

    /* =====================================================================
       啟用按鈕（取代 inline onclick="activateLicense()"）
       ===================================================================== */
    function setupActivateButton() {
        const btn = document.querySelector('.pro-license-input button');
        if (btn) btn.addEventListener('click', activateLicense);
    }

    /* =====================================================================
       Sandbox 模式視覺提示
       ===================================================================== */
    function showSandboxBanner() {
        if (!PRO_CONFIG.IS_SANDBOX) return;
        if (document.getElementById('sandbox-mode-banner')) return;  // 防重複

        const banner = document.createElement('div');
        banner.id = 'sandbox-mode-banner';
        banner.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0;
            background: linear-gradient(90deg, #f59e0b, #ef4444);
            color: #fff; text-align: center; padding: 6px 12px;
            font-size: 13px; font-weight: 600; z-index: 99999;
            box-shadow: 0 2px 8px rgba(0,0,0,.2);
            font-family: -apple-system, system-ui, sans-serif;
        `;
        banner.innerHTML = `
            🧪 SANDBOX 測試模式 — 訂閱不會真扣款
            <a href="${location.pathname}" style="color:#fff;text-decoration:underline;margin-left:1rem">切回 Live</a>
        `;
        document.body.appendChild(banner);
        document.body.style.paddingTop = '32px';
    }

    /* =====================================================================
       初始化
       ===================================================================== */
    function initProModule() {
        showSandboxBanner();
        setupPlanToggle();
        updatePriceDisplay('monthly');
        setupLicenseInput();
        setupModalDismiss();
        setupActivateButton();

        const proBtn = document.getElementById('proBadgeBtn');
        if (proBtn) proBtn.addEventListener('click', () => showProModal());

        PayPalIntegration.loadAndRender('monthly');

        // 背景驗證 token（不阻塞 UI）— 確認 KV 中訂閱仍 active
        ProManager.verifyWithServer().then((res) => {
            if (res.revoked) {
                console.warn('License revoked by server:', res.error);
                updateProBadge();
            }
        }).catch((err) => {
            console.warn('License verification skipped:', err.message);
        });

        // 背景自動續期：當 7 天 JWT 剩 < 48 小時時，重新 issue
        ProManager.refreshTokenIfNeeded().then((res) => {
            if (res.refreshed) {
                console.log('License token refreshed automatically');
            }
            if (res.revoked) {
                console.warn('License revoked during refresh:', res.error);
                updateProBadge();
            }
        }).catch((err) => {
            console.warn('Token refresh skipped:', err.message);
        });
    }

    /* =====================================================================
       公開 API（給計算機主程式用）
       ===================================================================== */
    window.ProUI = Object.freeze({
        showProModal,
        hideProModal,
        showSuccessState,
        updateProBadge,
        activateLicense,
        gateProFeature,
        initProModule,
    });

    // 向下相容：保留舊的全域函數名稱（給尚未遷移的 inline onclick 用）
    window.showProModal   = showProModal;
    window.hideProModal   = hideProModal;
    window.updateProBadge = updateProBadge;
    window.gateProFeature = gateProFeature;
    window.activateLicense = activateLicense;

    /* =====================================================================
       自動啟動
       ===================================================================== */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initProModule();
            updateProBadge();
        });
    } else {
        initProModule();
        updateProBadge();
    }
})();
