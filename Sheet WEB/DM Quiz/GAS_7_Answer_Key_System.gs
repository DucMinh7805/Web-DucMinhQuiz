const ANSWER_KEY_REPAIR_CONFIG = Object.freeze({
  cursorProperty: 'ANSWER_KEY_REPAIR_CURSOR',
  runningProperty: 'ANSWER_KEY_REPAIR_RUNNING',
  updatedProperty: 'ANSWER_KEY_REPAIR_UPDATED_AT',
  handler: 'continueAnswerKeyRepair_',
  batchSize: 8,
  auditSheetName: 'KiemTraBarem'
});

function getGoogleFormId_(formUrl) {
  const match = String(formUrl || '').match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : '';
}

function getAnswerKeyAuditSheet_(ss) {
  let sheet = ss.getSheetByName(ANSWER_KEY_REPAIR_CONFIG.auditSheetName);
  if (!sheet) sheet = ss.insertSheet(ANSWER_KEY_REPAIR_CONFIG.auditSheetName);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 8).setValues([[
      'Thời gian', 'Dòng UpDe', 'Tên đề', 'Trạng thái',
      'Số câu', 'Câu nhiều đáp án', 'Câu trả lời ngắn', 'Chi tiết'
    ]]).setFontWeight('bold').setBackground('#dbeafe');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findManifestDeckPath_(manifest, subjectName, deckName, formUrl) {
  const targetSubject = normalizeName(subjectName);
  const targetDeck = normalizeName(deckName);
  const targetUrl = String(formUrl || '').trim();
  for (const subject of (manifest.subjects || [])) {
    for (const deck of (subject.decks || [])) {
      if (targetUrl && String(deck.formUrl || '').trim() === targetUrl) return String(deck.path || '');
      if (normalizeName(subject.name) === targetSubject && normalizeName(deck.name) === targetDeck) {
        return String(deck.path || '');
      }
    }
  }
  return '';
}

function applyRestAnswerKeysToQuestions_(questions, restEntries) {
  const resolveEntry = createFormRestAnswerResolver_(restEntries);
  const updatedQuestions = JSON.parse(JSON.stringify(questions || []));
  const issues = [];
  let changed = 0;
  let multipleCount = 0;
  let shortAnswerCount = 0;
  let acceptedAnswerCount = 0;

  updatedQuestions.forEach((question, index) => {
    const entry = resolveEntry(question.question, index);
    if (!entry || normalizeName(entry.title) !== normalizeName(question.question)) {
      issues.push(`Câu ${index + 1}: không ghép được với Google Forms API`);
      return;
    }

    const answers = mergeUniqueAnswerValues_(entry.answers);
    if (entry.kind === 'text') {
      shortAnswerCount++;
      if (!answers.length) {
        issues.push(`Câu ${index + 1}: câu trả lời ngắn chưa có Answer Key`);
        return;
      }
      const answer = answers.join('|');
      if (question.type !== 'short_answer' || String(question.answer || '') !== answer) changed++;
      question.type = 'short_answer';
      question.answer = answer;
      acceptedAnswerCount += answers.length;
      return;
    }

    const isMultiple = isMultipleAnswerQuestion_(answers, entry.choiceType);
    if (!answers.length) {
      issues.push(`Câu ${index + 1}: câu lựa chọn chưa có Answer Key`);
      return;
    }
    const nextType = isMultiple ? 'multiple' : 'single';
    const answer = answers.join('|');
    if (question.type !== nextType || String(question.answer || '') !== answer) changed++;
    question.type = nextType;
    question.answer = answer;
    acceptedAnswerCount += answers.length;
    if (isMultiple) multipleCount++;
  });

  if (updatedQuestions.length !== (restEntries || []).length) {
    issues.push(`Lệch số câu: dữ liệu cũ ${updatedQuestions.length}, Forms API ${(restEntries || []).length}`);
  }

  return {
    questions: updatedQuestions,
    changed,
    multipleCount,
    shortAnswerCount,
    acceptedAnswerCount,
    issues
  };
}

function removeAnswerKeyRepairTriggers_() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === ANSWER_KEY_REPAIR_CONFIG.handler) ScriptApp.deleteTrigger(trigger);
  });
}

function ensureAnswerKeyRepairTrigger_() {
  const exists = ScriptApp.getProjectTriggers().some(
    trigger => trigger.getHandlerFunction() === ANSWER_KEY_REPAIR_CONFIG.handler
  );
  if (!exists) {
    ScriptApp.newTrigger(ANSWER_KEY_REPAIR_CONFIG.handler).timeBased().everyMinutes(1).create();
  }
}

