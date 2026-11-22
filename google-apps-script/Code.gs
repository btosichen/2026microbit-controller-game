/**
 * 藍鷹出擊 —— Google 試算表遊戲紀錄（Google Apps Script）
 *
 * 功能
 *   doPost：遊戲結束時，接收玩家成績並寫入「遊戲紀錄」工作表
 *   doGet ：?action=top&limit=10 回傳雲端排行榜；?action=ping 測試連線
 *   setup ：建立「遊戲紀錄」「排行榜」「玩家統計」三個工作表（第一次使用請先執行）
 *
 * 安全與資料品質
 *   - TOKEN 必須和遊戲 index.html 中 CONFIG.cloud.token 相同，才能寫入
 *   - 檢查欄位型別與範圍，暱稱會清除危險字元，並防止被當成試算表公式
 *   - 同一筆紀錄編號不會重複寫入（網路重送也不會變兩筆）
 *   - 異常高分會在「備註」欄標示，方便老師檢查（不會直接刪除）
 *   - 使用 LockService，多位學生同時上傳也不會互相覆蓋
 */

// ====== 可修改的設定 ======
const TOKEN = 'skyace-2026';            // 上傳密碼：改掉時，index.html 的 CONFIG.cloud.token 也要一起改
const SHEET_LOG = '遊戲紀錄';
const SHEET_TOP = '排行榜';
const SHEET_STAT = '玩家統計';
const TIMEZONE = 'Asia/Taipei';

const HEADERS = ['紀錄編號', '上傳時間', '玩家暱稱', '分數', '擊落數', '到達波次', '擊敗頭目',
  '難度', '遊戲時長(秒)', '開始時間', '結束時間', '結束原因', '操控方式',
  '特殊攻擊次數', '撿到道具數', '瀏覽器', '遊戲版本', '備註'];

const LIMITS = { nameMax: 12, scoreMax: 10000000, killsMax: 100000, waveMax: 999, durationMax: 36000 };

// ====== 試算表選單 ======
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('遊戲紀錄')
    .addItem('① 初始化工作表', 'setup')
    .addItem('寫入一筆測試資料', 'testInsert')
    .addToUi();
}

// ====== 建立／整理工作表（可重複執行，不會刪除已有紀錄） ======
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(TIMEZONE);

  // 1) 遊戲紀錄
  const log = ss.getSheetByName(SHEET_LOG) || ss.insertSheet(SHEET_LOG, 0);
  log.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#1f4e79').setFontColor('#ffffff').setHorizontalAlignment('center');
  log.setFrozenRows(1);
  log.getRange('B:B').setNumberFormat('yyyy/mm/dd hh:mm:ss');
  log.getRange('J:K').setNumberFormat('yyyy/mm/dd hh:mm:ss');
  log.getRange('D:D').setNumberFormat('#,##0');
  log.getRange('I:I').setNumberFormat('0.0');
  log.setColumnWidth(1, 120); log.setColumnWidth(3, 120);
  [2, 10, 11].forEach(c => log.setColumnWidth(c, 150));
  log.setColumnWidth(18, 180);

  // 2) 排行榜（自動依分數排序，前 20 名）
  const top = ss.getSheetByName(SHEET_TOP) || ss.insertSheet(SHEET_TOP, 1);
  top.clear();
  top.getRange('A1').setValue('藍鷹出擊 雲端排行榜（自動更新）').setFontSize(14).setFontWeight('bold');
  top.getRange('A3').setValue('名次');
  for (let i = 1; i <= 20; i++) top.getRange(3 + i, 1).setFormula(`=IF(B${3 + i}="","",${i})`);
  top.getRange('B3').setFormula(
    `=QUERY('${SHEET_LOG}'!A:R,"select C, D, E, F, H, K where D is not null order by D desc, E desc limit 20 ` +
    `label C '玩家暱稱', D '分數', E '擊落數', F '到達波次', H '難度', K '時間'",1)`);
  top.getRange('A3:G3').setFontWeight('bold').setBackground('#ffd23f');
  top.getRange('C:C').setNumberFormat('#,##0');
  top.getRange('G:G').setNumberFormat('yyyy/mm/dd hh:mm');
  top.setFrozenRows(3);

  // 3) 玩家統計（每位玩家的遊玩次數、最高分、平均分數…）
  const stat = ss.getSheetByName(SHEET_STAT) || ss.insertSheet(SHEET_STAT, 2);
  stat.clear();
  stat.getRange('A1').setFormula(
    `=QUERY('${SHEET_LOG}'!A:R,"select C, count(A), max(D), avg(D), sum(E), max(F), sum(I) where C is not null ` +
    `group by C order by max(D) desc ` +
    `label C '玩家暱稱', count(A) '遊玩次數', max(D) '最高分', avg(D) '平均分數', sum(E) '總擊落數', max(F) '最高波次', sum(I) '總遊玩秒數'",1)`);
  stat.getRange('A1:G1').setFontWeight('bold').setBackground('#3ddc97');
  stat.getRange('C:D').setNumberFormat('#,##0');
  stat.getRange('G:G').setNumberFormat('#,##0');
  stat.setFrozenRows(1);

  return '工作表已初始化';
}

