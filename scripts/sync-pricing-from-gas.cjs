/**
 * Đồng bộ duy nhất giá + cờ PRO từ manifest công khai của Sheet vào MongoDB.
 * Mặc định là dry-run. Chỉ ghi khi có --commit và toàn bộ bản ghi khớp 100%.
 */
const path = require('path');
const dns = require('dns');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'WebYKhoa';
const QUIZ_SHEET_WEB_APP_URL = process.env.QUIZ_SHEET_WEB_APP_URL || process.env.VITE_QUIZ_DATABASE_URL;
const shouldCommit = process.argv.includes('--commit');

if (!MONGODB_URI) throw new Error('Thiếu MONGODB_URI.');
if (!QUIZ_SHEET_WEB_APP_URL) throw new Error('Thiếu QUIZ_SHEET_WEB_APP_URL hoặc VITE_QUIZ_DATABASE_URL.');

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function parsePrice(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  const digits = String(value || '').replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
}

function buildLookup(items) {
  const lookup = new Map();
  for (const item of items) {
    for (const candidate of [item.id, item.code]) {
      const key = normalizeKey(candidate);
      if (key) lookup.set(key, item);
    }
  }
  return lookup;
}

async function fetchManifest() {
  const url = new URL(QUIZ_SHEET_WEB_APP_URL);
  url.searchParams.set('action', 'getManifest');
  const response = await fetch(url, { redirect: 'follow' });
  const text = await response.text();
  if (!response.ok) throw new Error(`Google Apps Script trả HTTP ${response.status}.`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Google Apps Script không trả JSON hợp lệ.');
  }
}

function matchSource(dbItem, lookup) {
  return lookup.get(normalizeKey(dbItem.id)) || lookup.get(normalizeKey(dbItem.code));
}

function pricingUpdate(source) {
  const price = parsePrice(source.price);
  return {
    price,
    priceFormatted: String(source.priceFormatted || '').trim(),
    priceNote: String(source.priceNote || '').trim(),
    isPro: Boolean(source.isPro || price > 0),
    pricingSynced: true,
    updatedAt: new Date()
  };
}

async function main() {
  const manifest = await fetchManifest();
  const sourceSubjects = Array.isArray(manifest.subjects) ? manifest.subjects : [];
  const sourceBooks = Array.isArray(manifest.books) ? manifest.books : [];
  if (!sourceSubjects.length || !sourceBooks.length) throw new Error('Manifest thiếu môn hoặc tài liệu; dừng để tránh ghi sai.');

  await mongoose.connect(MONGODB_URI, {
    dbName: MONGODB_DB_NAME,
    serverSelectionTimeoutMS: 12000,
    maxPoolSize: 2
  });

  try {
    const db = mongoose.connection.db;
    const dbSubjects = await db.collection('subjects').find({ isPublished: { $ne: false } }).project({ id: 1, code: 1 }).toArray();
    const dbBooks = await db.collection('books').find({ isPublished: { $ne: false } }).project({ id: 1, code: 1 }).toArray();
    const subjectLookup = buildLookup(sourceSubjects);
    const bookLookup = buildLookup(sourceBooks);
    const subjectPairs = dbSubjects.map(item => [item, matchSource(item, subjectLookup)]);
    const bookPairs = dbBooks.map(item => [item, matchSource(item, bookLookup)]);
    const unmatchedSubjects = subjectPairs.filter(([, source]) => !source).map(([item]) => item.id || item.code);
    const unmatchedBooks = bookPairs.filter(([, source]) => !source).map(([item]) => item.id || item.code);

    if (unmatchedSubjects.length || unmatchedBooks.length || dbSubjects.length !== sourceSubjects.length || dbBooks.length !== sourceBooks.length) {
      throw new Error(`Đối soát không đạt: DB/Sheet môn ${dbSubjects.length}/${sourceSubjects.length}, tài liệu ${dbBooks.length}/${sourceBooks.length}, không khớp ${unmatchedSubjects.length + unmatchedBooks.length}.`);
    }

    const summary = {
      mode: shouldCommit ? 'commit' : 'dry-run',
      database: MONGODB_DB_NAME,
      subjects: subjectPairs.length,
      paidSubjects: subjectPairs.filter(([, source]) => parsePrice(source.price) > 0).length,
      books: bookPairs.length,
      paidBooks: bookPairs.filter(([, source]) => parsePrice(source.price) > 0).length
    };

    if (shouldCommit) {
      await db.collection('subjects').bulkWrite(subjectPairs.map(([item, source]) => ({
        updateOne: { filter: { _id: item._id }, update: { $set: pricingUpdate(source) } }
      })), { ordered: true });
      await db.collection('books').bulkWrite(bookPairs.map(([item, source]) => ({
        updateOne: { filter: { _id: item._id }, update: { $set: pricingUpdate(source) } }
      })), { ordered: true });
    }

    console.log(JSON.stringify(summary));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
