# 💎 Pro Tier — Technical Reference

> **Version**: v3.1.0
> **Status**: ✅ Production (PayPal Live)
> **Last updated**: 2026-05-08

This document is the technical companion to the Pro subscription system shipped in v3.1. It covers architecture, data flow, gating points, PayPal setup, and operational notes.

---

## 1. Architecture Overview

The Pro module is a **single-file embedded subsystem** inside `index.html`. It does not require a backend, build step, or external dependency beyond the PayPal JavaScript SDK loaded at runtime.

```
┌─────────────────────────────────────────────────────────────┐
│                     index.html (252 KB)                      │
│                                                               │
│  ┌─────────────────┐   ┌──────────────────┐   ┌───────────┐  │
│  │  Calculator UI  │   │   Pro Module     │   │ PayPal    │  │
│  │  (existing)     │←─→│   (PRO_CONFIG +  │←─→│ JS SDK    │  │
│  │                 │   │    ProManager)   │   │ (CDN)     │  │
│  └─────────────────┘   └──────────────────┘   └───────────┘  │
│           ↓                      ↑                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  gateProFeature(featureKey, callback)                  │  │
│  │  ─ Wraps every Phase 5/6/7/8 / SVG entry point         │  │
│  │  ─ Returns true / runs callback if Pro                 │  │
│  │  ─ Opens upgrade modal if Free                         │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    localStorage:
                    ─ super_calc_pro_license
                    ─ super_calc_trial_start
                    ─ super_calc_paypal_sub_id
```

### Why no backend?

For the v1 MVP, **honor-system pricing** is acceptable. Client-side license validation can be bypassed via DevTools, but ~95% of users will not bother. If revenue justifies, the path forward is:
- **Cloudflare Workers + KV** (~$5/mo) for license signing & validation
- **PayPal Webhook** to handle subscription lifecycle (renewal, cancellation, refund)
- Migrate `validateLicense()` from regex check to server `fetch()` call

---

## 2. State Model

```javascript
const PRO_CONFIG = {
  STORAGE_KEY:        'super_calc_pro_license',
  TRIAL_KEY:          'super_calc_trial_start',
  SUBSCRIPTION_KEY:   'super_calc_paypal_sub_id',
  TRIAL_DAYS:         7,
  PAYPAL_PLAN_ID_MONTHLY: 'P-7YN578147A145924NNH6Y32I',  // Live
  PAYPAL_PLAN_ID_ANNUAL:  'P-6XU39039F20435621NH6Y5GI',  // Live
  PRICE_MONTHLY:      2.99,
  PRICE_ANNUAL:       19.99,
  FEATURES:           { /* feature key → display name */ }
};

const ProManager = {
  isProActive():       boolean   // hasValidLicense() OR isTrialActive()
  hasValidLicense():   boolean   // regex validates SUPC-XXXX-XXXX-XXXX
  isTrialActive():     boolean   // (Date.now() - trialStart) < 7 days
  getTrialDaysLeft():  number
  setLicense(key):     void
  setSubscription(id): string    // generates + stores license
  startTrial():        boolean
  reset():             void      // clears all 3 localStorage keys
};
```

---

## 3. License Code Generation

Licenses are deterministically derived from PayPal Subscription IDs to ensure the same subscription always maps to the same code.

```javascript
function generateLicenseFromSubscription(subId) {
  return `SUPC-${makeSegment(subId, 'A')}-${makeSegment(subId, 'B')}-${makeSegment(subId, 'C')}`;
}

const LICENSE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  // 31 chars

function makeSegment(seed, salt) {
  let result = '';
  for (let pos = 0; pos < 4; pos++) {
    let h = 0x811c9dc5;  // FNV-1a offset basis
    const input = `${seed}|${salt}|${pos}|super_calc_2026`;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;  // FNV prime, 32-bit unsigned
    }
    result += LICENSE_ALPHABET[h % LICENSE_ALPHABET.length];
  }
  return result;
}
```

### Design decisions

- **Crockford alphabet** (`A-Z` minus `I`, `L`, `O`, plus `2-9`): 31 chars, no visually ambiguous pairs (`0/O`, `1/I/L`)
- **Per-position independent hashing**: each of the 12 chars has its own seeded FNV-1a → no leading-zero patterns from `padStart`
- **`Math.imul` for FNV prime multiplication**: forces 32-bit unsigned semantics in JS (avoids 53-bit float precision issues)
- **Salts**: per-segment (`A`, `B`, `C`) + per-position (`0..3`) + project namespace (`super_calc_2026`)

### Collision space

- 31^4 ≈ 924K per segment × 3 segments = 31^12 ≈ **7.9 × 10^17**
- For comparison, total iPhones ever sold ≈ 2 × 10^9
- Collision risk for our user base (estimated <100K subscribers in 5 years): **negligible**

---

## 4. Feature Gating

All Pro entry points are wrapped with `gateProFeature(featureKey, callback)`:

```javascript
function gateProFeature(featureKey, callback) {
  if (ProManager.isProActive()) {
    callback();
    return true;
  }
  showProModal({ feature: featureKey });
  return false;
}
```

### Active gates (7 total)

