import { removeVietnameseTones, normalizeWhitespace } from './labNormalize.js';

/**
 * Parse raw MD content into structured lab entries.
 * @param {string} content - Raw markdown text
 * @param {string} filename - Source filename for tracking
 * @returns {{ entries: Array, warnings: string[], errors: string[] }}
 */
export function parseMdContent(content, filename) {
  const entries = [];
  const warnings = [];
  const errors = [];
  
  const lines = content.split(/\r?\n/);
  
  let currentTopic = '';
  let currentSection = '';
  let currentTest = null;
  
  let inTable = false;
  let tableHeaders = [];
  
  const finishCurrentTest = () => {
    if (currentTest && currentTest.testName) {
      entries.push({ ...currentTest });
    }
    currentTest = null;
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Strip common emoji prefixes from headings
    const stripEmoji = (s) => s
      .replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '')
      .trim();
    
    // Headings
    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      finishCurrentTest();
      currentTopic = stripEmoji(h1Match[1].trim());
      inTable = false;
      continue;
    }
    
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      finishCurrentTest();
      currentSection = stripEmoji(h2Match[1].trim());
      // Strip "Nhóm:" prefix if present in heading
      currentSection = currentSection.replace(/^Nhóm:\s*/i, '');
      inTable = false;
      continue;
    }
    
    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      finishCurrentTest();
      currentTest = {
        topicName: currentTopic,
        sectionName: currentSection,
        testName: h3Match[1].trim(),
        shortName: '',
        aliases: [],
        specimen: '',
        unit: '',
        referenceText: '',
        notes: '',
        source: filename,
        lineNumber: i + 1,
        rawText: line
      };
      inTable = false;
      continue;
    }
    
    // === FORMAT: "- Nhóm: <section name>" (used in actual MD files) ===
    const sectionMarker = line.match(/^-\s+Nhóm:\s*(.+)$/i);
    if (sectionMarker) {
      finishCurrentTest();
      currentSection = sectionMarker[1].trim().replace(/\[cite:\s*\d+\]/g, '').trim();
      // If no topic set yet, use section as topic
      if (!currentTopic) currentTopic = currentSection;
      continue;
    }
    
    // === FORMAT: "+ Tên: X | Tham chiếu: Y | Đơn vị: Z | Ý nghĩa: W" (pipe-delimited) ===
    const pipeEntryMatch = line.match(/^\+\s+Tên:\s*(.+)/i);
    if (pipeEntryMatch) {
      finishCurrentTest();
      
      const rawEntry = pipeEntryMatch[1];
      const segments = rawEntry.split('|').map(s => s.trim());
      
      let testName = segments[0] || '';
      let referenceText = '';
      let unit = '';
      let notes = '';
      
      for (let j = 1; j < segments.length; j++) {
        const seg = segments[j];
        const thamChieuMatch = seg.match(/^Tham chiếu:\s*(.*)/i);
        const donViMatch = seg.match(/^Đơn vị:\s*(.*)/i);
        const yNghiaMatch = seg.match(/^Ý nghĩa:\s*(.*)/i);
        
        if (thamChieuMatch) referenceText = thamChieuMatch[1].trim();
        else if (donViMatch) unit = donViMatch[1].trim();
        else if (yNghiaMatch) notes = yNghiaMatch[1].trim();
      }
      
      // Handle "Không có", "Không", "Không nêu" as empty
      if (/^(Không có|Không nêu|Không nêu trong file|Không|Không áp dụng)$/i.test(unit)) unit = '';
      if (/^(Không nêu|Không nêu trong file)$/i.test(referenceText)) referenceText = '';
      
      // Strip [cite: N] from all fields
      testName = testName.replace(/\[cite:\s*\d+\]/g, '').trim();
      referenceText = referenceText.replace(/\[cite:\s*\d+\]/g, '').trim();
      notes = notes.replace(/\[cite:\s*\d+\]/g, '').trim();
      
      // Warn about [cite: N] if present in original line
      if (/\[cite:\s*\d+\]/.test(line)) {
        warnings.push(`Dòng ${i + 1}: Phát hiện tham chiếu [cite: N] đã được loại bỏ`);
      }
      
      // Convert literal \\n to real newline
      referenceText = referenceText.replace(/\\n/g, '\n');
      notes = notes.replace(/\\n/g, '\n');
      
      if (testName) {
        entries.push({
          topicName: currentTopic,
          sectionName: currentSection,
          testName,
          shortName: '',
          aliases: [],
          specimen: '',
          unit,
          referenceText,
          notes,
          source: filename,
          lineNumber: i + 1,
          rawText: line
        });
      } else {
        warnings.push(`Dòng ${i + 1}: Bỏ qua — thiếu tên chỉ số`);
      }
      continue;
    }
    
    // Tables
    if (line.startsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter((_, index, array) => index > 0 && index < array.length - 1 || c !== '');
      if (line.includes('---')) {
        inTable = true;
        continue;
      }
      if (!inTable) {
        tableHeaders = cells.map(c => c.toLowerCase());
        inTable = true;
        continue;
      }
      
      if (inTable && tableHeaders.length > 0) {
        finishCurrentTest();
        
        let testData = {
          topicName: currentTopic,
          sectionName: currentSection,
          testName: '',
          shortName: '',
          aliases: [],
          specimen: '',
          unit: '',
          referenceText: '',
          notes: '',
          source: filename,
          lineNumber: i + 1,
          rawText: line
        };
        
        for (let j = 0; j < cells.length; j++) {
          const header = tableHeaders[j] || '';
          const cell = cells[j];
          if (header.includes('chỉ số') || header.includes('tên') || header.includes('test')) testData.testName = cell;
          else if (header.includes('khoảng') || header.includes('tham chiếu') || header.includes('giá trị')) testData.referenceText = cell;
          else if (header.includes('đơn vị')) testData.unit = cell;
          else if (header.includes('ý nghĩa') || header.includes('ghi chú')) testData.notes = cell;
          else if (header.includes('mẫu') || header.includes('bệnh phẩm')) testData.specimen = cell;
        }
        
        if (testData.testName) {
          entries.push(testData);
        } else {
          warnings.push(`Row at line ${i + 1} skipped: missing test name`);
        }
        continue;
      }
    } else {
      inTable = false;
    }
    
    // Mixed formats & Bullets
    if (currentTest) {
      currentTest.rawText += '\n' + line;
      
      const bulletMatch = line.match(/^[-*+]\s+(.+)$/);
      const textToParse = bulletMatch ? bulletMatch[1] : line;
      
      const colonSplit = textToParse.split(/:(.*)/s);
      if (colonSplit.length > 1) {
        const key = colonSplit[0].trim().toLowerCase();
        const value = colonSplit[1].trim();
        
        if (key.includes('khoảng tham chiếu')) currentTest.referenceText = value;
        else if (key.includes('đơn vị')) currentTest.unit = value;
        else if (key.includes('mẫu bệnh phẩm') || key.includes('bệnh phẩm')) currentTest.specimen = value;
        else if (key.includes('ý nghĩa') || key.includes('ghi chú')) currentTest.notes = value;
      } else {
        const boldMatch = textToParse.match(/^\*\*([^]+)\*\*\s*:?\s*(.+)$/);
        if (boldMatch) {
          const key = boldMatch[1].trim().toLowerCase();
          const value = boldMatch[2].trim();
          
          if (key.includes('khoảng tham chiếu')) currentTest.referenceText = value;
          else if (key.includes('đơn vị')) currentTest.unit = value;
          else if (key.includes('mẫu bệnh phẩm') || key.includes('bệnh phẩm')) currentTest.specimen = value;
          else if (key.includes('ý nghĩa') || key.includes('ghi chú')) currentTest.notes = value;
        }
      }
    }
  }
  
  finishCurrentTest();
  
  return { entries, warnings, errors };
}

