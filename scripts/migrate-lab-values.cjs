/**
 * scripts/migrate-lab-values.cjs
 * 
 * Migration script that converts the existing 30 static medical reference lab values
 * from src/data/labValuesData.js into MongoDB documents (LabTopic, LabSection, LabTest, LabInterpretation).
 * 
 * Usage:
 *   node scripts/migrate-lab-values.cjs
 *   node scripts/migrate-lab-values.cjs --force   (xóa dữ liệu cũ của 4 slug trước khi tạo mới)
 */

const path = require('path');
const dns = require('dns');
const mongoose = require('mongoose');

// Fix DNS resolution for Windows local machine (same pattern as api/_utils/db.js)
if (process.platform === 'win32' && !process.env.VERCEL) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {
    // Keep OS default if not permitted
  }
}

// Load environment variables from .env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ANSI Color Codes
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

// =============================================================================
// 1. INLINE SCHEMAS (CommonJS - identical to api/_models)
// =============================================================================

const labTopicSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, default: '', trim: true },
  image:       { type: String, default: '' },
  order:       { type: Number, default: 0 },
  status:      { type: String, enum: ['draft', 'published', 'hidden', 'archived'], default: 'draft', index: true }
}, { timestamps: true });

const labSectionSchema = new mongoose.Schema({
  topicId:     { type: mongoose.Schema.Types.ObjectId, ref: 'LabTopic', required: true, index: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  order:       { type: Number, default: 0 },
  status:      { type: String, enum: ['draft', 'published', 'hidden', 'archived'], default: 'draft', index: true }
}, { timestamps: true });

const labTestSchema = new mongoose.Schema({
  sectionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'LabSection', required: true, index: true },
  name:         { type: String, required: true, trim: true },
  shortName:    { type: String, default: '', trim: true },
  aliases:      [{ type: String, trim: true }],
  description:  { type: String, default: '', trim: true },
  specimen:     { type: String, default: '', trim: true },
  unit:         { type: String, default: '', trim: true },
  image:        { type: String, default: '' },
  status:       { type: String, enum: ['draft', 'published', 'hidden', 'archived'], default: 'draft', index: true },
  order:        { type: Number, default: 0 },
  source:       { type: String, default: '', trim: true },
  sourceDate:   { type: Date, default: null },
  reviewedAt:   { type: Date, default: null },
  reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewNote:   { type: String, default: '', trim: true },
  importedFrom: { type: String, default: '', trim: true },
  importedAt:   { type: Date, default: null },
  searchText:   { type: String, default: '' }
}, { timestamps: true });

const labInterpretationSchema = new mongoose.Schema({
  labTestId:     { type: mongoose.Schema.Types.ObjectId, ref: 'LabTest', required: true, index: true },
  type:          { type: String, enum: ['reference', 'threshold', 'formula', 'interpretation', 'note'], required: true },
  label:         { type: String, default: '', trim: true },
  referenceText: { type: String, default: '', trim: true },
  unit:          { type: String, default: '', trim: true },
  meaning:       { type: String, default: '', trim: true },
  population:    { type: String, default: '', trim: true },
  condition:     { type: String, default: '', trim: true },
  order:         { type: Number, default: 0 }
}, { timestamps: true });

const LabTopic = mongoose.models.LabTopic || mongoose.model('LabTopic', labTopicSchema);
const LabSection = mongoose.models.LabSection || mongoose.model('LabSection', labSectionSchema);
const LabTest = mongoose.models.LabTest || mongoose.model('LabTest', labTestSchema);
const LabInterpretation = mongoose.models.LabInterpretation || mongoose.model('LabInterpretation', labInterpretationSchema);

// =============================================================================
// 2. HELPER FUNCTIONS
// =============================================================================

/**
 * Loại bỏ dấu tiếng Việt để phục vụ tìm kiếm không dấu
 */
function removeVietnameseTones(str) {
  if (!str) return '';
  str = String(str);
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
  str = str.replace(/Đ/g, 'D');
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ''); // huyền, sắc, ngã, hỏi, nặng
  str = str.replace(/\u02C6|\u0306|\u031B/g, ''); // Â, Ê, Ă, Ơ, Ư
  return str;
}

/**
 * Tạo chuỗi searchText bằng cách nối:
 * name (lowercase, không dấu) + shortName + aliases + unit + specimen
 */
