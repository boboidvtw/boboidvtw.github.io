/**
 * paste-sanitize.test.js — 貼上／網址算式的清洗與驗證邊界（2026-08-14 建立）
 *
 * 兩個方向都要守：該拒的有拒（安全），該過的還要能被引擎算出**正確答案**
 * （否則守門只是把功能擋死，看起來很安全而已）。
 *
 * 執行：node --test tests/
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { sanitizePastedExpression, calculate } = require('./extract.js').load();

// [輸入, 期望的清洗結果, 期望 calculate 的值（null = 只要求不是 Error）]
const ACCEPT = [
  ['12+7',               '12+7',              19],
  ['1+2*3',              '1+2×3',             7],
  ['sin(30)+cos(60)',    'sin(30)+cos(60)',   1],        // DEG: 0.5 + 0.5
  ['nCr(5,123)',         'nCr(5,123)',        0],        // r>n → 0；重點是逗號沒被當千分位拆掉
  ['nCr(10,3)',          'nCr(10,3)',         120],
  ['1,234+5',            '1234+5',            1239],     // 無函數呼叫 → 千分位拆解
  ['1,234,567+1',        '1234567+1',         1234568],
  ['１２＋３',             '12+3',              15],       // 全形
  ['（２＋３）×４',         '(2+3)×4',           20],       // 全形括號與乘號
  ['10 – 3',             '10 − 3',            7],        // en dash
  ['10 — 3',             '10 − 3',            7],        // em dash
  ['√(16)',              '√(16)',             4],
  ['5 mod 3',            '5 mod 3',           2],
  ['|-5|',               '|−5|',              5],
  ['2^10',               '2^10',              1024],
  ['100%',               '100%',              1],
  ['5!',                 '5!',                120],
  ['6.626e-34',          '6.626e−34',         null],     // 科學記號
  ['π',                  'π',                 null],
  ['abs(-3)+floor(2.7)', 'abs(−3)+floor(2.7)', 5],
  ['exp(0)',             'exp(0)',            1],
  ['1  +  2',            '1 + 2',             3],        // 空白壓成單一空白
  // 千分位與函數呼叫同時出現。用「整段有沒有函數呼叫」當旗標的版本會保留頂層逗號，
  // 被 JS 的逗號運算子靜靜吃成 234.5 —— 一個看起來很合理的錯答案。
  ['1,234 + sin(30)',    '1234 + sin(30)',    1234.5],
  ['nCr(5,123) + 1,000', 'nCr(5,123) + 1000', 1000],
  ['sin(1,2)',           'sin(1,2)',          null],     // 函數參數列內的逗號照留
  ['1,234,567 × 2',      '1234567 × 2',       2469134],
  ['(1+2)×3',            '(1+2)×3',           9],
];

// calculate() 最終是 new Function()，貼上與 #calc= 是僅有的兩條外部輸入入口
const REJECT = [
  ['',                       'empty'],
  ['   ',                    'empty'],
  ['alert(1)',               'bad_syntax'],
  ['eval("1")',              'bad_syntax'],
  ['Math.random()',          'bad_syntax'],
  ['exp.call(1)',            'bad_syntax'],   // 合法函數名開頭、後面接別的東西
  ['abs.constructor',        'bad_syntax'],
  ['cos.constructor("x")()', 'bad_syntax'],
  ['constructor',            'bad_syntax'],
  ['1; alert(1)',            'bad_syntax'],
  ['[].map',                 'bad_syntax'],
  ['`${1}`',                 'bad_syntax'],
  ['process.exit()',         'bad_syntax'],
  ['fetch("//x")',           'bad_syntax'],
  ['0x1F',                   'bad_syntax'],
  ['1+2\nalert(3)',          'bad_syntax'],
  ['window',                 'bad_syntax'],
  ['this',                   'bad_syntax'],
  ['1'.repeat(201),          'too_long'],
  // 頂層逗號在 new Function 裡是逗號運算子，會靜靜丟掉左邊
  ['999, 1',                 'bad_syntax'],
  ['(1,2)',                  'bad_syntax'],
  ['1,(2)',                  'bad_syntax'],
  // 數字緊接函數名 → calculate() 轉出來是 JS 語法錯，在驗證端就對齊掉
  ['5exp(1)',                'bad_syntax'],
  ['2sin(0)',                'bad_syntax'],
  ['(1)cos(0)',              'bad_syntax'],
  // 多餘的右括號會提前關掉 calculate() 的 'return (' 包裝
  ['1)+(2',                  'bad_syntax'],
  ['1))',                    'bad_syntax'],
];

test('接受：合法算式通過驗證，且引擎算得出正確答案', () => {
  for (const [input, expected, value] of ACCEPT) {
    const r = sanitizePastedExpression(input);
    assert.ok(r.ok, `應接受但被拒: ${JSON.stringify(input)} (${r.reason})`);
    assert.strictEqual(r.value, expected, `清洗結果不符: ${JSON.stringify(input)}`);
    if (value !== null) {
      assert.strictEqual(calculate(r.value), value, `引擎算錯: ${JSON.stringify(input)}`);
    } else {
      assert.notStrictEqual(calculate(r.value), 'Error', `引擎回 Error: ${JSON.stringify(input)}`);
    }
  }
});

test('拒絕：不合法或危險的內容整段擋下', () => {
  for (const [input, reason] of REJECT) {
    const r = sanitizePastedExpression(input);
    assert.ok(!r.ok, `應拒絕卻通過: ${JSON.stringify(input.slice(0, 40))} → ${r.value}`);
    assert.strictEqual(r.reason, reason, `拒絕理由不符: ${JSON.stringify(input.slice(0, 40))}`);
  }
});

test('factorial 有上限：大數輸入不會讓分頁凍死', () => {
  const started = Date.now();
  assert.strictEqual(calculate('99999999999999999999!'), 'Error');
  assert.ok(Date.now() - started < 1000, 'factorial 上限失效，迴圈在空轉');
  assert.strictEqual(calculate('5!'), 120, '加了上限之後正常階乘仍要算得對');
});

test('守門本身不是擺設：雙向都有足夠樣本', () => {
  assert.ok(ACCEPT.length >= 25, `ACCEPT 樣本過少 (${ACCEPT.length})`);
  assert.ok(REJECT.length >= 25, `REJECT 樣本過少 (${REJECT.length})`);
});
