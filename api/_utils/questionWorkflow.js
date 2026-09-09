import crypto from 'node:crypto';
import { getQuestionImageVariants } from './imageUrl.js';
import { normalizeEditorQuestion } from '../../shared/questionInspection.js';

export function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function questionSnapshot(question) {
  const raw = question?.toObject ? question.toObject() : question || {};
  return {
    qId: String(raw.qId || ''),
    sourceQuestionId: String(raw.sourceQuestionId || ''),
    type: raw.type || 'single',
    difficulty: raw.difficulty || 'medium',
    question: String(raw.question || ''),
    vignette: String(raw.vignette || ''),
    options: (raw.options || []).map(option => ({ id: String(option.id), text: String(option.text || '') })),
    correctOptionIds: (raw.correctOptionIds || []).map(String),
    acceptedShortAnswers: (raw.acceptedShortAnswers || []).map(String),
    explanation: String(raw.explanation || ''),
    clinicalPearl: String(raw.clinicalPearl || ''),
    referenceBook: String(raw.referenceBook || ''),
    image: {
      thumbnailUrl: String(raw.image?.thumbnailUrl || ''),
      fullResUrl: String(raw.image?.fullResUrl || ''),
      caption: String(raw.image?.caption || '')
    },
    isPublished: raw.isPublished !== false
  };
}

export function editorDraftToQuestionChanges(input) {
  const draft = normalizeEditorQuestion(input);
  const options = draft.options.map((option, index) => ({ id: String.fromCharCode(97 + index), text: option.text }));
  const correctOptionIds = draft.options.reduce((ids, option, index) => {
    if (option.isCorrect) ids.push(options[index].id);
    return ids;
  }, []);
  return {
    question: draft.question,
    vignette: draft.vignette,
    type: draft.type,
    difficulty: draft.difficulty,
    options,
    correctOptionIds,
    acceptedShortAnswers: draft.type === 'short_answer' ? draft.acceptedShortAnswers.map(value => value.toLowerCase()) : [],
    explanation: draft.explanation,
    clinicalPearl: draft.clinicalPearl,
    referenceBook: draft.referenceBook,
    image: getQuestionImageVariants(draft.imageUrl),
    isPublished: draft.isPublished
  };
}
