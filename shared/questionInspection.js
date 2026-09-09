function clean(value) {
  return String(value || '').trim();
}

function normalized(value) {
  return clean(value).toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}

function tokenSet(value) {
  return new Set(normalized(value).split(/[^a-z0-9]+/).filter(Boolean));
}

function similarity(left, right) {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (!a.size && !b.size) return 1;
  const intersection = [...a].filter(token => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

export function normalizeEditorQuestion(input = {}) {
  const rawOptions = Array.isArray(input.options) ? input.options : [];
  const correctIds = new Set(input.correctOptionIds || []);
  const answerValues = new Set((Array.isArray(input.answer) ? input.answer : clean(input.answer).split('|')).map(normalized).filter(Boolean));
  const options = rawOptions.map((option, index) => {
    const id = clean(typeof option === 'object' ? option.id : '') || String.fromCharCode(97 + index);
    const text = clean(typeof option === 'object' ? option.text : option);
    const isCorrect = typeof option === 'object' && typeof option.isCorrect === 'boolean'
      ? option.isCorrect
      : correctIds.has(id) || answerValues.has(normalized(text));
    return { id, text, isCorrect };
  });
  const acceptedShortAnswers = (Array.isArray(input.acceptedShortAnswers)
    ? input.acceptedShortAnswers
    : clean(input.answer).split('|')).map(clean).filter(Boolean);
  const inferredType = input.type === 'short_answer'
    ? 'short_answer'
    : options.filter(option => option.isCorrect).length > 1 ? 'multiple' : 'single';
  return {
    question: clean(input.question),
    vignette: clean(input.vignette),
    type: inferredType,
    difficulty: ['easy', 'medium', 'hard'].includes(input.difficulty) ? input.difficulty : 'medium',
    options,
    acceptedShortAnswers,
    explanation: clean(input.explanation),
    clinicalPearl: clean(input.clinicalPearl),
    referenceBook: clean(input.referenceBook),
    imageUrl: clean(input.imageUrl || input.image?.fullResUrl || input.image?.thumbnailUrl),
    isPublished: input.isPublished !== false
  };
}

export function validateQuestionDraft(input = {}, current = null) {
  const draft = normalizeEditorQuestion(input);
  const errors = [];
  const warnings = [];
  if (!draft.question) errors.push('Nội dung câu hỏi không được để trống.');
  if (draft.type === 'short_answer') {
    if (!draft.acceptedShortAnswers.length) warnings.push('Câu trả lời ngắn chưa có đáp án chấm tự động.');
  } else {
    if (draft.options.length < 2) errors.push('Câu trắc nghiệm cần ít nhất hai phương án.');
    if (draft.options.some(option => !option.text)) errors.push('Không được để phương án trống.');
    if (!draft.options.some(option => option.isCorrect)) errors.push('Cần chọn ít nhất một đáp án đúng.');
    const values = draft.options.map(option => normalized(option.text)).filter(Boolean);
    if (new Set(values).size !== values.length) errors.push('Có phương án bị trùng nội dung.');
  }
  if (draft.imageUrl && !/^https:\/\//i.test(draft.imageUrl)) errors.push('Link ảnh phải bắt đầu bằng https://.');
  if (current) {
    const before = normalizeEditorQuestion(current);
    const removedCorrect = before.options.filter(option => option.isCorrect && !draft.options.some(next => next.id === option.id));
    if (removedCorrect.length && !draft.options.some(option => option.isCorrect)) {
      errors.push('Bạn đã xóa đáp án đúng cũ nhưng chưa chọn đáp án đúng mới.');
    }
    if (similarity(before.question, draft.question) < 0.45) warnings.push('Nội dung thay đổi lớn; hãy cân nhắc chọn “Thay câu”.');
  }
  return { draft, errors: [...new Set(errors)], warnings: [...new Set(warnings)], valid: errors.length === 0 };
}

export function compareQuestionDraft(current = {}, input = {}) {
  const before = normalizeEditorQuestion(current);
  const after = normalizeEditorQuestion(input);
  const fields = ['question', 'vignette', 'difficulty', 'explanation', 'clinicalPearl', 'referenceBook', 'imageUrl', 'isPublished'];
  const changedFields = fields.filter(field => JSON.stringify(before[field]) !== JSON.stringify(after[field]));
  if (JSON.stringify(before.options) !== JSON.stringify(after.options)) changedFields.push('options');
  if (before.type !== after.type) changedFields.push('type');
  if (JSON.stringify(before.acceptedShortAnswers) !== JSON.stringify(after.acceptedShortAnswers)) changedFields.push('answer');
  const questionSimilarity = similarity(before.question, after.question);
  const optionSimilarity = similarity(before.options.map(item => item.text).join(' '), after.options.map(item => item.text).join(' '));
  const changeScore = Math.round((1 - questionSimilarity) * 70 + (1 - optionSimilarity) * 20 + (changedFields.includes('type') ? 10 : 0));
  return {
    before,
    after,
    changedFields,
    hasChanges: changedFields.length > 0,
    changeScore: Math.max(0, Math.min(100, changeScore)),
    suggestedMode: changeScore >= 55 ? 'replace' : 'edit'
  };
}