function generateSearchText(test) {
  const nameNoTone = removeVietnameseTones(test.name || '').toLowerCase();
  const shortName = (test.shortName || '').toLowerCase();
  const aliasesStr = Array.isArray(test.aliases) ? test.aliases.join(' ') : (test.aliases || '');
  const unit = (test.unit || '').toLowerCase();
  const specimen = (test.specimen || '').toLowerCase();

  const parts = [
    nameNoTone,
    shortName,
    aliasesStr,
    unit,
    specimen
  ];

  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// =============================================================================
// 3. STATIC DATA (HARDCODED LAB_CATEGORIES - 30 LAB TESTS)
// =============================================================================

const LAB_CATEGORIES = [
  {
    id: 'hematology',
    slug: 'huyet-hoc',
    name: 'Huyết học',
    subtitle: 'Công thức máu toàn phần (CBC)',
    image: '',
    tests: [
      { 
        id: 'rbc',
        name: 'Hồng cầu (RBC)',
        shortName: 'RBC',
        aliases: ['Hồng cầu', 'Red Blood Cells', 'rbc'],
        specimen: 'Máu toàn phần',
        normal: 'Nam: 4.2 - 5.8 | Nữ: 3.8 - 5.0', 
        unit: 'x 10¹²/L', 
        notes: 'Giảm trong thiếu máu, suy tủy; Tăng trong đa hồng cầu, mất nước.',
        image: ''
      },
      { 
        id: 'hb',
        name: 'Hemoglobin (Hb)',
        shortName: 'Hb',
        aliases: ['Hemoglobin', 'Hgb', 'Huyết sắc tố', 'hb'],
        specimen: 'Máu toàn phần',
        normal: 'Nam: 130 - 180 | Nữ: 120 - 165', 
        unit: 'g/L', 
        notes: '< 120 g/L chẩn đoán thiếu máu (nữ), < 130 g/L (nam).',
        image: ''
      },
      { 
        id: 'hct',
        name: 'Hematocrit (Hct)',
        shortName: 'Hct',
        aliases: ['Hematocrit', 'Thể tích hồng cầu', 'hct'],
        specimen: 'Máu toàn phần',
        normal: 'Nam: 38 - 50% | Nữ: 35 - 45%', 
        unit: '%', 
        notes: 'Tỷ lệ thể tích hồng cầu/máu toàn phần. Giảm trong mất máu, tan máu.',
        image: ''
      },
      { 
        id: 'wbc',
        name: 'Bạch cầu (WBC)',
        shortName: 'WBC',
        aliases: ['Bạch cầu', 'White Blood Cells', 'wbc'],
        specimen: 'Máu toàn phần',
        normal: '4.0 - 10.0', 
        unit: 'x 10⁹/L', 
        notes: 'Tăng trong nhiễm trùng cấp, phản ứng viêm, bệnh bạch cầu.',
        image: ''
      },
      { 
        id: 'neu',
        name: 'Bạch cầu Neutrophil',
        shortName: 'NEU',
        aliases: ['Neutrophil', 'Bạch cầu trung tính', 'neu'],
        specimen: 'Máu toàn phần',
        normal: '40 - 74% (2.0 - 7.5)', 
        unit: 'x 10⁹/L', 
        notes: 'Tăng điển hình trong các nhiễm trùng do vi khuẩn cấp tính.',
        image: ''
      },
      { 
        id: 'lym',
        name: 'Bạch cầu Lymphocyte',
        shortName: 'LYM',
        aliases: ['Lymphocyte', 'Bạch cầu lympho', 'lym'],
        specimen: 'Máu toàn phần',
        normal: '20 - 45% (1.0 - 4.0)', 
        unit: 'x 10⁹/L', 
        notes: 'Tăng trong nhiễm trùng virus, lao mạn tính, bệnh bạch cầu lympho.',
        image: ''
      },
      { 
        id: 'eos',
        name: 'Bạch cầu Eosinophil',
        shortName: 'EOS',
        aliases: ['Eosinophil', 'Bạch cầu ái toan', 'eos'],
        specimen: 'Máu toàn phần',
        normal: '0.5 - 5% (0.04 - 0.5)', 
        unit: 'x 10⁹/L', 
        notes: 'Tăng trong các bệnh dị ứng, hen phế quản, nhiễm ký sinh trùng.',
        image: ''
      },
      { 
        id: 'plt',
        name: 'Tiểu cầu (PLT)',
        shortName: 'PLT',
        aliases: ['Tiểu cầu', 'Platelet', 'plt'],
        specimen: 'Máu toàn phần',
        normal: '150 - 450', 
        unit: 'x 10⁹/L', 
        notes: '< 100 G/L: Giảm tiểu cầu; < 50 G/L: Nguy cơ xuất huyết tự phát.',
        image: ''
      }
    ]
  },
  {
    id: 'biochemistry',
    slug: 'sinh-hoa-gan-than',
    name: 'Sinh hóa Gan - Thận',
    subtitle: 'Chức năng chuyển hóa & men gan',
    image: '',
    tests: [
      { 
        id: 'glucose',
        name: 'Glucose máu lúc đói',
        shortName: 'Glucose',
        aliases: ['Đường huyết', 'Đường huyết đói', 'Fasting Blood Glucose', 'glu'],
        specimen: 'Huyết tương',
        normal: '3.9 - 6.4 (70 - 115 mg/dL)', 
        unit: 'mmol/L', 
        notes: '≥ 7.0 mmol/L lúc đói: Tiêu chuẩn chẩn đoán Đái tháo đường.',
        image: ''
      },
      { 
        id: 'hba1c',
        name: 'HbA1c',
        shortName: 'HbA1c',
        aliases: ['A1c', 'Glycated Hemoglobin', 'hba1c'],
        specimen: 'Máu toàn phần',
        normal: '< 5.7% (Bình thường) | ≥ 6.5% (ĐTĐ)', 
        unit: '%', 
        notes: 'Phản ánh mức đường huyết trung bình trong 2-3 tháng gần nhất.',
        image: ''
      },
      { 
        id: 'ure',
        name: 'Urea (Ure máu)',
        shortName: 'Urea',
        aliases: ['Ure máu', 'BUN', 'Blood Urea Nitrogen', 'ure'],
        specimen: 'Huyết thanh',
        normal: '2.5 - 7.5 (15 - 45 mg/dL)', 
        unit: 'mmol/L', 
        notes: 'Tăng trong suy giảm chức năng thận, xuất huyết tiêu hóa cao.',
        image: ''
      },
      { 
        id: 'creatinine',
        name: 'Creatinine huyết thanh',
        shortName: 'Creatinine',
        aliases: ['Creatinine', 'Crea', 'creatinine'],
        specimen: 'Huyết thanh',
        normal: 'Nam: 62 - 106 | Nữ: 44 - 80', 
        unit: 'µmol/L', 
        notes: 'Chỉ số quan trọng đánh giá mức lọc cầu thận (eGFR).',
        image: ''
      },
      { 
        id: 'egfr',
        name: 'Mức lọc cầu thận (eGFR)',
        shortName: 'eGFR',
        aliases: ['eGFR', 'GFR', 'Mức lọc cầu thận', 'egfr'],
        specimen: 'Huyết thanh',
        normal: '≥ 90', 
        unit: 'mL/min/1.73m²', 
        notes: '< 60 kéo dài > 3 tháng: Phù hợp tiêu chuẩn Bệnh thận mạn.',
        image: ''
      },
      { 
        id: 'ast',
        name: 'AST (GOT)',
        shortName: 'AST',
        aliases: ['GOT', 'SGOT', 'Aspartate Aminotransferase', 'ast'],
        specimen: 'Huyết thanh',
        normal: 'Nam: < 35 | Nữ: < 31', 
        unit: 'U/L', 
        notes: 'Tăng trong hoại tử tế bào gan, viêm gan cấp, nhồi máu cơ tim.',
        image: ''
      },
      { 
        id: 'alt',
        name: 'ALT (GPT)',
        shortName: 'ALT',
        aliases: ['GPT', 'SGPT', 'Alanine Aminotransferase', 'alt'],
        specimen: 'Huyết thanh',
        normal: 'Nam: < 41 | Nữ: < 31', 
        unit: 'U/L', 
        notes: 'Chỉ số có độ đặc hiệu cao hơn cho tổn thương tế bào gan.',
        image: ''
      },
      { 
        id: 'bilitp',
        name: 'Bilirubin toàn phần',
        shortName: 'Bilirubin TP',
        aliases: ['Bilirubin toàn phần', 'Total Bilirubin', 'TBIL', 'bilitp'],
        specimen: 'Huyết thanh',
        normal: '< 17.1 (< 1.0 mg/dL)', 
        unit: 'µmol/L', 
        notes: '> 34 µmol/L (2 mg/dL) bắt đầu quan sát thấy vàng da trên lâm sàng.',
        image: ''
      },
      { 
        id: 'bilitr',
        name: 'Bilirubin trực tiếp',
        shortName: 'Bilirubin TT',
        aliases: ['Bilirubin trực tiếp', 'Direct Bilirubin', 'DBIL', 'bilitr'],
        specimen: 'Huyết thanh',
        normal: '< 4.3 (< 0.25 mg/dL)', 
        unit: 'µmol/L', 
        notes: 'Tăng ưu thế trong các bệnh lý tắc mật, ứ mật trong/ngoài gan.',
        image: ''
      },
      { 
        id: 'albumin',
        name: 'Albumin huyết thanh',
        shortName: 'Albumin',
        aliases: ['Albumin', 'Alb', 'albumin'],
        specimen: 'Huyết thanh',
        normal: '35 - 50 (3.5 - 5.0 g/dL)', 
        unit: 'g/L', 
        notes: 'Giảm trong suy dinh dưỡng nặng, xơ gan mất bù, hội chứng thận hư.',
        image: ''
      }
    ]
  },
  {
    id: 'electrolytes',
    slug: 'dien-giai-do',
    name: 'Điện giải đồ',
    subtitle: 'Nồng độ ion huyết tương',
    image: '',
    tests: [
      { 
        id: 'na',
        name: 'Natri (Na⁺)',
        shortName: 'Na⁺',
        aliases: ['Natri', 'Sodium', 'Na', 'na'],
        specimen: 'Huyết thanh',
        normal: '135 - 145', 
        unit: 'mmol/L', 
        notes: 'Hạ Natri gây phù não, co giật; Tăng Natri gây teo mất nước tế bào.',
        image: ''
      },
      { 
        id: 'k',
        name: 'Kali (K⁺)',
        shortName: 'K⁺',
        aliases: ['Kali', 'Potassium', 'K', 'k'],
        specimen: 'Huyết thanh',
        normal: '3.5 - 5.0', 
        unit: 'mmol/L', 
        notes: 'Nguy cơ loạn nhịp tim: < 3.0 (sóng U), > 6.0 (sóng T nhọn, ngừng tim).',
        image: ''
      },
      { 
        id: 'cl',
        name: 'Clo (Cl⁻)',
        shortName: 'Cl⁻',
        aliases: ['Clo', 'Chloride', 'Cl', 'cl'],
        specimen: 'Huyết thanh',
        normal: '96 - 106', 
        unit: 'mmol/L', 
        notes: 'Dùng để tính khoảng trống Anion gap = Na - (Cl + HCO3).',
        image: ''
      },
      { 
        id: 'ca_tp',
        name: 'Canxi toàn phần (Ca²⁺)',
        shortName: 'Ca²⁺ TP',
        aliases: ['Canxi toàn phần', 'Total Calcium', 'Ca', 'ca_tp'],
        specimen: 'Huyết thanh',
        normal: '2.15 - 2.55 (8.6 - 10.2 mg/dL)', 
        unit: 'mmol/L', 
        notes: 'Cần hiệu chỉnh theo Albumin: Ca_hc = Ca_tp + 0.8 * (40 - Albumin)/10.',
        image: ''
      },
      { 
        id: 'ca_ion',
        name: 'Canxi ion hóa (Ca²⁺ ion)',
        shortName: 'Ca²⁺ ion',
        aliases: ['Canxi ion hóa', 'Ionized Calcium', 'iCa', 'ca_ion'],
        specimen: 'Huyết thanh',
        normal: '1.15 - 1.30', 
        unit: 'mmol/L', 
        notes: 'Dạng canxi tự do có hoạt tính sinh học chính trong cơ thể.',
        image: ''
      }
    ]
  },
  {
    id: 'cardiac_abg',
    slug: 'khi-mau-men-tim',
    name: 'Khí máu & Men tim',
    subtitle: 'Đánh giá thăng bằng kiềm toan & tim mạch',
    image: '',
    tests: [
      { 
        id: 'ph',
        name: 'pH máu động mạch',
        shortName: 'pH',
        aliases: ['pH máu', 'ABG pH', 'ph'],
        specimen: 'Máu động mạch',
        normal: '7.35 - 7.45', 
        unit: '', 
        notes: '< 7.35: Toan máu; > 7.45: Kiềm máu.',
        image: ''
      },
      { 
        id: 'paco2',
        name: 'PaCO₂',
        shortName: 'PaCO₂',
        aliases: ['PaCO2', 'pCO2', 'paco2'],
        specimen: 'Máu động mạch',
        normal: '35 - 45', 
        unit: 'mmHg', 
        notes: 'Thông số hô hấp: Tăng -> Toan hô hấp; Giảm -> Kiềm hô hấp.',
        image: ''
      },
      { 
        id: 'hco3',
        name: 'HCO₃⁻ (Bicarbonate)',
        shortName: 'HCO₃⁻',
        aliases: ['HCO3', 'Bicarbonate', 'hco3'],
        specimen: 'Máu động mạch',
        normal: '22 - 26', 
        unit: 'mmol/L', 
        notes: 'Thông số chuyển hóa: Giảm -> Toan chuyển hóa; Tăng -> Kiềm chuyển hóa.',
        image: ''
      },
      { 
        id: 'pao2',
        name: 'PaO₂',
        shortName: 'PaO₂',
        aliases: ['PaO2', 'pO2', 'pao2'],
        specimen: 'Máu động mạch',
        normal: '80 - 100', 
        unit: 'mmHg', 
        notes: '< 60 mmHg: Phù hợp giảm oxy máu động mạch (Suy hô hấp).',
        image: ''
      },
      { 
        id: 'trop',
        name: 'Troponin T / I (hs-cTn)',
        shortName: 'hs-cTn',
        aliases: ['Troponin', 'hs-cTn', 'cTnT', 'cTnI', 'trop'],
        specimen: 'Huyết thanh',
        normal: '< 14', 
        unit: 'ng/L', 
        notes: 'Dấu ấn đặc hiệu hoại tử cơ tim trong Hội chứng vành cấp.',
        image: ''
      },
      { 
        id: 'bnp',
        name: 'NT-proBNP',
        shortName: 'NT-proBNP',
        aliases: ['BNP', 'Pro-BNP', 'bnp'],
        specimen: 'Huyết thanh',
        normal: '< 125 (< 75 tuổi)', 
        unit: 'pg/mL', 
        notes: 'Dấu ấn căng thành cơ tim, hỗ trợ chẩn đoán & tiên lượng suy tim.',
        image: ''
      },
      { 
        id: 'ddimer',
        name: 'D-Dimer',
        shortName: 'D-Dimer',
        aliases: ['D-Dimer', 'D dimer', 'ddimer'],
        specimen: 'Huyết tương',
        normal: '< 500', 
        unit: 'ng/mL FEU', 
        notes: 'Giá trị dự đoán âm tính cao để loại trừ Thuyên tắc phổi (PE) & DVT.',
        image: ''
      }
    ]
  }
];

// =============================================================================
// 4. MAIN MIGRATION FUNCTION
// =============================================================================

async function runMigration() {
  const isForce = process.argv.includes('--force') || process.argv.includes('--clean');

  console.log(`${c.bright}🔄 Đang kết nối MongoDB...${c.reset}`);
  
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Thiếu biến môi trường MONGODB_URI trong .env');
  }

  const dbName = process.env.MONGODB_DB_NAME || 'WebYKhoa';

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000
  });

  console.log(`${c.green}✅ Đã kết nối thành công (Database: ${dbName})${c.reset}`);

  // Nếu cờ --force được truyền vào: xóa dữ liệu cũ của 4 slug để chạy migration sạch hoàn toàn
  if (isForce) {
    console.log(`\n${c.yellow}⚠️  Đang dọn dẹp dữ liệu cũ do có cờ --force...${c.reset}`);
    const slugs = LAB_CATEGORIES.map(c => c.slug);
    const existingTopics = await LabTopic.find({ slug: { $in: slugs } });
    const topicIds = existingTopics.map(t => t._id);

    const existingSections = await LabSection.find({ topicId: { $in: topicIds } });
    const sectionIds = existingSections.map(s => s._id);

    const existingTests = await LabTest.find({ sectionId: { $in: sectionIds } });
    const testIds = existingTests.map(t => t._id);

    await LabInterpretation.deleteMany({ labTestId: { $in: testIds } });
    await LabTest.deleteMany({ _id: { $in: testIds } });
    await LabSection.deleteMany({ _id: { $in: sectionIds } });
    await LabTopic.deleteMany({ _id: { $in: topicIds } });
    console.log(`${c.green}✅ Đã dọn dẹp xong dữ liệu cũ.${c.reset}`);
  }

  const stats = {
    topics: 0,
    sections: 0,
    tests: 0,
    interpretations: 0,
    skippedTopics: 0
  };

  // Duyệt qua từng danh mục trong số 4 danh mục
  for (let catIdx = 0; catIdx < LAB_CATEGORIES.length; catIdx++) {
    const category = LAB_CATEGORIES[catIdx];

    // Kiểm tra xem topic với slug này đã tồn tại chưa để tránh trùng lặp
    const existingTopic = await LabTopic.findOne({ slug: category.slug });
    if (existingTopic && !isForce) {
      console.log(`\n${c.yellow}⚠️  Chủ đề "${category.name}" (slug: '${category.slug}') đã tồn tại -> Bỏ qua để tránh tạo trùng lặp.${c.reset}`);
      stats.skippedTopics++;
      continue;
    }

    console.log(`\n${c.cyan}📦 Đang tạo chủ đề: ${category.name}${c.reset}`);

    // a. Tạo LabTopic document với status 'published'
    const topicDoc = await LabTopic.create({
      name: category.name,
      slug: category.slug,
      description: category.subtitle || '',
      image: category.image || '',
      order: catIdx,
      status: 'published'
    });
    stats.topics++;

    // b. Tạo LabSection document (cùng tên với topic vì cấu trúc cũ chưa có nhóm)
    const sectionDoc = await LabSection.create({
      topicId: topicDoc._id,
      name: category.name,
      description: category.subtitle || '',
      order: 0,
      status: 'published'
    });
    console.log(`  ${c.blue}📂 Tạo nhóm: ${sectionDoc.name}${c.reset}`);
    stats.sections++;

    // c. Tạo từng LabTest và các LabInterpretation
    for (let testIdx = 0; testIdx < category.tests.length; testIdx++) {
      const test = category.tests[testIdx];
      const searchText = generateSearchText(test);

      const testDoc = await LabTest.create({
        sectionId: sectionDoc._id,
        name: test.name,
        shortName: test.shortName || '',
        aliases: test.aliases || [],
        description: test.description || '',
        specimen: test.specimen || '',
        unit: test.unit || '',
        image: test.image || '',
        status: 'published',
        order: testIdx,
        source: '',
        sourceDate: null,
        reviewedAt: null,
        reviewedBy: null,
        reviewNote: '',
        importedFrom: 'labValuesData.js',
        importedAt: new Date(),
        searchText: searchText
      });
      stats.tests++;

      let interpCount = 0;

      // 1. Mức diễn giải 'reference' từ trường 'normal'
      if (test.normal && test.normal.trim()) {
        await LabInterpretation.create({
          labTestId: testDoc._id,
          type: 'reference',
          label: 'Khoảng tham chiếu',
          referenceText: test.normal.trim(),
          unit: test.unit || '',
          meaning: '',
          population: '',
          condition: '',
          order: 0
        });
        interpCount++;
        stats.interpretations++;
      }

      // 2. Mức diễn giải 'interpretation' từ trường 'notes' (nếu có nội dung)
      if (test.notes && test.notes.trim()) {
        await LabInterpretation.create({
          labTestId: testDoc._id,
          type: 'interpretation',
          label: 'Ý nghĩa lâm sàng',
          referenceText: '',
          unit: '',
          meaning: test.notes.trim(),
          population: '',
          condition: '',
          order: 1
        });
        interpCount++;
        stats.interpretations++;
      }

      console.log(`  ${c.green}✅ ${test.name} + ${interpCount} mức diễn giải${c.reset}`);
    }
  }

  // Báo cáo tổng kết
  console.log(`\n${c.bright}📊 Kết quả migration:${c.reset}`);
  console.log(`  - Chủ đề: ${stats.topics}${stats.skippedTopics > 0 ? ` (${stats.skippedTopics} đã bỏ qua do tồn tại)` : ''}`);
  console.log(`  - Nhóm: ${stats.sections}`);
  console.log(`  - Chỉ số: ${stats.tests}`);
  console.log(`  - Mức diễn giải: ${stats.interpretations}`);

  if (stats.skippedTopics > 0 && stats.topics === 0) {
    console.log(`\n${c.yellow}💡 Lưu ý: Tất cả các chủ đề đã tồn tại. Nếu muốn ghi đè lại từ đầu, hãy chạy lệnh:${c.reset}`);
    console.log(`   node scripts/migrate-lab-values.cjs --force`);
  }
}

// Thực thi
runMigration()
  .then(() => {
    console.log(`\n${c.green}🎉 Quá trình migration hoàn tất!${c.reset}`);
  })
  .catch((err) => {
    console.error(`\n${c.red}❌ Lỗi trong quá trình migration:${c.reset}`, err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
      console.log(`${c.dim}🔌 Đã đóng kết nối MongoDB.${c.reset}`);
    } catch {
      // Bỏ qua lỗi ngắt kết nối
    }
  });
