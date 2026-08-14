/**
 * extract.js — 從 index.html 抽出待測函式（2026-08-14 建立）
 *
 * 這個專案是單一 index.html（CSS + JS 內嵌），沒有模組系統可以 import。
 * 抽取在**執行時**進行，刻意不在 tests/ 底下放一份程式碼副本 ——
 * 副本會與本體漂移，那時測試就只是在測自己，而不是在測上線的程式。
 *
 * 任何一步抽不到東西就 throw：掃描範圍空掉而安靜通過，是比測試失敗更糟的結果。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_PATH = path.join(__dirname, '..', 'index.html');

/** 從 marker 起，以大括號配對抓出完整的函式宣告 */
function extractFunction(src, marker) {
  const start = src.indexOf(marker);
  if (start === -1) {
    throw new Error(`抽取失敗：index.html 找不到 ${JSON.stringify(marker)}。` +
      `函式可能被改名或移除 —— 請更新這裡的 marker，不要讓測試靜靜地少測一塊。`);
  }
  let i = src.indexOf('{', start);
  if (i === -1) throw new Error(`抽取失敗：${marker} 之後找不到函式主體的 '{'`);
  let depth = 0;
  for (let k = i; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, k + 1);
    }
  }
  throw new Error(`抽取失敗：${marker} 的大括號沒有收斂（檔案被截斷？）`);
}

function extractRegion(src, re, label) {
  const m = src.match(re);
  if (!m) throw new Error(`抽取失敗：找不到 ${label} 區塊`);
  return m[1];
}

const FUNCTION_MARKERS = [
  'function _normalizePasted',
  'function _resolveCommas',
  'function _pastedTokensAllowed',
  'function sanitizePastedExpression',
  'function calculate(expr)',
];

const EXPORTED = [
  'sanitizePastedExpression',
  'calculate',
  '_normalizePasted',
  '_resolveCommas',
  '_pastedTokensAllowed',
];

function load() {
  const src = fs.readFileSync(INDEX_PATH, 'utf8');

  const parts = [
    // 貼上驗證用到的常數（PASTE_MAX_LEN … PASTE_NUMBER_RE）
    extractRegion(src, /( *const PASTE_MAX_LEN[\s\S]*?const PASTE_NUMBER_RE = [^\n]*\n)/, 'PASTE_* 常數'),
    ...FUNCTION_MARKERS.map(m => extractFunction(src, m)),
  ];

  const code = [
    "'use strict';",
    // calculate() 讀取這個全域；測試固定用 DEG，與網站預設一致
    "let angleMode = 'DEG';",
    ...parts,
    `module.exports = { ${EXPORTED.join(', ')} };`,
  ].join('\n\n');

  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(code, sandbox, { filename: 'index.html (extracted)' });

  const api = sandbox.module.exports;
  for (const name of EXPORTED) {
    if (typeof api[name] !== 'function') {
      throw new Error(`抽取失敗：${name} 不是函式（抽到的是 ${typeof api[name]}）`);
    }
  }
  return api;
}

module.exports = { load, extractFunction, INDEX_PATH, FUNCTION_MARKERS, EXPORTED };
