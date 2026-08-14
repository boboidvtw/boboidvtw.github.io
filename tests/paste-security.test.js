/**
 * paste-security.test.js — 針對貼上／網址算式驗證的繞過構造（2026-08-14 建立）
 *
 * 背景：calculate() 最終用 new Function('return (' + expr + ')') 求值。
 * 外部字串有兩條路能到達它 —— 剪貼簿貼上，以及 #calc= 網址參數
 * （後者在 v3.10.0 之前是零驗證的，可構造出可執行的連結；已改為共用同一套驗證）。
 *
 * 這裡不做規則閱讀，只放**具體構造**：每一條都是想像中的攻擊字串，全部必須被拒。
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { sanitizePastedExpression, calculate } = require('./extract.js').load();

const BYPASS_ATTEMPTS = [
  // 逃逸到 Function constructor
  'abs.constructor("return 1")()',
  'cos.constructor',
  'exp.constructor("x")',
  '(1).constructor',
  '1..constructor',
  'sqrt.__proto__',
  'abs.__proto__.constructor',
  // 取得全域
  'globalThis', 'window', 'self', 'top', 'this', 'Function', 'Math',
  'Math.constructor("")',
  // 用「函數名的字母」拼識別字：tokenizer 只認完整函數名且必須緊接 '('
  'factorial(200)',
  'facTorial(5)',
  'nCrnPr(1)',
  'exptan(1)',
  // 函數名開頭但後面不是 '('
  'exp.call(1)', 'exp[0]', 'exp `x`', 'abs=1', 'log:1',
  // 語句注入
  '1;alert(1)', '1,alert(1)', '1)+alert(1', 'alert`1`',
  // 逗號運算子 —— #calc= 零驗證時期真正可用的那一招
  "1,(window.x=1)",
  "1,(fetch('//evil'))",
  '1,document.cookie',
  // 編碼與跳脫
  '\\u0061lert(1)', 'e\\u0076al(1)', '%61lert(1)',
  // 註解 / 換行
  '1//x\nalert(1)', '1/*x*/+2',
  // 選擇性存取
  'abs?.call', 'abs?.(1)',
];

test('繞過構造：全部應被拒絕', () => {
  const leaked = [];
  for (const attempt of BYPASS_ATTEMPTS) {
    const r = sanitizePastedExpression(attempt);
    if (r.ok) leaked.push({ input: attempt, cleaned: r.value, evaluated: String(calculate(r.value)) });
  }
  assert.deepStrictEqual(leaked, [], '以下字串通過了驗證:\n' + JSON.stringify(leaked, null, 2));
});

test('mod 是唯一不需緊接 ( 的字母 token —— 確認它不會開出縫', () => {
  for (const s of ['1 mod 2', '1 mod mod 2', 'mod', 'mod mod mod']) {
    const r = sanitizePastedExpression(s);
    assert.ok(r.ok, `mod 樣本應通過清洗: ${s}`);
    const out = calculate(r.value);
    assert.ok(out === 'Error' || typeof out === 'number', `mod 樣本產生意外結果: ${s} → ${out}`);
  }
  assert.strictEqual(calculate('1 mod 2'), 1);
});

test('串接語意：貼上的內容接在既有算式後不會產生新識別字', () => {
  // 既有 display 只可能由按鈕／鍵盤的固定 token 構成，與通過驗證的貼上內容串接後，
  // 仍只會是「完整函數名 + 符號」的序列。
  const existing = ['12', 'sin(', '1e', '5!', '(', 'abs('];
  const pasted = sanitizePastedExpression('cos(60)');
  assert.ok(pasted.ok);
  for (const prefix of existing) {
    const out = calculate(prefix + pasted.value);
    assert.ok(out === 'Error' || typeof out === 'number' || typeof out === 'string',
      `串接後產生意外型別: ${prefix + pasted.value} → ${typeof out}`);
  }
});

test('繞過清單本身要夠厚', () => {
  assert.ok(BYPASS_ATTEMPTS.length >= 30, `構造樣本過少 (${BYPASS_ATTEMPTS.length})`);
});
