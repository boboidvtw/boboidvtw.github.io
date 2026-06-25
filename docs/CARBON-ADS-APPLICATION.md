# Carbon Ads Application — ∑ Calc

> **目的**：申請 https://www.carbonads.net/join — 直接複製貼到表單對應欄位。
> **送出日**：（填）　**回覆期**：5-7 個工作天　**Application URL**：（拿到後填）
> **備註**：流量數字使用者送出前以 Cloudflare Analytics 最新 30 天為準更新；本檔的是保守估計與定位文案。

---

## Field: Site URL
```
https://boboidvtw.github.io/
```

## Field: Site Name
```
∑ Calc (Sigma Calc)
```

## Field: Site Category / Topic
```
Developer & engineering tools — scientific calculator with built-in formula library
```

## Field: Site Description (Short, ~ 250 chars)

```
A free online scientific calculator with a 100-formula library (math, physics, engineering, finance, health), function plotting, 3D surface plots, unit and currency conversion. Built as a single HTML file with zero trackers and ad-free Pro tier.
```

## Field: Site Description (Long, ~ 600 chars)

```
∑ Calc is a free scientific calculator built for developers, engineers, students, and scientists. The interface is intentionally dense and keyboard-friendly: 5 main tabs (Calculate / Units / Currency / Formulas / Saved), a 100-formula library spanning engineering, physics, finance and health, function plotting with derivative/integral/intersection tooling, 3D surface plotting, and a custom-formula builder.

The site is built as a single index.html with no frameworks, no third-party trackers, and a Service Worker for offline use. Available in English, Traditional Chinese, Simplified Chinese, and Japanese. A Pro subscription (PayPal, $2.99/mo, 7-day free trial) unlocks advanced plotting tools — meaning we view ad revenue as a complement to subscription revenue, not the primary monetization channel. That lets us keep the ad experience minimal and respectful of the site's tool-first identity.
```

## Field: Why is your site a good fit for Carbon Ads?

```
Three reasons:

1. Audience match — visitors are developers, engineers, scientists, and CS/STEM students reaching for a calculator with deeper-than-spreadsheet primitives (tangents, integrals, 3D plotting, intersection solving, 100 vetted formulas). This is exactly the audience Carbon's sponsors — dev tools, SaaS, design tools, hosting, IDE/editor extensions — want to reach.

2. Single-slot, tool-first design — the site already has a clean three-panel sidebar architecture. Carbon's single 130x100 placement fits naturally at the bottom of the desktop sidebar without disrupting the calculator workflow or competing with primary actions. Mobile sidebar is hidden site-wide, so the ad respects mobile users.

3. Aligned monetization philosophy — we have a paying Pro tier ($2.99/mo, ad-free), so ads are supplementary. We won't pressure for higher ad density or invasive placements; we want the same minimal, respectful ad experience Carbon is known for among dev/design publishers.
```

## Field: Monthly Pageviews

> **填表前用最新 Cloudflare Analytics 30-day rollup 數字覆蓋這欄。若 Cloudflare Analytics 未開啟，先在 dash.cloudflare.com 啟用後等 24h 再申請。**

```
Currently low (growing) — site relaunched with formula library and Pro subscription in May 2026. Will provide latest Cloudflare Analytics screenshot upon request.
```

## Field: Audience Geography

```
Primary: United States, Canada, United Kingdom, Australia, Germany (English-speaking developers and engineers).
Secondary: Traditional Chinese (Taiwan, Hong Kong), Simplified Chinese (mainland China developer community), Japan.
The site is fully localized in 4 languages but EN audience dominates by intent (Carbon-relevant developer queries).
```

## Field: Audience Demographics / Personas

```
- Software engineers and CS students doing quick math, base conversion, or formula lookups during coding
- Hardware / electrical engineers verifying Ohm's law, LC/RC frequencies, signal calculations
- Physics and chemistry students working through coursework
- Financial professionals running compound interest, EAR, BEP, dividend yield calculations
- Health-conscious users computing TDEE, BMR, body fat (Deurenberg)
- All technically literate, English-fluent, low ad-tolerance — exactly Carbon's existing developer audience profile
```

## Field: Why developers/designers visit your site

```
They need a calculator that goes beyond `bc` or the OS default — one that ships 100 vetted formulas with full LaTeX/expression input, plots functions in seconds, handles unit and currency conversion, and stores history across sessions. Most online calculators are ad-spammed or feature-poor; ∑ Calc is the dev-tool version of that category.
```

## Field: How will you place the ad?

```
A single Carbon Ads slot will be placed at the bottom of the desktop right sidebar (below the existing "Currency Rates" panel), in its own panel container styled to match the site's design system. The slot:

- Loads only for Free-tier users (Pro and 7-day Trial users will not load the embed script at all, via our existing ProManager.isProActive() check)
- Hidden entirely on mobile (the sidebar itself is display:none below 768px)
- One placement only — no rotation, no second slot, no popups, no interstitials
- Will be the only ad network on the site (Carbon's exclusivity respected)
```

## Field: Other monetization on site

```
- Pro subscription via PayPal Subscriptions ($2.99/mo or $19.99/yr, 7-day free trial)
- One-time tips via GitHub Sponsors and PayPal.me
- No other ad networks — currently zero ads (a prior AdSense script tag was removed after rejection, see CHANGELOG v3.8.3). Carbon Ads will be the only network if approved.
```

## Field: Languages supported

```
English (primary), Traditional Chinese (zh-TW), Simplified Chinese (zh-CN), Japanese (ja)
```

## Field: Open source / GitHub

```
https://github.com/boboidvtw/boboidvtw.github.io — site source is public, MIT-licensed, single index.html with companion js/ modules
```

## Field: Contact email

```
（使用者填 — Carbon 會把核可信寄到這信箱）
```

---

## 送出前最後檢查

- [ ] Cloudflare Analytics 已開啟、有 ≥7 天數據（截圖待會他們可能要）
- [ ] 流量欄已用最新 30-day 數字覆蓋
- [ ] Contact email 已填
- [ ] 把這份 markdown 開兩個 tab 並排，一個欄位一個欄位複製

## 後續

- 通過 → 拿到 `serve` code 與 `placement` ID → 回 session 觸發 Phase C 整合（見 CHANGELOG [3.8.3] 下一步）
- 被拒 → 評估候選方案：BuySellAds 自助 banner、直接接洽贊助商（Polypane / Cursor / Linear）、或養流量 6-12 月後重申
