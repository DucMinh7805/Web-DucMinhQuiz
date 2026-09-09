const QUESTION_OVERRIDE_SHEET = 'Question_Overrides';
const QUESTION_OVERRIDE_HEADERS = [
  'Source Question ID', 'Legacy Question ID', 'Public ID', 'Deck Path',
  'Patch JSON', 'Updated At', 'Updated By'
];

function getQuestionOverrideSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(QUESTION_OVERRIDE_SHEET);
  if (!sheet) sheet = ss.insertSheet(QUESTION_OVERRIDE_SHEET);
  if (sheet.getMaxColumns() < QUESTION_OVERRIDE_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), QUESTION_OVERRIDE_HEADERS.length - sheet.getMaxColumns());
  }
  const current = sheet.getRange(1, 1, 1, QUESTION_OVERRIDE_HEADERS.length).getValues()[0];
  if (current.join('|') !== QUESTION_OVERRIDE_HEADERS.join('|')) {
    sheet.getRange(1, 1, 1, QUESTION_OVERRIDE_HEADERS.length)
      .setValues([QUESTION_OVERRIDE_HEADERS])
      .setFontWeight('bold')
      .setBackground('#ccfbf1');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function upsertQuestionOverride_(params) {
  const sourceQuestionId = String(params.sourceQuestionId || '').trim();
  const qId = String(params.qId || '').trim();
  const publicId = String(params.publicId || '').trim().toUpperCase();
  const deckPath = String(params.deckPath || '').trim();
  if (!sourceQuestionId && !qId) throw new Error('Câu hỏi thiếu mã nguồn ổn định.');

  let patch;
  try { patch = JSON.parse(String(params.patchJson || '{}')); }
  catch (error) { throw new Error('Nội dung chỉnh sửa không phải JSON hợp lệ.'); }
  if (!patch || Array.isArray(patch) || typeof patch !== 'object') throw new Error('Nội dung chỉnh sửa không hợp lệ.');

  // Hai lần lưu gần nhau không được cùng đọc rồi tạo hai dòng override trùng nhau.
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getQuestionOverrideSheet_();
    const rows = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, QUESTION_OVERRIDE_HEADERS.length).getValues()
      : [];
    let targetRow = -1;
    for (let index = 0; index < rows.length; index++) {
      const sameSource = sourceQuestionId && String(rows[index][0] || '').trim() === sourceQuestionId;
      const sameLegacy = qId && String(rows[index][1] || '').trim() === qId;
      if (sameSource || sameLegacy) { targetRow = index + 2; break; }
    }

    let merged = {};
    if (targetRow > 0) {
      try { merged = JSON.parse(String(sheet.getRange(targetRow, 5).getValue() || '{}')); } catch (ignore) {}
    }
    Object.keys(patch).forEach(function(key) { merged[key] = patch[key]; });
    const row = [sourceQuestionId, qId, publicId, deckPath, JSON.stringify(merged), new Date(), 'quizdm.com'];
    if (targetRow > 0) sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);
    return { success: true, message: 'Đã lưu bản chỉnh sửa câu hỏi về Sheet.' };
  } finally {
    lock.releaseLock();
  }
}

function applyQuestionOverrides_(questions) {
  if (!Array.isArray(questions) || !questions.length) return questions || [];
  const sheet = getQuestionOverrideSheet_();
  if (sheet.getLastRow() <= 1) return questions;
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, QUESTION_OVERRIDE_HEADERS.length).getValues();
  const bySource = {};
  const byLegacy = {};
  rows.forEach(function(row) {
    let patch = null;
    try { patch = JSON.parse(String(row[4] || '{}')); } catch (ignore) {}
    if (!patch) return;
    const sourceId = String(row[0] || '').trim();
    const qId = String(row[1] || '').trim();
    if (sourceId) bySource[sourceId] = patch;
    if (qId) byLegacy[qId] = patch;
  });

  return questions.map(function(question) {
    const patch = bySource[String(question.sourceQuestionId || '').trim()]
      || byLegacy[String(question.id || '').trim()];
    if (!patch) return question;
    const merged = Object.assign({}, question, patch);
    if (Array.isArray(patch.options)) merged.options = patch.options.join('|');
    if (Array.isArray(patch.answer)) merged.answer = patch.answer.join('|');
    if (patch.image && typeof patch.image === 'object') {
      merged.imageUrl = String(patch.image.fullResUrl || patch.image.thumbnailUrl || '');
      delete merged.image;
    }
    return merged;
  });
}
