# Frequently Asked Questions（常見問題）

---

## General（一般）

**Q: Does Super Calculator require an internet connection?**
**Q: Super Calculator 需要網路連線嗎？**

No. It runs entirely in the browser with zero network requests.
不需要，完全在瀏覽器本機執行，零網路請求。

---

**Q: Which browsers are supported?**
**Q: 支援哪些瀏覽器？**

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |
| Mobile Chrome | 90+ |
| Mobile Safari | 14+ |

---

**Q: Is there a mobile app?**
**Q: 有手機 APP 嗎？**

Not yet. However, the web app is fully responsive and works well on mobile browsers. PWA support (installable as an app) is planned for a future release.

目前沒有。但網頁版已支援響應式設計，在手機瀏覽器上使用體驗良好。未來版本計劃支援 PWA（可安裝為 APP）。

---

## Calculation（計算）

**Q: Why is 0.1 + 0.2 not exactly 0.3?**
**Q: 為什麼 0.1 + 0.2 不等於 0.3？**

This is a floating-point precision issue inherent to all binary computers (IEEE 754 standard). The calculator displays results rounded to 10 significant digits to minimize visible impact.

這是所有二進位電腦固有的浮點數精度問題（IEEE 754 標準）。計算機會將結果四捨五入到 10 位有效數字以減少影響。

---

**Q: What is the maximum number the calculator can handle?**
**Q: 計算機能處理的最大數字是多少？**

JavaScript's `Number.MAX_SAFE_INTEGER` is 9,007,199,254,740,991 (≈ 9 × 10¹⁵). For scientific notation, values up to 1.7976931348623157 × 10³⁰⁸ are supported.

---

**Q: How do I calculate percentages?**
**Q: 如何計算百分比？**

Use the `%` button: entering `50 % of 200` → `50 ÷ 100 × 200 = 100`.

---

## Formula Library（公式庫）

**Q: Can I add custom formulas?**
**Q: 可以新增自訂公式嗎？**

Currently, custom formulas must be added by editing `index.html`. See the [Developer Guide](../README.md#developer-guide) for instructions. A UI for adding custom formulas is planned for v1.1.0.

目前需透過編輯 `index.html` 新增公式。參見[開發者指南](../README.md#開發者指南)。v1.1.0 計劃提供 UI 新增自訂公式。

---

**Q: How many formulas are built in?**
**Q: 內建幾個公式？**

| Category | Count |
|----------|-------|
| Geometry | 20+ |
| Physics | 30+ |
| Chemistry | 15+ |
| Finance | 10+ |
| **Total** | **75+** |

---

## History & Data（歷史記錄）

**Q: Where is my calculation history stored?**
**Q: 計算歷史存在哪裡？**

In the browser's `localStorage`. It is never sent to any server.

儲存於瀏覽器的 `localStorage`，從不傳送到任何伺服器。

---

**Q: Will history be lost if I close the browser?**
**Q: 關閉瀏覽器後歷史記錄會消失嗎？**

No, `localStorage` persists across browser sessions. However, clearing your browser cache or site data will remove the history.

不會，`localStorage` 跨瀏覽器 session 保留。但清除瀏覽器快取或網站資料後會消失。

---

## Contributing（貢獻）

**Q: How can I report a bug?**
**Q: 如何回報 Bug？**

Open an [Issue on GitHub](https://github.com/YOUR_USERNAME/super-calculator/issues) with:
1. Steps to reproduce
2. Expected result
3. Actual result
4. Browser and OS version

**Q: How can I contribute a new formula?**
**Q: 如何貢獻新公式？**

1. Fork the repo
2. Add the formula to the library in `index.html`
3. Document it in `docs/FORMULAS.md`
4. Open a Pull Request with the category and source reference
