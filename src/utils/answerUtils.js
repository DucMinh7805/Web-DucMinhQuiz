export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function splitAnswerValues(value) {
  if (Array.isArray(value)) return value.map(String).map(item => item.trim()).filter(Boolean);
  return String(value ?? '').split('|').map(item => item.trim()).filter(Boolean);
}

export function getOptionLabel(option, index = 0) {
  const match = String(option ?? '').trim().match(/^([A-Z])\s*[.):-]\s*/i);
  return match ? match[1].toUpperCase() : String.fromCharCode(65 + index);
}

export function isOptionCorrect(option, index, correctAnswer) {
  const normalizedOption = normalizeText(option);
  const optionWithoutLabel = normalizeText(String(option ?? '').replace(/^([A-Z])\s*[.):-]\s*/i, ''));
  const optionLabel = getOptionLabel(option, index);

  return splitAnswerValues(correctAnswer).some(answer => {
    const normalizedAnswer = normalizeText(answer);
    const answerLabelMatch = String(answer).trim().match(/^([A-Z])(?:\s*[.):-]|$)/i);
    const answerLabel = answerLabelMatch ? answerLabelMatch[1].toUpperCase() : '';
    return normalizedAnswer === normalizedOption ||
      normalizedAnswer === optionWithoutLabel ||
      (answerLabel && answerLabel === optionLabel);
  });
}

export function areAnswersEquivalent(userAnswer, correctAnswer) {
  const canonicalize = value => {
    const raw = String(value ?? '').trim();
    const labelMatch = raw.match(/^([A-Z])(?:\s*[.):-]\s*|$)/i);
    return labelMatch ? `option:${labelMatch[1].toUpperCase()}` : normalizeText(raw);
  };
  const userValues = splitAnswerValues(userAnswer).map(canonicalize).sort();
  const correctValues = splitAnswerValues(correctAnswer).map(canonicalize).sort();
  return userValues.length > 0 &&
    userValues.length === correctValues.length &&
    userValues.every((value, index) => value === correctValues[index]);
}

export const QUESTION_EVALUATION = Object.freeze({
  CORRECT: 'correct',
  INCORRECT: 'incorrect',
  UNGRADED: 'ungraded'
});

export function isShortAnswerQuestion(question) {
  return question?.type === 'short_answer' || question?.type === 'fill_in_blank';
}

export function hasQuestionAnswerKey(question) {
  return splitAnswerValues(question?.answer).length > 0;
}

/**
 * Một nguồn sự thật duy nhất cho chấm điểm ở lúc làm bài, tổng kết và ôn câu sai.
 * Câu tự luận chấp nhận MỘT trong các đáp án phân cách bằng `|`. Nếu nguồn chưa
 * có barem thì trả về `ungraded`, tuyệt đối không tự tính đúng hoặc sai.
 */
export function evaluateQuestionAnswer(question, userAnswer) {
  if (!hasQuestionAnswerKey(question)) return QUESTION_EVALUATION.UNGRADED;

  const userValues = splitAnswerValues(userAnswer);
  if (userValues.length === 0) return QUESTION_EVALUATION.INCORRECT;

  if (isShortAnswerQuestion(question)) {
    const normalizedUserAnswer = normalizeText(userValues.join(' '));
    const matchesAcceptedAnswer = splitAnswerValues(question.answer)
      .some(answer => normalizeText(answer) === normalizedUserAnswer);
    return matchesAcceptedAnswer
      ? QUESTION_EVALUATION.CORRECT
      : QUESTION_EVALUATION.INCORRECT;
  }

  return areAnswersEquivalent(userAnswer, question.answer)
    ? QUESTION_EVALUATION.CORRECT
    : QUESTION_EVALUATION.INCORRECT;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function getStableQuestionId(question, subjectId, deckId) {
  const providedId = question?.id || question?.questionId || question?.entryId;
  if (providedId) return String(providedId);
  const fingerprint = [subjectId, deckId, question?.question, question?.vignette]
    .map(value => normalizeText(value))
    .join('|');
  return `${subjectId || 'subject'}-${deckId || 'deck'}-${hashString(fingerprint)}`;
}