function startAnswerKeyRepairAll() {
  const ui = SpreadsheetApp.getUi();
  const choice = ui.alert(
    'Sửa barem toàn hệ thống',
    'Hệ thống sẽ đọc Answer Key chuẩn từ Google Forms API theo từng lô, chỉ cập nhật type/đáp án và giữ nguyên câu hỏi, ảnh, lời giải. Tiếp tục?',
    ui.ButtonSet.YES_NO
  );
  if (choice !== ui.Button.YES) return;

  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    [ANSWER_KEY_REPAIR_CONFIG.cursorProperty]: '2',
    [ANSWER_KEY_REPAIR_CONFIG.runningProperty]: '1',
    [ANSWER_KEY_REPAIR_CONFIG.updatedProperty]: new Date().toISOString()
  });
  removeAnswerKeyRepairTriggers_();
  ensureAnswerKeyRepairTrigger_();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Đã bắt đầu sửa barem theo lô. Có thể đóng Sheet; hệ thống sẽ tự chạy tiếp.',
    'Barem Google Forms API',
    8
  );
  continueAnswerKeyRepair_();
}

function stopAnswerKeyRepairAll() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(ANSWER_KEY_REPAIR_CONFIG.runningProperty);
  removeAnswerKeyRepairTriggers_();
  SpreadsheetApp.getActiveSpreadsheet().toast('Đã dừng tiến trình sửa barem.', 'Barem Google Forms API', 6);
}