// ====== 接收遊戲成績 ======
function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '';
    if (raw.length > 5000) throw validationError('資料太大');
    let body;
    try { body = JSON.parse(raw); } catch (err) { throw validationError('不是正確的 JSON 資料'); }
    if (!body || body.token !== TOKEN) return json({ ok: false, error: 'TOKEN 不正確，請確認遊戲與 GAS 的 TOKEN 相同', retry: true });

    const r = validateRecord(body.record);
    const cache = CacheService.getScriptCache();
    if (cache.get('id_' + r.id)) return json({ ok: true, duplicate: true, id: r.id });

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const sh = getLogSheet();
      // 檢查最近 500 筆，避免同一筆被重複寫入
      const last = sh.getLastRow();
      if (last > 1) {
        const n = Math.min(500, last - 1);
        const ids = sh.getRange(last - n + 1, 1, n, 1).getValues().map(v => String(v[0]));
        if (ids.indexOf(r.id) >= 0) return json({ ok: true, duplicate: true, id: r.id });
      }
      sh.appendRow(toRow(r));
    } finally {
      lock.releaseLock();
    }
    cache.put('id_' + r.id, '1', 21600);   // 6 小時內記住這個編號
    return json({ ok: true, id: r.id, note: r.note || '' });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err), retry: !(err && err.isValidation) });
  }
}

// ====== 讀取排行榜／測試連線 ======
function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = p.action || 'ping';
  try {
    if (action === 'ping') {
      const sh = getLogSheet();
      return json({ ok: true, message: '連線成功', spreadsheet: SpreadsheetApp.getActiveSpreadsheet().getName(), rows: Math.max(0, sh.getLastRow() - 1) });
    }
    if (action === 'top') {
      const limit = Math.min(50, Math.max(1, parseInt(p.limit, 10) || 10));
      const sh = getLogSheet();
      const last = sh.getLastRow();
      if (last < 2) return json({ ok: true, records: [] });
      const values = sh.getRange(2, 1, last - 1, 12).getValues();
      const records = values
        .filter(v => v[2] !== '' && typeof v[3] === 'number')
        .map(v => ({
          name: String(v[2]), score: v[3], kills: Number(v[4]) || 0, wave: Number(v[5]) || 1,
          difficulty: String(v[7] || ''),
          time: v[10] instanceof Date ? v[10].toISOString() : (v[1] instanceof Date ? v[1].toISOString() : ''),
        }))
        .sort((a, b) => b.score - a.score || b.kills - a.kills)
        .slice(0, limit);
      return json({ ok: true, records: records });
    }
    return json({ ok: false, error: '未知的 action：' + action });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

// ====== 工具函式 ======
function getLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_LOG);
  if (!sh) { setup(); sh = ss.getSheetByName(SHEET_LOG); }
  return sh;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function validationError(msg) {
  const err = new Error(msg);
  err.isValidation = true;   // 資料本身有問題：遊戲端不要再重送
  return err;
}