| Feature key | Gate location | Phase | Behavior on Free |
|-------------|---------------|-------|------------------|
| `tangent` | `[data-tool="tangent"]` click handler | 5 | Modal opens, tool selection blocked |
| `integral` | `[data-tool="integral"]` click handler | 5 | Same |
| `slope` | `[data-tool="slope"]` click handler | 5 | Same |
| `intersect` | `#graphFindIntersectBtn` click | 6 | Modal opens, no intersection scan |
| `statistics` | `[data-mode="statistics"]` click | 7 | Modal opens, mode does not switch |
| `3d` | `[data-mode="3d"]` click | 8 | Same |
| `svg` | `#graphExportSvgBtn` click | v2 | Modal opens, no download |

Free features explicitly preserved:
- All basic & scientific calculation
- Function mode plotting
- `mark` tool (point marking on curves)
- PNG export
- Special-points detection (zeros, extrema)
- X-range adjustment, parameter sliders

---

## 5. PayPal Integration

### SDK loading

```html
<script
  src="https://www.paypal.com/sdk/js?client-id=BAAwe...prky-9L0&vault=true&intent=subscription&currency=USD"
  data-sdk-integration-source="button-factory"
></script>
```

### Subscribe button

```javascript
paypal.Buttons({
  style: { shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' },
  createSubscription(data, actions) {
    return actions.subscription.create({
      plan_id: planId,  // monthly or annual
      application_context: {
        brand_name:  '∑ Calc Pro',
        user_action: 'SUBSCRIBE_NOW',
      }
    });
  },
  onApprove(data) {
    const license = ProManager.setSubscription(data.subscriptionID);
    showSuccessState(license, data.subscriptionID);
  },
  onError(err) { /* show error UI */ },
  onCancel()   { /* log */ },
}).render('#paypal-button-container');
```

### PayPal account requirements

| Requirement | Status |
|-------------|--------|
| PayPal Business account | ✅ Required (Personal cannot generate Live API credentials) |
| Live App in Developer Dashboard | ✅ One App created (`Default App`) |
| Live Client ID | ✅ Stored in HTML script tag (public, embedded by design) |
| Live Secret Key | ⚠️ Never embedded in client (only used for backend OAuth, not needed in v1) |
| Subscription Plans | ✅ 2 Live plans created and Active |

---

## 6. Sandbox vs Live switching

For local testing without real charges, swap these 3 values:

| Component | Sandbox | Live (current) |
|-----------|---------|----------------|
| Client ID | `ARsg9OYpS2sah6TGWw_DPxyj-p2O6j_JRmUcgInTsuWKreOVUH9jdliSBzYRXg1xKuFsUe0jMF4rmyDL` | `BAAwe1vut4JSk6JhmXFWzzvQRUswxr3UWYOPNvhFYnsd60xmFL44_mEqaXSFr4mlRyW-eIlo7yprky-9L0` |
| Monthly Plan | `P-9EP53164NM591910NNH6UWJY` | `P-7YN578147A145924NNH6Y32I` |
| Annual Plan | `P-3815018227551592KNH6UXIQ` | `P-6XU39039F20435621NH6Y5GI` |

Sandbox values are kept in source comments for fast switch-back. Both Sandbox and Live plans share identical pricing and trial period for accurate testing.

---

## 7. Operational notes

### Customer-side support

- Footer email: `boboidvtw+supercalc@gmail.com` (Gmail `+` alias for filterable mailbox)
- Common support scenarios:
  - **Lost license** → user lost localStorage and didn't save the code → contact support, manual lookup via PayPal Subscription ID
  - **Subscription cancellation** → user does this via PayPal directly; no app-side action needed
  - **Refund** → handle via PayPal Resolution Center

### Known operational risks

1. **License loss without backup**: User clears browser storage, loses license code → needs manual reissue. Mitigation: success modal explicitly tells user to save the code.
2. **Sandbox/Live mismatch**: If Plan IDs are mixed across environments, Subscribe button errors out. Mitigation: triple-check IDs before deploying; use grep to scan for stale `PLACEHOLDER` strings.
3. **Client ID typos**: Visual ambiguity (e.g., `mIRyW` vs `mlRyW`) → SDK rejects with "client-id not recognized". Mitigation: always copy via clipboard button in Developer Dashboard, never re-type.

---

## 8. Files modified for v3.1

| File | Change |
|------|--------|
| `index.html` | +788 / -16 lines. Added Pro CSS (~280 LOC), Pro modal HTML (~75 LOC), Pro JS module (~250 LOC), wrapped 7 Pro entry points with `gateProFeature()`. Added Pro badge button in header. Loaded PayPal SDK. |
| `README.md` (zh-TW) | Added v3.1 Pro tier section, updated TOC, version badge, version history. |
| `README_EN.md` | Same as zh-TW, English version. |
| `CHANGELOG.md` | Added detailed v3.1 entry above v3.0. |
| `docs/PRO_TIER.md` | This document. |

---

## 9. Future roadmap (v4.x candidates)

- **Backend license validation** (Cloudflare Workers + KV)
- **PayPal webhook** for automatic cancellation handling
- **Email-based license recovery** (user enters PayPal email → look up subscription → resend code)
- **Promo codes** (e.g., student discount, early-bird annual)
- **Annual-only "team license"** (5 seats for $79/year)
- **Stripe as alternative** (lower fees: 2.9% vs PayPal's 3.4%)

---

🌸 *Made with care by Amy Agent (Claude Sonnet 4.5).*