/**
 * Normalize parsed entries according to medical data rules.
 */
export function normalizeEntries(entries) {
  const normalized = [];
  
  for (const entry of entries) {
    const normEntry = { ...entry };
    
    if (normEntry.referenceText) {
      normEntry.referenceText = normEntry.referenceText
        .replace(/\\n/g, '\n')
        .replace(/Không nêu/gi, '');
      if (normEntry.referenceText.match(/\[cite:\s*\d+\]/i)) {
        // Warning about cite reference could be handled here or upstream
      }
    }
    
    if (normEntry.notes) {
      normEntry.notes = normEntry.notes.replace(/\\n/g, '\n');
    }
    
    if (normEntry.unit) {
      normEntry.unit = normEntry.unit.replace(/Không nêu/gi, '');
    }
    
    for (const key in normEntry) {
      if (typeof normEntry[key] === 'string') {
        normEntry[key] = normalizeWhitespace(normEntry[key]);
      }
    }
    
    normalized.push(normEntry);
  }
  
  return normalized;
}

/**
 * Compare parsed entries against existing DB data.
 */
export function classifyEntries(entries, existingTests) {
  const result = {
    newEntries: [],
    updatedEntries: [],
    unchangedEntries: [],
    duplicateEntries: [],
    errorEntries: [],
    conflictEntries: []
  };

  const normalizePart = value => removeVietnameseTones(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const isQuickSummary = value => /nguongcannhonhanh/.test(normalizePart(value));
  const getExistingContext = test => {
    const section = test.sectionId && typeof test.sectionId === 'object' ? test.sectionId : null;
    const topic = section?.topicId && typeof section.topicId === 'object' ? section.topicId : null;
    return {
      topicName: test.topicName || topic?.name || '',
      sectionName: test.sectionName || section?.name || ''
    };
  };
  const contextKey = (topicName, sectionName, testName) =>
    `${normalizePart(topicName)}|${normalizePart(sectionName)}|${normalizePart(testName)}`;
  const topicNameKey = (topicName, testName) =>
    `${normalizePart(topicName)}|${normalizePart(testName)}`;

  // Prefer a contextual match. A name-only fallback is kept for migrated legacy data.
  const existingByContext = new Map();
  const existingByName = new Map();
  existingTests.forEach(test => {
    const testName = test.testName || test.name || '';
    const normName = normalizePart(testName);
    if (normName) {
      if (!existingByName.has(normName)) existingByName.set(normName, []);
      existingByName.get(normName).push(test);

      const context = getExistingContext(test);
      if (context.topicName && context.sectionName) {
        const key = contextKey(context.topicName, context.sectionName, testName);
        if (!existingByContext.has(key)) existingByContext.set(key, []);
        existingByContext.get(key).push(test);
      }
    }
  });

  // Deduplicate within the same context. Quick-summary rows are merged into the
  // first test with the same name in the topic, while genuine cross-section tests
  // remain separate (for example ADA in pleural fluid vs ascitic fluid).
  const seenByContext = new Map();
  const firstByTopicAndName = new Map();

  for (const entry of entries) {
    if (!entry.testName) {
      result.errorEntries.push(entry);
      continue;
    }

    const normName = normalizePart(entry.testName);
    const exactKey = contextKey(entry.topicName, entry.sectionName, entry.testName);
    const topicKey = topicNameKey(entry.topicName, entry.testName);
    const contextualMatches = existingByContext.get(exactKey) || [];
    const nameMatches = existingByName.get(normName) || [];
    const dbMatches = contextualMatches.length > 0
      ? contextualMatches
      : (nameMatches.length === 1 && existingByContext.size === 0 ? nameMatches : []);

    if (dbMatches.length > 0) {
      // Already in DB
      const match = dbMatches[0];
      const isUnchanged =
        (entry.referenceText || '') === (match.referenceText || '') &&
        (entry.unit || '') === (match.unit || '');

      if (isUnchanged) {
        result.unchangedEntries.push({ ...entry, existingId: match._id || match.id, dbData: match });
      } else {
        // Data differs from DB: this is a conflict / candidate for update
        result.conflictEntries.push({ ...entry, existingId: match._id || match.id, dbData: match });
      }
    } else if (seenByContext.has(exactKey) || (isQuickSummary(entry.sectionName) && firstByTopicAndName.has(topicKey))) {
      const firstIdx = seenByContext.get(exactKey) ?? firstByTopicAndName.get(topicKey);
      const first = result.newEntries[firstIdx];
      if (!first._batchDuplicates) first._batchDuplicates = [];
      first._batchDuplicates.push(entry);
      result.duplicateEntries.push({
        ...entry,
        batchDuplicate: true,
        mergeIntoClientKey: first._clientKey
      });
    } else {
      const firstIdx = result.newEntries.length;
      const newEntry = { ...entry, _clientKey: `batch-${firstIdx}` };
      seenByContext.set(exactKey, firstIdx);
      if (!isQuickSummary(entry.sectionName) && !firstByTopicAndName.has(topicKey)) {
        firstByTopicAndName.set(topicKey, firstIdx);
      }
      result.newEntries.push(newEntry);
    }
  }

  return result;
}