function cleanText(v, max, raw) {
  let s = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();
  s = Array.from(s).slice(0, max).join('');
  if (!raw && /^[=+\-@]/.test(s)) s = "'" + s;      // 防止被試算表當成公式執行
  return s;
}
// 在前面加上 ' 讓試算表一律當作文字（避免 007 變成 7、=xxx 變成公式）；儲存格中不會顯示這個 '
function asText(s) { return s ? "'" + s : s; }

function toInt(v, min, max, label) {
  const n = Number(v);
  if (!isFinite(n) || n < min || n > max) throw validationError(label + '數值不合理：' + v);
  return Math.floor(n);
}

function toDate(v) {
  if (typeof v !== 'string') return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  const now = Date.now();
  if (d.getTime() > now + 10 * 60 * 1000 || d.getTime() < now - 365 * 24 * 3600 * 1000) return '';   // 時間不合理就留空
  return d;
}

function validateRecord(r) {
  if (!r || typeof r !== 'object') throw validationError('缺少 record 資料');
  const id = String(r.id || '').replace(/[^\w-]/g, '').slice(0, 40);
  if (id.length < 6) throw validationError('缺少紀錄編號');
  const name = cleanText(r.name, LIMITS.nameMax, true);
  if (!name) throw validationError('暱稱不可空白');

  const out = {
    id: id,
    name: name,
    score: toInt(r.score, 0, LIMITS.scoreMax, '分數'),
    kills: toInt(r.kills, 0, LIMITS.killsMax, '擊落數'),
    wave: toInt(r.wave, 1, LIMITS.waveMax, '波次'),
    bosses: toInt(r.bosses || 0, 0, LIMITS.waveMax, '擊敗頭目數'),
    difficulty: ['簡單', '普通', '困難'].indexOf(r.difficulty) >= 0 ? r.difficulty : '未知',
    duration: Math.round(Math.min(LIMITS.durationMax, Math.max(0, Number(r.durationSec) || 0)) * 10) / 10,
    startedAt: toDate(r.startedAt),
    endedAt: toDate(r.endedAt),
    endReason: cleanText(r.endReason, 20),
    control: ['鍵盤', 'micro:bit'].indexOf(r.control) >= 0 ? r.control : '未知',
    specials: toInt(r.specials || 0, 0, 100000, '特殊攻擊次數'),
    items: toInt(r.items || 0, 0, 100000, '道具數'),
    browser: cleanText(r.browser, 40),
    version: cleanText(r.version, 10),
    note: '',
  };
  // 合理性檢查：不擋下，只在「備註」欄提醒老師
  const notes = [];
  if (out.score > (out.duration + 10) * 1500) notes.push('分數偏高，請確認');
  if (out.kills > (out.duration + 10) * 5) notes.push('擊落數偏高，請確認');
  out.note = notes.join('；');
  return out;
}

function toRow(r) {
  return [asText(r.id), new Date(), asText(r.name), r.score, r.kills, r.wave, r.bosses, r.difficulty, r.duration,
    r.startedAt, r.endedAt, r.endReason, r.control, r.specials, r.items, r.browser, r.version, r.note];
}

// ====== 在編輯器中按「執行」即可測試寫入一筆 ======
function testInsert() {
  const now = new Date();
  const res = doPost({ postData: { contents: JSON.stringify({
    token: TOKEN,
    record: {
      id: 'test' + now.getTime().toString(36), name: '測試飛行員', score: 1234, kills: 8, wave: 1, bosses: 0,
      difficulty: '普通', durationSec: 42.5, startedAt: new Date(now - 42500).toISOString(), endedAt: now.toISOString(),
      endReason: '測試資料', control: '鍵盤', specials: 1, items: 2, browser: 'GAS 測試', version: 'test',
    },
  }) } });
  Logger.log(res.getContent());
  return res.getContent();
}
