/**
 * extract.test.js — 抽取器自身的守門（2026-08-14 建立）
 *
 * 其餘測試全部建立在「extract.js 真的從 index.html 抽到了東西」之上。
 * 如果哪天函式改名、抽取器安靜地抽到空字串，測試會全綠而什麼都沒守到 ——
 * 這個檔案就是為了讓那種情況變成紅燈。
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { load, extractFunction, INDEX_PATH, FUNCTION_MARKERS, EXPORTED } = require('./extract.js');

test('index.html 存在且抽得出所有 marker', () => {
  const src = fs.readFileSync(INDEX_PATH, 'utf8');
  for (const marker of FUNCTION_MARKERS) {
    const block = extractFunction(src, marker);
    assert.ok(block.length > 50, `${marker} 抽出的區塊過短（${block.length} 字元），可能只抓到宣告行`);
    assert.ok(block.trim().endsWith('}'), `${marker} 抽出的區塊沒有正確收斂`);
  }
});

test('抽出的 API 全部是函式', () => {
  const api = load();
  for (const name of EXPORTED) {
    assert.strictEqual(typeof api[name], 'function', `${name} 不是函式`);
  }
});

test('marker 找不到時要大聲失敗，不能安靜回空字串', () => {
  const src = fs.readFileSync(INDEX_PATH, 'utf8');
  assert.throws(() => extractFunction(src, 'function thisDoesNotExist'), /抽取失敗/);
});

test('抽出來的就是 index.html 現在的版本（不是副本）', () => {
  const src = fs.readFileSync(INDEX_PATH, 'utf8');
  const api = load();
  // 用一個只有現行實作才有的行為當指紋：逗號依括號深度分辨
  assert.ok(src.includes('_resolveCommas'), 'index.html 沒有 _resolveCommas，測試與本體已漂移');
  assert.strictEqual(api.sanitizePastedExpression('1,234 + sin(30)').value, '1234 + sin(30)');
  assert.strictEqual(api.sanitizePastedExpression('nCr(5,123)').value, 'nCr(5,123)');
});
