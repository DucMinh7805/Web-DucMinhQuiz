function normalizeSubjectKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function formatSubjectName(subjectId, manifest) {
  if (!subjectId) return 'Y Khoa';
  const normalizedId = normalizeSubjectKey(subjectId);
  const matchedSubject = manifest?.subjects?.find(subject =>
    [subject.id, subject.code, subject.name].some(value => normalizeSubjectKey(value) === normalizedId)
  );
  if (matchedSubject?.name) return matchedSubject.name;

  return String(subjectId)
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
