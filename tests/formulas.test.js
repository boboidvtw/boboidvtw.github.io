/**
 * formulas.test.js — 公式庫的代入與計算結果（2026-11-18 建立，v3.12.0）
 *
 * 防的是：公式寫錯（運算子、括號、變數名）、varTransform 少換算（使用者輸入 5% 被當成 5），
 * 或 id / tier 被改動而讓 Bobo Labs 文章內嵌的 `?formula=N` 指到錯的公式。
 *
 * 期望值是獨立算出的字面值（Python 手算／教科書範例），不是用同一條式子在測試裡重算。
 * 代入走 index.html 裡上線的 substituteFormulaVars()，不是測試自己的副本。
 *
 * 執行：node --test tests/*.test.js
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { builtInFormulas, varDescMap, varTransform, substituteFormulaVars, calculate } =
  require('./extract.js').load();

function run(id, values) {
  const f = builtInFormulas.find(x => x.id === id);
  assert.ok(f, `找不到公式 #${id}`);
  const expr = substituteFormulaVars(f.expr, f.vars, varTransform[id] || {}, values);
  const result = calculate(expr);
  assert.notStrictEqual(result, 'Error', `#${id} 計算回傳 Error（代入後：${expr}）`);
  return Number(result);
}

function near(actual, expected, label) {
  const tol = Math.max(1e-6, Math.abs(expected) * 1e-6);
  assert.ok(Math.abs(actual - expected) <= tol, `${label}：得到 ${actual}，期望 ${expected}`);
}

// [id, 使用者在 modal 輸入的值（比例一律是 %）, 期望結果, 說明]
const CASES = [
  [111, { V2: 200, V1: 100, t: 10 },                 7.177346253629313,  '10 年翻倍的 CAGR ≈ 7.18%'],
  [112, { r: 5, i: 2 },                              2.941176470588247,  'Fisher：1.05/1.02−1，不是單純 5−2=3'],
  [113, { PMT: 10000, r: 6, n: 12 },                 123355.62372899655, '月投 1 萬、年化 6%（月 0.5%）一年'],
  [114, { P: 100000, g: 3, y: 4, t: 10 },            198932.45399322922, '(1.03×1.04)^10 × 10 萬'],
  [115, { E: 600000, r: 4 },                         15000000,           '年花 60 萬 → 1,500 萬（25 倍）'],
  [116, { D: 3, y: 5 },                              60,                 '配 3 元、要 5% 殖利率 → 60 元'],
  [117, { P: 50, B: 25 },                            2,                  'P/B = 2'],
  [118, { M: 30000, I: 90000 },                      33.333333333333336, '月付 3 萬 / 收入 9 萬 = 1/3'],
  [119, { waist: 80, hip: 100 },                     0.8,                'WHR 0.8'],
  [120, { a: 40 },                                   180,                'Tanaka：208 − 28'],
  [121, { a: 40, rest: 60, intensity: 70 },          144,                'Karvonen：(180−60)×0.7+60'],
  [122, { h: 170 },                                  63.58,              '22 × 1.7²'],
];

for (const [id, values, expected, label] of CASES) {
  test(`#${id} ${label}`, () => near(run(id, values), expected, `#${id}`));
}

test('百分比輸入真的有被換算（少了 varTransform 會差兩個數量級）', () => {
  // 115 若沒把 4 換成 0.04，會得到 150,000 而不是 15,000,000
  assert.ok(run(115, { E: 600000, r: 4 }) > 1e7);
  // 113 若用年利率而非月利率，一年後會遠大於 12 萬多
  assert.ok(run(113, { PMT: 10000, r: 6, n: 12 }) < 130000);
});

test('公式 id 不重複（文章內嵌 ?formula=N 依賴 id 唯一）', () => {
  const ids = builtInFormulas.map(f => f.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

test('v3.12.0 新公式的 id、分類、Tier 與 Bobo Labs 灰卡一致', () => {
  const expected = {
    111: ['金融', 'free'], 112: ['金融', 'free'], 113: ['金融', 'pro'],  114: ['金融', 'pro'],
    115: ['金融', 'free'], 116: ['金融', 'pro'],  117: ['金融', 'free'], 118: ['金融', 'free'],
    119: ['健康', 'free'], 120: ['健康', 'free'], 121: ['健康', 'pro'],  122: ['健康', 'free'],
  };
  for (const [id, [group, tier]] of Object.entries(expected)) {
    const f = builtInFormulas.find(x => x.id === Number(id));
    assert.ok(f, `缺 #${id}`);
    assert.strictEqual(f.group, group, `#${id} group`);
    assert.strictEqual(f.tier || 'free', tier, `#${id} tier`);
  }
});

test('新公式每個變數都有說明（modal placeholder 不能是「輸入數值」）', () => {
  for (const f of builtInFormulas.filter(x => x.id >= 111)) {
    for (const v of f.vars) {
      assert.ok(varDescMap[f.id] && varDescMap[f.id][v], `#${f.id} 的 ${v} 沒有 varDescMap 說明`);
    }
  }
});
