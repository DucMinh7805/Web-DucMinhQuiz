function isPlainRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getTimestamp(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function normalizeMistakes(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(item => {
    if (!isPlainRecord(item)) return false;
    return Boolean(String(item.id || item.questionId || '').trim());
  });
}

export function mergeProgress(serverProgress = {}, clientProgress = {}) {
  const safeServer = isPlainRecord(serverProgress) ? serverProgress : {};
  const safeClient = isPlainRecord(clientProgress) ? clientProgress : {};
  const merged = {};

  for (const [subjectId, decks] of Object.entries(safeServer)) {
    if (isPlainRecord(decks)) merged[subjectId] = { ...decks };
  }

  for (const [subjectId, clientDecks] of Object.entries(safeClient)) {
    if (!isPlainRecord(clientDecks)) continue;
    if (!merged[subjectId]) merged[subjectId] = {};

    for (const [deckId, clientDeck] of Object.entries(clientDecks)) {
      if (!isPlainRecord(clientDeck)) continue;
      const serverDeck = merged[subjectId][deckId];
      if (!isPlainRecord(serverDeck)) {
        merged[subjectId][deckId] = clientDeck;
        continue;
      }

      const clientTime = getTimestamp(clientDeck.completedAt || clientDeck.date);
      const serverTime = getTimestamp(serverDeck.completedAt || serverDeck.date);
      if (clientTime >= serverTime) merged[subjectId][deckId] = clientDeck;
    }
  }

  return merged;
}

export function mergeMistakes(serverMistakes = [], clientMistakes = []) {
  const map = new Map();
  for (const mistake of [...normalizeMistakes(serverMistakes), ...normalizeMistakes(clientMistakes)]) {
    const id = String(mistake.id || mistake.questionId).trim();
    const existing = map.get(id);
    if (!existing || getTimestamp(mistake.date) >= getTimestamp(existing.date)) {
      map.set(id, mistake);
    }
  }
  return Array.from(map.values());
}