function showAnswerKeyRepairStatus() {
  const props = PropertiesService.getScriptProperties();
  const cursor = Number(props.getProperty(ANSWER_KEY_REPAIR_CONFIG.cursorProperty) || 2);
  const running = props.getProperty(ANSWER_KEY_REPAIR_CONFIG.runningProperty) === '1';
  const updatedAt = props.getProperty(ANSWER_KEY_REPAIR_CONFIG.updatedProperty) || 'chưa chạy';
  SpreadsheetApp.getUi().alert(
    'Trạng thái sửa barem',
    `${running ? 'Đang chạy' : 'Đã dừng/hoàn tất'}; dòng UpDe kế tiếp: ${cursor}; cập nhật: ${updatedAt}. ` +
    `Xem chi tiết tại tab ${ANSWER_KEY_REPAIR_CONFIG.auditSheetName}.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Kiểm tra không ghi dữ liệu cho dòng UpDe đang chọn. Dùng bước này trước khi
 * chạy toàn hệ thống để xác nhận Apps Script đã được cấp quyền Forms API.
 */
function testSelectedAnswerKeySource() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  if (normalizeName(sheet.getName()) !== 'upde') {
    SpreadsheetApp.getUi().alert('Hãy chọn một dòng trong tab UpDe rồi chạy lại.');
    return;
  }
  const rowNumber = Math.max(2, sheet.getActiveRange().getRow());
  const row = sheet.getRange(rowNumber, 1, 1, 5).getValues()[0] || [];
  const deckName = String(row[1] || '').trim();
  const formId = getGoogleFormId_(row[2]);
  if (!formId) throw new Error(`Dòng ${rowNumber} không có link Google Form hợp lệ.`);

  const entries = getFormRestQuestionEntries_(formId);
  const multipleEntries = entries.filter(entry =>
    entry.kind === 'choice' && isMultipleAnswerQuestion_(entry.answers, entry.choiceType)
  );
  const shortEntries = entries.filter(entry => entry.kind === 'text');
  const emptyKeys = entries.filter(entry => !entry.answers.length);
  SpreadsheetApp.getUi().alert(
    'Google Forms Answer Key hoạt động',
    `${deckName || `Dòng ${rowNumber}`}: đọc ${entries.length} câu; ` +
      `${multipleEntries.length} câu có nhiều đáp án đã tick; ` +
      `${shortEntries.length} câu trả lời ngắn; ${emptyKeys.length} câu chưa có barem.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function continueAnswerKeyRepair_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty(ANSWER_KEY_REPAIR_CONFIG.runningProperty) !== '1') return;

    const { manifest, allDecksData, dbSheet, ss } = getDB();
    const deckSheet = findSheetByAliases(ss, ['UpDe', 'Up De', 'Up Môn', 'UpMon', 'Decks']);
    if (!deckSheet) throw new Error('Không tìm thấy tab UpDe.');
    const auditSheet = getAnswerKeyAuditSheet_(ss);
    const rows = deckSheet.getDataRange().getValues();
    let rowNumber = Math.max(2, Number(props.getProperty(ANSWER_KEY_REPAIR_CONFIG.cursorProperty) || 2));
    let processed = 0;
    let databaseChanged = false;
    const pendingPushes = [];

    while (rowNumber <= rows.length && processed < ANSWER_KEY_REPAIR_CONFIG.batchSize) {
      const row = rows[rowNumber - 1] || [];
      const subjectName = String(row[0] || '').trim();
      const deckName = String(row[1] || '').trim();
      const formUrl = String(row[2] || '').trim();
      const normalizedStatus = normalizeName(row[4]);
      rowNumber++;
      if (!subjectName || !deckName || !formUrl || normalizedStatus === 'xoa' || normalizedStatus.indexOf('da xoa') >= 0) continue;
      processed++;

      const sourceRow = rowNumber - 1;
      deckSheet.getRange(sourceRow, 5).setValue('⏳ Đang kiểm tra barem Google Forms API...');
      SpreadsheetApp.flush();
      let auditStatus = 'OK';
      let auditDetail = '';
      let report = { questions: [], changed: 0, multipleCount: 0, shortAnswerCount: 0, acceptedAnswerCount: 0, issues: [] };
      try {
        const formId = getGoogleFormId_(formUrl);
        if (!formId) throw new Error('Link Form không có Form ID hợp lệ.');
        const deckPath = findManifestDeckPath_(manifest, subjectName, deckName, formUrl);
        if (!deckPath || !allDecksData[deckPath]) throw new Error('Đề chưa có dữ liệu trong Database_JSON; hãy đồng bộ đề này trước.');
        const existingQuestions = parseDeckQuestions_(allDecksData[deckPath]);
        const restEntries = getFormRestQuestionEntries_(formId);
        report = applyRestAnswerKeysToQuestions_(existingQuestions, restEntries);
        if (report.issues.length) throw new Error(report.issues.slice(0, 4).join('; '));

        allDecksData[deckPath] = JSON.stringify(report.questions);
        databaseChanged = databaseChanged || report.changed > 0;
        pendingPushes.push({ deckPath, questions: report.questions, sourceRow, deckName, report });
        deckSheet.getRange(sourceRow, 5).setValue(
          `⏳ Barem đạt; đang đưa lên web (${report.multipleCount} câu nhiều, ${report.shortAnswerCount} câu ngắn)...`
        );
      } catch (error) {
        auditStatus = 'LỖI';
        auditDetail = compactSyncMessage_(error, 250);
        deckSheet.getRange(sourceRow, 5).setValue(`❌ Barem: ${compactSyncMessage_(error, 90)}`);
      }

      auditSheet.appendRow([
        new Date(), sourceRow, deckName, auditStatus,
        report.questions.length || 0, report.multipleCount || 0, report.shortAnswerCount || 0,
        auditDetail || `Đã cập nhật ${report.changed || 0} câu; đọc ${report.acceptedAnswerCount || 0} đáp án chuẩn`
      ]);
    }

    if (databaseChanged || pendingPushes.length) saveDB(dbSheet, manifest, allDecksData);
    pendingPushes.forEach(item => {
      const syncResult = pushContentSyncToWeb_({
        operation: 'upsertDeck',
        manifest,
        deckPath: item.deckPath,
        questions: item.questions
      });
      deckSheet.getRange(item.sourceRow, 5).setValue(
        syncResult.success
          ? `✅ Barem API (${item.questions.length} câu; ${item.report.multipleCount} nhiều; ${item.report.shortAnswerCount} ngắn)`
          : `❌ Web chưa nhận barem: ${compactSyncMessage_(syncResult.message, 80)}`
      );
    });
    SpreadsheetApp.flush();

    props.setProperty(ANSWER_KEY_REPAIR_CONFIG.cursorProperty, String(rowNumber));
    props.setProperty(ANSWER_KEY_REPAIR_CONFIG.updatedProperty, new Date().toISOString());
    if (rowNumber > rows.length) {
      props.deleteProperty(ANSWER_KEY_REPAIR_CONFIG.runningProperty);
      removeAnswerKeyRepairTriggers_();
      ss.toast(
        `Đã kiểm tra xong toàn bộ. Xem tab ${ANSWER_KEY_REPAIR_CONFIG.auditSheetName}.`,
        'Hoàn tất barem Google Forms API',
        10
      );
    } else {
      ensureAnswerKeyRepairTrigger_();
      ss.toast(`Đã xử lý tới dòng ${rowNumber - 1}; hệ thống sẽ tự chạy lô tiếp theo.`, 'Barem Google Forms API', 5);
    }
  } catch (error) {
    PropertiesService.getScriptProperties().setProperty(
      ANSWER_KEY_REPAIR_CONFIG.updatedProperty,
      `Lỗi: ${compactSyncMessage_(error, 180)}`
    );
    throw error;
  } finally {
    lock.releaseLock();
  }
}
