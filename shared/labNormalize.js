/**
 * Bỏ dấu tiếng Việt.
 * 'Hồng cầu' → 'hong cau'
 */
export function removeVietnameseTones(str) {
  if (!str) return '';
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  // Some system encode vietnamese combining accent as individual utf-8 characters
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); // huyền, sắc, ngã, hỏi, nặng
  str = str.replace(/\u02C6|\u0306|\u031B/g, ""); // Â, Ê, Ă, Ơ, Ư
  return str;
}

/**
 * Normalize search query for matching.
 * Handles: lowercase, remove tones, collapse spaces, handle 'fib4' = 'FIB-4' = 'fib 4'
 */
export function normalizeSearchQuery(query) {
  if (!query) return '';
  let str = removeVietnameseTones(query).toLowerCase();
  str = str.replace(/-/g, ' '); // treat hyphen as space for 'FIB-4' -> 'fib 4'
  str = str.replace(/[^a-z0-9\s]/g, ''); // remove punctuation
  str = str.replace(/\s+/g, ' ').trim();
  return str;
}

/**
 * Sinh searchText từ các trường của LabTest.
 * Kết hợp: name + shortName + aliases + specimen + unit (all lowercased, no tones)
 */
export function buildSearchText(test) {
  if (!test) return '';
  const parts = [
    test.name,
    test.shortName,
    ...(test.aliases || []),
    test.specimen,
    test.unit
  ];
  return normalizeSearchQuery(parts.filter(Boolean).join(' '));
}

/**
 * Chuẩn hóa khoảng trắng: trim, collapse multiple spaces/newlines.
 * But preserve intentional line breaks (convert \n literal to real newline).
 */
export function normalizeWhitespace(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/\\n/g, '\n') // convert \n literal to newline
    .replace(/[ \t]+/g, ' ') // collapse horizontal spaces
    .replace(/\n\s*\n/g, '\n') // collapse multiple newlines
    .trim();
}

/**
 * Validate a LabTest draft before saving.
 * Returns { errors: string[], warnings: string[] }
 * Errors (block save): missing name, missing sectionId
 * Warnings (allow save): missing source, missing reviewedAt, no interpretations, missing unit
 */
export function validateLabTest(draft) {
  const errors = [];
  const warnings = [];

  if (!draft.name?.trim()) errors.push('Thiếu tên chỉ số (name)');
  if (!draft.sectionId) errors.push('Thiếu nhóm chỉ số (sectionId)');

  if (!draft.source?.trim()) warnings.push('Thiếu nguồn tham khảo (source)');
  if (!draft.reviewedAt) warnings.push('Thiếu ngày duyệt (reviewedAt)');
  if (!draft.unit?.trim()) warnings.push('Thiếu đơn vị đo (unit)');
  if (!draft.interpretations || draft.interpretations.length === 0) {
    warnings.push('Chưa có biện luận/khoảng tham chiếu nào (interpretations)');
  }

  return { errors, warnings };
}

/**
 * Compare two LabTest objects and return changed fields.
 * Returns { changedFields: string[], hasChanges: boolean }
 */
export function compareLabTests(oldTest, newTest) {
  const changedFields = [];
  const fields = ['name', 'shortName', 'unit', 'specimen', 'source', 'reviewedAt', 'status', 'sectionId', 'order'];
  
  for (const field of fields) {
    if (String(oldTest[field] || '') !== String(newTest[field] || '')) {
      changedFields.push(field);
    }
  }

  // Compare aliases (array of strings)
  const oldAliases = (oldTest.aliases || []).join('|');
  const newAliases = (newTest.aliases || []).join('|');
  if (oldAliases !== newAliases) changedFields.push('aliases');

  // Compare interpretations (array of objects) - simple stringify for now
  const oldInterps = JSON.stringify(oldTest.interpretations || []);
  const newInterps = JSON.stringify(newTest.interpretations || []);
  if (oldInterps !== newInterps) changedFields.push('interpretations');

  return {
    changedFields,
    hasChanges: changedFields.length > 0
  };
}

/**
 * Check if a search query matches a test.
 * Searches across: name, shortName, aliases, searchText, unit, specimen
 */
export function matchesSearch(test, normalizedQuery) {
  if (!normalizedQuery) return true;
  
  const searchStr = test.searchText || buildSearchText(test);
  return searchStr.includes(normalizedQuery);
}
