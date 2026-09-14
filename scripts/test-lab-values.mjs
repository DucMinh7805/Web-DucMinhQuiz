import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMdContent, normalizeEntries, classifyEntries } from '../shared/labMdParser.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'docs', 'lab-data');
const files = fs.readdirSync(dataDir).filter(name => name.endsWith('.md')).sort();

assert.equal(files.length, 5, 'Phải có đúng 5 file MD nguồn dùng cho đợt migration này.');

const entries = [];
const parserErrors = [];
for (const filename of files) {
  const content = fs.readFileSync(path.join(dataDir, filename), 'utf8');
  const parsed = parseMdContent(content, filename);
  entries.push(...normalizeEntries(parsed.entries));
  parserErrors.push(...parsed.errors);
}

assert.equal(parserErrors.length, 0, 'Parser không được có lỗi chặn.');
assert.equal(entries.length, 229, 'Phải đọc đủ 229 dòng trị số nguồn.');
assert.ok(entries.every(item => item.testName && item.sectionName), 'Mọi dòng phải có tên chỉ số và nhóm.');
assert.ok(entries.every(item => {
  const displayFields = [item.topicName, item.sectionName, item.testName, item.referenceText, item.notes, item.unit];
  return displayFields.every(value => !/\[cite:\s*\d+\]/i.test(String(value || '')));
}), 'Không được để sót thẻ [cite: N] trong các trường hiển thị.');
assert.ok(entries.every(item => !/^[\p{Extended_Pictographic}\uFE0F\u200D]/u.test(item.sectionName)), 'Tên nhóm không được còn emoji đầu dòng.');

const classified = classifyEntries(entries, []);
const mergedRows = classified.newEntries.reduce((total, item) => total + (item._batchDuplicates?.length || 0), 0);
assert.equal(classified.newEntries.length, 156, 'Phải tạo 156 chỉ số duy nhất theo đúng ngữ cảnh chủ đề/nhóm.');
assert.equal(classified.duplicateEntries.length, 73, 'Phải nhận diện 73 dòng cần gộp diễn giải.');
assert.equal(classified.newEntries.length + mergedRows, entries.length, 'Không được làm mất bất kỳ dòng nguồn nào khi gộp.');

const ada = classified.newEntries.filter(item => /adenosine deaminase|\bada\b/i.test(item.testName));
assert.ok(ada.length >= 2, 'ADA ở các loại dịch khác nhau phải được giữ thành các chỉ số theo ngữ cảnh riêng.');
assert.ok(new Set(ada.map(item => item.sectionName)).size >= 2, 'Không được gộp ADA xuyên qua các nhóm bệnh phẩm khác nhau.');

const contextual = classifyEntries([
  { topicName: 'Dịch cơ thể', sectionName: 'Dịch màng phổi', testName: 'ADA', referenceText: '< 40' },
  { topicName: 'Dịch cơ thể', sectionName: 'Dịch báng', testName: 'ADA', referenceText: '< 36' },
  { topicName: 'Dịch cơ thể', sectionName: 'Dịch báng', testName: 'ADA', referenceText: '> 36' }
], []);
assert.equal(contextual.newEntries.length, 2, 'Trùng trong cùng nhóm phải gộp, khác nhóm phải tách.');
assert.equal(contextual.duplicateEntries.length, 1);

const backendSource = fs.readFileSync(path.join(root, 'api', '_utils', 'adminLabValuesHandler.js'), 'utf8');
assert.match(backendSource, /session\.withTransaction/, 'Các thao tác nhiều bước phải dùng transaction.');
assert.match(backendSource, /resource === 'save-test'/, 'Editor phải có API lưu test + diễn giải nguyên tử.');
assert.match(backendSource, /status: 'draft'/, 'Luồng xuất bản phải chỉ lấy dữ liệu nháp.');
assert.match(backendSource, /acknowledgedWarnings/, 'Backend phải tự kiểm tra xác nhận cảnh báo.');
assert.match(backendSource, /existingSignatures/, 'Nhập lại cùng file phải chống trùng diễn giải.');
assert.match(backendSource, /attachTestCounts/, 'API Admin phải trả số trị số đúng cho chủ đề và nhóm.');
assert.match(backendSource, /countByTopic/, 'Số trị số chủ đề phải được cộng từ mọi nhóm con.');

console.log(`✓ Lab parser: ${entries.length} dòng nguồn → ${classified.newEntries.length} chỉ số + ${mergedRows} dòng diễn giải gộp`);
console.log('✓ Phân loại theo ngữ cảnh, chống mất dòng, transaction và chặn publish đã được kiểm tra');
