export const fetchManifest = async () => {
  try {
    const response = await fetch('/api/decks');
    if (!response.ok) throw new Error('Network response was not ok');
    
    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'L?i l?y d? li?u');
    
    return result.data;
  } catch (error) {
    console.error('Error fetching manifest:', error);
    throw error;
  }
};

export const fetchDeckQuestions = async (deckPath, signal) => {
  try {
    const response = await fetch(`/api/questions?deckPath=${encodeURIComponent(deckPath)}`, { signal });
    if (!response.ok) throw new Error('Network response was not ok');
    
    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'L?i l?y d? li?u');
    
    return result.data.map((q, idx) => ({
      id: q._id || q.qId || `q_${idx}`,
      ...q,
      parsedOptions: q.options || []
    }));
  } catch (error) {
    console.error(`Error fetching deck [${deckPath}]:`, error);
    throw error;
  }
};
